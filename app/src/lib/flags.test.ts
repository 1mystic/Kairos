import { afterEach, describe, expect, it, vi } from 'vitest';
import { isFlagOn, recallModel } from './flags';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const store = (data: Record<string, string>) =>
  vi.stubGlobal('localStorage', { getItem: (k: string) => data[k] ?? null });

describe('flags', () => {
  it('is off by default', () => {
    store({});
    expect(isFlagOn('learnedRecall')).toBe(false);
    expect(isFlagOn('uncertaintyPlanner')).toBe(false);
    expect(recallModel()).toBe('elo');
  });
  it('turns on from the env var', () => {
    store({});
    vi.stubEnv('VITE_FLAG_LEARNED_RECALL', '1');
    expect(isFlagOn('learnedRecall')).toBe(true);
    expect(isFlagOn('uncertaintyPlanner')).toBe(false);
    expect(recallModel()).toBe('learned');
  });
  it('env "0" is off', () => {
    store({});
    vi.stubEnv('VITE_FLAG_UNCERTAINTY_PLANNER', '0');
    expect(isFlagOn('uncertaintyPlanner')).toBe(false);
  });
  it('turns on from localStorage', () => {
    store({ 'kairos.flag.uncertaintyPlanner': '1' });
    expect(isFlagOn('uncertaintyPlanner')).toBe(true);
    expect(isFlagOn('learnedRecall')).toBe(false);
  });
  it('survives throwing or missing localStorage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
    expect(isFlagOn('learnedRecall')).toBe(false);
    vi.stubGlobal('localStorage', undefined);
    expect(isFlagOn('learnedRecall')).toBe(false);
  });
});
