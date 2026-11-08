import { buildSchedule, computePace, countByKind, daysLeft, phaseFor, scheduleFrom, type PaceResult } from '@kairos/core';
import type { PaceLogDoc, Profile } from '../store';
import { isYmd } from './range';

/** Plan/pace facts for the plan, nextmock and a few stat cards. Needs a profile exam date; everything else degrades gracefully. */
export interface PlanInfo {
  examDate: string;
  daysLeft: number;
  phase: string;
  buffersLeft: number | null;
  nextMock: string | null;
  /** only when we can estimate remaining work (W); otherwise null and the card explains */
  pace: PaceResult | null;
  /** planned minus done, summed over the pace log (tasks still owed) */
  backlog: number | null;
  /** today is a rest day / buffer, or the minutes planned today */
  todayMinutes: number | null;
}

export function selectPlan(
  profile: Profile | null,
  paceLog: ReadonlyArray<PaceLogDoc & { date: string }>,
  today: string,
  extra: { workRemainingMin?: number | null; fu?: number } = {},
): PlanInfo | null {
  const examDate = (profile as { examDate?: string | null } | null)?.examDate;
  if (!isYmd(examDate)) return null;
  const left = daysLeft(examDate, today);
  if (left < 0) return null;
  const phase = phaseFor(left).label;
  const mpw = (profile as { minutesPerWeekday?: Record<string, number> } | null)?.minutesPerWeekday;
  const off = (profile as { offDay?: number | null } | null)?.offDay ?? null;
  let info: PlanInfo = { examDate, daysLeft: left, phase, buffersLeft: null, nextMock: null, pace: null, backlog: null, todayMinutes: null };
  if (mpw && Object.keys(mpw).length) {
    const minutes: Record<number, number> = {};
    for (let d = 0; d < 7; d++) minutes[d] = Number(mpw[String(d)] ?? 0) || 0;
    const sched = buildSchedule({ today, examDate, minutesPerWeekday: minutes, offDay: off });
    const rest = scheduleFrom(sched, today);
    const counts = countByKind(rest);
    const nm = rest.find((d) => (d.kind === 'mock' || d.kind === 'sprint_mock') && d.date >= today);
    info = { ...info, buffersLeft: counts.buffer, nextMock: nm?.date ?? null, todayMinutes: rest[0]?.kind === 'work' || rest[0]?.kind === 'mock' ? rest[0].capacityMin : 0 };
    const W = extra.workRemainingMin;
    if (typeof W === 'number' && W >= 0) info.pace = computePace({ workRemainingMin: W, scheduleFromToday: rest, fu: extra.fu ?? 0.8, bufferDaysLeft: counts.buffer });
  }
  if (paceLog.length) info.backlog = paceLog.reduce((a, p) => a + Math.max(0, (p.planned ?? 0) - (p.done ?? 0)), 0);
  return info;
}

export const PACE_WORDS: Record<PaceResult['status'], string> = { ahead: 'Ahead of pace', on_track: 'On track', slightly_behind: 'Slightly behind', behind: 'Behind' };
