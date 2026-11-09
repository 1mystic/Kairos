import { chunkOps } from './batching';
import { LocalStore } from './LocalStore';
import { FirestoreStore } from './FirestoreStore';
import { createMemoryLocalDb } from './localDb';
import { runMigration } from './migrate';
import { fakeFs } from './testUtils';

describe('chunkOps', () => {
  it('splits by op count', () => {
    const ops = Array.from({ length: 5 }, (_, i) => ({ data: { i } }));
    expect(chunkOps(ops, 2).map((c) => c.length)).toEqual([2, 2, 1]);
  });
  it('splits by payload size and never drops an oversize op', () => {
    const big = { data: { s: 'x'.repeat(600) } };
    const chunks = chunkOps([big, big, big], 400, 1000);
    expect(chunks.map((c) => c.length)).toEqual([1, 1, 1]);
    expect(chunkOps([], 400)).toEqual([]);
  });
});

describe('migration vs firestore.rules caps', () => {
  it('truncates sessions.events to 2000 and plans.tasks to 200, and moves the roadmap state', async () => {
    const NOW = Date.UTC(2026, 10, 8, 12);
    const local = new LocalStore(createMemoryLocalDb());
    await local.addSession({ id: 's', startedAt: NOW, events: Array.from({ length: 2500 }, (_, i) => i) });
    await local.putPlan('2026-11-08', { tasks: Array.from({ length: 250 }, (_, i) => i) });
    await local.putState('roadmap', { v: 1 });
    const f = fakeFs();
    await runMigration(local, new FirestoreStore('u1', f.adapter), 'u1', 'new', NOW);
    expect((f.docs.get('users/u1/sessions/s')!.events as unknown[]).length).toBe(2000);
    expect((f.docs.get('users/u1/plans/2026-11-08')!.tasks as unknown[]).length).toBe(200);
    expect(f.docs.get('users/u1/state/roadmap')).toEqual({ v: 1 });
  });
});
