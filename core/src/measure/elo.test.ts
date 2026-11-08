import { describe, expect, it } from 'vitest';
import {
  aggregate,
  bFromPCorrect,
  confidenceLabel,
  inflateRd,
  masteryProb,
  newElo,
  pCorrect,
  updateElo,
  type EloState,
} from './elo';

const DAY = 86_400_000;

describe('elo', () => {
  it('p and masteryProb', () => {
    expect(pCorrect(0, 0)).toBeCloseTo(0.5);
    expect(masteryProb(0)).toBeCloseTo(0.5);
    expect(masteryProb(2)).toBeGreaterThan(0.85);
    expect(masteryProb(0, 1)).toBeLessThan(0.5);
    expect(bFromPCorrect(0.5)).toBeCloseTo(0);
    expect(bFromPCorrect(2)).toBeCloseTo(bFromPCorrect(0.99));
  });

  it('moves theta toward outcome with decaying K', () => {
    const s0 = newElo();
    const up = updateElo(s0, 0, 1, 1000);
    expect(up.theta).toBeCloseTo(0.4 * 0.5);
    const dn = updateElo(s0, 0, 0, 1000);
    expect(dn.theta).toBeCloseTo(-0.2);
    const old: EloState = { ...s0, n: 20 };
    expect(updateElo(old, 0, 1, 1000).theta).toBeCloseTo(0.1);
    expect(updateElo(s0, 0, 0.5, 1).theta).toBeCloseTo(0); // partial credit at p=.5
    expect(updateElo(s0, 0, 5, 1).theta).toBeCloseTo(up.theta); // clamped
    expect(updateElo(s0, 0, 1, 1, { k0: 1 }).theta).toBeCloseTo(0.5);
  });

  it('rd shrinks to the floor and grows with time', () => {
    let s = newElo();
    for (let i = 0; i < 200; i++) s = updateElo(s, 0, i % 2, i);
    expect(s.rd).toBeCloseTo(0.15);
    expect(s.n).toBe(200);
    const later = inflateRd(s.rd, s.last, s.last + 100 * DAY);
    expect(later).toBeGreaterThan(0.4);
    expect(inflateRd(0.9, 1, 1 + 10_000 * DAY)).toBe(1);
    expect(inflateRd(0.5, 0, 5 * DAY)).toBe(0.5);
    expect(inflateRd(0.5, 10, 5)).toBe(0.5);
    const back = updateElo(s, 0, 1, s.last + 100 * DAY);
    expect(back.rd).toBeGreaterThan(s.rd);
  });

  it('confidence labels', () => {
    expect(confidenceLabel(1)).toBe('not_enough_data');
    expect(confidenceLabel(0.5)).toBe('rough');
    expect(confidenceLabel(0.2)).toBe('confident');
  });

  it('simulated learner converges to true theta', () => {
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (const trueTheta of [-1, 0.5, 1.5]) {
      let s = newElo();
      const avg: number[] = [];
      for (let i = 0; i < 200; i++) {
        const b = (rnd() - 0.5) * 3;
        const r = rnd() < pCorrect(trueTheta, b) ? 1 : 0;
        s = updateElo(s, b, r, i * 1000);
        if (i >= 150) avg.push(s.theta);
      }
      const est = avg.reduce((a, b) => a + b, 0) / avg.length;
      expect(Math.abs(est - trueTheta)).toBeLessThan(0.3);
      expect(s.rd).toBeLessThan(0.2);
      expect(confidenceLabel(s.rd)).toBe('confident');
    }
  });
});

describe('aggregate', () => {
  const items = [
    { id: 'a', theta: 2, rd: 0.2, n: 40 },
    { id: 'b', theta: -2, rd: 1, n: 1 },
  ];
  it('empty', () => {
    expect(aggregate([]).label).toBe('not_enough_data');
  });
  it('shrinks low-n topics toward parent', () => {
    const agg = aggregate(items, {}, { parentTheta: 0 });
    // a: 40*2/45 = 1.778 ; b: -2/6 = -0.333 ; mean
    expect(agg.theta).toBeCloseTo((1.7778 - 0.3333) / 2, 3);
    expect(agg.n).toBe(41);
    expect(agg.rd).toBeCloseTo(Math.sqrt(0.25 * 0.04 + 0.25 * 1), 5);
  });
  it('weights, default parent, unobserved topics', () => {
    const w = aggregate(items, { a: 3, b: 1 }, { parentTheta: 0 });
    expect(w.theta).toBeCloseTo(0.75 * 1.7778 + 0.25 * -0.3333, 3);
    const d = aggregate(items);
    expect(Number.isFinite(d.theta)).toBe(true);
    const none = aggregate([{ id: 'x', theta: 0, rd: 1, n: 0 }, { id: 'y', theta: 0, rd: 1, n: 0 }]);
    expect(none.theta).toBe(0);
    expect(none.label).toBe('not_enough_data');
    const zero = aggregate(items, { a: 0, b: 0 }, { parentTheta: 0 });
    expect(zero.theta).toBeCloseTo((1.7778 - 0.3333) / 2, 3);
  });
});
