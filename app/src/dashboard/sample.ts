import { addDays } from '@kairos/core';
import type { MockDoc, SessionDoc } from '../store';
import type { MasteryLike } from './data';
import type { DashboardBundle } from './types';

/** Deterministic made-up data for "Preview with sample data". Used only when toggled. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SAMPLE_NAMES: Record<string, string> = {
  'PHY.ROT': 'Rotational Motion', 'PHY.LOM': 'Laws of Motion', 'CHE.IONEQ': 'Ionic Equilibrium', 'CHE.THERMO': 'Thermodynamics',
  'MAT.SEQ': 'Sequences and Series', 'MAT.TRIG': 'Trigonometric Functions', 'PHY.WEP': 'Work, Energy and Power', 'CHE.BOND': 'Chemical Bonding',
};
const CHAPTERS = Object.keys(SAMPLE_NAMES);
const LABELS = ['silly_mistake', 'concept_gap', 'time_sink', 'guess_careless', 'fluency'] as const;

function at(date: string, hour: number, minute = 0): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!, hour, minute).getTime();
}

export function makeSampleBundle(today: string): DashboardBundle {
  const r = rng(20261108);
  const sessions: SessionDoc[] = [];
  for (let back = 0; back < 75; back++) {
    const date = addDays(today, -back);
    const quiet = back > 0 && back % 6 === 3;
    if (quiet || r() < 0.18) continue;
    const count = r() < 0.35 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const chapter = CHAPTERS[Math.floor(r() * CHAPTERS.length)]!;
      const n = 10 + Math.floor(r() * 16);
      const acc = Math.min(0.95, 0.5 + r() * 0.35 + (75 - back) * 0.002);
      const correct = Math.round(n * acc);
      const wrong = n - correct - (r() < 0.3 ? 1 : 0);
      const labels: Record<string, number> = {};
      for (const l of LABELS) { const c = Math.floor(r() * (wrong + 1) * (l === 'silly_mistake' ? 0.7 : 0.35)); if (c) labels[l] = c; }
      const timeMs = n * (60_000 + Math.floor(r() * 70_000));
      const startedAt = at(date, 17 + k * 2, Math.floor(r() * 50));
      sessions.push({
        id: `sample_s_${back}_${k}`, startedAt, endedAt: startedAt + timeMs, exam: 'JEE_MAIN', chapter, ctx: 'practice',
        summary: { n, correct, wrong, skipped: n - correct - wrong, accuracy: correct / n, totalTimeMs: timeMs, avgTimeMs: timeMs / n, byChapter: { [chapter]: { n, correct, wrong, skipped: 0, timeMs } }, labels },
      });
    }
  }
  const mocks: MockDoc[] = [41, 20, 6].map((back, i) => {
    const marks = 120 + i * 34;
    return { id: `sample_m_${back}`, paperId: 'sample_jee_mini_v1', submittedAt: at(addDays(today, -back), 10), score: { marks, max: 300, correct: 40, wrong: 10, blank: 10, partial: 0 }, analysis: { v: 1, title: 'JEE Main mini mock', usedMs: 150 * 60_000, pending: false } };
  });
  const mastery: MasteryLike = {};
  CHAPTERS.forEach((c, i) => {
    mastery[c] = { θ: [0.7, 0.2, -0.6, -0.1, 0.5, 0.3, -0.5, 0.1][i]!, rd: 0.22 + (i % 3) * 0.08, n: 18 + i * 3, last: at(addDays(today, -(i % 5)), 18) };
  });
  const dow = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), d === 0 ? 240 : d === 6 ? 210 : 150]));
  return {
    sessions, mocks, mastery, names: SAMPLE_NAMES,
    uploads: [{ at: at(addDays(today, -2), 20), count: 24 }],
    profile: { kind: 'guest', displayName: 'Sample', createdAt: 0, examDate: addDays(today, 97), exam: 'JEE_MAIN', minutesPerWeekday: dow, offDay: 5 } as DashboardBundle['profile'],
    paceLog: [{ date: addDays(today, -2), planned: 6, done: 4 }, { date: addDays(today, -1), planned: 6, done: 6 }],
    usage: { questions: 120, limit: 2000 },
    band: { p25: 148, p50: 171, p75: 196, max: 300 },
    workRemainingMin: 5_800,
    sample: true,
  };
}
