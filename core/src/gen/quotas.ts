import type { Slot } from '../blueprint';
import { dirichlet, type Rng } from './rng';

export const DEFAULT_CONCENTRATION = 50;
const WEIGHT_FLOOR = 1e-3;

/**
 * Chapter quotas for one subject x section.
 * weights: chapterId -> weight (e.g. 5-yr appearance share). capacity: chapterId -> eligible question count.
 * Draw ~ Dirichlet(concentration * normalised weights), largest-remainder rounding to exactly `count`,
 * then clamp to capacity and redistribute overflow to chapters with spare capacity (biggest deficit first).
 * If total capacity < count the quotas sum to the total capacity.
 */
export function chapterQuotas(opts: {
  count: number;
  weights: Record<string, number>;
  capacity: Record<string, number>;
  rng: Rng;
  concentration?: number;
}): Record<string, number> {
  const chapters = Object.keys(opts.capacity)
    .filter((c) => opts.capacity[c]! > 0)
    .sort();
  const out: Record<string, number> = {};
  for (const c of Object.keys(opts.capacity)) out[c] = 0;
  if (chapters.length === 0 || opts.count <= 0) return out;
  const raw = chapters.map((c) => Math.max(opts.weights[c] ?? 0, 0) + WEIGHT_FLOOR);
  const tot = raw.reduce((a, b) => a + b, 0);
  const alpha = raw.map((w) => ((opts.concentration ?? DEFAULT_CONCENTRATION) * w) / tot);
  const p = dirichlet(alpha, opts.rng);
  const ideal = p.map((x) => x * opts.count);
  const q = ideal.map(Math.floor);
  const left = opts.count - q.reduce((a, b) => a + b, 0);
  const byRem = ideal.map((x, i) => i).sort((i, j) => ideal[j]! - q[j]! - (ideal[i]! - q[i]!) || i - j);
  for (let k = 0; k < left; k++) q[byRem[k % byRem.length]!]!++;
  // clamp to capacity, redistribute
  let excess = 0;
  chapters.forEach((c, i) => {
    const cap = opts.capacity[c]!;
    if (q[i]! > cap) {
      excess += q[i]! - cap;
      q[i] = cap;
    }
  });
  while (excess > 0) {
    let best = -1;
    let bestDef = -Infinity;
    chapters.forEach((c, i) => {
      if (q[i]! < opts.capacity[c]!) {
        const def = ideal[i]! - q[i]!;
        if (def > bestDef) {
          bestDef = def;
          best = i;
        }
      }
    });
    if (best < 0) break;
    q[best]!++;
    excess--;
  }
  chapters.forEach((c, i) => (out[c] = q[i]!));
  return out;
}

export const quotaKey = (subject: string, sectionId: string): string => `${subject}:${sectionId}`;

/** Quotas for every subject x section in a slot list. Keys are `subject:sectionId`. */
export function computeQuotas(opts: {
  slots: Slot[];
  weights: Record<string, number>;
  capacity: (subject: string, sectionId: string) => Record<string, number>;
  rng: Rng;
  concentration?: number;
}): Record<string, Record<string, number>> {
  const counts = new Map<string, { subject: string; sectionId: string; n: number }>();
  for (const s of opts.slots) {
    const k = quotaKey(s.subject, s.sectionId);
    const e = counts.get(k);
    if (e) e.n++;
    else counts.set(k, { subject: s.subject, sectionId: s.sectionId, n: 1 });
  }
  const res: Record<string, Record<string, number>> = {};
  for (const [k, e] of counts) {
    res[k] = chapterQuotas({
      count: e.n,
      weights: opts.weights,
      capacity: opts.capacity(e.subject, e.sectionId),
      rng: opts.rng,
      concentration: opts.concentration,
    });
  }
  return res;
}
