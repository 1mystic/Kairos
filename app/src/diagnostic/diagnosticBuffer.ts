import { openDB, type IDBPDatabase } from 'idb';
import type { DiagBuffered } from './diagnosticCore';

export interface DiagBuffer {
  load(): Promise<DiagBuffered | null>;
  save(s: DiagBuffered): Promise<void>;
  clear(): Promise<void>;
}

export const DIAG_DB = 'kairos-diagnostic';
const STALE_MS = 24 * 3600_000;

export function createIdbDiagBuffer(name = DIAG_DB): DiagBuffer | null {
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
      return ((await (await db()).get('active', 'current')) as DiagBuffered | undefined) ?? null;
    },
    async save(s) {
      await (await db()).put('active', s, 'current');
    },
    async clear() {
      await (await db()).delete('active', 'current');
    },
  };
}

export function createMemoryDiagBuffer(initial: DiagBuffered | null = null): DiagBuffer & { value: DiagBuffered | null; saves: number } {
  const b = {
    value: initial,
    saves: 0,
    async load() {
      return b.value ? structuredClone(b.value) : null;
    },
    async save(s: DiagBuffered) {
      b.saves++;
      b.value = structuredClone(s);
    },
    async clear() {
      b.value = null;
    },
  };
  return b;
}

let shared: DiagBuffer | undefined;
export function getDiagBuffer(): DiagBuffer {
  return (shared ??= createIdbDiagBuffer() ?? createMemoryDiagBuffer());
}
export function setDiagBuffer(b: DiagBuffer | undefined): void {
  shared = b;
}

export const isDiagResumable = (s: DiagBuffered | null, now: number): s is DiagBuffered =>
  !!s && s.answered.length > 0 && now - s.updatedAt < STALE_MS;
