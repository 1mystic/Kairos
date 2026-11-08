import { addDays, dayNumber, daysLeft, weekdayOf } from './calendar';
import { DEFAULT_PHASES, phaseFor, type PhaseDef, type PhaseId } from './phases';

export type DayKind = 'work' | 'mock' | 'buffer' | 'off' | 'taper' | 'sprint_mock';

export interface ScheduleDay {
  /** YYYY-MM-DD local date. */
  date: string;
  /** Days until the exam (exam day itself is not scheduled). */
  daysLeft: number;
  kind: DayKind;
  phase: PhaseId;
  /** Student's stated minutes for this weekday (0 on off days). Never more. */
  capacityMin: number;
  /** Sprint day that fell on the student's weekly off-day. */
  offDayOverridden?: true;
  warning?: string;
}

export interface ScheduleConfig {
  phases?: readonly PhaseDef[];
  /** Last N scheduled days are taper (default 2). */
  taperDays?: number;
  /** Last N scheduled days (incl. taper) form the final sprint (default 15). */
  sprintDays?: number;
  /** One buffer per this many work days (default 7). */
  workDaysPerBuffer?: number;
  /** A mock is only placed on a day with at least this many minutes (default 210). */
  mockMinCapacityMin?: number;
}

export interface ScheduleInput {
  today: string;
  examDate: string;
  /** Index 0 = Sunday ... 6 = Saturday. */
  minutesPerWeekday: Record<number, number>;
  /** Weekday index of the weekly off-day, or null. */
  offDay: number | null;
  config?: ScheduleConfig;
}

/**
 * Reverse schedule from today to the day before the exam: taper, final sprint (daily mock),
 * phase-frequency mocks, buffers (1 per 7 work days), everything else work. Pure and deterministic.
 */
export function buildSchedule(input: ScheduleInput): ScheduleDay[] {
  const { today, examDate, minutesPerWeekday, offDay } = input;
  const cfg = input.config ?? {};
  const phases = cfg.phases ?? DEFAULT_PHASES;
  const taperDays = cfg.taperDays ?? 2;
  const sprintDays = cfg.sprintDays ?? 15;
  const perBuffer = cfg.workDaysPerBuffer ?? 7;
  const mockMin = cfg.mockMinCapacityMin ?? 210;

  const total = Math.max(0, daysLeft(examDate, today));
  const days: ScheduleDay[] = [];
  const mockAcc = new Map<PhaseId, number>();

  for (let i = 0; i < total; i++) {
    const date = addDays(today, i);
    const left = total - i;
    const wd = weekdayOf(date);
    const stated = Math.max(0, minutesPerWeekday[wd] ?? 0);
    const isOff = offDay !== null && wd === offDay;

    if (left <= taperDays) {
      days.push({ date, daysLeft: left, kind: isOff ? 'off' : 'taper', phase: 'taper', capacityMin: isOff ? 0 : stated });
    } else if (left <= sprintDays) {
      const d: ScheduleDay = { date, daysLeft: left, kind: 'sprint_mock', phase: 'final_sprint', capacityMin: stated };
      if (isOff) {
        d.offDayOverridden = true;
        d.warning = 'Final sprint: a full mock is scheduled on your usual off-day.';
      }
      days.push(d);
    } else {
      const phase = phaseFor(left, phases);
      const acc = (mockAcc.get(phase.id) ?? 0) + 1;
      mockAcc.set(phase.id, acc);
      if (isOff) {
        days.push({ date, daysLeft: left, kind: 'off', phase: phase.id, capacityMin: 0 });
      } else if (phase.mockEveryDays !== null && acc >= phase.mockEveryDays && stated >= mockMin) {
        mockAcc.set(phase.id, acc - phase.mockEveryDays);
        days.push({ date, daysLeft: left, kind: 'mock', phase: phase.id, capacityMin: stated });
      } else {
        days.push({ date, daysLeft: left, kind: 'work', phase: phase.id, capacityMin: stated });
      }
    }
  }

  // Buffers: counted back from the exam, every (perBuffer+1)-th candidate day => 1 buffer per 7 work days.
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i] as ScheduleDay;
    if (d.kind !== 'work') continue;
    n++;
    if (n % (perBuffer + 1) === 0) d.kind = 'buffer';
  }
  return days;
}

export function countByKind(schedule: readonly ScheduleDay[]): Record<DayKind, number> {
  const out: Record<DayKind, number> = { work: 0, mock: 0, buffer: 0, off: 0, taper: 0, sprint_mock: 0 };
  for (const d of schedule) out[d.kind]++;
  return out;
}

/** Minutes on plain work days (buffers, mocks and taper excluded). */
export function workMinutes(schedule: readonly ScheduleDay[]): number {
  return schedule.reduce((s, d) => s + (d.kind === 'work' ? d.capacityMin : 0), 0);
}

/** Remaining schedule from `today` onwards (inclusive). */
export function scheduleFrom(schedule: readonly ScheduleDay[], today: string): ScheduleDay[] {
  const t = dayNumber(today);
  return schedule.filter((d) => dayNumber(d.date) >= t);
}
