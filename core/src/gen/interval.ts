/**
 * Calibrated score interval (docs/17 Phase F). Split-conformal quantiles of z = (actual - pred) / sd, fitted on
 * simulated mocks by `pipeline/ml/conformal.py` (Mondrian buckets on seen_frac = share of the paper's questions whose
 * topic the student has practised) and shipped as static JSON. Interval = pred + sd * [q_lo, q_hi]. Pure.
 */
import TABLE_JSON from './score_interval.json';

export interface IntervalBucket {
  max_seen_frac: number;
  q_lo: number;
  q_hi: number;
  n: number;
}

export interface IntervalTable {
  version: number;
  level: number;
  models: Record<string, IntervalBucket[]>;
}

export const SCORE_INTERVAL_TABLE = TABLE_JSON as unknown as IntervalTable;

export interface ScoreInterval {
  lo: number;
  hi: number;
  /** nominal coverage, e.g. 0.8 */
  level: number;
}

/** Bucket by seen_frac: first bucket whose upper edge is above the value (the last bucket includes 1). */
function bucketFor(buckets: readonly IntervalBucket[], seenFrac: number): IntervalBucket {
  const s = Math.min(1, Math.max(0, seenFrac));
  for (let i = 0; i < buckets.length - 1; i++) if (s < (buckets[i] as IntervalBucket).max_seen_frac) return buckets[i] as IntervalBucket;
  return buckets[buckets.length - 1] as IntervalBucket;
}

export function scoreInterval(pred: number, sd: number, seenFrac: number, model: 'elo' | 'learned' = 'elo', table: IntervalTable = SCORE_INTERVAL_TABLE): ScoreInterval {
  const buckets = table.models[model];
  if (!buckets || buckets.length === 0) throw new Error(`no interval table for ${model}`);
  const b = bucketFor(buckets, seenFrac);
  return { lo: pred + sd * b.q_lo, hi: pred + sd * b.q_hi, level: table.level };
}

/** Expected marks and Bernoulli sd of a paper: per question P(correct) and its marks (attempted questions only). */
export function paperMoments(items: ReadonlyArray<{ p: number; correct: number; wrong: number }>): { mean: number; sd: number } {
  let mean = 0;
  let v = 0;
  for (const { p, correct, wrong } of items) {
    mean += correct * p + wrong * (1 - p);
    v += (correct - wrong) ** 2 * p * (1 - p);
  }
  return { mean, sd: Math.sqrt(v) };
}
