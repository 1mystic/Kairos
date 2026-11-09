/** Pure telemetry logic: accumulate, clamp to the firestore.rules caps, decide when to flush. No Firebase here. */
export const COUNTERS = [
  'signups', 'sessions', 'questions', 'correct', 'mocks', 'diagnostics', 'uploads', 'onboarded',
  'sessions_JEE_MAIN', 'sessions_NEET_UG', 'sessions_IAT', 'sessions_GATE_DA',
] as const;
export type Counter = (typeof COUNTERS)[number];
export type Counts = Partial<Record<Counter, number>>;

/** Largest increment one write may carry (rules). `active` is separate: exactly +1 together with the seen marker. */
export const CAPS: Record<Counter, number> = {
  signups: 50, sessions: 50, questions: 500, correct: 500, mocks: 50, diagnostics: 50, uploads: 50, onboarded: 50,
  sessions_JEE_MAIN: 50, sessions_NEET_UG: 50, sessions_IAT: 50, sessions_GATE_DA: 50,
};

const isCounter = (k: string): k is Counter => (COUNTERS as readonly string[]).includes(k);

/** Local calendar day, YYYY-MM-DD. */
export function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Drop unknown keys, non-positive and non-finite values; whole numbers only; correct never exceeds questions. */
export function normalize(c: Record<string, unknown>): Counts {
  const out: Counts = {};
  for (const [k, v] of Object.entries(c)) {
    if (!isCounter(k) || typeof v !== 'number' || !Number.isFinite(v)) continue;
    const n = Math.floor(v);
    if (n > 0) out[k] = n;
  }
  if (out.correct !== undefined) {
    const q = out.questions ?? 0;
    if (out.correct > q) {
      if (q > 0) out.correct = q;
      else delete out.correct;
    }
  }
  return out;
}

export function addCounts(a: Counts, b: Counts): Counts {
  const sum: Record<string, number | undefined> = { ...a };
  for (const [k, v] of Object.entries(normalize(b))) sum[k] = (sum[k] ?? 0) + v;
  return normalize(sum);
}

export const isEmpty = (c: Counts): boolean => Object.keys(c).length === 0;

/** What one write may carry (<= caps, correct <= questions) and what stays pending for the next flush. */
export function takeBatch(pending: Counts): { send: Counts; rest: Counts } {
  const send: Counts = {};
  const rest: Counts = {};
  for (const k of COUNTERS) {
    const n = pending[k] ?? 0;
    if (n <= 0) continue;
    const s = Math.min(n, CAPS[k]);
    send[k] = s;
    if (n > s) rest[k] = n - s;
  }
  if (send.correct !== undefined) {
    const q = send.questions ?? 0;
    const c = Math.min(send.correct, q);
    const held = send.correct - c;
    if (c > 0) send.correct = c;
    else delete send.correct;
    if (held > 0) rest.correct = (rest.correct ?? 0) + held;
  }
  return { send, rest: normalize(rest) };
}

export type FlushReason = 'timer' | 'hide' | 'manual';

export interface FlushInput {
  uid: string | null;
  online: boolean;
  hasPending: boolean;
  /** the daily `active` count has not been recorded today */
  needsActive: boolean;
  lastFlushDay: string | null;
  today: string;
  reason: FlushReason;
}

/**
 * Guests and offline: never. Timer: once per day. Page hide / manual: whenever something is pending.
 * (So a user costs at most one scheduled flush a day plus one per time they leave the page with unsent data.)
 */
export function shouldFlush(i: FlushInput): boolean {
  if (!i.uid || !i.online) return false;
  if (!i.hasPending && !i.needsActive) return false;
  if (i.reason === 'timer') return i.lastFlushDay !== i.today;
  return true;
}

/**
 * Exams with a per-exam counter in the rules contract: keep this list in sync with `statKeys()` in
 * firestore.rules (`sessions_<EXAM>`); an unknown field would make the whole stats write be rejected.
 */
const KNOWN_EXAMS = ['JEE_MAIN', 'NEET_UG', 'IAT', 'GATE_DA'];
export function sessionCounts(s: { exam?: string | null; answered: number; correct: number }): Record<string, number> {
  const answered = Math.max(0, Math.floor(s.answered));
  const counts: Record<string, number> = { sessions: 1, questions: answered, correct: Math.min(Math.max(0, Math.floor(s.correct)), answered) };
  if (s.exam && KNOWN_EXAMS.includes(s.exam)) counts[`sessions_${s.exam}`] = 1;
  return counts;
}
