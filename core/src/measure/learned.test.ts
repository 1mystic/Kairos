import { describe, expect, it } from 'vitest';
import { featureVector, LEARNED_WEIGHTS, predictP, predictRecall, recallInput, type GbdtWeights, type LogRegWeights, type RecallInput } from './learned';
import { pCorrect } from './elo';
import type { TopicMastery } from './mastery';

const DAY = 86_400_000;
const base: RecallInput = { elo_theta: 0.4, elo_rd: 0.5, elo_n: 12, fsrs_r: 0.8, fsrs_s: 6, fsrs_d: 5, err_rate: 0.2, k_in_session: 2, days_since_last_topic: 3, difficulty_b: -0.3 };
const tm: TopicMastery = { θ: 0.7, rd: 0.4, n: 15, last: 10 * DAY, S: 8, D: 5, due: 18 * DAY, err_mix: { silly_mistake: 2, concept_gap: 1 }, reps: 3, lapses: 0, st: 2 };

describe('learned recall model', () => {
  it('golden: matches the Python reference on the shipped weights', () => {
    const golden = LEARNED_WEIGHTS.golden ?? [];
    expect(golden.length).toBeGreaterThanOrEqual(8);
    for (const g of golden) expect(Math.abs(predictP(g.input) - g.p)).toBeLessThan(1e-9);
  });

  it('shipped weights are versioned and record their seed', () => {
    expect(LEARNED_WEIGHTS.version).toBeGreaterThanOrEqual(1);
    expect(typeof LEARNED_WEIGHTS.seed).toBe('number');
  });

  it('features follow the documented closed forms', () => {
    const names = ['x_elo', 'rd', 'log_n', 'r', 'one_minus_r', 'log_days', 'unseen', 'err', 'b', 'log_k', 'x_elo_r', 'x_elo_rd', 'log_s'];
    const v = featureVector(base, names);
    expect(v).toEqual([0.7, 0.5, Math.log1p(12), 0.8, 1 - 0.8, Math.log1p(3), 0, 0.2, -0.3, Math.log1p(2), 0.7 * 0.8, 0.7 * 0.5, Math.log1p(6)].map((x, i) => (i === 0 ? 0.4 - -0.3 : x)));
    expect(featureVector({ ...base, days_since_last_topic: -1, elo_n: 0 }, ['log_days', 'unseen'])).toEqual([0, 1]);
    expect(() => featureVector(base, ['nope'])).toThrow();
  });

  it('logreg and gbdt scorers', () => {
    const lr: LogRegWeights = { version: 1, model: 'logreg', features: ['x_elo'], mean: [0], scale: [1], coef: [1], intercept: 0 };
    expect(predictP(base, lr)).toBeCloseTo(pCorrect(0.4, -0.3), 12);
    const gb: GbdtWeights = { version: 1, model: 'gbdt', features: ['x_elo', 'r'], trees: [{ split_feature: 0, threshold: 0.5, left: { leaf_value: -1 }, right: { split_feature: 1, threshold: 0.9, left: { leaf_value: 0.5 }, right: { leaf_value: 2 } } }, { leaf_value: 0.25 }] };
    expect(predictP(base, gb)).toBeCloseTo(1 / (1 + Math.exp(-0.75)), 12);
    expect(predictP({ ...base, elo_theta: -1 }, gb)).toBeCloseTo(1 / (1 + Math.exp(0.75)), 12);
  });

  it('recallInput from the mastery doc', () => {
    const now = 13.5 * DAY;
    const x = recallInput(tm, 0.2, now, 4);
    expect(x.elo_theta).toBe(0.7);
    expect(x.days_since_last_topic).toBe(3);
    expect(x.err_rate).toBeCloseTo(3 / 15, 12);
    expect(x.fsrs_r).toBeGreaterThan(0);
    expect(x.fsrs_r).toBeLessThan(1);
    expect(x.k_in_session).toBe(4);
    const u = recallInput(undefined, 0.2, now);
    expect(u).toMatchObject({ elo_n: 0, fsrs_r: 1, fsrs_s: 0, days_since_last_topic: -1, err_rate: 0, elo_rd: 1 });
  });

  it('predictRecall: Elo by default, learned on request, monotone in difficulty', () => {
    const now = 13 * DAY;
    expect(predictRecall(tm, 0.2, now)).toBe(pCorrect(0.7, 0.2));
    expect(predictRecall(undefined, 0.2, now)).toBe(pCorrect(0, 0.2));
    const easy = predictRecall(tm, -1, now, { model: 'learned' });
    const hard = predictRecall(tm, 1.5, now, { model: 'learned' });
    expect(easy).toBeGreaterThan(hard);
    for (const p of [easy, hard, predictRecall(undefined, 0, now, { model: 'learned' })]) {
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });
});
