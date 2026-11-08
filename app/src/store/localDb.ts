import { openDB, type IDBPDatabase } from 'idb';

/** Minimal key-value surface LocalStore needs. Tests use MemoryLocalDb; the app uses IdbLocalDb. */
export const LOCAL_STORES = ['profile', 'state', 'sessions', 'plans', 'mocks', 'pace_log', 'meta'] as const;
export type LocalStoreName = (typeof LOCAL_STORES)[number];
export const DATA_STORES: LocalStoreName[] = ['state', 'sessions', 'plans', 'mocks', 'pace_log'];

export interface LocalDb {
  get(store: LocalStoreName, key: string): Promise<unknown | undefined>;
  put(store: LocalStoreName, key: string, value: unknown): Promise<void>;
  getAll(store: LocalStoreName): Promise<Array<{ key: string; value: unknown }>>;
  clear(store: LocalStoreName): Promise<void>;
}

export const GUEST_DB_NAME = 'kairos-guest';

export function createIdbLocalDb(name = GUEST_DB_NAME): LocalDb {
  let opened: Promise<IDBPDatabase> | undefined; // opened lazily so tests without indexedDB never touch it
  const dbp = () =>
    (opened ??= openDB(name, 1, {
      upgrade(db) {
        for (const s of LOCAL_STORES) db.createObjectStore(s);
      },
    }));
  return {
    async get(store, key) {
      return (await dbp()).get(store, key);
    },
    async put(store, key, value) {
      await (await dbp()).put(store, value, key);
    },
    async getAll(store) {
      const db = await dbp();
      const [keys, values] = await Promise.all([db.getAllKeys(store), db.getAll(store)]);
      return keys.map((k, i) => ({ key: String(k), value: values[i] }));
    },
    async clear(store) {
      await (await dbp()).clear(store);
    },
  };
}

export function createMemoryLocalDb(): LocalDb {
  const data = new Map<string, Map<string, unknown>>();
  const s = (n: string) => data.get(n) ?? data.set(n, new Map()).get(n)!;
  return {
    async get(store, key) {
      const v = s(store).get(key);
      return v === undefined ? undefined : structuredClone(v);
    },
    async put(store, key, value) {
      s(store).set(key, structuredClone(value));
    },
    async getAll(store) {
      return [...s(store).entries()].map(([key, value]) => ({ key, value: structuredClone(value) }));
    },
    async clear(store) {
      s(store).clear();
    },
  };
}
