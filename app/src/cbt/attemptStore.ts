import { openDB, type IDBPDatabase } from 'idb';
import type { Attempt } from './model';

/** Where the in-progress attempt lives. IndexedDB in the app, in-memory in tests. */
export interface AttemptStore {
  get(paperId: string): Promise<Attempt | undefined>;
  put(attempt: Attempt): Promise<void>;
  delete(paperId: string): Promise<void>;
}

export const EXAM_DB_NAME = 'kairos-exam';
const STORE = 'attempts';

export function createIdbAttemptStore(name = EXAM_DB_NAME): AttemptStore {
  let opened: Promise<IDBPDatabase> | undefined;
  const db = () =>
    (opened ??= openDB(name, 1, {
      upgrade(d) {
        d.createObjectStore(STORE);
      },
    }));
  return {
    async get(paperId) {
      return (await (await db()).get(STORE, paperId)) as Attempt | undefined;
    },
    async put(a) {
      await (await db()).put(STORE, a, a.paperId);
    },
    async delete(paperId) {
      await (await db()).delete(STORE, paperId);
    },
  };
}

export function createMemoryAttemptStore(): AttemptStore & { map: Map<string, Attempt>; writes: number } {
  const map = new Map<string, Attempt>();
  const s = {
    map,
    writes: 0,
    async get(id: string) {
      const a = map.get(id);
      return a ? (structuredClone(a) as Attempt) : undefined;
    },
    async put(a: Attempt) {
      s.writes++;
      map.set(a.paperId, structuredClone(a));
    },
    async delete(id: string) {
      map.delete(id);
    },
  };
  return s;
}

let shared: AttemptStore | undefined;
/** Process-wide IndexedDB store (opened lazily). */
export function defaultAttemptStore(): AttemptStore {
  return (shared ??= createIdbAttemptStore());
}
