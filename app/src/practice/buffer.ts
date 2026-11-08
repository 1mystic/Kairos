import { openDB, type IDBPDatabase } from 'idb';
import type { KairosEvent } from '@kairos/core';

/** Everything needed to resume a half-finished session after a refresh or crash. */
export interface BufferedSession {
  id: string;
  startedAt: number;
  exam: string;
  /** 'mixed' or a chapter id */
  chapter: string;
  chapters: string[];
  mode: 'timed' | 'relaxed';
  size: number;
  seed: number;
  /** question ids in queue order */
  qids: string[];
  /** index of the question on screen */
  index: number;
  events: KairosEvent[];
  /** 1-tap reasons by question id (raw chip ids) */
  reasons: Record<string, string>;
  /** question ids already checked */
  checked: string[];
  updatedAt: number;
}

/** Local buffer. The only writer is the session screen; it is cleared once the session is flushed. */
export interface SessionBuffer {
  load(): Promise<BufferedSession | null>;
  save(s: BufferedSession): Promise<void>;
  clear(): Promise<void>;
}

export const BUFFER_DB = 'kairos-practice';

export function createIdbBuffer(name = BUFFER_DB): SessionBuffer | null {
  if (typeof indexedDB === 'undefined') return null;
  let dbp: Promise<IDBPDatabase> | undefined;
  const db = () =>
    (dbp ??= openDB(name, 1, {
      upgrade(d) {
        d.createObjectStore('active');
      },
    }));
  return {
    async load() {
      return ((await (await db()).get('active', 'current')) as BufferedSession | undefined) ?? null;
    },
    async save(s) {
      await (await db()).put('active', s, 'current');
    },
    async clear() {
      await (await db()).delete('active', 'current');
    },
  };
}

export function createMemoryBuffer(initial: BufferedSession | null = null): SessionBuffer & { value: BufferedSession | null; saves: number } {
  const b = {
    value: initial,
    saves: 0,
    async load() {
      return b.value ? structuredClone(b.value) : null;
    },
    async save(s: BufferedSession) {
      b.saves++;
      b.value = structuredClone(s);
    },
    async clear() {
      b.value = null;
    },
  };
  return b;
}

let shared: SessionBuffer | null | undefined;
export function getSessionBuffer(): SessionBuffer {
  if (!shared) shared = createIdbBuffer() ?? createMemoryBuffer();
  return shared;
}
/** test hook */
export function setSessionBuffer(b: SessionBuffer | null | undefined): void {
  shared = b;
}

/** Fire-and-forget save that never throws into the UI. */
export function saveQuietly(buf: SessionBuffer, s: BufferedSession): void {
  buf.save(s).catch(() => {});
}

const STALE_MS = 12 * 3600_000;
/** A buffered session older than 12h is not offered for resume. */
export function isResumable(s: BufferedSession | null, now: number): s is BufferedSession {
  return !!s && s.qids.length > 0 && s.index < s.qids.length && now - s.updatedAt < STALE_MS;
}
