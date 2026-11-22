import {
  collection, deleteDoc, doc, documentId, getDoc, getDocs, limit as fsLimit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { SERVER_TIME } from './bankCloud';
import { assertAiNoteQid, normaliseAiNoteInput } from './aiNotes';
import { chunkOps } from './batching';
import type { AiNote, AiProvider, ListMocksOpts, ListSessionsOpts, MockDoc, PaceLogDoc, PlanDoc, Profile, SessionDoc, StateDocName, UserStore } from './types';

type Data = Record<string, unknown>;

/** Top-level SERVER_TIME placeholders (see bankCloud.ts) become serverTimestamp() just before a write. */
const stampServerTime = (d: Data): Data => {
  const out: Data = { ...d };
  for (const k of Object.keys(out)) if (out[k] === SERVER_TIME) out[k] = serverTimestamp();
  return out;
};
/** Firestore Timestamp (or number, or null while a local write is still pending) -> epoch ms. */
const toMs = (v: unknown): number => {
  if (v && typeof (v as { toMillis?: unknown }).toMillis === 'function') return (v as { toMillis: () => number }).toMillis();
  if (typeof v === 'number') return v;
  return Date.now();
};

/** The only Firestore surface FirestoreStore touches. Tests inject a fake. */
export interface FsAdapter {
  get(path: string): Promise<Data | null>;
  set(path: string, data: Data): Promise<void>;
  /** profile update: the adapter must stamp updatedAt (firestore.rules require it) */
  updateProfile(path: string, fields: Data): Promise<void>;
  list(collectionPath: string, opts?: { limit?: number; /** orderBy(documentId(), 'desc'): date-keyed collections, newest first */ newestById?: boolean }): Promise<Array<{ id: string; data: Data }>>;
  /**
   * Recent-first query on one numeric field: orderBy(field,'desc') + optional where(field,'>=',since) + limit.
   * Same field for filter and order, so no composite index is needed. Billed per document returned.
   */
  listRecent(collectionPath: string, q: { field: string; since?: number; limit: number }): Promise<Array<{ id: string; data: Data }>>;
  /** one atomic batch; callers keep it <= 400 ops */
  batchSet(ops: Array<{ path: string; data: Data }>): Promise<void>;
  /** delete one document (no-op when missing) */
  delete(path: string): Promise<void>;
}

/** Sessions returned by FirestoreStore.listSessions when the caller passes no limit (reads are billed per doc). */
export const DEFAULT_SESSION_LIMIT = 60;
/** Pass as `limit` to read every session (export only). */
export const ALL_SESSIONS = Number.POSITIVE_INFINITY;
/** Mocks returned by FirestoreStore.listMocks when the caller passes no limit. Pass Infinity to read every mock (export). */
export const DEFAULT_MOCK_LIMIT = 100;

/** pace_log docs returned by listPaceLog unless `all` (dashboard looks back 120 days). */
export const PACE_LOG_LIMIT = 130;
/** Short-lived memo of collection reads (Spark budget: Home -> Practice -> Home would otherwise re-bill the same docs). */
export const LIST_CACHE_MS = 30_000;

export function createFirestoreAdapter(db: Firestore, now: () => number = Date.now): FsAdapter {
  const ref = (p: string) => doc(db, p);
  type Rows = Array<{ id: string; data: Data }>;
  const memo = new Map<string, { at: number; rows: Rows }>();
  const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/'));
  /** any write under a collection drops that collection's memoised reads */
  const forget = (path: string) => {
    const col = parentOf(path);
    for (const k of memo.keys()) if (k.startsWith(`${col}\u0000`)) memo.delete(k);
  };
  const cached = async (path: string, key: string, load: () => Promise<Rows>): Promise<Rows> => {
    const k = `${path}\u0000${key}`;
    const hit = memo.get(k);
    if (hit && now() - hit.at < LIST_CACHE_MS) return [...hit.rows];
    const rows = await load();
    memo.set(k, { at: now(), rows });
    return [...rows];
  };
  const listRecentRaw = async (path: string, q: { field: string; since?: number; limit: number }): Promise<Rows> => {
    const cons = [
      ...(q.since !== undefined ? [where(q.field, '>=', q.since)] : []),
      orderBy(q.field, 'desc'),
      ...(Number.isFinite(q.limit) ? [fsLimit(q.limit)] : []),
    ];
    const snap = await getDocs(query(collection(db, path), ...cons));
    return snap.docs.map((d) => ({ id: d.id, data: d.data() as Data }));
  };
  return {
    async get(path) {
      const s = await getDoc(ref(path));
      return s.exists() ? (s.data() as Data) : null;
    },
    async set(path, data) {
      forget(path);
      try {
        await setDoc(ref(path), stampServerTime(data));
      } finally {
        forget(path); // offline, setDoc settles only on server ack: reads in between must not be served stale
      }
    },
    async updateProfile(path, fields) {
      await updateDoc(ref(path), { ...fields, updatedAt: serverTimestamp() });
    },
    list(path, opts) {
      return cached(path, `list:${opts?.limit ?? ''}:${opts?.newestById ? 'd' : ''}`, async () => {
        const c = collection(db, path);
        const cons = [...(opts?.newestById ? [orderBy(documentId(), 'desc')] : []), ...(opts?.limit ? [fsLimit(opts.limit)] : [])];
        const snap = await getDocs(cons.length ? query(c, ...cons) : c);
        return snap.docs.map((d) => ({ id: d.id, data: d.data() as Data }));
      });
    },
    listRecent(path, q) {
      return cached(path, `recent:${q.field}:${q.since ?? ''}:${q.limit}`, () => listRecentRaw(path, q));
    },
    async batchSet(ops) {
      const b = writeBatch(db);
      for (const o of ops) b.set(ref(o.path), stampServerTime(o.data));
      for (const o of ops) forget(o.path);
      try {
        await b.commit();
      } finally {
        for (const o of ops) forget(o.path);
      }
    },
    async delete(path) {
      forget(path);
      try {
        await deleteDoc(ref(path));
      } finally {
        forget(path);
      }
    },
  };
}

/** docs/03 paths under users/{uid}. Sessions are one doc per session. */
export class FirestoreStore implements UserStore {
  readonly kind = 'cloud' as const;
  /** `onProfileSaved` lets the app mirror a successful profile write into its in-memory profile (no extra read) */
  constructor(readonly uid: string, readonly fs: FsAdapter, private onProfileSaved?: (fields: Data) => void) {}
  private p(rest: string) {
    return `users/${this.uid}/${rest}`;
  }

  async getProfile() {
    return (await this.fs.get(`users/${this.uid}`)) as Profile | null;
  }
  async saveProfile(p: Parameters<UserStore['saveProfile']>[0]) {
    if ('kind' in p) throw new Error('Cannot write a guest profile to the cloud.');
    await this.fs.updateProfile(`users/${this.uid}`, p as Data);
    this.onProfileSaved?.(p as Data);
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
  /** One document read. */
  async getSession(id: string) {
    const d = await this.fs.get(this.p(`sessions/${id}`));
    return d ? ({ ...d, id } as SessionDoc) : null;
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
  /**
   * Newest first by submittedAt (single-field order, automatic index; mock docs always carry a numeric submittedAt,
   * see cbt/model.ts buildMockDoc). Default limit 100; Infinity reads everything.
   */
  async listMocks(opts: ListMocksOpts = {}) {
    const limit = opts.limit && opts.limit > 0 ? opts.limit : DEFAULT_MOCK_LIMIT;
    return (await this.fs.listRecent(this.p('mocks'), { field: 'submittedAt', limit })).map((r) => ({ ...r.data, id: r.id }) as MockDoc);
  }
  putPaceLog(date: string, p: PaceLogDoc) {
    return this.fs.set(this.p(`pace_log/${date}`), p);
  }
  /** Newest PACE_LOG_LIMIT days unless `all` (export). Doc ids are YYYY-MM-DD, so id order is date order. */
  async listPaceLog(opts?: { all?: boolean }) {
    return (await this.fs.list(this.p('pace_log'), opts?.all ? undefined : { limit: PACE_LOG_LIMIT, newestById: true })).map((r) => ({ ...r.data, date: r.id }) as PaceLogDoc & { date: string });
  }

  async getAiNote(qid: string): Promise<AiNote | null> {
    assertAiNoteQid(qid);
    const d = await this.fs.get(this.p(`ai_notes/${qid}`));
    if (!d) return null;
    return { qid, text: String(d.text ?? ''), provider: d.provider as AiProvider, updatedAt: toMs(d.updatedAt) };
  }
  /** ONE write: a full set of the doc with updatedAt = server time. */
  async putAiNote(qid: string, note: { text: string; provider: AiProvider }) {
    assertAiNoteQid(qid);
    const n = normaliseAiNoteInput(note);
    await this.fs.set(this.p(`ai_notes/${qid}`), { text: n.text, provider: n.provider, updatedAt: SERVER_TIME });
  }
  async deleteAiNote(qid: string) {
    assertAiNoteQid(qid);
    await this.fs.delete(this.p(`ai_notes/${qid}`));
  }

  // ----- cloud-only helpers used by migration -----
  async hasData(): Promise<boolean> {
    for (const c of ['sessions', 'mocks', 'plans', 'pace_log']) {
      if ((await this.fs.list(this.p(c), { limit: 1 })).length) return true;
    }
    return (await this.getState('mastery')) !== null || (await this.getState('pace')) !== null;
  }
  async existingIds(collectionName: 'sessions' | 'mocks' | 'plans' | 'pace_log' | 'ai_notes'): Promise<Set<string>> {
    return new Set((await this.fs.list(this.p(collectionName))).map((r) => r.id));
  }
  async batchWrite(ops: Array<{ path: string; data: Data }>) {
    for (const chunk of chunkOps(ops.map((o) => ({ path: this.p(o.path), data: o.data })), 400)) await this.fs.batchSet(chunk);
  }
}
