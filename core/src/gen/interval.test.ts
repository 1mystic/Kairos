import { describe, expect, it } from 'vitest';
import { paperMoments, SCORE_INTERVAL_TABLE, scoreInterval, type IntervalTable } from './interval';

const table: IntervalTable = { version: 1, level: 0.8, models: { elo: [{ max_seen_frac: 0.5, q_lo: -2, q_hi: 1, n: 10 }, { max_seen_frac: 1, q_lo: -1, q_hi: 2, n: 10 }], learned: [] } };

describe('scoreInterval', () => {
  it('pred + sd * [q_lo, q_hi] from the seen_frac bucket', () => {
    expect(scoreInterval(100, 10, 0.2, 'elo', table)).toEqual({ lo: 80, hi: 110, level: 0.8 });
    expect(scoreInterval(100, 10, 0.5, 'elo', table)).toEqual({ lo: 90, hi: 120, level: 0.8 });
    expect(scoreInterval(100, 10, 7, 'elo', table)).toEqual({ lo: 90, hi: 120, level: 0.8 });
    expect(scoreInterval(100, 10, -1, 'elo', table).lo).toBe(80);
    expect(() => scoreInterval(1, 1, 1, 'learned', table)).toThrow();
  });
  it('shipped table: both models, 80% level, q_lo < 0 < q_hi in every bucket', () => {
    expect(SCORE_INTERVAL_TABLE.level).toBeCloseTo(0.8, 9);
    for (const m of ['elo', 'learned']) {
      const bs = SCORE_INTERVAL_TABLE.models[m]!;
      expect(bs.length).toBe(3);
      expect(bs[bs.length - 1]!.max_seen_frac).toBe(1);
      for (const b of bs) {
        expect(b.q_lo).toBeLessThan(0);
        expect(b.q_hi).toBeGreaterThan(0);
      }
    }
    const i = scoreInterval(120, 15, 1);
    expect(i.lo).toBeLessThan(120);
    expect(i.hi).toBeGreaterThan(120);
  });
  it('paperMoments: expected marks and Bernoulli sd', () => {
    const m = paperMoments([{ p: 0.5, correct: 4, wrong: -1 }, { p: 1, correct: 4, wrong: -1 }]);
    expect(m.mean).toBeCloseTo(1.5 + 4, 12);
    expect(m.sd).toBeCloseTo(Math.sqrt(25 * 0.25), 12);
    expect(paperMoments([])).toEqual({ mean: 0, sd: 0 });
  });
});
