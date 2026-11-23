import { describe, expect, it } from 'vitest';
import { applyCalibration, CALIB_MIN_N, type CalibFile } from './calib';
import { behaviourLabels, timeSinkThreshold, TIME_SINK_MS, TIME_NORM_MIN_N } from './labels';
import type { Question } from '../question';

const q = (id: string, p = 0.6): Question => ({ id, type: 'SCQ', stem: 's', options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], answer: { keys: ['A'] }, tax: { subject: 'physics', chapter: 'c', topics: ['t1'] }, difficulty: { p_correct: p, median_time_s: 60 } }) as Question;

describe('applyCalibration', () => {
  const calib: CalibFile = { version: 1, model: '1pl', items: { a: [1.2, 1, 80], b: [-0.5, 1, 10], c: [Number.NaN, 1, 99] } };
  it('replaces difficulty only for items with enough attempts, keeps p_correct consistent', () => {
    const out = applyCalibration([q('a'), q('b'), q('c'), q('d')], calib);
    expect(out[0]!.difficulty).toMatchObject({ b: 1.2, a: 1, n: 80, median_time_s: 60 });
    expect(out[0]!.difficulty!.p_correct).toBeCloseTo(1 / (1 + Math.exp(1.2)), 12);
    expect(out[1]!.difficulty).toEqual({ p_correct: 0.6, median_time_s: 60 });
    expect(out[2]!.difficulty!.b).toBeUndefined();
    expect(out[3]).toEqual(q('d'));
    expect(applyCalibration([q('b')], calib, 5)[0]!.difficulty!.b).toBe(-0.5);
    expect(applyCalibration([q('a')], null)).toEqual([q('a')]);
    expect(CALIB_MIN_N).toBe(50);
  });
});

describe('time norms', () => {
  it('threshold = median + 3 x 1.4826 x MAD with a 60 s floor; falls back without data', () => {
    const norms = { t1: [90_000, 20_000, 200] as [number, number, number], t2: [20_000, 5_000, 500] as [number, number, number], t3: [90_000, 20_000, TIME_NORM_MIN_N - 1] as [number, number, number] };
    expect(timeSinkThreshold(norms, 't1')).toBeCloseTo(90_000 + 3 * 1.4826 * 20_000, 6);
    expect(timeSinkThreshold(norms, 't2')).toBe(60_000);
    expect(timeSinkThreshold(norms, 't3')).toBe(TIME_SINK_MS);
    expect(timeSinkThreshold(norms, 'zz')).toBe(TIME_SINK_MS);
    expect(timeSinkThreshold(undefined, 't1')).toBe(TIME_SINK_MS);
    expect(timeSinkThreshold(norms, undefined)).toBe(TIME_SINK_MS);
  });
  it('labels use the per-item threshold when given', () => {
    const f = { correct: false, timeMs: 100_000, medianTimeMs: 90_000, pCorrect: 0.5, changedCorrectToWrong: false, skipped: false };
    expect(behaviourLabels(f)).not.toContain('time_sink');
    expect(behaviourLabels({ ...f, timeSinkMs: 95_000 })).toContain('time_sink');
  });
});
