export type NudgeKind = 'first_session' | 'three_days' | 'exam_date_set' | 'many_sessions';

export const NUDGE_KEY = 'kairos-nudge';
export const BANNER_SNOOZE_MS = 7 * 86_400_000;
export const MANY_SESSIONS = 50;

export interface NudgeState {
  /** milestones already shown (each once) */
  shown: NudgeKind[];
  /** milestones requested while the daily limit blocked them */
  pending: NudgeKind[];
  /** YYYY-MM-DD of the last modal shown */
  lastModalDay: string | null;
  activeDays: string[];
  bannerSnoozedUntil: number;
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const empty = (): NudgeState => ({ shown: [], pending: [], lastModalDay: null, activeDays: [], bannerSnoozedUntil: 0 });

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function loadNudge(kv: KV): NudgeState {
  try {
    const raw = kv.getItem(NUDGE_KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Partial<NudgeState>) } : empty();
  } catch {
    return empty();
  }
}
export function saveNudge(kv: KV, s: NudgeState) {
  try { kv.setItem(NUDGE_KEY, JSON.stringify(s)); } catch { /* storage full or blocked: skip */ }
}

/** Record that today was an active day. Returns the new state. */
export function trackActiveDay(s: NudgeState, now: Date): NudgeState {
  const k = dayKey(now);
  return s.activeDays.includes(k) ? s : { ...s, activeDays: [...s.activeDays, k].slice(-30) };
}

/**
 * Ask to show a milestone modal. At most one modal per day, each milestone once.
 * If blocked only by the daily limit the milestone waits in `pending` for another day.
 */
export function requestNudge(s: NudgeState, kind: NudgeKind, now: Date): { state: NudgeState; show: NudgeKind | null } {
  if (s.shown.includes(kind)) return { state: s, show: null };
  const today = dayKey(now);
  if (s.lastModalDay === today) {
    return { state: s.pending.includes(kind) ? s : { ...s, pending: [...s.pending, kind] }, show: null };
  }
  return {
    state: { ...s, shown: [...s.shown, kind], pending: s.pending.filter((k) => k !== kind), lastModalDay: today },
    show: kind,
  };
}

/** Show the oldest pending milestone, if today's modal slot is free. */
export function flushPending(s: NudgeState, now: Date) {
  const next = s.pending[0];
  return next ? requestNudge(s, next, now) : { state: s, show: null };
}

export function bannerVisible(s: NudgeState, now: number): boolean {
  return now >= s.bannerSnoozedUntil;
}
export function snoozeBanner(s: NudgeState, now: number): NudgeState {
  return { ...s, bannerSnoozedUntil: now + BANNER_SNOOZE_MS };
}
