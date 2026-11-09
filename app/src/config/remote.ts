import { doc, getDoc } from 'firebase/firestore';
import { getServices } from '../lib/firebase';

/** One Firestore read per config doc per TTL. Stale-while-revalidate; offline falls back to the cache, then to bundled defaults. */
export const CONFIG_CACHE_KEY = 'kairos-config-v1';
export const CONFIG_TTL_MS = 6 * 3_600_000;

type Raw = Record<string, unknown> | null;
interface Entry { at: number; data: Raw }
type CacheFile = Record<string, Entry>;

export interface ConfigEnv {
  fetchDoc(id: string): Promise<Raw>;
  now(): number;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
}

/** Firestore Timestamps -> epoch ms, recursively, so docs are JSON-safe for the cache. */
export function jsonSafe(v: unknown): unknown {
  if (v && typeof v === 'object') {
    const o = v as { toMillis?: () => number };
    if (typeof o.toMillis === 'function') return o.toMillis();
    if (Array.isArray(v)) return v.map(jsonSafe);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, jsonSafe(x)]));
  }
  return v;
}

const realEnv = (): ConfigEnv => ({
  async fetchDoc(id) {
    const { db } = getServices();
    const s = await getDoc(doc(db, 'config', id));
    return s.exists() ? (jsonSafe(s.data()) as Record<string, unknown>) : null;
  },
  now: () => Date.now(),
  storage: typeof localStorage === 'undefined' ? null : localStorage,
});

let env: ConfigEnv = realEnv();
const inflight = new Map<string, Promise<Raw | undefined>>();
const listeners = new Set<() => void>();

/** Tests: swap the environment (fetcher, clock, storage). Call with no argument to restore. */
export function setConfigEnv(over?: Partial<ConfigEnv>): void {
  env = over ? { ...realEnv(), ...over } : realEnv();
  inflight.clear();
}

function readCache(): CacheFile {
  try {
    const raw = env.storage?.getItem(CONFIG_CACHE_KEY);
    const f = raw ? (JSON.parse(raw) as CacheFile) : {};
    return f && typeof f === 'object' ? f : {};
  } catch {
    return {};
  }
}
function writeCache(id: string, e: Entry): void {
  try {
    env.storage?.setItem(CONFIG_CACHE_KEY, JSON.stringify({ ...readCache(), [id]: e }));
  } catch {
    /* private mode / quota */
  }
}

/** Cached doc at any age: `undefined` = never fetched; `null` = known not to exist. */
export function cachedConfigDoc(id: string): Raw | undefined {
  const e = readCache()[id];
  return e ? e.data : undefined;
}
export const configStamp = (id: string): number => readCache()[id]?.at ?? -1;
export const isFresh = (id: string): boolean => {
  const e = readCache()[id];
  return !!e && env.now() - e.at < CONFIG_TTL_MS;
};

/** Fetch only when the cache is missing or older than the TTL. Resolves to the doc, or `undefined` when the fetch failed. */
export function refreshConfigDoc(id: string, force = false): Promise<Raw | undefined> {
  if (!force && isFresh(id)) return Promise.resolve(cachedConfigDoc(id));
  const pending = inflight.get(id);
  if (pending) return pending;
  const p = env
    .fetchDoc(id)
    .then((data) => {
      writeCache(id, { at: env.now(), data });
      listeners.forEach((f) => f());
      return data;
    })
    .catch(() => undefined)
    .finally(() => {
      inflight.delete(id);
    });
  inflight.set(id, p);
  return p;
}

export const fetchConfigDoc = (id: string): Promise<Raw | undefined> => refreshConfigDoc(id, true);
export function subscribeConfig(f: () => void): () => void {
  listeners.add(f);
  return () => void listeners.delete(f);
}
