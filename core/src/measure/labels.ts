/** 5.3 behaviour labels from per-question attempt facts and the event stream. */
import type { KairosEvent } from '../cbt/palette';
import type { Question, Response } from '../question';
import { evaluateDetailed, type MsqScorer } from '../scoring';
import { bFromPCorrect } from './elo';

export const BEHAVIOUR_LABELS = [
  'guess_careless',
  'concept_gap',
  'fluency',
  'overthinking',
  'silly_mistake',
  'strategy',
  'time_sink',
] as const;
export type BehaviourLabel = (typeof BEHAVIOUR_LABELS)[number];

export interface AttemptFacts {
  correct: boolean;
  timeMs: number;
  medianTimeMs: number;
  /** population P(correct) of the item */
  pCorrect: number;
  changedCorrectToWrong: boolean;
  skipped: boolean;
  /** time-sink threshold for this item (ms); default TIME_SINK_MS. Set from per-topic time norms (median + 3 x 1.4826 x MAD). */
  timeSinkMs?: number;
}

export interface Attempt extends AttemptFacts {
  q: string;
  /** score in [0,1], partial credit allowed */
  r: number;
  /** item difficulty b */
  b: number;
  /** 1-tap reason chosen by the student */
  reason?: BehaviourLabel;
}

export interface LabelOptions {
  /** 'override': the student's reason replaces derived labels; 'add': it is added */
  reasonMode?: 'override' | 'add';
}

export const TIME_SINK_MS = 180_000;

export function behaviourLabels(
  f: AttemptFacts & { reason?: BehaviourLabel },
  opts: LabelOptions = {},
): BehaviourLabel[] {
  const out: BehaviourLabel[] = [];
  const m = f.medianTimeMs;
  const easy = f.pCorrect > 0.75;
  if (f.skipped) {
    if (easy) out.push('strategy');
  } else {
    if (!f.correct && f.timeMs < 0.4 * m) out.push('guess_careless');
    if (!f.correct && f.timeMs > 1.5 * m) out.push('concept_gap');
    if (f.correct && f.timeMs > 2 * m) out.push('fluency');
    if (f.changedCorrectToWrong) out.push('overthinking');
    if (!f.correct && easy) out.push('silly_mistake');
    if (!f.correct && f.timeMs > (f.timeSinkMs ?? TIME_SINK_MS)) out.push('time_sink');
  }
  if (f.reason) {
    if ((opts.reasonMode ?? 'override') === 'override') return [f.reason];
    if (!out.includes(f.reason)) out.push(f.reason);
  }
  return out;
}

export interface AttemptsOptions {
  /** median time when the item has none, ms */
  defaultMedianMs?: number;
  /** 1-tap reasons by question id */
  reasons?: Record<string, BehaviourLabel>;
  /** MSQ scorer (default all-or-nothing); pass jeeAdvancedPartial for partial credit */
  msq?: MsqScorer;
  /** per-topic solve-time norms (pipeline/ml/irt_job.py time_norms.json); replace the fixed TIME_SINK_MS when n is large enough */
  timeNorms?: TimeNorms;
}

/** topic -> [median_ms, mad_ms (raw), n] */
export type TimeNorms = Record<string, [number, number, number]>;
/** norms with fewer attempts than this are ignored */
export const TIME_NORM_MIN_N = 30;

/** Time-sink threshold for a topic: median + 3 x 1.4826 x MAD (robust 3 sigma), never below 60 s; TIME_SINK_MS without a usable norm. */
export function timeSinkThreshold(norms: TimeNorms | undefined, topic: string | undefined): number {
  const t = topic !== undefined ? norms?.[topic] : undefined;
  if (!t || t[2] < TIME_NORM_MIN_N) return TIME_SINK_MS;
  return Math.max(60_000, t[0] + 3 * 1.4826 * t[1]);
}

const DEFAULT_MEDIAN_MS = 120_000;

function parseResponse(v: string, q: Question): Response {
  const a = q.answer;
  if (a && 'keys' in a) return { keys: v === '' ? [] : v.split(',') };
  return { value: v };
}

/**
 * Rebuild attempts from the event stream. Time = sum of visit..leave (or ..submit) spans;
 * final answer = last save since the last clear; "changed correct->wrong" = some earlier
 * select/save was correct but the final saved answer is wrong. Questions never visited
 * are omitted; questions without an answer key are omitted too.
 */
export function attemptsFromEvents(
  events: KairosEvent[],
  questions: Question[],
  opts: AttemptsOptions = {},
): Attempt[] {
  const msqOpt = opts.msq ? { msq: opts.msq } : {};
  const byId = new Map(questions.map((q) => [q.id, q]));
  const sorted = [...events].sort((a, b) => a.t - b.t);
  interface Acc {
    time: number;
    open: number | null;
    seen: boolean;
    final: string | null;
    wasCorrect: boolean;
  }
  const acc = new Map<string, Acc>();
  const order: string[] = [];
  const get = (id: string): Acc => {
    let a = acc.get(id);
    if (!a) {
      a = { time: 0, open: null, seen: false, final: null, wasCorrect: false };
      acc.set(id, a);
      order.push(id);
    }
    return a;
  };
  const isCorrect = (q: Question, v: string): boolean => {
    try {
      return evaluateDetailed(q, parseResponse(v, q), msqOpt).verdict === 'correct';
    } catch {
      return false;
    }
  };
  const close = (a: Acc, t: number) => {
    if (a.open !== null) {
      a.time += Math.max(0, t - a.open);
      a.open = null;
    }
  };
  for (const e of sorted) {
    const q = byId.get(e.q);
    if (!q) continue;
    const a = get(e.q);
    switch (e.a) {
      case 'visit':
        a.seen = true;
        if (a.open === null) a.open = e.t;
        break;
      case 'leave':
      case 'submit':
        a.seen = true;
        close(a, e.t);
        break;
      case 'select':
      case 'save':
        a.seen = true;
        if (e.v !== undefined && isCorrect(q, e.v)) a.wasCorrect = true;
        if (e.a === 'save') a.final = e.v ?? null;
        break;
      case 'clear':
        a.final = null;
        break;
      default:
        break;
    }
  }
  const last = sorted.length ? sorted[sorted.length - 1]!.t : 0;
  const defMedian = opts.defaultMedianMs ?? DEFAULT_MEDIAN_MS;
  const out: Attempt[] = [];
  for (const id of order) {
    const a = acc.get(id)!;
    const q = byId.get(id)!;
    if (!a.seen || !q.answer) continue;
    close(a, last);
    const ev = a.final === null ? null : evaluateDetailed(q, parseResponse(a.final, q), msqOpt);
    const skipped = ev === null || ev.verdict === 'blank';
    const correct = ev?.verdict === 'correct';
    const r = correct ? 1 : ev?.verdict === 'partial' ? partialR(q, ev.partialMarks) : 0;
    const d = q.difficulty;
    const pCorrect = d?.p_correct ?? (d?.b !== undefined ? 1 / (1 + Math.exp(d.b)) : 0.5);
    const att: Attempt = {
      q: id,
      correct,
      r,
      b: d?.b ?? bFromPCorrect(pCorrect),
      timeMs: a.time,
      medianTimeMs: d?.median_time_s !== undefined ? d.median_time_s * 1000 : defMedian,
      pCorrect,
      changedCorrectToWrong: a.wasCorrect && !skipped && !correct,
      skipped,
    };
    if (opts.timeNorms) att.timeSinkMs = timeSinkThreshold(opts.timeNorms, q.tax?.topics?.[0] ?? q.tax?.chapter);
    const reason = opts.reasons?.[id];
    if (reason) att.reason = reason;
    out.push(att);
  }
  return out;
}

/** Partial credit as a fraction of the number of correct keys (JEE adv. MSQ). */
function partialR(q: Question, marks: number): number {
  const a = q.answer;
  if (a && 'keys' in a && a.keys.length > 0) return Math.min(1, Math.max(0, marks / a.keys.length));
  return 0.5;
}
