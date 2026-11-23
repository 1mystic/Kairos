import { describe, expect, it } from 'vitest';
import type { KairosEvent } from '../cbt/palette';
import { mcq } from './fixtures.test-util';
import { jeeAdvancedPartial } from '../scoring';
import { attemptsFromEvents, behaviourLabels, type AttemptFacts, type BehaviourLabel } from './labels';

const base: AttemptFacts = {
  correct: true,
  timeMs: 60_000,
  medianTimeMs: 60_000,
  pCorrect: 0.5,
  changedCorrectToWrong: false,
  skipped: false,
};
const L = (o: Partial<AttemptFacts> & { reason?: BehaviourLabel }, opts = {}) => behaviourLabels({ ...base, ...o }, opts);

describe('behaviourLabels', () => {
  it('none for a normal correct', () => expect(L({})).toEqual([]));
  it('guess_careless', () =>
    expect(L({ correct: false, timeMs: 20_000 })).toEqual(['guess_careless']));
  it('concept_gap', () => expect(L({ correct: false, timeMs: 100_000 })).toEqual(['concept_gap']));
  it('fluency', () => expect(L({ timeMs: 130_000 })).toEqual(['fluency']));
  it('overthinking', () =>
    expect(L({ correct: false, changedCorrectToWrong: true })).toEqual(['overthinking']));
  it('silly_mistake', () =>
    expect(L({ correct: false, pCorrect: 0.9 })).toEqual(['silly_mistake']));
  it('strategy on skipped easy only', () => {
    expect(L({ correct: false, skipped: true, pCorrect: 0.9, timeMs: 1 })).toEqual(['strategy']);
    expect(L({ correct: false, skipped: true, pCorrect: 0.5, timeMs: 1 })).toEqual([]);
  });
  it('time_sink stacks with concept_gap', () =>
    expect(L({ correct: false, timeMs: 200_000 })).toEqual(['concept_gap', 'time_sink']));
  it('multiple labels', () =>
    expect(L({ correct: false, timeMs: 10_000, pCorrect: 0.9, changedCorrectToWrong: true })).toEqual(
      ['guess_careless', 'overthinking', 'silly_mistake'],
    ));
  it('user reason overrides or adds', () => {
    const f = { correct: false, timeMs: 100_000, reason: 'strategy' as const };
    expect(L(f)).toEqual(['strategy']);
    expect(L(f, { reasonMode: 'add' })).toEqual(['concept_gap', 'strategy']);
    expect(L({ ...f, reason: 'concept_gap' }, { reasonMode: 'add' })).toEqual(['concept_gap']);
  });
});

const ev = (t: number, q: string, a: KairosEvent['a'], v?: string): KairosEvent => ({
  t,
  q,
  a,
  ctx: 'practice',
  ...(v !== undefined ? { v } : {}),
});

describe('attemptsFromEvents', () => {
  const qs = [
    mcq('q1'),
    mcq('q2', { difficulty: { b: 0, median_time_s: 30 } }),
    mcq('q3', { type: 'INT', options: undefined, answer: { value: 5 }, difficulty: undefined }),
    mcq('q4', { type: 'MSQ', answer: { keys: ['A', 'B'] } }),
    mcq('q5'),
    mcq('noanswer', { answer: null }),
  ];
  const events: KairosEvent[] = [
    ev(0, 'q1', 'visit'),
    ev(10_000, 'q1', 'select', 'A'),
    ev(20_000, 'q1', 'select', 'B'),
    ev(25_000, 'q1', 'save', 'B'),
    ev(30_000, 'q1', 'leave'),
    ev(30_000, 'q2', 'visit'),
    ev(40_000, 'q2', 'save', 'A'),
    ev(50_000, 'q2', 'leave'),
    ev(50_000, 'q3', 'visit'),
    ev(60_000, 'q3', 'save', '5'),
    ev(70_000, 'q3', 'clear'),
    ev(80_000, 'q3', 'leave'),
    ev(80_000, 'q1', 'visit'),
    ev(90_000, 'q1', 'leave'),
    ev(90_000, 'q4', 'visit'),
    ev(95_000, 'q4', 'save', 'A'),
    ev(100_000, 'q4', 'leave'),
    ev(100_000, 'noanswer', 'visit'),
    ev(101_000, 'ghost', 'visit'),
    ev(105_000, 'noanswer', 'leave'),
    ev(105_000, 'q5', 'visit'),
    ev(106_000, 'q5', 'mark'),
    ev(110_000, 'q5', 'submit', 'manual'),
  ];
  const att = attemptsFromEvents(events, qs, { reasons: { q2: 'strategy' }, msq: jeeAdvancedPartial });
  const by = Object.fromEntries(att.map((a) => [a.q, a]));

  it('time norms set a per-item time-sink threshold', () => {
    const withNorms = attemptsFromEvents(events, qs, { timeNorms: { x: [1, 1, 100] } });
    expect(withNorms.every((a) => typeof a.timeSinkMs === 'number')).toBe(true);
    expect(att.every((a) => a.timeSinkMs === undefined)).toBe(true);
  });

  it('time sums spans, changes detected', () => {
    expect(att.map((a) => a.q)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
    expect(by.q1).toMatchObject({ correct: false, skipped: false, timeMs: 40_000, r: 0 });
    expect(by.q1!.changedCorrectToWrong).toBe(true);
    expect(by.q1!.medianTimeMs).toBe(60_000);
    expect(by.q1!.pCorrect).toBe(0.5);
  });
  it('correct, b/median from difficulty, reason attached', () => {
    expect(by.q2).toMatchObject({ correct: true, r: 1, b: 0, medianTimeMs: 30_000, reason: 'strategy' });
    expect(by.q2!.pCorrect).toBeCloseTo(0.5);
    expect(by.q2!.timeMs).toBe(20_000);
  });
  it('cleared answer is skipped; default median', () => {
    expect(by.q3).toMatchObject({ skipped: true, correct: false, medianTimeMs: 120_000 });
  });
  it('partial credit on MSQ', () => {
    expect(by.q4).toMatchObject({ correct: false, skipped: false, r: 0.5 });
  });
  it('visited-only question at submit is skipped', () => {
    expect(by.q5).toMatchObject({ skipped: true, timeMs: 5_000 });
  });
  it('open spans are closed at the last event; value answers; unsorted input', () => {
    const a = attemptsFromEvents(
      [ev(5_000, 'q3', 'save', '5'), ev(0, 'q3', 'visit'), ev(9_000, 'q3', 'select')],
      qs,
      { defaultMedianMs: 1000 },
    );
    expect(a[0]).toMatchObject({ correct: true, timeMs: 9_000, medianTimeMs: 1000 });
    expect(attemptsFromEvents([], qs)).toEqual([]);
  });
  it('mean-time fallbacks: b only, MSQ with wrong value', () => {
    const q = mcq('b1', { difficulty: { b: 1 } });
    const a = attemptsFromEvents([ev(0, 'b1', 'visit'), ev(1, 'b1', 'save', 'B'), ev(2, 'b1', 'leave')], [q]);
    expect(a[0]!.pCorrect).toBeCloseTo(1 / (1 + Math.E));
    const num = mcq('n1', { type: 'NAT' as never, answer: { value: 1 } });
    const bad = attemptsFromEvents([ev(0, 'n1', 'visit'), ev(1, 'n1', 'save', 'abc'), ev(2, 'n1', 'leave')], [num]);
    expect(bad[0]).toMatchObject({ correct: false, skipped: false });
    const parseless = mcq('z', { answer: { keys: ['A'] } });
    const ws = attemptsFromEvents([ev(0, 'z', 'visit'), ev(1, 'z', 'save', ''), ev(2, 'z', 'leave')], [parseless]);
    expect(ws[0]!.skipped).toBe(true);
    const mq = mcq('m', { type: 'MSQ', answer: { value: 1 } as never });
    const odd = attemptsFromEvents([ev(0, 'm', 'visit'), ev(1, 'm', 'save', '1'), ev(2, 'm', 'leave')], [mq]);
    expect(odd[0]!.correct).toBe(true);
  });
});
