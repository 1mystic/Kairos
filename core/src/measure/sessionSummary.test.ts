import { describe, expect, it } from 'vitest';
import type { KairosEvent } from '../cbt/palette';
import { mcq } from './fixtures.test-util';
import { summarizeSession } from './sessionSummary';

const ev = (t: number, q: string, a: KairosEvent['a'], v?: string): KairosEvent => ({
  t, q, a, ctx: 'practice', ...(v !== undefined ? { v } : {}),
});

describe('summarizeSession', () => {
  const qs = [
    mcq('q1'),
    mcq('q2', { difficulty: { p_correct: 0.9, median_time_s: 60 } }),
    mcq('q3', { tax: undefined }),
  ];
  const events = [
    ev(0, 'q1', 'visit'), ev(30_000, 'q1', 'save', 'A'), ev(30_000, 'q1', 'leave'),
    ev(30_000, 'q2', 'visit'), ev(40_000, 'q2', 'save', 'B'), ev(40_000, 'q2', 'leave'),
    ev(40_000, 'q3', 'visit'), ev(50_000, 'q3', 'submit', 'manual'),
  ];
  it('counts, timing, chapters, labels', () => {
    const s = summarizeSession(events, qs);
    expect(s).toMatchObject({ n: 3, correct: 1, wrong: 1, skipped: 1, totalTimeMs: 50_000 });
    expect(s.accuracy).toBeCloseTo(1 / 3);
    expect(s.avgTimeMs).toBeCloseTo(50_000 / 3);
    expect(s.byChapter.kinematics).toMatchObject({ n: 2, correct: 1, wrong: 1, timeMs: 40_000 });
    expect(s.byChapter.unknown!.skipped).toBe(1);
    expect(s.labels).toEqual({ guess_careless: 1, silly_mistake: 1 });
  });
  it('reasons flow through; empty session', () => {
    const s = summarizeSession(events, qs, { reasons: { q2: 'concept_gap' } });
    expect(s.labels).toEqual({ concept_gap: 1 });
    const e = summarizeSession([], qs);
    expect(e).toMatchObject({ n: 0, accuracy: 0, avgTimeMs: 0, labels: {} });
  });
});
