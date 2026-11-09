import { useCallback, useEffect, useRef, useState } from 'react';

export const ADMIN_CACHE_KEY = 'kairos-admin-cache-v1';
export const ADMIN_CACHE_TTL_MS = 10 * 60_000;

const mem = new Map<string, { at: number; data: unknown }>();

export function readAdminCache<T>(key: string, now = Date.now()): T | null {
  const m = mem.get(key);
  if (m && now - m.at < ADMIN_CACHE_TTL_MS) return m.data as T;
  try {
    const f = JSON.parse(sessionStorage.getItem(ADMIN_CACHE_KEY) ?? '{}') as Record<string, { at: number; data: unknown }>;
    const e = f[key];
    if (e && now - e.at < ADMIN_CACHE_TTL_MS) {
      mem.set(key, e);
      return e.data as T;
    }
  } catch {
    /* unavailable */
  }
  return null;
}
export function writeAdminCache(key: string, data: unknown, now = Date.now()): void {
  mem.set(key, { at: now, data });
  try {
    const f = JSON.parse(sessionStorage.getItem(ADMIN_CACHE_KEY) ?? '{}') as Record<string, unknown>;
    sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ ...f, [key]: { at: now, data } }));
  } catch {
    /* unavailable */
  }
}
export function clearAdminCache(): void {
  mem.clear();
  try {
    sessionStorage.removeItem(ADMIN_CACHE_KEY);
  } catch {
    /* unavailable */
  }
}

export interface CachedQuery<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  /** force a fresh read (the Refresh button) */
  reload(): void;
  /** read now (cache first); for queries that are not automatic */
  run(): void;
}

/** One read per key per 10 minutes (memory + sessionStorage). `auto: false` waits for run(). */
export function useCachedQuery<T>(key: string, load: () => Promise<T>, auto = true): CachedQuery<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null; fromCache: boolean }>(() => {
    const c = readAdminCache<T>(key);
    return { data: c, loading: false, error: null, fromCache: c !== null };
  });
  const loadRef = useRef(load);
  loadRef.current = load;

  const go = useCallback(
    (force: boolean) => {
      if (!force) {
        const c = readAdminCache<T>(key);
        if (c !== null) return setState({ data: c, loading: false, error: null, fromCache: true });
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      loadRef.current().then(
        (d) => {
          writeAdminCache(key, d);
          setState({ data: d, loading: false, error: null, fromCache: false });
        },
        (e: unknown) => setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'The read failed.' })),
      );
    },
    [key],
  );

  useEffect(() => {
    const c = readAdminCache<T>(key);
    setState({ data: c, loading: false, error: null, fromCache: c !== null });
    if (auto) go(false);
  }, [key, auto, go]);

  return { ...state, reload: () => go(true), run: () => go(false) };
}
