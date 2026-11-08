import { openDB, type IDBPDatabase } from 'idb';
import type { Answer, Blueprint, PublicQuestion } from '@kairos/core';

/**
 * Locally generated mock papers. They never leave the device (guests and signed-in students alike),
 * and hold the answer key so the exam runner can grade them offline.
 * IndexedDB `kairos-generated`, object store `papers`, keyPath `paperId`.
 */
export interface GeneratedPaperRecord {
  /** `gen_<seed hex>` */
  paperId: string;
  seed: number;
  exam: string;
  blueprintId: string;
  /** the blueprint actually used (a cut-down copy for mini papers) so the paper opens offline */
  blueprint?: Blueprint;
  title: string;
  mini?: boolean;
  /** same order as the blueprint's slots, answers stripped */
  paper: PublicQuestion[];
  answers: Record<string, Answer | null>;
  createdAt: number;
  /** share of slots drawn from weak or unseen chapters (0 when tilt was off) */
  weakShare?: number;
}

export interface GeneratedStore {
  put(r: GeneratedPaperRecord): Promise<void>;
  get(paperId: string): Promise<GeneratedPaperRecord | null>;
  /** newest first */
  list(): Promise<GeneratedPaperRecord[]>;
  remove(paperId: string): Promise<void>;
}

export const GENERATED_DB = 'kairos-generated';
export const GENERATED_STORE = 'papers';
export const GEN_PREFIX = 'gen_';

export const isGeneratedId = (id: string): boolean => id.startsWith(GEN_PREFIX);
export const paperIdForSeed = (seed: number): string => `${GEN_PREFIX}${seed.toString(16).padStart(4, '0')}`;
/** "Paper #A4F2" */
export const paperCode = (seedOrId: number | string): string =>
  (typeof seedOrId === 'number' ? seedOrId.toString(16) : seedOrId.replace(GEN_PREFIX, '')).padStart(4, '0').toUpperCase();

export function createIdbGeneratedStore(name = GENERATED_DB): GeneratedStore | null {
  if (typeof indexedDB === 'undefined') return null;
  let dbp: Promise<IDBPDatabase> | undefined;
  const db = () =>
    (dbp ??= openDB(name, 1, {
      upgrade(d) {
        d.createObjectStore(GENERATED_STORE, { keyPath: 'paperId' });
      },
    }));
  return {
    async put(r) {
      await (await db()).put(GENERATED_STORE, r);
    },
    async get(id) {
      return ((await (await db()).get(GENERATED_STORE, id)) as GeneratedPaperRecord | undefined) ?? null;
    },
    async list() {
      const all = (await (await db()).getAll(GENERATED_STORE)) as GeneratedPaperRecord[];
      return all.sort((a, b) => b.createdAt - a.createdAt);
    },
    async remove(id) {
      await (await db()).delete(GENERATED_STORE, id);
    },
  };
}

export function createMemoryGeneratedStore(): GeneratedStore & { map: Map<string, GeneratedPaperRecord> } {
  const map = new Map<string, GeneratedPaperRecord>();
  return {
    map,
    async put(r) {
      map.set(r.paperId, structuredClone(r));
    },
    async get(id) {
      const r = map.get(id);
      return r ? structuredClone(r) : null;
    },
    async list() {
      return [...map.values()].map((r) => structuredClone(r)).sort((a, b) => b.createdAt - a.createdAt);
    },
    async remove(id) {
      map.delete(id);
    },
  };
}

let shared: GeneratedStore | undefined;
export function getGeneratedStore(): GeneratedStore {
  return (shared ??= createIdbGeneratedStore() ?? createMemoryGeneratedStore());
}
/** test hook */
export function setGeneratedStore(s: GeneratedStore | undefined): void {
  shared = s;
}
