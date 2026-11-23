import { describe, expect, it } from 'vitest';
import { bootstrapMean, pairedBootstrap, summarizeStudy } from './stats';
import { runSim } from './harness';
import { randomPolicy, weakestFirstPolicy } from './policies';

describe('bootstrap statistics', () => {
  it('bootstrapMean: deterministic, CI brackets the mean and shrinks with n', () => {
    const xs = Array.from({ length: 400 }, (_, i) => (i % 10) - 4.5);
    const a = bootstrapMean([xs], 500, 3);
    expect(bootstrapMean([xs], 500, 3).ci95).toEqual(a.ci95);
    expect(a.mean).toBeCloseTo(0, 9);
    expect(a.ci95[0]).toBeLessThan(0);
    expect(a.ci95[1]).toBeGreaterThan(0);
    const small = bootstrapMean([xs.slice(0, 40)], 500, 3);
    expect(small.ci95[1] - small.ci95[0]).toBeGreaterThan(a.ci95[1] - a.ci95[0]);
    expect(bootstrapMean([[1, 2], [3, 4]], 0).ci95[0]).toBeNaN();
  });
  it('pairedBootstrap: detects a consistent shift and counts positive seeds', () => {
    const b = [Array.from({ length: 50 }, (_, i) => i), Array.from({ length: 50 }, (_, i) => 2 * i)];
    const a = b.map((xs) => xs.map((x, i) => x + 1 + (i % 3) * 0.1));
    const d = pairedBootstrap(a, b, 400, 1);
    expect(d.mean).toBeGreaterThan(1);
    expect(d.ci95[0]).toBeGreaterThan(0);
    expect(d.pBoot).toBe(0);
    expect(d.positiveSeeds).toBe(2);
    expect(pairedBootstrap(b, a, 400, 1).ci95[1]).toBeLessThan(0);
  });
  it('summarizeStudy: per-policy CIs and paired diffs vs baselines', () => {
    const bySeed = [1, 2].map((seed) => ({ seed, result: runSim({ students: 3, days: 15, seed, policies: [randomPolicy, weakestFirstPolicy] }) }));
    const s = summarizeStudy(bySeed, ['random', 'missing'], 200);
    expect(s.policies).toEqual(['random', 'weakest_first']);
    expect(s.studentsPerSeed).toBe(3);
    expect(Object.keys(s.paired)).toEqual(['random']);
    expect(s.paired.random!.weakest_first!.gain.seeds).toBe(2);
    expect(s.metrics.random!.gain.ci95[0]).toBeLessThanOrEqual(s.metrics.random!.gain.mean);
    expect(Object.keys(s.perSeedGain)).toEqual(['1', '2']);
    expect(summarizeStudy([], []).policies).toEqual([]);
  });
});
