import { describe, expect, it } from 'vitest';
import { bandOf, buildQueue, seenIds, thetaFor } from './queue';
import { mulberry32, seededShuffle } from './rng';
import { mkQ } from './fixtures.test-util';

const diff = (label: string, b: number) => ({ label, b, p_correct: 1 / (1 + Math.exp(b)), median_time_s: 80 });
const pool = [
  ...Array.from({ length: 10 }, (_, i) => mkQ(`e${i}`, { difficulty: diff('E', -1.2) })),
  ...Array.from({ length: 10 }, (_, i) => mkQ(`m${i}`, { difficulty: diff('M', 0) })),
  ...Array.from({ length: 10 }, (_, i) => mkQ(`h${i}`, { difficulty: diff('H', 1.5) })),
];

describe('rng', () => {
  it('mulberry32 is deterministic', () => {
    expect([mulberry32(7)(), mulberry32(7)()]).toEqual([mulberry32(7)(), mulberry32(7)()]);
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
  it('shuffle keeps items', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], mulberry32(3)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('buildQueue', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const ids = (seed: number) => buildQueue(pool, { size: 10, seed }).questions.map((q) => q.id);
    expect(ids(5)).toEqual(ids(5));
    expect(ids(5)).not.toEqual(ids(6));
  });
  it('spreads E then M then H without mastery data', () => {
    const bands = buildQueue(pool, { size: 9, seed: 1 }).questions.map(bandOf);
    expect(bands).toEqual(['E', 'E', 'E', 'M', 'M', 'M', 'H', 'H', 'H']);
  });
  it('excludes recently seen questions when enough remain', () => {
    const seen = new Set(pool.slice(0, 15).map((q) => q.id));
    const r = buildQueue(pool, { size: 10, seed: 1, seen });
    expect(r.questions.every((q) => !seen.has(q.id))).toBe(true);
    expect(r.repeats).toBe(0);
  });
  it('backfills from seen questions when the pool is short and reports it', () => {
    const seen = new Set(pool.slice(0, 25).map((q) => q.id));
    const r = buildQueue(pool, { size: 10, seed: 1, seen });
    expect(r.questions).toHaveLength(10);
    expect(r.repeats).toBe(5);
  });
  it('targets difficulty near theta (p about 0.65)', () => {
    const strong = buildQueue(pool, { size: 8, seed: 2, theta: 2 }).questions.map(bandOf);
    const weak = buildQueue(pool, { size: 8, seed: 2, theta: -1.5 }).questions.map(bandOf);
    const hard = (b: string[]) => b.filter((x) => x === 'H').length;
    expect(hard(strong)).toBeGreaterThan(hard(weak));
    expect(weak.filter((x) => x === 'E').length).toBeGreaterThan(strong.filter((x) => x === 'E').length);
  });
  it('drops questions without an answer key and honours band filters', () => {
    const p = [mkQ('x', { answer: null }), mkQ('y', { difficulty: diff('H', 1.5) }), mkQ('z', { difficulty: diff('E', -1) })];
    const r = buildQueue(p, { size: 5, seed: 1, bands: new Set(['H'] as const) });
    expect(r.questions.map((q) => q.id)).toEqual(['y']);
  });
  it('thetaFor and seenIds', () => {
    expect(thetaFor(pool, null)).toBeUndefined();
    expect(thetaFor([mkQ('a')], { 'PHY.LOM': { θ: 0.5, n: 3 } })).toBe(0.5);
    expect([...seenIds([{ qids: ['a'] }, { events: [{ q: 'b', a: 'visit' }, { q: 'c', a: 'save' }] }])].sort()).toEqual(['a', 'b']);
  });
});
