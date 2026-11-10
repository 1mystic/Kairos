import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** DryRun keeps progress as a JSON object `{ [slug]: 1 }` in localStorage['dr-done']. Reads also accept an array of slugs. */
export const DONE_KEY = 'dr-done';
export const DONE_EVENT = 'kairos-dsa-done';

/** Tolerant parse: object (truthy values), array of slugs, empty or garbage -> set of solved slugs. */
export function parseDone(raw: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!raw) return out;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return out; }
  if (Array.isArray(v)) {
    for (const s of v) if (typeof s === 'string' && s) out.add(s);
  } else if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) if (val) out.add(k);
  }
  return out;
}

/** Always serialises as DryRun's object form so both UIs stay in sync. */
export function serializeDone(done: ReadonlySet<string>): string {
  const o: Record<string, 1> = {};
  for (const s of done) o[s] = 1;
  return JSON.stringify(o);
}

export function readDoneRaw(): string | null {
  try { return localStorage.getItem(DONE_KEY); } catch { return null; }
}

/** Set or clear one slug. Preserves other slugs, converts an array to the object form, notifies this tab. */
export function setDone(slug: string, value: boolean): Set<string> {
  const cur = parseDone(readDoneRaw());
  if (value) cur.add(slug); else cur.delete(slug);
  try { localStorage.setItem(DONE_KEY, serializeDone(cur)); } catch { /* storage full or blocked: UI still updates from memory next read */ }
  window.dispatchEvent(new Event(DONE_EVENT));
  return cur;
}

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === DONE_KEY) cb(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener(DONE_EVENT, cb);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(DONE_EVENT, cb);
  };
}

export function useDone(): { done: Set<string>; isDone(slug: string): boolean; set(slug: string, value: boolean): void } {
  const raw = useSyncExternalStore(subscribe, readDoneRaw, () => null);
  const done = useMemo(() => parseDone(raw), [raw]);
  const isDone = useCallback((s: string) => done.has(s), [done]);
  return { done, isDone, set: setDone };
}
