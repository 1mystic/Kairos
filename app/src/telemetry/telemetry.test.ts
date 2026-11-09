import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPS, addCounts, sessionCounts, localDay, normalize, shouldFlush, takeBatch, type Counts } from './logic';
import { Telemetry, TELEMETRY_KEY, type StatsAdapter } from './telemetry';

function setup(opts: { uid?: string | null; online?: boolean; seen?: boolean } = {}) {
  const store = new Map<string, string>();
  const calls: Array<{ kind: string; day: string; counts?: Counts }> = [];
  const state = { uid: opts.uid === undefined ? 'u1' : opts.uid, online: opts.online ?? true, seen: opts.seen ?? false, failCounts: false };
  const adapter: StatsAdapter = {
    async hasSeen() { return state.seen; },
    async addActive(day) { calls.push({ kind: 'active', day }); },
    async addCounts(day, counts) {
      if (state.failCounts) throw new Error('offline');
      calls.push({ kind: 'counts', day, counts });
    },
  };
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const t = new Telemetry({ adapter, storage, now: () => new Date(), getUid: () => state.uid, isOnline: () => state.online });
  return { t, calls, state, store, storage, adapter };
}

describe('telemetry logic', () => {
  it('normalizes: drops junk, floors, keeps correct <= questions', () => {
    expect(normalize({ sessions: 2.9, bogus: 4, questions: -1, mocks: NaN })).toEqual({ sessions: 2 });
    expect(normalize({ questions: 10, correct: 12 })).toEqual({ questions: 10, correct: 10 });
    expect(normalize({ correct: 3 })).toEqual({});
    expect(addCounts({ sessions: 1 }, { sessions: 2, questions: 5 })).toEqual({ sessions: 3, questions: 5 });
  });
  it('clamps one write to the caps and carries the rest over', () => {
    const { send, rest } = takeBatch({ questions: 1200, correct: 900, sessions: 70 });
    expect(send).toEqual({ questions: CAPS.questions, correct: CAPS.correct, sessions: CAPS.sessions });
    expect(rest).toEqual({ questions: 700, correct: 400, sessions: 20 });
    expect(takeBatch({ questions: 3, correct: 3 }).send.correct).toBeLessThanOrEqual(3);
  });
  it('decides when to flush', () => {
    const base = { uid: 'u', online: true, hasPending: true, needsActive: false, lastFlushDay: null, today: '2026-11-08', reason: 'timer' as const };
    expect(shouldFlush(base)).toBe(true);
    expect(shouldFlush({ ...base, uid: null })).toBe(false);
    expect(shouldFlush({ ...base, online: false })).toBe(false);
    expect(shouldFlush({ ...base, hasPending: false })).toBe(false);
    expect(shouldFlush({ ...base, lastFlushDay: '2026-11-08' })).toBe(false);
    expect(shouldFlush({ ...base, lastFlushDay: '2026-11-08', reason: 'hide' })).toBe(true);
    expect(shouldFlush({ ...base, hasPending: false, needsActive: true })).toBe(true);
  });
  it('uses the local date', () => {
    expect(localDay(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08');
  });
});

describe('Telemetry', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 8, 10, 0) }));
  afterEach(() => vi.useRealTimers());

  it('skips guests entirely', async () => {
    const { t, calls, store } = setup({ uid: null });
    expect(t.bump({ sessions: 1 })).toBe(false);
    await t.flush('hide');
    expect(calls).toEqual([]);
    expect(store.has(TELEMETRY_KEY)).toBe(false);
  });

  it('accumulates in storage, survives a reload, and sends one counters write plus the active batch', async () => {
    const a = setup();
    a.t.bump({ sessions: 1, questions: 10, correct: 7 });
    a.t.bump({ sessions: 1, questions: 5, correct: 5 });
    const b = new Telemetry({ adapter: a.adapter, storage: a.storage, now: () => new Date(), getUid: () => 'u1', isOnline: () => true });
    expect(b.pending()['2026-11-08']).toEqual({ sessions: 2, questions: 15, correct: 12 });
    await b.flush('timer');
    expect(a.calls.map((c) => c.kind)).toEqual(['active', 'counts']);
    expect(a.calls[1]!.counts).toEqual({ sessions: 2, questions: 15, correct: 12 });
    expect(b.hasPending()).toBe(false);
  });

  it('counts active once a day, skips it when the marker exists, never sends zero deltas', async () => {
    const a = setup({ seen: true });
    a.t.bump({ sessions: 1, questions: 0 });
    await a.t.flush('timer');
    expect(a.calls.map((c) => c.kind)).toEqual(['counts']);
    expect(a.calls[0]!.counts).toEqual({ sessions: 1 });
    a.t.bump({ mocks: 1 });
    await a.t.flush('hide');
    expect(a.calls.filter((c) => c.kind === 'active')).toHaveLength(0);
  });

  it('timer flushes once a day; page hide flushes again when data is pending', async () => {
    const a = setup();
    a.t.bump({ sessions: 1 });
    await a.t.flush('timer');
    a.t.bump({ sessions: 1 });
    await a.t.flush('timer');
    expect(a.calls.filter((c) => c.kind === 'counts')).toHaveLength(1);
    await a.t.flush('hide');
    expect(a.calls.filter((c) => c.kind === 'counts')).toHaveLength(2);
    await a.t.flush('hide');
    expect(a.calls.filter((c) => c.kind === 'counts')).toHaveLength(2);
  });

  it('offline: nothing is sent and nothing is lost; failures keep data for the retry', async () => {
    const a = setup({ online: false });
    a.t.bump({ questions: 4, correct: 2 });
    await a.t.flush('hide');
    expect(a.calls).toEqual([]);
    a.state.online = true;
    a.state.failCounts = true;
    await a.t.flush('hide');
    expect(a.t.hasPending()).toBe(true);
    a.state.failCounts = false;
    await a.t.flush('hide');
    expect(a.t.hasPending()).toBe(false);
  });

  it('day rollover: yesterday pending is sent to its own day', async () => {
    const a = setup();
    a.t.bump({ sessions: 1 });
    vi.setSystemTime(new Date(2026, 10, 9, 0, 5));
    a.t.bump({ sessions: 1 });
    await a.t.flush('timer');
    const days = a.calls.filter((c) => c.kind === 'counts').map((c) => c.day);
    expect(days).toEqual(['2026-11-08', '2026-11-09']);
  });

  it('large totals go out capped, the rest on the next flush', async () => {
    const a = setup();
    a.t.bump({ questions: 600, correct: 550 });
    await a.t.flush('timer');
    expect(a.calls.find((c) => c.kind === 'counts')!.counts).toEqual({ questions: 500, correct: 500 });
    expect(a.t.pending()['2026-11-08']).toEqual({ questions: 100, correct: 50 });
  });
});

describe('per-exam session counter', () => {
  it('GATE_DA has no per-exam counter, only sessions', () => {
    expect(sessionCounts({ exam: 'GATE_DA', answered: 5, correct: 3 })).toEqual({ sessions: 1, questions: 5, correct: 3 });
    expect(sessionCounts({ exam: 'IAT', answered: 1, correct: 1 })).toMatchObject({ sessions_IAT: 1 });
  });
});
