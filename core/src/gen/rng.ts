/** Seeded PRNG utilities. Never use Math.random in src: papers must be reproducible. */
export type Rng = () => number;

/** mulberry32: returns floats in [0,1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a decorrelated sub-seed (for redraws / simulation runs). */
export function subSeed(seed: number, k: number): number {
  return mulberry32((seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0)() * 4294967296 >>> 0;
}

/** Fisher-Yates; returns a new array. */
export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** k distinct items without replacement (k clamped to length). */
export function sample<T>(xs: readonly T[], k: number, rng: Rng): T[] {
  return shuffle(xs, rng).slice(0, Math.max(0, Math.min(k, xs.length)));
}

function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Gamma(shape, 1) via Marsaglia-Tsang (with the shape<1 boost). */
export function gamma(shape: number, rng: Rng): number {
  if (shape < 1) return gamma(shape + 1, rng) * Math.pow(Math.max(rng(), 1e-12), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(Math.max(u, 1e-300)) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Dirichlet draw; alphas must be > 0. Result sums to 1. */
export function dirichlet(alpha: readonly number[], rng: Rng): number[] {
  const g = alpha.map((a) => gamma(Math.max(a, 1e-6), rng));
  const s = g.reduce((x, y) => x + y, 0) || 1;
  return g.map((x) => x / s);
}

/** Sample an index with probability proportional to exp(score/temperature). */
export function softmaxSample(scores: readonly number[], temperature: number, rng: Rng): number {
  if (scores.length === 0) throw new Error('softmaxSample: empty scores');
  const t = Math.max(temperature, 1e-9);
  const m = Math.max(...scores);
  const w = scores.map((s) => Math.exp((s - m) / t));
  let r = rng() * w.reduce((x, y) => x + y, 0);
  for (let i = 0; i < w.length; i++) {
    r -= w[i]!;
    if (r <= 0) return i;
  }
  return w.length - 1;
}
