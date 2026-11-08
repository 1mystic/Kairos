/** Seeded PRNG helpers (no dependency on other modules). */

/** mulberry32: small, fast, deterministic. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string/number hash to a 32-bit seed. */
export function hashSeed(...parts: Array<string | number>): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** Standard normal via Box-Muller. */
export function normal(rng: Rng): number {
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Standard Gumbel (for Gumbel-top-k sampling without replacement). */
export function gumbel(rng: Rng): number {
  return -Math.log(-Math.log(Math.max(1e-12, Math.min(1 - 1e-12, rng()))));
}
