import { confidenceLabel, masteryByChapter, maxMarks, predictScore, type Blueprint, type MasteryDoc, type Question, type ScoreBand } from '@kairos/core';
import { topicMeta, type Taxonomy } from '../practice/taxonomy';

export type PredictConfidence = 'not_enough_data' | 'rough' | 'confident';

export const PREDICT_KEY = 'kairos-predicted';
export const MIN_TOPICS = 10;
export const MIN_ATTEMPTS = 40;
export const SIMS_DESKTOP = 500;
export const SIMS_MOBILE = 300;

/** Fractions of the paper's maximum marks used for the target line (rough, VERIFY against real cut-offs). */
export const AMBITION_FRACTION = { comfortable: 0.4, competitive: 0.6, top: 0.8 } as const;

export function targetFor(ambition: string | undefined, max: number): number | undefined {
  const f = AMBITION_FRACTION[ambition as keyof typeof AMBITION_FRACTION];
  return f === undefined ? undefined : Math.round(f * max);
}

export interface DataStats {
  topics: number;
  attempts: number;
  avgRd: number;
}

/** Topics with at least 2 attempts count as "attempted": one answer says almost nothing. */
export function dataStats(doc: MasteryDoc | null | undefined): DataStats {
  const ts = Object.values(doc ?? {}).filter((t) => t.n >= 2);
  const attempts = Object.values(doc ?? {}).reduce((s, t) => s + t.n, 0);
  return { topics: ts.length, attempts, avgRd: ts.length ? ts.reduce((s, t) => s + t.rd, 0) / ts.length : 1 };
}

/**
 * Not enough data: fewer than MIN_TOPICS (10) topics with 2+ attempts, or fewer than MIN_ATTEMPTS (40)
 * attempts overall. Past that gate the band is 'rough', and 'confident' only when the mean rd of the
 * attempted topics reaches core's confident level (rd <= 0.3).
 */
export function confidenceOf(doc: MasteryDoc | null | undefined): PredictConfidence {
  const s = dataStats(doc);
  if (s.topics < MIN_TOPICS || s.attempts < MIN_ATTEMPTS) return 'not_enough_data';
  return confidenceLabel(s.avgRd) === 'confident' ? 'confident' : 'rough';
}

/**
 * Theta lookup for core predictScore (key = topics[0] ?? chapter ?? subject): the topic's own theta when
 * it has data, else its chapter aggregate, else its subject's, else 0 (an average student).
 * Returned as a plain table so it can be sent to a worker.
 */
export function thetaTable(doc: MasteryDoc, tax: Taxonomy | null, bank: Question[]): Record<string, number> {
  const meta = tax ? topicMeta(tax) : {};
  const chapters = tax ? masteryByChapter(doc, meta) : {};
  const subj: Record<string, { s: number; n: number }> = {};
  for (const [ch, a] of Object.entries(chapters)) {
    if (a.n === 0) continue;
    const sub = Object.values(meta).find((m) => m.chapter === ch)?.subject;
    if (sub) {
      const e = (subj[sub] ??= { s: 0, n: 0 });
      e.s += a.theta * a.n;
      e.n += a.n;
    }
  }
  const out: Record<string, number> = {};
  for (const q of bank) {
    const key = q.tax?.topics?.[0] ?? q.tax?.chapter ?? q.tax?.subject ?? '';
    if (key in out) continue;
    const own = doc[key];
    const m = meta[key];
    const ch = m ? chapters[m.chapter] : undefined;
    const sb = m ? subj[m.subject] : undefined;
    out[key] = own && own.n > 0 ? own.θ : ch && ch.n > 0 ? ch.theta : sb ? sb.s / sb.n : 0;
  }
  return out;
}

export interface PredictInput {
  blueprint: Blueprint;
  bank: Question[];
  table: Record<string, number>;
  weights: Record<string, number>;
  sims: number;
  seed: number;
}

export function runPredict(i: PredictInput): ScoreBand {
  return predictScore({ blueprint: i.blueprint, bank: i.bank, weights: i.weights, sims: i.sims, seed: i.seed, theta: (k) => i.table[k] ?? 0 });
}

export const maxOf = (bp: Blueprint): number => maxMarks(bp);

// ---------------------------------------------------------------- cache

export interface PredictedCache {
  v: 1;
  /** local YYYY-MM-DD of the computation */
  date: string;
  exam: string;
  blueprintId: string;
  band: ScoreBand;
  confidence: PredictConfidence;
  max: number;
  topics: number;
  attempts: number;
  updatedAt: number;
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export function readCache(kv: KV): PredictedCache | null {
  try {
    const c = JSON.parse(kv.getItem(PREDICT_KEY) ?? 'null') as PredictedCache | null;
    return c && c.v === 1 && c.band ? c : null;
  } catch {
    return null;
  }
}
export function writeCache(kv: KV, c: PredictedCache): void {
  try {
    kv.setItem(PREDICT_KEY, JSON.stringify(c));
  } catch {
    /* private mode: recompute next time */
  }
}

/** Reuse today's result unless the exam changed or mastery moved materially (>= 15% or 10 attempts, or 3 topics). */
export function cacheFresh(c: PredictedCache | null, today: string, exam: string, stats: DataStats): c is PredictedCache {
  if (!c || c.date !== today || c.exam !== exam) return false;
  if (Math.abs(stats.attempts - c.attempts) >= Math.max(10, 0.15 * c.attempts)) return false;
  if (Math.abs(stats.topics - c.topics) >= 3) return false;
  return true;
}
