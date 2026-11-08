import { describe, expect, it } from 'vitest';
import { mcq } from './fixtures.test-util';
import type { Attempt } from './labels';
import {
  applySession,
  emptyMastery,
  guardSize,
  masteryByChapter,
  masteryBySubject,
  topicOf,
  type MasteryDoc,
  type TopicMeta,
} from './mastery';
import { retrievability, isDue, cardFromParts } from './fsrs';

const T0 = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;
const att = (q: string, o: Partial<Attempt> = {}): Attempt => ({
  q,
  correct: true,
  r: 1,
  b: 0,
  timeMs: 60_000,
  medianTimeMs: 60_000,
  pCorrect: 0.5,
  changedCorrectToWrong: false,
  skipped: false,
  ...o,
});

const qs = [
  mcq('a1'),
  mcq('a2'),
  mcq('b1', { tax: { subject: 'physics', chapter: 'optics', topics: ['lens'] } }),
  mcq('c1', { tax: { subject: 'chemistry', chapter: 'bonding' } }),
  mcq('n1', { tax: undefined }),
];

describe('mastery', () => {
  it('topicOf falls back to chapter', () => {
    expect(topicOf(qs[0]!)).toBe('projectile');
    expect(topicOf(qs[3]!)).toBe('bonding');
    expect(topicOf(qs[4]!)).toBeUndefined();
  });

  it('applySession updates elo + fsrs + err_mix per topic, purely', () => {
    const empty = emptyMastery();
    const m = applySession(
      empty,
      [
        att('a1'),
        att('a2', { correct: false, r: 0, timeMs: 10_000 }),
        att('b1', { skipped: true, correct: false, r: 0, pCorrect: 0.9 }),
        att('c1'),
        att('n1'),
        att('unknown'),
      ],
      qs,
      T0,
    );
    expect(empty).toEqual({});
    expect(Object.keys(m).sort()).toEqual(['bonding', 'lens', 'projectile']);
    const p = m.projectile!;
    expect(p.n).toBe(2);
    expect(p.last).toBe(T0);
    expect(p.err_mix).toEqual({ guess_careless: 1 });
    expect(p.due).toBeGreaterThan(T0);
    expect(p.S).toBeGreaterThan(0);
    // skipped-only topic: no elo n, label recorded, no review time
    expect(m.lens).toMatchObject({ n: 0, last: 0, err_mix: { strategy: 1 } });
    expect(m.bonding!.θ).toBeGreaterThan(0);
  });

  it('second session accumulates and reuses the card', () => {
    const m1 = applySession({}, [att('a1')], qs, T0);
    const m2 = applySession(m1, [att('a1'), att('a2', { timeMs: 5_000 })], qs, T0 + 3 * DAY);
    expect(m2.projectile!.n).toBe(3);
    expect(m2.projectile!.reps).toBe(2);
    expect(m2.projectile!.S).toBeGreaterThan(m1.projectile!.S);
    expect(m2.bonding).toBeUndefined();
    expect(m1.projectile!.n).toBe(1);
    const wrong = applySession(m2, [att('a1', { correct: false, r: 0.2 })], qs, T0 + 9 * DAY);
    expect(wrong.projectile!.lapses).toBe(1);
    expect(wrong.projectile!.θ).toBeLessThan(m2.projectile!.θ);
  });

  it('due logic works on stored mastery', () => {
    const m = applySession({}, [att('a1')], qs, T0).projectile!;
    const card = cardFromParts(m);
    expect(retrievability(card, T0 + DAY)).toBeGreaterThan(0.8);
    expect(isDue(card, T0 + 400 * DAY)).toBe(true);
  });

  it('JSON round-trips and stays small', () => {
    const m = applySession({}, [att('a1'), att('c1')], qs, T0 + 0.123456);
    expect(JSON.parse(JSON.stringify(m))).toEqual(m);
    const decimals = JSON.stringify(m.projectile!.θ).split('.')[1] ?? '';
    expect(decimals.length).toBeLessThanOrEqual(3);
  });

  it('guardSize caps err_mix keys and prunes over budget', () => {
    const mix = { a: 5, b: 4, c: 3, d: 2, e: 0 } as never;
    const g = guardSize(
      { t: { θ: 0.123456, rd: 1, n: 1, last: 1, S: 1, D: 1, due: 1, err_mix: mix, reps: 1, lapses: 0, st: 2 } },
      { maxErrKeys: 3 },
    );
    expect(Object.keys(g.t!.err_mix)).toEqual(['a', 'b', 'c']);
    expect(g.t!.θ).toBe(0.123);
    const big: MasteryDoc = {};
    for (let i = 0; i < 1000; i++)
      big['topic' + i] = { ...g.t!, n: i, last: i };
    const pruned = guardSize(big);
    expect(JSON.stringify(pruned).length).toBeLessThanOrEqual(60_000);
    expect(pruned.topic999).toBeDefined();
    expect(pruned.topic0).toBeUndefined();
    expect(Object.keys(guardSize(big, { maxBytes: 1e9 })).length).toBe(1000);
  });

  it('chapter and subject aggregation', () => {
    const doc = applySession(
      {},
      [att('a1'), att('a2', { correct: false, r: 0 }), att('b1'), att('c1')],
      qs,
      T0,
    );
    const meta: Record<string, TopicMeta> = {
      projectile: { chapter: 'kinematics', subject: 'physics', weight: 2 },
      lens: { chapter: 'optics', subject: 'physics' },
      bonding: { chapter: 'bonding', subject: 'chemistry' },
    };
    const ch = masteryByChapter(doc, meta);
    expect(Object.keys(ch).sort()).toEqual(['bonding', 'kinematics', 'optics']);
    expect(ch.kinematics!.n).toBe(2);
    const sub = masteryBySubject(doc, { ...meta, ghost: { chapter: 'x', subject: 'y' } });
    expect(Object.keys(sub).sort()).toEqual(['chemistry', 'physics']);
    expect(sub.physics!.n).toBe(3);
    expect(masteryByChapter({ ...doc, orphan: doc.lens! }, meta).orphan).toBeUndefined();
  });
});
