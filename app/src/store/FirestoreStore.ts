import {
  collection, doc, getDoc, getDocs, limit as fsLimit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { ListSessionsOpts, MockDoc, PaceLogDoc, PlanDoc, Profile, SessionDoc, StateDocName, UserStore } from './types';

type Data = Record<string, unknown>;

/** The only Firestore surface FirestoreStore touches. Tests inject a fake. */
export interface FsAdapter {
  get(path: string): Promise<Data | null>;
  set(path: string, data: Data): Promise<void>;
  /** profile update: the adapter must stamp updatedAt (firestore.rules require it) */
  updateProfile(path: string, fields: Data): Promise<void>;
  list(collectionPath: string, opts?: { limit?: number }): Promise<Array<{ id: string; data: Data }>>;
  /**
   * Recent-first query on one numeric field: orderBy(field,'desc') + optional where(field,'>=',since) + limit.
   * Same field for filter and order, so no composite index is needed. Billed per document returned.
   */
  listRecent(collectionPath: string, q: { field: string; since?: number; limit: number }): Promise<Array<{ id: string; data: Data }>>;
  /** one atomic batch; callers keep it <= 400 ops */
  batchSet(ops: Array<{ path: string; data: Data }>): Promise<void>;
}

/** Sessions returned by FirestoreStore.listSessions when the caller passes no limit (reads are billed per doc). */
export const DEFAULT_SESSION_LIMIT = 60;
/** Pass as `limit` to read every session (export only). */
export const ALL_SESSIONS = Number.POSITIVE_INFINITY;

export function createFirestoreAdapter(db: Firestore): FsAdapter {
  const ref = (p: string) => doc(db, p);
  return {
    async get(path) {
      const s = await getDoc(ref(path));
      return s.exists() ? (s.data() as Data) : null;
    },
    async set(path, data) {
      await setDoc(ref(path), data);
    },
    async updateProfile(path, fields) {
      await updateDoc(ref(path), { ...fields, updatedAt: serverTimestamp() });
    },
    async list(path, opts) {
      const c = collection(db, path);
      const snap = await getDocs(opts?.limit ? query(c, fsLimit(opts.limit)) : c);
      return snap.docs.map((d) => ({ id: d.id, data: d.data() as Data }));
    },
    async listRecent(path, q) {
      const cons = [
        ...(q.since !== undefined ? [where(q.field, '>=', q.since)] : []),
        orderBy(q.field, 'desc'),
        ...(Number.isFinite(q.limit) ? [fsLimit(q.limit)] : []),
      ];
      const snap = await getDocs(query(collection(db, path), ...cons));
      return snap.docs.map((d) => ({ id: d.id, data: d.data() as Data }));
    },
    async batchSet(ops) {
      const b = writeBatch(db);
      for (const o of ops) b.set(ref(o.path), o.data);
      await b.commit();
    },
  };
}

/** docs/03 paths under users/{uid}. Sessions are one doc per session. */
export class FirestoreStore implements UserStore {
  readonly kind = 'cloud' as const;
  constructor(readonly uid: string, readonly fs: FsAdapter) {}
  private p(rest: string) {
    return `users/${this.uid}/${rest}`;
  }

  async getProfile() {
    return (await this.fs.get(`users/${this.uid}`)) as Profile | null;
  }
  async saveProfile(p: Parameters<UserStore['saveProfile']>[0]) {
    if ('kind' in p) throw new Error('Cannot write a guest profile to the cloud.');
    await this.fs.updateProfile(`users/${this.uid}`, p as Data);
  }
  getState(d: StateDocName) {
    return this.fs.get(this.p(`state/${d}`));
  }
  putState(d: StateDocName, data: Data) {
    return this.fs.set(this.p(`state/${d}`), data);
  }
  addSession(s: SessionDoc) {
    return this.fs.set(this.p(`sessions/${s.id}`), s);
  }
  /**
   * A real query (newest first), so only the returned docs are billed. Default limit 60; pass
   * ALL_SESSIONS to read everything. `since` and ordering use startedAt (single-field index, automatic).
   */
  async listSessions(opts: ListSessionsOpts = {}) {
    const limit = opts.limit && opts.limit > 0 ? opts.limit : DEFAULT_SESSION_LIMIT;
    const rows = await this.fs.listRecent(this.p('sessions'), { field: 'startedAt', limit, ...(opts.since !== undefined ? { since: opts.since } : {}) });
    return rows.map((r) => ({ ...r.data, id: r.id }) as SessionDoc);
  }
  putPlan(date: string, plan: PlanDoc) {
    return this.fs.set(this.p(`plans/${date}`), plan);
  }
  getPlan(date: string) {
    return this.fs.get(this.p(`plans/${date}`)) as Promise<PlanDoc | null>;
  }
  async listPlans() {
    return (await this.fs.list(this.p('plans'))).map((r) => ({ ...r.data, date: r.id }) as PlanDoc & { date: string });
  }
  putMock(id: string, m: MockDoc) {
    return this.fs.set(this.p(`mocks/${id}`), { ...m, id });
  }
  async listMocks() {
    return (await this.fs.list(this.p('mocks'))).map((r) => ({ ...r.data, id: r.id }) as MockDoc);
  }
  putPaceLog(date: string, p: PaceLogDoc) {
    return this.fs.set(this.p(`pace_log/${date}`), p);
  }
  async listPaceLog() {
    return (await this.fs.list(this.p('pace_log'))).map((r) => ({ ...r.data, date: r.id }) as PaceLogDoc & { date: string });
  }

  // ----- cloud-only helpers used by migration -----
  async hasData(): Promise<boolean> {
    for (const c of ['sessions', 'mocks', 'plans', 'pace_log']) {
      if ((await this.fs.list(this.p(c), { limit: 1 })).length) return true;
    }
    return (await this.getState('mastery')) !== null || (await this.getState('pace')) !== null;
  }
  async existingIds(collectionName: 'sessions' | 'mocks' | 'plans' | 'pace_log'): Promise<Set<string>> {
    return new Set((await this.fs.list(this.p(collectionName))).map((r) => r.id));
  }
  batchWrite(ops: Array<{ path: string; data: Data }>) {
    return this.fs.batchSet(ops.map((o) => ({ path: this.p(o.path), data: o.data })));
  }
}
