/**
 * Learned recall model (docs/17 Phase C): P(correct | learner state, item) from static JSON weights trained offline
 * (`pipeline/ml`). Pure TypeScript, no server inference (Spark plan). Elo stays the default; this path is used only
 * when a caller passes `model: 'learned'` (the app flag `learnedRecall`).
 *
 * Inputs are closed-form functions of the on-device mastery doc + the item difficulty, mirroring
 * `pipeline/ml/features.py` exactly (a golden test pins the two together).
 */
import { pCorrect } from './elo';
import { cardFromParts, retrievability } from './fsrs';
import type { TopicMastery } from './mastery';
import WEIGHTS_JSON from './learned.weights.json';

const DAY_MS = 86_400_000;

/** Raw learner-state snapshot for one (topic, item) pair, same names as the attempt table / training CSV. */
export interface RecallInput {
  elo_theta: number;
  elo_rd: number;
  elo_n: number;
  /** FSRS retrievability now (1 if never seen) */
  fsrs_r: number;
  /** FSRS stability in days (0 if never seen) */
  fsrs_s: number;
  fsrs_d: number;
  /** behaviour-label errors / n, in [0, 1] */
  err_rate: number;
  /** items on this topic already done in the current session */
  k_in_session: number;
  /** whole days since the topic was last practised, -1 if never */
  days_since_last_topic: number;
  difficulty_b: number;
}

export interface LogRegWeights {
  version: number;
  model: 'logreg';
  features: string[];
  mean: number[];
  scale: number[];
  coef: number[];
  intercept: number;
  seed?: number;
}

export type GbdtNode = { leaf_value: number } | { split_feature: number; threshold: number; left: GbdtNode; right: GbdtNode };

export interface GbdtWeights {
  version: number;
  model: 'gbdt';
  features: string[];
  trees: GbdtNode[];
  seed?: number;
}

export type RecallWeights = LogRegWeights | GbdtWeights;

/** The shipped weights (see learned.weights.json: version, seed, training data hash, held-out metrics). */
export const LEARNED_WEIGHTS = WEIGHTS_JSON as unknown as RecallWeights & { golden?: Array<{ input: RecallInput; p: number }> };

const FEATURE_FNS: Record<string, (x: RecallInput) => number> = {
  x_elo: (x) => x.elo_theta - x.difficulty_b,
  rd: (x) => x.elo_rd,
  log_n: (x) => Math.log1p(x.elo_n),
  r: (x) => x.fsrs_r,
  one_minus_r: (x) => 1 - x.fsrs_r,
  log_days: (x) => Math.log1p(Math.max(x.days_since_last_topic, 0)),
  unseen: (x) => (x.elo_n > 0 ? 0 : 1),
  err: (x) => x.err_rate,
  b: (x) => x.difficulty_b,
  log_k: (x) => Math.log1p(x.k_in_session),
  x_elo_r: (x) => (x.elo_theta - x.difficulty_b) * x.fsrs_r,
  x_elo_rd: (x) => (x.elo_theta - x.difficulty_b) * x.elo_rd,
  log_s: (x) => Math.log1p(x.fsrs_s),
};

export function featureVector(x: RecallInput, names: readonly string[]): number[] {
  return names.map((n) => {
    const f = FEATURE_FNS[n];
    if (!f) throw new Error(`unknown feature ${n}`);
    return f(x);
  });
}

const sig = (z: number): number => 1 / (1 + Math.exp(-z));

function treeValue(node: GbdtNode, v: readonly number[]): number {
  let n = node;
  while (!('leaf_value' in n)) n = (v[n.split_feature] as number) <= n.threshold ? n.left : n.right;
  return n.leaf_value;
}

/** P(correct) from a learned model. Pure. */
export function predictP(x: RecallInput, w: RecallWeights = LEARNED_WEIGHTS): number {
  const v = featureVector(x, w.features);
  if (w.model === 'gbdt') return sig(w.trees.reduce((a, t) => a + treeValue(t, v), 0));
  let z = w.intercept;
  for (let i = 0; i < v.length; i++) z += (w.coef[i] as number) * (((v[i] as number) - (w.mean[i] as number)) / (w.scale[i] as number));
  return sig(z);
}

/** Snapshot from the on-device mastery doc (undefined / n = 0 means never seen). */
export function recallInput(t: TopicMastery | undefined, b: number, now: number, kInSession = 0): RecallInput {
  const seen = t !== undefined && t.n > 0;
  const err = t ? Object.values(t.err_mix).reduce<number>((a, c) => a + (c ?? 0), 0) : 0;
  return {
    elo_theta: t?.θ ?? 0,
    elo_rd: t?.rd ?? 1,
    elo_n: t?.n ?? 0,
    fsrs_r: seen ? retrievability(cardFromParts(t), now) : 1,
    fsrs_s: seen ? t.S : 0,
    fsrs_d: seen ? t.D : 0,
    err_rate: seen ? Math.min(1, err / t.n) : 0,
    k_in_session: kInSession,
    days_since_last_topic: seen && t.last > 0 ? Math.max(0, Math.floor((now - t.last) / DAY_MS)) : -1,
    difficulty_b: b,
  };
}

export type RecallModel = 'elo' | 'learned';

export interface RecallOptions {
  /** default 'elo' (the product default until the study shows the learned model wins) */
  model?: RecallModel;
  weights?: RecallWeights;
  kInSession?: number;
}

/** P(correct) on an item of difficulty b for a topic's mastery state: Elo (default) or the learned model. */
export function predictRecall(t: TopicMastery | undefined, b: number, now: number, opts: RecallOptions = {}): number {
  if ((opts.model ?? 'elo') === 'elo') return pCorrect(t && t.n > 0 ? t.θ : 0, b);
  return predictP(recallInput(t, b, now, opts.kInSession ?? 0), opts.weights ?? LEARNED_WEIGHTS);
}
