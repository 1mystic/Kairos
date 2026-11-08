export type PhaseId = 'build' | 'strengthen' | 'consolidate' | 'exam_mode' | 'final_sprint' | 'taper';

export interface PhaseMix {
  new: number;
  weak: number;
  review: number;
  mixed: number;
}

export interface PhaseDef {
  id: PhaseId;
  label: string;
  /** Applies when daysLeft >= minDays (and below the next phase's minDays). */
  minDays: number;
  mix: PhaseMix;
  /** One mock every N days (may be fractional, e.g. 3.5 = 2/week); null = none. */
  mockEveryDays: number | null;
  /** Target success probability for practice items; 'exam' = match exam difficulty; null = n/a. */
  targetP: [number, number] | 'exam' | null;
}

/** docs/05 5.5. Mix percentages sum to 100. Taper = own mistakes only (all weight on `weak`). */
export const DEFAULT_PHASES: readonly PhaseDef[] = [
  { id: 'build', label: 'Build', minDays: 121, mix: { new: 50, weak: 25, review: 15, mixed: 10 }, mockEveryDays: 14, targetP: [0.7, 0.75] },
  { id: 'strengthen', label: 'Strengthen', minDays: 61, mix: { new: 30, weak: 35, review: 20, mixed: 15 }, mockEveryDays: 7, targetP: [0.6, 0.7] },
  { id: 'consolidate', label: 'Consolidate', minDays: 31, mix: { new: 10, weak: 35, review: 25, mixed: 30 }, mockEveryDays: 3.5, targetP: 'exam' },
  { id: 'exam_mode', label: 'Exam mode', minDays: 16, mix: { new: 0, weak: 30, review: 30, mixed: 40 }, mockEveryDays: 2, targetP: 'exam' },
  { id: 'final_sprint', label: 'Final sprint', minDays: 3, mix: { new: 0, weak: 30, review: 50, mixed: 20 }, mockEveryDays: 1, targetP: 'exam' },
  { id: 'taper', label: 'Taper', minDays: 0, mix: { new: 0, weak: 100, review: 0, mixed: 0 }, mockEveryDays: null, targetP: null },
];

/**
 * Phase for a number of days left. Phases are looked up by threshold, so a student who signs up
 * with 40 days left simply starts in Consolidate, and with 10 days left in Final sprint.
 * Past-exam values clamp to the last phase.
 */
export function phaseFor(daysLeft: number, config: readonly PhaseDef[] = DEFAULT_PHASES): PhaseDef {
  const sorted = [...config].sort((a, b) => b.minDays - a.minDays);
  for (const p of sorted) if (daysLeft >= p.minDays) return p;
  return sorted[sorted.length - 1] as PhaseDef;
}

/** Phases a student will pass through from signup to exam day, in order (short runways skip early phases). */
export function phasesFromSignup(daysLeftAtSignup: number, config: readonly PhaseDef[] = DEFAULT_PHASES): PhaseDef[] {
  const sorted = [...config].sort((a, b) => b.minDays - a.minDays);
  const start = phaseFor(daysLeftAtSignup, config);
  return sorted.slice(sorted.indexOf(start));
}
