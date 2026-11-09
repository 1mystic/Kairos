/** Shared plumbing for the mock-report maths. Pure: no React, no store. */
import { evaluateDetailed, type PublicQuestion, type Question, type Response, type Verdict } from '@kairos/core';
import { readAnalysis, type MockAnalysis } from '../../cbt/model';
import type { MockDoc } from '../../store';

export type QLike = Question | PublicQuestion;
/** Questions of the paper by id. Public questions (no answer key) are fine: difficulty and taxonomy are all most maths needs. */
export type QMap = ReadonlyMap<string, QLike>;

/** Same fallback core uses in `attemptsFromEvents` when an item has no median time. */
export const DEFAULT_MEDIAN_MS = 120_000;
/** p(correct) above this is an "easy" question (docs/05 5.3). */
export const EASY_P = 0.75;
export const SUBJECT_NAME: Record<string, string> = {
  PHY: 'Physics', CHE: 'Chemistry', MAT: 'Mathematics', BOT: 'Botany', ZOO: 'Zoology', BIO: 'Biology',
  GA: 'General Aptitude', PRS: 'Probability & Statistics', LA: 'Linear Algebra', CO: 'Calculus & Optimization', PDS: 'Programming', DBW: 'Database & Warehousing', ML: 'Machine Learning', AI: 'Artificial Intelligence',
};
export const subjectName = (c: string) => SUBJECT_NAME[c] ?? c;

export const round1 = (x: number) => Math.round(x * 10) / 10;
export const round2 = (x: number) => Math.round(x * 100) / 100;
export const marksText = (x: number) => (Number.isInteger(round1(x)) ? String(round1(x)) : round1(x).toFixed(1));

export interface TimelineEvent { t: number; q: string; a: string; v?: string }

/** One graded question of a mock with everything the analyses need. */
export interface Row {
  qid: string;
  subject: string;
  sectionId: string;
  chapter?: string;
  verdict?: Verdict;
  marks: number;
  /** marks for a correct answer in this question's section */
  maxMarks: number;
  timeMs: number;
  /** palette status was not `not_visited` */
  visited: boolean;
  pCorrect: number | null;
  medianMs: number | null;
}

export interface MockRows {
  analysis: MockAnalysis;
  rows: Row[];
  /** every row carries a verdict (the paper was graded) */
  graded: boolean;
}

export function pCorrectOf(q: QLike | undefined): number | null {
  const d = q?.difficulty;
  if (!d) return null;
  if (d.p_correct !== undefined) return d.p_correct;
  if (d.b !== undefined) return 1 / (1 + Math.exp(d.b));
  return null;
}

export function timelineOf(mock: MockDoc): TimelineEvent[] {
  const t = mock.timeline;
  return Array.isArray(t) ? ([...t] as TimelineEvent[]).filter((e) => e && typeof e.t === 'number').sort((a, b) => a.t - b.t) : [];
}

/** Rows of a stored mock, or null when the doc has no v1 analysis. */
export function rowsOf(mock: MockDoc, questions?: QMap): MockRows | null {
  const analysis = readAnalysis(mock);
  if (!analysis) return null;
  const perSection = new Map<string, number>();
  for (const q of analysis.questions) {
    const k = `${q.subject}.${q.sectionId}`;
    perSection.set(k, (perSection.get(k) ?? 0) + 1);
  }
  const rows: Row[] = analysis.questions.map((o) => {
    const k = `${o.subject}.${o.sectionId}`;
    const q = questions?.get(o.qid);
    const med = q?.difficulty?.median_time_s;
    const row: Row = {
      qid: o.qid,
      subject: o.subject,
      sectionId: o.sectionId,
      marks: o.marks ?? 0,
      maxMarks: (analysis.maxBySection[k] ?? 0) / (perSection.get(k) ?? 1),
      timeMs: o.timeMs,
      visited: o.status !== 'not_visited',
      pCorrect: pCorrectOf(q),
      medianMs: med !== undefined ? med * 1000 : null,
    };
    if (o.verdict) row.verdict = o.verdict;
    const ch = q?.tax?.chapter;
    if (ch) row.chapter = ch;
    return row;
  });
  return { analysis, rows, graded: !analysis.pending && rows.length > 0 && rows.every((r) => r.verdict !== undefined) };
}

export function attemptedRow(r: Row): boolean {
  return r.verdict === 'correct' || r.verdict === 'wrong' || r.verdict === 'partial';
}

function toResponse(q: Question, v: string): Response {
  const a = q.answer;
  if (a && 'keys' in a) return { keys: v === '' ? [] : v.split(',') };
  return { value: v };
}

/** Is this value a correct answer to the question? False when the key is not available. */
export function valueIsCorrect(q: QLike | undefined, v: string): boolean | null {
  if (!q || !('answer' in q) || !q.answer) return null;
  try {
    return evaluateDetailed(q as Question, toResponse(q as Question, v)).verdict === 'correct';
  } catch {
    return null;
  }
}

/** Last save time (ms since start) of each question that ended with a saved answer. */
export function lastSaveTimes(events: readonly TimelineEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) {
    if (e.a === 'save') out.set(e.q, e.t);
    else if (e.a === 'clear') out.delete(e.q);
  }
  return out;
}

/** Per-question visit..leave spans, closing the open one at `endT`. Same rule as `timePerQuestion` in cbt/model. */
export function visitSpans(events: readonly TimelineEvent[], endT: number): { q: string; from: number; to: number }[] {
  const spans: { q: string; from: number; to: number }[] = [];
  let open: string | null = null;
  let since = 0;
  for (const e of events) {
    if (e.a === 'visit') {
      open = e.q;
      since = e.t;
    } else if (e.a === 'leave' && open === e.q) {
      spans.push({ q: e.q, from: since, to: Math.max(since, e.t) });
      open = null;
    }
  }
  if (open) spans.push({ q: open, from: since, to: Math.max(since, endT) });
  return spans;
}

/** Questions whose last unsaved selection was never saved (discarded by navigating away). */
export function unsavedSelections(events: readonly TimelineEvent[]): Map<string, string> {
  const draft = new Map<string, string>();
  const saved = new Map<string, string>();
  for (const e of events) {
    if (e.a === 'select' && e.v !== undefined) draft.set(e.q, e.v);
    else if (e.a === 'save') {
      if (e.v !== undefined) saved.set(e.q, e.v);
      draft.delete(e.q);
    } else if (e.a === 'clear') {
      draft.delete(e.q);
      saved.delete(e.q);
    }
  }
  const out = new Map<string, string>();
  for (const [q, v] of draft) if (v !== '' && v !== saved.get(q)) out.set(q, v);
  return out;
}
