import type { ScheduleDay } from './schedule';

export type PaceStatus = 'ahead' | 'on_track' | 'slightly_behind' | 'behind';
export type Ambition = 'comfortable' | 'competitive' | 'top';

export const RHO_AHEAD = 0.85;
export const RHO_ON_TRACK = 1.0;
export const RHO_SLIGHTLY_BEHIND = 1.15;
export const MAX_DAILY_LOAD_CHANGE = 0.15;
export const FU_MIN = 0.5;
export const FU_MAX = 1.1;
export const FU_WINDOW_DAYS = 14;
/** Population prior: mastery gained per practised question until the student's own g is learned. */
export const DEFAULT_GAIN = 0.005;
export const DEFAULT_ITEM_MIN = 3;

export function paceStatus(rho: number): PaceStatus {
  if (rho < RHO_AHEAD) return 'ahead';
  if (rho <= RHO_ON_TRACK) return 'on_track';
  if (rho <= RHO_SLIGHTLY_BEHIND) return 'slightly_behind';
  return 'behind';
}

/** A = sum of work-day capacity x f_u. */
export function availableMinutes(schedule: readonly ScheduleDay[], fu: number): number {
  return schedule.reduce((s, d) => s + (d.kind === 'work' ? d.capacityMin * fu : 0), 0);
}

export interface PaceInput {
  /** W: minutes of work still needed. */
  workRemainingMin: number;
  scheduleFromToday: readonly ScheduleDay[];
  /** Completion factor f_u. */
  fu: number;
  bufferDaysLeft: number;
}

export interface PaceResult {
  W: number;
  A: number;
  rho: number;
  status: PaceStatus;
  /** Buffer days to spend (never auto-raises load). 0 unless behind. */
  bufferToSpend: number;
  message: string;
}

export function computePace(input: PaceInput): PaceResult {
  const { workRemainingMin: W, scheduleFromToday: sched, fu } = input;
  const A = availableMinutes(sched, fu);
  const rho = W <= 0 ? 0 : A <= 0 ? Infinity : W / A;
  const status = paceStatus(rho);

  let bufferToSpend = 0;
  if (status === 'slightly_behind' || status === 'behind') {
    let have = A;
    const buffers = sched.filter((d) => d.kind === 'buffer');
    const cap = Math.min(Math.max(0, Math.floor(input.bufferDaysLeft)), buffers.length);
    while (bufferToSpend < cap && have < W) {
      have += (buffers[bufferToSpend] as ScheduleDay).capacityMin * fu;
      bufferToSpend++;
    }
  }

  const bd = (n: number) => `${n} buffer day${n === 1 ? '' : 's'}`;
  let message: string;
  switch (status) {
    case 'ahead':
      message = 'Ahead of pace. You could raise your ambition or add a mock; nothing changes unless you say so.';
      break;
    case 'on_track':
      message = 'On track.';
      break;
    case 'slightly_behind':
      message =
        bufferToSpend > 0
          ? `Slightly behind. Using ${bd(bufferToSpend)} to catch up (${input.bufferDaysLeft - bufferToSpend} left after).`
          : 'Slightly behind, and no buffer days are left to spend.';
      break;
    default:
      message = 'Behind. Choose: study more minutes per day, or drop some low-weight chapters.';
  }
  return { W, A, rho, status, bufferToSpend, message };
}

export interface ChapterWork {
  id: string;
  /** Exam weight, 0..1 (relative importance). */
  weight: number;
  remainingMin: number;
  /** Expected marks lost if the chapter is dropped. */
  marksCost: number;
}

export interface BehindOptions {
  /** Extra minutes per work day (sum over all remaining work days brings rho to 1.0). */
  addMinutesPerDay: number;
  /** Increase as a share of the average planned work-day capacity. */
  addPercent: number;
  /** True whenever the suggestion exceeds stated capacity: must be asked, never auto-applied. */
  requiresConsent: boolean;
  /** Lowest weight / lowest marks cost first, until rho <= 1.0. */
  dropChapters: ChapterWork[];
  dropMarksCost: number;
  rhoAfterDrop: number;
  /** Dropping the listed chapters reaches rho <= 1.0. */
  dropReachesTarget: boolean;
  /** Load ramp needed to reach `addMinutesPerDay` within the +/-15%/day rule. */
  rampDays: number;
}

/** The two choices offered when rho > 1.15. Returns null otherwise. */
export function behindOptions(input: {
  workRemainingMin: number;
  scheduleFromToday: readonly ScheduleDay[];
  fu: number;
  chapters: readonly ChapterWork[];
}): BehindOptions | null {
  const { workRemainingMin: W, scheduleFromToday: sched, fu } = input;
  const A = availableMinutes(sched, fu);
  const rho = W <= 0 ? 0 : A <= 0 ? Infinity : W / A;
  if (paceStatus(rho) !== 'behind') return null;

  const workDays = sched.filter((d) => d.kind === 'work');
  const n = workDays.length;
  const avgCap = n > 0 ? workDays.reduce((s, d) => s + d.capacityMin, 0) / n : 0;
  const addMinutesPerDay = n > 0 && fu > 0 ? Math.ceil((W - A) / (n * fu)) : Infinity;
  const addPercent = avgCap > 0 ? addMinutesPerDay / avgCap : Infinity;
  const rampDays = Number.isFinite(addPercent) && addPercent > 0 ? Math.ceil(Math.log(1 + addPercent) / Math.log(1 + MAX_DAILY_LOAD_CHANGE)) : 0;

  const order = [...input.chapters].sort(
    (a, b) => a.weight - b.weight || a.marksCost - b.marksCost || (a.id < b.id ? -1 : 1),
  );
  const dropped: ChapterWork[] = [];
  let w = W;
  for (const c of order) {
    if (A > 0 ? w / A <= RHO_ON_TRACK : w <= 0) break;
    dropped.push(c);
    w -= c.remainingMin;
  }
  const rhoAfterDrop = w <= 0 ? 0 : A <= 0 ? Infinity : w / A;
  return {
    addMinutesPerDay,
    addPercent,
    requiresConsent: true,
    dropChapters: dropped,
    dropMarksCost: dropped.reduce((s, c) => s + c.marksCost, 0),
    rhoAfterDrop,
    dropReachesTarget: rhoAfterDrop <= RHO_ON_TRACK,
    rampDays,
  };
}

/** Clamp day-to-day load change to +/-15%. From zero load there is nothing to ramp from, so wanted is used. */
export function limitLoadChange(prevLoad: number, wantedLoad: number, maxChange = MAX_DAILY_LOAD_CHANGE): number {
  if (prevLoad <= 0) return Math.max(0, wantedLoad);
  return Math.min(prevLoad * (1 + maxChange), Math.max(prevLoad * (1 - maxChange), wantedLoad));
}

/** Anything above the stated capacity needs the student's consent. */
export function capacityCheck(wantedMin: number, statedMin: number): { minutes: number; requiresConsent: boolean } {
  return { minutes: wantedMin, requiresConsent: wantedMin > statedMin };
}

/** Target mastery m* from ambition; high-weight chapters (weight 0..1) aim higher. */
export function ambitionTarget(ambition: Ambition, weight: number): number {
  const base: Record<Ambition, number> = { comfortable: 0.55, competitive: 0.7, top: 0.8 };
  const w = Math.min(1, Math.max(0, weight));
  return Math.min(0.95, base[ambition] + 0.1 * w);
}

export interface WorkChapter {
  id: string;
  weight: number;
  /** Current mastery m in 0..1. */
  mastery: number;
  /** Learned mastery gain per question g; population prior when absent. */
  gain?: number;
  /** Average minutes per item t-bar. */
  itemMin?: number;
}

export function chapterRemainingMin(c: WorkChapter, ambition: Ambition): number {
  const g = c.gain && c.gain > 0 ? c.gain : DEFAULT_GAIN;
  const t = c.itemMin && c.itemMin > 0 ? c.itemMin : DEFAULT_ITEM_MIN;
  return (Math.max(0, ambitionTarget(ambition, c.weight) - c.mastery) / g) * t;
}

/** W = sum_c max(0,(m*-m)/g)*t + W_reviews. */
export function workRemaining(chapters: readonly WorkChapter[], opts: { ambition: Ambition; reviewMin?: number }): number {
  return chapters.reduce((s, c) => s + chapterRemainingMin(c, opts.ambition), 0) + Math.max(0, opts.reviewMin ?? 0);
}

/**
 * f_u = EWMA over ~14 days of done/planned, times 1.1, clamped to [0.5, 1.1].
 * `prevEwma` is the raw ratio EWMA (null on day one). Days with nothing planned leave it unchanged.
 */
export function updateFu(prevEwma: number | null, done: number, planned: number): { ewma: number; fu: number } {
  const alpha = 2 / (FU_WINDOW_DAYS + 1);
  let ewma = prevEwma ?? 1;
  if (planned > 0) {
    const ratio = Math.min(1.5, Math.max(0, done / planned));
    ewma = prevEwma === null ? ratio : alpha * ratio + (1 - alpha) * prevEwma;
  }
  return { ewma, fu: Math.min(FU_MAX, Math.max(FU_MIN, ewma * 1.1)) };
}
