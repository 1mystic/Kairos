import type { Question } from '../question';

/** Local ability shape (logit scale): theta and its standard error. */
export interface ChapterTheta {
  θ: number;
  rd: number;
}

export interface Answered {
  qid: string;
  correct: boolean;
}

export const DIAG_PRIOR: ChapterTheta = { θ: 0, rd: 1.5 };
export const DIAG_TIME_BUDGET_S = 40 * 60;
export const DIAG_ITEMS_PER_CHAPTER = 2;
const DEFAULT_TIME_S = 90;

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** item difficulty on the logit scale (b, else from p_correct, else 0) */
export function itemB(q: Question): number {
  const d = q.difficulty;
  if (d?.b !== undefined) return d.b;
  if (d?.p_correct !== undefined) {
    const p = Math.min(0.99, Math.max(0.01, d.p_correct));
    return -Math.log(p / (1 - p));
  }
  return 0;
}

/** One-step Laplace (Gaussian posterior) 1PL update. */
export function updateTheta(t: ChapterTheta, b: number, correct: boolean): ChapterTheta {
  const p = sigmoid(t.θ - b);
  const prec = 1 / (t.rd * t.rd) + p * (1 - p);
  return { θ: t.θ + ((correct ? 1 : 0) - p) / prec, rd: 1 / Math.sqrt(prec) };
}

export type DiagnosticNext =
  | { done: false; qid: string; chapter: string; info: number; question: Question }
  | { done: true; reason: 'time' | 'covered' | 'exhausted' };

export interface DiagnosticInput {
  studiedChapters: string[];
  bank: Question[];
  answered: Answered[];
  theta: Record<string, ChapterTheta>;
  timeBudgetS?: number;
  perChapter?: number;
}

/**
 * Next diagnostic item: rotate over studied chapters (fewest answered first, ties by list order),
 * pick the unanswered item with max 1PL information p(1-p) at the chapter's current theta.
 * Stops at the time budget (sum of difficulty.median_time_s, default 90s) or when every chapter has
 * `perChapter` (2) items; chapters with no remaining items are skipped.
 */
export function nextDiagnosticItem(inp: DiagnosticInput): DiagnosticNext {
  const per = inp.perChapter ?? DIAG_ITEMS_PER_CHAPTER;
  const byId = new Map(inp.bank.map((q) => [q.id, q]));
  const seen = new Set(inp.answered.map((a) => a.qid));
  const spent = inp.answered.reduce(
    (t, a) => t + (byId.get(a.qid)?.difficulty?.median_time_s ?? DEFAULT_TIME_S),
    0,
  );
  const budget = inp.timeBudgetS ?? DIAG_TIME_BUDGET_S;
  if (spent >= budget) return { done: true, reason: 'time' };
  const count = (ch: string): number => inp.answered.filter((a) => byId.get(a.qid)?.tax?.chapter === ch).length;
  const order = inp.studiedChapters
    .map((ch, i) => ({ ch, i, n: count(ch) }))
    .filter((c) => c.n < per)
    .sort((a, b) => a.n - b.n || a.i - b.i);
  if (order.length === 0) return { done: true, reason: 'covered' };
  for (const { ch } of order) {
    const t = inp.theta[ch] ?? DIAG_PRIOR;
    let best: { q: Question; info: number } | null = null;
    for (const q of inp.bank) {
      if (q.tax?.chapter !== ch || seen.has(q.id) || q.status === 'quarantined') continue;
      const p = sigmoid(t.θ - itemB(q));
      const info = p * (1 - p);
      if (!best || info > best.info + 1e-12) best = { q, info };
    }
    if (best) return { done: false, qid: best.q.id, chapter: ch, info: best.info, question: best.q };
  }
  return { done: true, reason: 'exhausted' };
}

/** Replay answers through the 1PL update: theta + rd per studied chapter (prior if unanswered). */
export function diagnosticSummary(inp: {
  studiedChapters: string[];
  bank: Question[];
  answered: Answered[];
  prior?: ChapterTheta;
}): Record<string, ChapterTheta & { n: number }> {
  const byId = new Map(inp.bank.map((q) => [q.id, q]));
  const out: Record<string, ChapterTheta & { n: number }> = {};
  for (const ch of inp.studiedChapters) out[ch] = { ...(inp.prior ?? DIAG_PRIOR), n: 0 };
  for (const a of inp.answered) {
    const q = byId.get(a.qid);
    const ch = q?.tax?.chapter;
    if (!q || !ch || !out[ch]) continue;
    const cur = out[ch]!;
    out[ch] = { ...updateTheta(cur, itemB(q), a.correct), n: cur.n + 1 };
  }
  return out;
}
