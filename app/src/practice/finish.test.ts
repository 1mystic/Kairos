import { evaluateResponse, MAX_MASTERY_BYTES, type KairosEvent, type MasteryDoc } from '@kairos/core';
import { describe, expect, it } from 'vitest';
import { checkAnswer, commitSession, finishSession, buildReview, valueToResponse } from './finish';
import { fakeStore, mkQ } from './fixtures.test-util';

const ev = (t: number, q: string, a: KairosEvent['a'], v?: string): KairosEvent => ({ t, q, a, ctx: 'practice', ...(v ? { v } : {}) });
const qs = [mkQ('q1'), mkQ('q2', { type: 'NVQ', options: undefined, answer: { value: 9.8, tol: 0.1 }, tax: { subject: 'PHY', chapter: 'PHY.KIN1D', topics: [] } })];
const events: KairosEvent[] = [
  ev(0, 'q1', 'visit'), ev(50_000, 'q1', 'save', 'B'), ev(50_000, 'q1', 'submit'),
  ev(50_000, 'q2', 'visit'), ev(60_000, 'q2', 'save', '5'), ev(60_000, 'q2', 'submit'),
];

describe('numeric answer checking (core evaluateResponse)', () => {
  it('uses tolerance for NVQ and exact for INT', () => {
    const nvq = qs[1]!;
    expect(checkAnswer(nvq, valueToResponse(nvq, '9.85'))).toBe('correct');
    expect(checkAnswer(nvq, valueToResponse(nvq, '9.5'))).toBe('wrong');
    expect(checkAnswer(nvq, valueToResponse(nvq, ''))).toBe('blank');
    const int = mkQ('i', { type: 'INT', options: undefined, answer: { value: 4 } });
    expect(evaluateResponse(int, { value: '4' })).toBe('correct');
    expect(checkAnswer(int, valueToResponse(int, '4.5'))).toBe('wrong');
  });
});

describe('finishSession', () => {
  it('summarises and creates mastery from nothing', () => {
    const r = finishSession({ events, questions: qs, reasons: { q2: 'guessed' }, mastery: null, now: 1_000_000 });
    expect(r.summary.n).toBe(2);
    expect(r.summary.correct).toBe(1);
    expect(r.summary.wrong).toBe(1);
    expect(r.summary.labels.guess_careless).toBe(1);
    expect(Object.keys(r.mastery).sort()).toEqual(['PHY.KIN1D', 'PHY.LOM']);
    expect(r.mastery['PHY.LOM']!.θ).toBeGreaterThan(0);
    expect(r.mastery['PHY.KIN1D']!.θ).toBeLessThan(0);
  });
  it('updates an existing doc without losing other topics', () => {
    const first = finishSession({ events, questions: qs, reasons: {}, mastery: null, now: 1_000_000 }).mastery;
    const prev: MasteryDoc = { ...first, 'OTHER.T': { ...first['PHY.LOM']! } };
    const r = finishSession({ events, questions: qs, reasons: {}, mastery: prev, now: 2_000_000 });
    expect(r.mastery['OTHER.T']).toBeDefined();
    expect(r.mastery['PHY.LOM']!.n).toBe(2);
  });
  it('keeps the doc under the size guard', () => {
    const big: MasteryDoc = {};
    const t = finishSession({ events, questions: qs, reasons: {}, mastery: null, now: 1 }).mastery['PHY.LOM']!;
    for (let i = 0; i < 1200; i++) big[`T.${i}.${'x'.repeat(20)}`] = { ...t, n: 1 };
    const r = finishSession({ events, questions: qs, reasons: {}, mastery: big, now: 2 });
    expect(JSON.stringify(r.mastery).length).toBeLessThanOrEqual(MAX_MASTERY_BYTES);
  });
  it('buildReview reports answers and outcomes', () => {
    const rows = buildReview(events, qs, {});
    expect(rows.map((r) => [r.outcome, r.given])).toEqual([['correct', 'B'], ['wrong', '5']]);
  });
});

describe('commitSession', () => {
  it('writes exactly one session and one mastery doc', async () => {
    const { store, calls, sessions, states } = fakeStore();
    const out = await commitSession(
      store,
      { id: 's1', startedAt: 0, endedAt: 70_000, exam: 'JEE_MAIN', chapter: 'mixed', chapters: ['PHY.LOM', 'PHY.KIN1D'], mode: 'relaxed' },
      { events, questions: qs, reasons: {} },
    );
    expect(calls).toEqual({ addSession: 1, putState: 1 });
    expect(out.masteryError).toBeUndefined();
    expect(sessions[0]).toMatchObject({ id: 's1', ctx: 'practice', qids: ['q1', 'q2'] });
    expect(states.mastery).toBeDefined();
  });
  it('keeps the session when the mastery write fails', async () => {
    const { store, calls } = fakeStore({ putState: async () => { throw new Error('offline'); } });
    const out = await commitSession(store, { id: 's', startedAt: 0, endedAt: 1, exam: 'E', chapter: 'c', chapters: ['c'], mode: 'timed' }, { events, questions: qs, reasons: {} });
    expect(calls.addSession).toBe(1);
    expect(out.masteryError).toBeInstanceOf(Error);
  });
});
