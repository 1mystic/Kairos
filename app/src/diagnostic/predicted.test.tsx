import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { parseBlueprint, type MasteryDoc } from '@kairos/core';
import { PredictedBandView, bandLine } from './PredictedBand';
import type { ReactElement } from 'react';
import { AMBITION_FRACTION, cacheFresh, confidenceOf, dataStats, readCache, targetFor, PREDICT_KEY, type KV, type PredictedCache, type PredictInput } from './predicted';
import { usePredictedScoreFor, type PredictedScore } from './usePredictedScore';
import { storeWith, synthBank, synthTaxonomy } from './testkit.test-util';

const topic = (n: number, rd = 0.9): MasteryDoc[string] => ({ θ: 0.2, rd, n, last: 1, S: 1, D: 1, due: 1, err_mix: {}, reps: 1, lapses: 0, st: 1 });
const docOf = (topics: number, n: number, rd?: number): MasteryDoc => Object.fromEntries(Array.from({ length: topics }, (_, i) => [`PHY.T${i}`, topic(n, rd)]));
const memKv = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('not-enough-data rule', () => {
  it('needs 10 topics with 2+ attempts and 40 attempts overall', () => {
    expect(confidenceOf(null)).toBe('not_enough_data');
    expect(confidenceOf(docOf(9, 10))).toBe('not_enough_data'); // 9 topics
    expect(confidenceOf(docOf(10, 3))).toBe('not_enough_data'); // 30 attempts
    expect(confidenceOf(docOf(10, 4))).toBe('rough'); // 40 attempts, wide rd
    expect(confidenceOf(docOf(10, 30, 0.25))).toBe('confident');
    expect(dataStats(docOf(3, 1)).topics).toBe(0); // single answers do not count as a topic
  });
  it('target is a share of max marks by ambition', () => {
    expect(AMBITION_FRACTION.competitive).toBe(0.6);
    expect(targetFor('competitive', 300)).toBe(180);
    expect(targetFor(undefined, 300)).toBeUndefined();
  });
});

const bp = parseBlueprint({
  id: 'bp_p',
  exam: 'JEE_MAIN',
  mode: 'CBT',
  duration_min: 60,
  ui_skin: 'x',
  subjects: [{ code: 'PHY', sections: [{ id: 'A', type: 'SCQ', count: 5, marks: { correct: 4, wrong: -1, blank: 0 } }] }],
  time_slots: ['09:00'],
});
const CH = Array.from({ length: 10 }, (_, i) => ({ id: `PHY.T${i}`, subject: 'PHY' }));
const bank = synthBank(CH, 3);

function deps(kv: KV, extra: Record<string, unknown> = {}) {
  const predict = vi.fn<(i: PredictInput) => Promise<{ p25: number; p50: number; p75: number; mean: number }>>(async () => ({ p25: 100, p50: 120, p75: 140, mean: 121 }));
  const loadBank = vi.fn(async () => ({ version: 1, manifest: undefined as never, questions: bank }));
  return { kv, now: () => new Date(2026, 10, 8, 12).getTime(), predict, loadBank, loadBlueprints: async () => ({ version: 1, blueprints: [bp] }), loadTaxonomy: async () => synthTaxonomy(CH), mobile: false, ...extra };
}

describe('usePredictedScore', () => {
  const enough = docOf(10, 5);
  it('returns no band and does not touch the bank when data is thin', async () => {
    const { store } = storeWith({ exam: 'JEE_MAIN' }, { getState: async () => docOf(3, 5) as never });
    const d = deps(memKv());
    const { result } = renderHook(() => usePredictedScoreFor(store, d));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ band: null, confidence: 'not_enough_data' });
    expect(d.loadBank).not.toHaveBeenCalled();
  });

  it('computes once, caches for the day, and recomputes only on material change', async () => {
    const kv = memKv();
    let doc = enough;
    const { store } = storeWith({ exam: 'JEE_MAIN', ambition: 'competitive' }, { getState: async () => doc as never });
    const d = deps(kv);
    const first = renderHook(() => usePredictedScoreFor(store, d));
    await waitFor(() => expect(first.result.current.band).not.toBeNull());
    expect(first.result.current).toMatchObject({ confidence: 'rough', max: 20, target: 12, attempts: 50 });
    expect(d.predict).toHaveBeenCalledTimes(1);
    expect(d.predict.mock.calls[0]![0].sims).toBe(500);
    expect(readCache(kv)?.date).toBe('2026-11-08');

    // same day, same mastery: served from cache
    const second = renderHook(() => usePredictedScoreFor(store, d));
    await waitFor(() => expect(second.result.current.band).not.toBeNull());
    expect(d.predict).toHaveBeenCalledTimes(1);

    // material change (many more attempts): recompute
    doc = docOf(10, 9);
    const third = renderHook(() => usePredictedScoreFor(store, d));
    await waitFor(() => expect(d.predict).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(third.result.current.band).not.toBeNull());
  });

  it('caps sims on mobile and recomputes on a new day', async () => {
    const kv = memKv();
    const { store } = storeWith({ exam: 'JEE_MAIN' }, { getState: async () => enough as never });
    const d = deps(kv, { mobile: true });
    renderHook(() => usePredictedScoreFor(store, d));
    await waitFor(() => expect(d.predict).toHaveBeenCalledTimes(1));
    expect(d.predict.mock.calls[0]![0].sims).toBe(300);
    const next = deps(kv, { now: () => new Date(2026, 10, 9, 12).getTime() });
    renderHook(() => usePredictedScoreFor(store, next));
    await waitFor(() => expect(next.predict).toHaveBeenCalledTimes(1));
  });

  it('cacheFresh rules', () => {
    const c: PredictedCache = { v: 1, date: 'd', exam: 'E', blueprintId: 'b', band: { p25: 1, p50: 2, p75: 3, mean: 2 }, confidence: 'rough', max: 10, topics: 10, attempts: 100, updatedAt: 1 };
    expect(cacheFresh(c, 'd', 'E', { topics: 10, attempts: 105, avgRd: 1 })).toBe(true);
    expect(cacheFresh(c, 'd', 'E', { topics: 10, attempts: 130, avgRd: 1 })).toBe(false);
    expect(cacheFresh(c, 'd', 'F', { topics: 10, attempts: 100, avgRd: 1 })).toBe(false);
    expect(cacheFresh(c, 'x', 'E', { topics: 10, attempts: 100, avgRd: 1 })).toBe(false);
    expect(PREDICT_KEY).toBe('kairos-predicted');
  });
});

describe('PredictedBand', () => {
  const p: PredictedScore = { loading: false, band: { p25: 168.4, p50: 182, p75: 195.6, mean: 181 }, confidence: 'rough', target: 180, updatedAt: 1, max: 300, attempts: 214 };
  const wrap = (el: ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>);

  it('shows the range, target and question count, with an explanation popover', async () => {
    expect(bandLine(p)).toBe('168–196 · target 180 · based on 214 questions');
    wrap(<PredictedBandView p={p} />);
    expect(screen.getByText('168–196 · target 180 · based on 214 questions')).toBeInTheDocument();
    expect(screen.getByText('Rough estimate')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Likely range 168 to 196 out of 300, median 182, target 180/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'How this is computed' }));
    expect(screen.getByText(/25th to 75th percentile/)).toBeInTheDocument();
  });
  it('is calm when there is not enough data', () => {
    wrap(<PredictedBandView p={{ loading: false, band: null, confidence: 'not_enough_data', updatedAt: null }} />);
    expect(screen.getByText(/Not enough data yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Find your starting point' })).toHaveAttribute('href', '/diagnostic');
  });
});
