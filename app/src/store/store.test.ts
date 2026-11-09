import { FirestoreStore } from './FirestoreStore';
import { LocalStore } from './LocalStore';
import { createMemoryLocalDb } from './localDb';
import { BATCH_MAX, SESSION_CAP_DAYS, discardLocal, inspectMigration, runMigration } from './migrate';
import { fakeFs } from './testUtils';
import { bannerVisible, isFullScreenRoute, flushPending, loadNudge, requestNudge, saveNudge, snoozeBanner, trackActiveDay, type KV } from './nudgeLogic';

const NOW = Date.UTC(2026, 10, 8, 12);
const DAY = 86_400_000;
const sess = (id: string, ageDays = 0) => ({ id, startedAt: NOW - ageDays * DAY, summary: { n: 1 } });

async function seeded(n = 3) {
  const local = new LocalStore(createMemoryLocalDb());
  for (let i = 0; i < n; i++) await local.addSession(sess(`s${i}`, i));
  await local.putMock('m1', { id: 'm1', paperId: 'p' });
  await local.putPlan('2026-11-08', { tasks: [] });
  await local.putPaceLog('2026-11-08', { done: 1 });
  await local.putState('mastery', { t1: 1 });
  return local;
}

describe('stores', () => {
  it('LocalStore round-trips docs and filters sessions', async () => {
    const l = await seeded(3);
    expect((await l.listSessions()).map((s) => s.id)).toEqual(['s0', 's1', 's2']);
    expect(await l.listSessions({ since: NOW - 1.5 * DAY })).toHaveLength(2);
    expect(await l.getPlan('2026-11-08')).toEqual({ tasks: [] });
    expect(await l.getState('pace')).toBeNull();
  });
  it('FirestoreStore uses docs/03 paths', async () => {
    const f = fakeFs();
    const c = new FirestoreStore('u1', f.adapter);
    await c.addSession(sess('a'));
    await c.putState('pace', { W: 1 });
    await c.putMock('m', { id: 'm', paperId: 'p' });
    expect([...f.docs.keys()].sort()).toEqual(['users/u1/mocks/m', 'users/u1/sessions/a', 'users/u1/state/pace']);
    expect((await c.listSessions())[0]?.id).toBe('a');
  });
  it('getSession reads one doc (cloud) / one record (local), null when missing', async () => {
    const f = fakeFs();
    const c = new FirestoreStore('u1', f.adapter);
    await c.addSession(sess('old', 400));
    expect((await c.getSession('old'))?.id).toBe('old');
    expect(await c.getSession('nope')).toBeNull();
    const l = await seeded(2);
    expect((await l.getSession('s1'))?.id).toBe('s1');
    expect(await l.getSession('nope')).toBeNull();
  });
  it('cloud listMocks is newest-first and bounded (default 100, Infinity = all); local stays unbounded', async () => {
    const f = fakeFs();
    const c = new FirestoreStore('u1', f.adapter);
    for (let i = 0; i < 130; i++) await c.putMock(`m${i}`, { id: `m${i}`, paperId: 'p', submittedAt: 1000 + i });
    const some = await c.listMocks();
    expect(some).toHaveLength(100);
    expect(some[0]?.id).toBe('m129');
    expect(await c.listMocks({ limit: 5 })).toHaveLength(5);
    expect(await c.listMocks({ limit: Number.POSITIVE_INFINITY })).toHaveLength(130);
    expect(f.queries.at(-1)).toMatchObject({ field: 'submittedAt' });
    const l = new LocalStore(createMemoryLocalDb());
    for (let i = 0; i < 130; i++) await l.putMock(`m${i}`, { id: `m${i}`, paperId: 'p', submittedAt: i });
    expect(await l.listMocks({ limit: 5 })).toHaveLength(130);
  });
  it('cloud saveProfile reports the written fields to onProfileSaved', async () => {
    const seen: unknown[] = [];
    const c = new FirestoreStore('u1', fakeFs().adapter, (f) => seen.push(f));
    await c.saveProfile({ displayName: 'Asha' });
    expect(seen).toEqual([{ displayName: 'Asha' }]);
  });
  it('cloud saveProfile rejects guest profiles', async () => {
    const c = new FirestoreStore('u1', fakeFs().adapter);
    await expect(c.saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1 })).rejects.toThrow();
  });
});

describe('migration', () => {
  it('new account: uploads everything incl. state, then clears local and marks migratedTo', async () => {
    const local = await seeded(3);
    const f = fakeFs();
    const cloud = new FirestoreStore('u1', f.adapter);
    expect((await inspectMigration(local, cloud, NOW)).status).toBe('upload');
    const r = await runMigration(local, cloud, 'u1', 'new', NOW);
    expect(r.uploaded).toBe(7);
    expect(f.docs.has('users/u1/state/mastery')).toBe(true);
    expect(await local.hasData()).toBe(false);
    expect((await local.getMeta()).migratedTo).toBe('u1');
    expect((await inspectMigration(local, cloud, NOW)).status).toBe('none');
  });
  it('batches at <= 400 ops', async () => {
    const local = await seeded(0);
    for (let i = 0; i < 850; i++) await local.addSession(sess(`x${i}`));
    const f = fakeFs();
    await runMigration(local, new FirestoreStore('u1', f.adapter), 'u1', 'new', NOW);
    expect(Math.max(...f.batches)).toBeLessThanOrEqual(BATCH_MAX);
    expect(f.batches.reduce((a, b) => a + b, 0)).toBe(850 + 3 + 1);
  });
  it('existing account: asks, add appends new ids only and keeps cloud state', async () => {
    const local = await seeded(2);
    const f = fakeFs({
      'users/u1/sessions/s0': { id: 's0', startedAt: 1, cloud: true },
      'users/u1/state/mastery': { cloud: 1 },
    });
    const cloud = new FirestoreStore('u1', f.adapter);
    expect((await inspectMigration(local, cloud, NOW)).status).toBe('ask');
    const r = await runMigration(local, cloud, 'u1', 'merge', NOW);
    expect(f.docs.get('users/u1/sessions/s0')).toMatchObject({ cloud: true });
    expect(f.docs.has('users/u1/sessions/s1')).toBe(true);
    expect(f.docs.get('users/u1/state/mastery')).toEqual({ cloud: 1 });
    expect(r.uploaded).toBe(4); // s1, m1, plan, pace_log
    expect(await local.hasData()).toBe(false);
  });
  it('discard clears local without uploading', async () => {
    const local = await seeded(2);
    await discardLocal(local);
    expect(await local.hasData()).toBe(false);
  });
  it('is idempotent: a retry after a network drop resumes without duplicates', async () => {
    const local = await seeded(0);
    for (let i = 0; i < 500; i++) await local.addSession(sess(`x${i}`));
    const f = fakeFs();
    f.state.failBatchAt = 2;
    const cloud = new FirestoreStore('u1', f.adapter);
    await expect(runMigration(local, cloud, 'u1', 'new', NOW)).rejects.toThrow('network');
    expect(Object.keys((await local.getMeta()).migratedIds)).toHaveLength(BATCH_MAX);
    expect(await local.hasData()).toBe(true);
    const r = await runMigration(local, cloud, 'u1', 'new', NOW);
    expect(r.uploaded).toBe(500 + 3 + 1 - BATCH_MAX);
    expect(f.docs.size).toBe(504);
  });
  it('caps sessions at the last 60 days and reports the rest', async () => {
    const local = await seeded(0);
    await local.addSession(sess('new', 1));
    await local.addSession(sess('old', SESSION_CAP_DAYS + 5));
    const f = fakeFs();
    const cloud = new FirestoreStore('u1', f.adapter);
    const plan = await inspectMigration(local, cloud, NOW);
    expect(plan.skippedSessions).toBe(1);
    const r = await runMigration(local, cloud, 'u1', 'new', NOW);
    expect(r.skippedSessions).toBe(1);
    expect(f.docs.has('users/u1/sessions/new')).toBe(true);
    expect(f.docs.has('users/u1/sessions/old')).toBe(false);
  });
});

describe('nudge rules', () => {
  const d = (s: string) => new Date(`${s}T10:00:00`);
  it('shows each milestone once', () => {
    const a = requestNudge(loadNudge(mem()), 'first_session', d('2026-11-08'));
    expect(a.show).toBe('first_session');
    expect(requestNudge(a.state, 'first_session', d('2026-11-20')).show).toBeNull();
  });
  it('allows at most one modal per day and defers the other', () => {
    const a = requestNudge(loadNudge(mem()), 'first_session', d('2026-11-08'));
    const b = requestNudge(a.state, 'exam_date_set', d('2026-11-08'));
    expect(b.show).toBeNull();
    expect(b.state.pending).toEqual(['exam_date_set']);
    expect(flushPending(b.state, d('2026-11-08')).show).toBeNull();
    expect(flushPending(b.state, d('2026-11-09')).show).toBe('exam_date_set');
  });
  it('tracks active days once per day', () => {
    let s = loadNudge(mem());
    for (const day of ['2026-11-06', '2026-11-06', '2026-11-07', '2026-11-08']) s = trackActiveDay(s, d(day));
    expect(s.activeDays).toHaveLength(3);
  });
  it('banner snoozes for 7 days and persists', () => {
    const kv = mem();
    const t = d('2026-11-08').getTime();
    saveNudge(kv, snoozeBanner(loadNudge(kv), t));
    const s = loadNudge(kv);
    expect(bannerVisible(s, t + 6 * DAY)).toBe(false);
    expect(bannerVisible(s, t + 7 * DAY)).toBe(true);
  });
});

function mem(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('nudge routes', () => {
  it('treats exam runners and the diagnostic as full screen, not results or other pages', () => {
    expect(isFullScreenRoute('/exam/jee_main_mock_a')).toBe(true);
    expect(isFullScreenRoute('/diagnostic')).toBe(true);
    expect(isFullScreenRoute('/exam/jee_main_mock_a/result/m1')).toBe(false);
    expect(isFullScreenRoute('/mocks')).toBe(false);
    expect(isFullScreenRoute('/')).toBe(false);
  });
});
