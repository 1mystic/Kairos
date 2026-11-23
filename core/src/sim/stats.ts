/** Study statistics: seeded bootstrap CIs (stratified by seed) and paired differences between policies. */
import { hashSeed, mulberry32 } from './rng';
import { METRICS, mean, type MetricName, type SimResult } from './harness';

export interface CI {
  mean: number;
  ci95: [number, number];
}

export interface PairedCI extends CI {
  /** share of bootstrap replicates with a mean difference <= 0 (one-sided, H1: a > b) */
  pBoot: number;
  /** seeds whose own mean difference is > 0 */
  positiveSeeds: number;
  seeds: number;
}

const q = (sorted: readonly number[], p: number): number => {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (i - lo);
};

/**
 * Percentile bootstrap of the mean, resampling within each stratum (one stratum per seed) so every replicate keeps the
 * seed mix. `strata` are arrays of values; the statistic is the mean over all pooled values.
 */
export function bootstrapMean(strata: readonly (readonly number[])[], B = 2000, seed = 1): CI & { reps: number[] } {
  const rng = mulberry32(hashSeed('boot', seed));
  const all = strata.flat();
  const reps: number[] = [];
  for (let b = 0; b < B; b++) {
    let s = 0;
    let n = 0;
    for (const xs of strata) {
      for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rng() * xs.length)] as number;
      n += xs.length;
    }
    reps.push(s / Math.max(1, n));
  }
  const sorted = [...reps].sort((a, b) => a - b);
  return { mean: mean(all), ci95: reps.length ? [q(sorted, 0.025), q(sorted, 0.975)] : [NaN, NaN], reps };
}

export function pairedBootstrap(a: readonly (readonly number[])[], b: readonly (readonly number[])[], B = 2000, seed = 1): PairedCI {
  const d = a.map((xs, s) => xs.map((x, i) => x - ((b[s] as readonly number[])[i] as number)));
  const r = bootstrapMean(d, B, seed);
  return {
    mean: r.mean,
    ci95: r.ci95,
    pBoot: r.reps.filter((x) => x <= 0).length / Math.max(1, r.reps.length),
    positiveSeeds: d.filter((xs) => mean(xs) > 0).length,
    seeds: d.length,
  };
}

export interface StudySummary {
  policies: string[];
  seeds: number[];
  studentsPerSeed: number;
  /** policy -> metric -> mean and 95% CI */
  metrics: Record<string, Record<MetricName, CI>>;
  /** baseline -> policy -> metric -> paired difference (policy - baseline) */
  paired: Record<string, Record<string, Record<MetricName, PairedCI>>>;
  /** seed -> policy -> mean gain */
  perSeedGain: Record<string, Record<string, number>>;
}

const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;
const roundCI = <T extends CI>(c: T): T => ({ ...c, mean: r4(c.mean), ci95: [r4(c.ci95[0]), r4(c.ci95[1])] });

/** Summarise one SimResult per seed (same students and policies in each). */
export function summarizeStudy(bySeed: ReadonlyArray<{ seed: number; result: SimResult }>, baselines: readonly string[], B = 2000): StudySummary {
  const policies = bySeed[0]?.result.policies ?? [];
  const col = (p: string, m: MetricName): number[][] => bySeed.map(({ result }) => result.metrics[p]?.[m] ?? []);
  const metrics: StudySummary['metrics'] = {};
  for (const p of policies) {
    metrics[p] = Object.fromEntries(
      METRICS.map((m) => {
        const r = bootstrapMean(col(p, m), B, hashSeed(p, m));
        return [m, roundCI({ mean: r.mean, ci95: r.ci95 })];
      }),
    ) as Record<MetricName, CI>;
  }
  const paired: StudySummary['paired'] = {};
  for (const base of baselines) {
    if (!policies.includes(base)) continue;
    const out: Record<string, Record<MetricName, PairedCI>> = {};
    for (const p of policies) {
      if (p === base) continue;
      out[p] = Object.fromEntries(METRICS.map((m) => [m, roundCI(pairedBootstrap(col(p, m), col(base, m), B, hashSeed(p, base, m)))])) as Record<MetricName, PairedCI>;
    }
    paired[base] = out;
  }
  const perSeedGain: StudySummary['perSeedGain'] = {};
  for (const { seed, result } of bySeed) perSeedGain[String(seed)] = Object.fromEntries(policies.map((p) => [p, r4(mean(result.gains[p] ?? []))]));
  return { policies, seeds: bySeed.map((x) => x.seed), studentsPerSeed: bySeed[0]?.result.gains[policies[0] ?? '']?.length ?? 0, metrics, paired, perSeedGain };
}
