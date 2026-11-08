import type { Blueprint, Marks } from './blueprint';
import { flattenSlots } from './blueprint';
import { isScored, type PaletteStatus } from './cbt/palette';
import type { Question, Response } from './question';

export type Verdict = 'correct' | 'wrong' | 'partial' | 'blank';

export interface MsqResult {
  verdict: 'correct' | 'wrong' | 'partial';
  /** marks awarded for a 'partial' verdict (ignored otherwise) */
  marks?: number;
}
/** Decides MSQ outcome from chosen (non-empty) and correct option keys. */
export type MsqScorer = (chosen: string[], correct: string[]) => MsqResult;

/** Default: exact match or nothing. */
export const allOrNothing: MsqScorer = (chosen, correct) => ({
  verdict: setEq(chosen, correct) ? 'correct' : 'wrong',
});

/** JEE-Advanced style: any wrong option => wrong; otherwise +1 per correct option chosen. */
export const jeeAdvancedPartial: MsqScorer = (chosen, correct) => {
  const c = new Set(correct);
  if (chosen.some((k) => !c.has(k))) return { verdict: 'wrong' };
  if (chosen.length === correct.length) return { verdict: 'correct' };
  return { verdict: 'partial', marks: chosen.length };
};

export interface EvalOptions {
  msq?: MsqScorer;
}
export interface Evaluation {
  verdict: Verdict;
  partialMarks: number;
}

function setEq(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

const EPS = 1e-9;

export function evaluateDetailed(
  q: Question,
  response: Response | null | undefined,
  opts: EvalOptions = {},
): Evaluation {
  const blank: Evaluation = { verdict: 'blank', partialMarks: 0 };
  if (!response) return blank;
  const a = q.answer;
  if (!a) throw new Error(`question ${q.id} has no answer; cannot evaluate`);
  const out = (verdict: Verdict, partialMarks = 0): Evaluation => ({ verdict, partialMarks });

  if ('keys' in a) {
    if (!('keys' in response) || response.keys.length === 0) {
      return 'value' in response ? out('wrong') : blank;
    }
    if (q.type === 'MSQ') {
      const r = (opts.msq ?? allOrNothing)(response.keys, a.keys);
      return out(r.verdict, r.verdict === 'partial' ? (r.marks ?? 0) : 0);
    }
    return out(setEq(response.keys, a.keys) ? 'correct' : 'wrong');
  }

  // numeric answer
  if (!('value' in response)) return response.keys.length === 0 ? blank : out('wrong');
  const raw = response.value;
  if (typeof raw === 'string' && raw.trim() === '') return blank;
  const x = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(x)) return out('wrong');
  if ('range' in a) {
    return out(x >= a.range[0] - EPS && x <= a.range[1] + EPS ? 'correct' : 'wrong');
  }
  const tol = q.type === 'INT' ? 0 : (a.tol ?? 0);
  return out(Math.abs(x - a.value) <= tol + EPS ? 'correct' : 'wrong');
}

export function evaluateResponse(
  q: Question,
  response: Response | null | undefined,
  opts: EvalOptions = {},
): Verdict {
  return evaluateDetailed(q, response, opts).verdict;
}

// ---- paper scoring ----

export interface PaperResponse {
  answer: Response | null;
  /** palette status at submit; only answered / answered_marked count */
  status: PaletteStatus;
}

export interface Tally {
  marks: number;
  correct: number;
  wrong: number;
  blank: number;
  partial: number;
}

export interface PaperScore extends Tally {
  max: number;
  bySubject: Record<string, Tally>;
  bySection: Record<string, Tally>;
}

const emptyTally = (): Tally => ({ marks: 0, correct: 0, wrong: 0, blank: 0, partial: 0 });

function award(marks: Marks, e: Evaluation): number {
  switch (e.verdict) {
    case 'correct':
      return marks.correct;
    case 'wrong':
      return marks.wrong;
    case 'partial':
      return e.partialMarks;
    case 'blank':
      return marks.blank;
  }
}

/** Key for `bySection`. */
export const sectionKey = (subject: string, sectionId: string) => `${subject}.${sectionId}`;

/**
 * Score a paper. `questions[i]` and `responses[i]` correspond to `flattenSlots(blueprint)[i]`.
 * A missing question or a response whose status is not scored counts as blank.
 */
export function scorePaper(
  blueprint: Blueprint,
  questions: (Question | undefined)[],
  responses: (PaperResponse | null | undefined)[],
  opts: EvalOptions = {},
): PaperScore {
  const slots = flattenSlots(blueprint);
  const total: Tally = emptyTally();
  const bySubject: Record<string, Tally> = {};
  const bySection: Record<string, Tally> = {};
  let max = 0;
  for (const slot of slots) {
    max += slot.marks.correct;
    const subj = (bySubject[slot.subject] ??= emptyTally());
    const sec = (bySection[sectionKey(slot.subject, slot.sectionId)] ??= emptyTally());
    const q = questions[slot.index];
    const r = responses[slot.index];
    const e: Evaluation =
      q && r && isScored(r.status)
        ? evaluateDetailed(q, r.answer, opts)
        : { verdict: 'blank', partialMarks: 0 };
    const m = award(slot.marks, e);
    for (const t of [total, subj, sec]) {
      t.marks += m;
      t[e.verdict]++;
    }
  }
  return { ...total, max, bySubject, bySection };
}
