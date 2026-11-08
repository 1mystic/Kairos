import { describe, expect, it } from 'vitest';
import {
  fromCard,
  isDue,
  newCard,
  ratingFromOutcome,
  retrievability,
  reviewTopic,
  toCard,
  cardFromParts,
} from './fsrs';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

describe('fsrs', () => {
  it('new card is due, R = 0, JSON serialisable', () => {
    const c = newCard(T0);
    expect(isDue(c, T0)).toBe(true);
    expect(retrievability(c, T0)).toBe(0);
    expect(JSON.parse(JSON.stringify(c))).toEqual(c);
    expect(fromCard(toCard(c))).toEqual(c);
  });

  it('rating mapping', () => {
    const o = { correct: true, timeMs: 100, medianTimeMs: 100 };
    expect(ratingFromOutcome({ ...o, correct: false })).toBe('again');
    expect(ratingFromOutcome({ ...o, timeMs: 200 })).toBe('hard');
    expect(ratingFromOutcome(o)).toBe('good');
    expect(ratingFromOutcome({ ...o, timeMs: 30 })).toBe('easy');
    expect(ratingFromOutcome({ ...o, medianTimeMs: 0 })).toBe('good');
  });

  it('review schedules in the future; R decays; ratings order stability', () => {
    const c0 = newCard(T0);
    const good = reviewTopic(c0, 'good', T0);
    const easy = reviewTopic(c0, 'easy', T0);
    const again = reviewTopic(c0, 'again', T0);
    const hard = reviewTopic(c0, 'hard', T0);
    expect(good.due).toBeGreaterThan(T0);
    expect(easy.stability).toBeGreaterThan(good.stability);
    expect(good.stability).toBeGreaterThan(hard.stability);
    expect(hard.stability).toBeGreaterThan(again.stability);
    expect(retrievability(good, T0)).toBeCloseTo(1, 2);
    expect(retrievability(good, T0 + 30 * DAY)).toBeLessThan(retrievability(good, T0 + DAY));
    const j = JSON.parse(JSON.stringify(good));
    const again2 = reviewTopic(j, 'good', T0 + 3 * DAY);
    expect(again2.reps).toBe(2);
    expect(again2.stability).toBeGreaterThan(0);
    const lapsed = reviewTopic(again2, 'again', T0 + 10 * DAY);
    expect(lapsed.lapses).toBe(1);
  });

  it('due thresholds 0.85 / 0.9', () => {
    const c = reviewTopic(newCard(T0), 'good', T0);
    // find days where R crosses 0.9 and 0.85
    const R = (d: number) => retrievability(c, T0 + d * DAY);
    let d90 = 0;
    while (R(d90) >= 0.9) d90 += 0.05;
    let d85 = d90;
    while (R(d85) >= 0.85) d85 += 0.05;
    expect(d85).toBeGreaterThan(d90);
    const mid = T0 + ((d90 + d85) / 2) * DAY;
    expect(isDue(c, mid, 200)).toBe(false); // R in [.85,.9): not due far from exam
    expect(isDue(c, mid)).toBe(false);
    expect(isDue(c, mid, 60)).toBe(true); // due in last 60 days
    expect(isDue(c, mid, 61)).toBe(false);
    expect(isDue(c, T0 + (d85 + 0.5) * DAY, 200)).toBe(true);
    expect(isDue(c, T0 + 0.5 * (d90 - 0.1) * DAY, 30)).toBe(false);
  });

  it('cardFromParts round-trips the essentials', () => {
    const c = reviewTopic(newCard(T0), 'good', T0);
    const r = cardFromParts({
      S: c.stability,
      D: c.difficulty,
      due: c.due,
      last: T0,
      reps: c.reps,
      lapses: c.lapses,
      st: c.state,
    });
    expect(retrievability(r, T0 + 5 * DAY)).toBeCloseTo(retrievability(c, T0 + 5 * DAY), 6);
    expect(cardFromParts({ ...r, S: 1, D: 1, due: 0, last: T0, reps: 0, lapses: 0, st: 0 }).scheduled_days).toBe(0);
  });
});
