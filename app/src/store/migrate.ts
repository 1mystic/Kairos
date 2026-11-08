import type { FirestoreStore } from './FirestoreStore';
import type { LocalStore } from './LocalStore';

export const SESSION_CAP_DAYS = 60;
export const BATCH_MAX = 400;
const DAY_MS = 86_400_000;

export interface MigrationPlan {
  /** none: nothing local. upload: cloud is empty, safe to upload. ask: cloud has data, ask the user. */
  status: 'none' | 'upload' | 'ask';
  counts: { sessions: number; mocks: number; plans: number; paceLog: number };
  /** sessions older than 60 days that will not be uploaded */
  skippedSessions: number;
}

export interface MigrationResult {
  uploaded: number;
  skippedSessions: number;
  mode: 'new' | 'merge';
}

type Op = { key: string; path: string; data: Record<string, unknown> };
const clean = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

async function gather(local: LocalStore, cutoff: number) {
  const [allSessions, mocks, plans, paceLog] = await Promise.all([
    local.listSessions(), local.listMocks(), local.listPlans(), local.listPaceLog(),
  ]);
  const sessions = allSessions.filter((s) => s.startedAt >= cutoff);
  return { sessions, mocks, plans, paceLog, skippedSessions: allSessions.length - sessions.length };
}

export async function inspectMigration(local: LocalStore, cloud: FirestoreStore, now = Date.now()): Promise<MigrationPlan> {
  if (!(await local.hasData())) return { status: 'none', counts: { sessions: 0, mocks: 0, plans: 0, paceLog: 0 }, skippedSessions: 0 };
  const g = await gather(local, now - SESSION_CAP_DAYS * DAY_MS);
  const status = (await cloud.hasData()) ? 'ask' : 'upload';
  return {
    status,
    counts: { sessions: g.sessions.length, mocks: g.mocks.length, plans: g.plans.length, paceLog: g.paceLog.length },
    skippedSessions: g.skippedSessions,
  };
}

/**
 * mode 'new': cloud is empty, upload everything incl. mastery/pace state.
 * mode 'merge': append sessions/mocks/plans/pace_log whose ids are not in the cloud; keep cloud state docs.
 * Idempotent: ids uploaded are recorded locally (meta.migratedIds) after each batch, so a retry resumes.
 * On success the local data is cleared and the DB is marked migratedTo: uid.
 */
export async function runMigration(local: LocalStore, cloud: FirestoreStore, uid: string, mode: 'new' | 'merge', now = Date.now()): Promise<MigrationResult> {
  const g = await gather(local, now - SESSION_CAP_DAYS * DAY_MS);
  const meta = await local.getMeta();
  const done = meta.migratedIds;
  const ops: Op[] = [];
  const add = (coll: string, id: string, data: Record<string, unknown>) => ops.push({ key: `${coll}/${id}`, path: `${coll}/${id}`, data: clean(data) });

  const existing = mode === 'merge'
    ? { sessions: await cloud.existingIds('sessions'), mocks: await cloud.existingIds('mocks'), plans: await cloud.existingIds('plans'), pace_log: await cloud.existingIds('pace_log') }
    : null;
  const fresh = (coll: 'sessions' | 'mocks' | 'plans' | 'pace_log', id: string) => !existing || !existing[coll].has(id);

  for (const s of g.sessions) if (fresh('sessions', s.id)) add('sessions', s.id, s);
  for (const m of g.mocks) if (fresh('mocks', m.id)) add('mocks', m.id, m);
  for (const p of g.plans) if (fresh('plans', p.date)) add('plans', p.date, p);
  for (const p of g.paceLog) if (fresh('pace_log', p.date)) add('pace_log', p.date, p);
  if (mode === 'new') {
    for (const d of ['mastery', 'pace'] as const) {
      const st = await local.getState(d);
      if (st) add('state', d, st);
    }
  }

  const todo = ops.filter((o) => !done[o.key]);
  for (let i = 0; i < todo.length; i += BATCH_MAX) {
    const chunk = todo.slice(i, i + BATCH_MAX);
    await cloud.batchWrite(chunk.map(({ path, data }) => ({ path, data })));
    for (const o of chunk) done[o.key] = true;
    await local.setMeta({ ...meta, migratedIds: done });
  }

  await local.setMeta({ migratedIds: done, migratedTo: uid });
  await local.clearData();
  await local.setMeta({ migratedIds: {}, migratedTo: uid });
  return { uploaded: todo.length, skippedSessions: g.skippedSessions, mode };
}

export async function discardLocal(local: LocalStore): Promise<void> {
  await local.clearData();
}
