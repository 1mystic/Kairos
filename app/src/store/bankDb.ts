import { openDB, type IDBPDatabase } from 'idb';

/** Tiny keyed store surface shared by the bank stores and the upload page cache. Tests inject createMemoryKv(). */
export interface KvDb {
  get(store: string, key: string): Promise<unknown | undefined>;
  put(store: string, key: string, value: unknown): Promise<void>;
  del(store: string, key: string): Promise<void>;
  getAll(store: string): Promise<Array<{ key: string; value: unknown }>>;
  clear(store: string): Promise<void>;
}

export function createIdbKv(name: string, stores: readonly string[]): KvDb {
  let opened: Promise<IDBPDatabase> | undefined; // lazy: tests without indexedDB never touch it
  const dbp = () =>
    (opened ??= openDB(name, 1, {
      upgrade(db) {
        for (const s of stores) db.createObjectStore(s);
      },
    }));
  return {
    async get(store, key) {
      return (await dbp()).get(store, key);
    },
    async put(store, key, value) {
      await (await dbp()).put(store, value, key);
    },
    async del(store, key) {
      await (await dbp()).delete(store, key);
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

/** In-memory stand-in. Stores references (no structured clone) so Blobs/ArrayBuffers behave in jsdom. */
export function createMemoryKv(): KvDb {
  const data = new Map<string, Map<string, unknown>>();
  const s = (n: string) => data.get(n) ?? data.set(n, new Map()).get(n)!;
  return {
    async get(store, key) {
      return s(store).get(key);
    },
    async put(store, key, value) {
      s(store).set(key, value);
    },
    async del(store, key) {
      s(store).delete(key);
    },
    async getAll(store) {
      return [...s(store).entries()].map(([key, value]) => ({ key, value }));
    },
    async clear(store) {
      s(store).clear();
    },
  };
}
