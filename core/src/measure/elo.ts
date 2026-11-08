/** 5.1 ability: 1PL online (elo) per user x topic, with a glicko-style rd. */

export interface EloOptions {
  /** base learning rate */
  k0?: number;
  /** rd of a never-seen topic */
  rdInit?: number;
  /** floor rd can shrink to */
  rdFloor?: number;
  /** ceiling rd can grow back to */
  rdMax?: number;
  /** multiplicative rd shrink per observation */
  rdDecay?: number;
  /** rd growth constant per sqrt(day) */
  c?: number;
}

export const ELO_DEFAULTS = {
  k0: 0.4,
  rdInit: 1.0,
  rdFloor: 0.15,
  rdMax: 1.0,
  rdDecay: 0.97,
  c: 0.05,
} as const;

const DAY_MS = 86_400_000;

export interface EloState {
  theta: number;
  rd: number;
  /** observations so far */
  n: number;
  /** epoch ms of last observation, 0 = never */
  last: number;
}

export type ConfidenceLabel = 'not_enough_data' | 'rough' | 'confident';

export function newElo(opts: EloOptions = {}): EloState {
  return { theta: 0, rd: opts.rdInit ?? ELO_DEFAULTS.rdInit, n: 0, last: 0 };
}

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** P(correct) for ability theta on an item of difficulty b. */
export function pCorrect(theta: number, b: number): number {
  return sigmoid(theta - b);
}

/** Item difficulty b implied by a population p_correct (for a theta=0 learner). */
export function bFromPCorrect(p: number): number {
  const c = Math.min(0.99, Math.max(0.01, p));
  return Math.log((1 - c) / c);
}

/** mastery m_T = P(correct) on a medium exam-level item. */
export function masteryProb(theta: number, bMedium = 0): number {
  return pCorrect(theta, bMedium);
}

/** Grow rd with time since last seen. */
export function inflateRd(rd: number, last: number, now: number, opts: EloOptions = {}): number {
  if (!last || now <= last) return rd;
  const c = opts.c ?? ELO_DEFAULTS.c;
  const max = opts.rdMax ?? ELO_DEFAULTS.rdMax;
  const days = (now - last) / DAY_MS;
  return Math.min(max, Math.sqrt(rd * rd + c * c * days));
}

/** One observation. r in [0,1] (partial credit allowed). Pure. */
export function updateElo(
  s: EloState,
  b: number,
  r: number,
  now: number,
  opts: EloOptions = {},
): EloState {
  const k0 = opts.k0 ?? ELO_DEFAULTS.k0;
  const floor = opts.rdFloor ?? ELO_DEFAULTS.rdFloor;
  const decay = opts.rdDecay ?? ELO_DEFAULTS.rdDecay;
  const rr = Math.min(1, Math.max(0, r));
  const rdNow = inflateRd(s.rd, s.last, now, opts);
  const k = k0 / (1 + s.n / 20);
  const theta = s.theta + k * (rr - pCorrect(s.theta, b));
  return {
    theta,
    rd: Math.max(floor, rdNow * decay),
    n: s.n + 1,
    last: Math.max(s.last, now),
  };
}

export function confidenceLabel(rd: number): ConfidenceLabel {
  if (rd > 0.6) return 'not_enough_data';
  if (rd > 0.3) return 'rough';
  return 'confident';
}

export interface AggItem {
  id: string;
  theta: number;
  rd: number;
  n: number;
}

export interface AggOptions {
  /** shrinkage strength */
  k?: number;
  /** parent mean; defaults to the n-weighted mean of the items (0 if none observed) */
  parentTheta?: number;
  /** rd used for items with no data */
  rdPrior?: number;
}

export interface Aggregate {
  theta: number;
  rd: number;
  n: number;
  label: ConfidenceLabel;
}

/** Weight-averaged theta of topics, each shrunk toward the parent mean when n is small. */
export function aggregate(
  items: AggItem[],
  weights: Record<string, number> = {},
  opts: AggOptions = {},
): Aggregate {
  const k = opts.k ?? 5;
  const rdPrior = opts.rdPrior ?? ELO_DEFAULTS.rdInit;
  if (items.length === 0) return { theta: 0, rd: rdPrior, n: 0, label: confidenceLabel(rdPrior) };
  const totalN = items.reduce((a, i) => a + i.n, 0);
  const parent =
    opts.parentTheta ??
    (totalN > 0 ? items.reduce((a, i) => a + i.n * i.theta, 0) / totalN : 0);
  let ws = items.map((i) => Math.max(0, weights[i.id] ?? 1));
  let sum = ws.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    ws = items.map(() => 1);
    sum = items.length;
  }
  let theta = 0;
  let varSum = 0;
  items.forEach((it, idx) => {
    const w = ws[idx]! / sum;
    const shrunk = (it.n * it.theta + k * parent) / (it.n + k);
    const rd = it.n === 0 ? rdPrior : it.rd;
    theta += w * shrunk;
    varSum += w * w * rd * rd;
  });
  const rd = Math.sqrt(varSum);
  return { theta, rd, n: totalN, label: confidenceLabel(rd) };
}
