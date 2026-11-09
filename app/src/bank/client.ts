/**
 * Static question-bank client.
 *
 *   latest.json (network-first) -> v{N}/manifest.json -> shards / mock papers
 *
 * - Shards are `.json.gz` (served as application/gzip, no Content-Encoding), fetched as
 *   ArrayBuffer and gunzipped with DecompressionStream. If the server already decompressed
 *   (gzip magic 1f 8b missing) the bytes are parsed as JSON directly; the manifest sha256 is
 *   of the gz bytes so it can only be verified on the gzip path.
 * - Everything is validated with core `questionSchema` / `publicQuestionSchema`.
 * - Validated results are cached in IndexedDB (`kairos-bank`) keyed `{version}:{path}`;
 *   when latest.json changes, entries of older versions are purged.
 * - Manifest has no qid -> chapter index (unless it carries an optional `qindex`), so
 *   `getQuestionsByIds` builds one by loading every shard of the exam (cached after the first
 *   load, in memory per version+exam and in IndexedDB per shard).
 */
import { openDB, type IDBPDatabase } from 'idb';
import {
  latestSchema,
  manifestSchema,
  mockPaperSchema,
  shardSchema,
  type Manifest,
  type ManifestFile,
  type MockPaper,
  type Question,
} from '@kairos/core';

/** structural subset of a zod schema (app does not depend on zod directly) */
interface Schema<T> {
  safeParse(
    v: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}
import { BANK_BASE } from './config';

export type BankErrorCode = 'network' | 'http' | 'sha256' | 'schema' | 'missing';

export class BankError extends Error {
  constructor(
    public code: BankErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BankError';
  }
}

export type { Manifest, ManifestFile, MockPaper };

// ---------------------------------------------------------------- cache

export interface BankCache {
  get(key: string): Promise<unknown>;
  put(key: string, version: number, value: unknown): Promise<void>;
  /** delete every entry whose version != keep */
  purgeExcept(keep: number): Promise<void>;
  getLatest(): Promise<number | undefined>;
  setLatest(v: number): Promise<void>;
}

const DB_NAME = 'kairos-bank';

export function createIdbCache(name = DB_NAME): BankCache | null {
  if (typeof indexedDB === 'undefined') return null;
  let dbp: Promise<IDBPDatabase> | undefined;
  const db = () =>
    (dbp ??= openDB(name, 1, {
      upgrade(d) {
        d.createObjectStore('files').createIndex('v', 'v');
        d.createObjectStore('meta');
      },
    }));
  return {
    async get(key) {
      return ((await (await db()).get('files', key)) as { data: unknown } | undefined)?.data;
    },
    async put(key, v, data) {
      await (await db()).put('files', { v, data }, key);
    },
    async purgeExcept(keep) {
      const d = await db();
      const tx = d.transaction('files', 'readwrite');
      let cur = await tx.store.openCursor();
      while (cur) {
        if ((cur.value as { v: number }).v !== keep) await cur.delete();
        cur = await cur.continue();
      }
      await tx.done;
    },
    async getLatest() {
      return (await db()).get('meta', 'latest') as Promise<number | undefined>;
    },
    async setLatest(v) {
      await (await db()).put('meta', v, 'latest');
    },
  };
}

/** In-memory cache (tests / environments without IndexedDB). */
export function createMemoryCache(): BankCache & { entries: Map<string, { v: number; data: unknown }> } {
  const entries = new Map<string, { v: number; data: unknown }>();
  let latest: number | undefined;
  return {
    entries,
    async get(k) {
      return entries.get(k)?.data;
    },
    async put(k, v, data) {
      entries.set(k, { v, data });
    },
    async purgeExcept(keep) {
      for (const [k, e] of entries) if (e.v !== keep) entries.delete(k);
    },
    async getLatest() {
      return latest;
    },
    async setLatest(v) {
      latest = v;
    },
  };
}

let cache: BankCache | null | undefined; // undefined = lazily create the IDB cache
let base = BANK_BASE;
const memo = new Map<string, Promise<unknown>>();
const qindexMemo = new Map<string, Promise<Map<string, Question>>>();

/** Test hook / config override. Pass `null` to disable caching. */
export function configureBank(opts: { cache?: BankCache | null; base?: string }): void {
  if (opts.cache !== undefined) cache = opts.cache;
  if (opts.base !== undefined) base = opts.base.replace(/\/+$/, '');
  resetBankMemo();
}
export function resetBankMemo(): void {
  memo.clear();
  qindexMemo.clear();
}
function getCache(): BankCache | null {
  if (cache === undefined) cache = createIdbCache();
  return cache;
}
async function safe<T>(p: Promise<T> | undefined, fallback: T): Promise<T> {
  try {
    return (await p) ?? fallback;
  } catch {
    return fallback; // cache problems must never break the bank
  }
}

// ---------------------------------------------------------------- network helpers

async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new BankError('network', `fetch ${url} failed: ${e instanceof Error ? e.message : e}`);
  }
  if (!res.ok) throw new BankError('http', `fetch ${url}: HTTP ${res.status}`);
  return res;
}

export async function sha256Hex(buf: ArrayBuffer | Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', buf as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const isGzip = (b: Uint8Array) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

export async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BufferSource]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseWith<T>(schema: Schema<T>, json: unknown, what: string): T {
  const r = schema.safeParse(json);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new BankError('schema', `${what}: invalid (${i?.path.map(String).join('.')}: ${i?.message})`);
  }
  return r.data;
}

function parseJsonBytes(bytes: Uint8Array, what: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new BankError('schema', `${what}: not valid JSON`);
  }
}

/** cache -> network, verify sha256 against the manifest entry, parse, validate, cache. */
async function loadFile<T>(
  version: number,
  entry: ManifestFile,
  schema: Schema<T>,
  gz: boolean,
): Promise<T> {
  const key = `${version}:${entry.path}`;
  const c = getCache();
  const hit = await safe(c?.get(key), undefined);
  if (hit !== undefined) {
    const r = schema.safeParse(hit);
    if (r.success) return r.data;
  }
  const res = await fetchOk(`${base}/v${version}/${entry.path}`);
  const raw = new Uint8Array(await res.arrayBuffer());
  let bytes: Uint8Array = raw;
  const gzipped = isGzip(raw);
  if (!gz || gzipped) {
    const sha = await sha256Hex(raw);
    if (sha !== entry.sha256)
      throw new BankError('sha256', `${entry.path}: sha256 mismatch (expected ${entry.sha256}, got ${sha})`);
  }
  if (gz && gzipped) {
    try {
      bytes = await gunzip(raw);
    } catch {
      throw new BankError('schema', `${entry.path}: corrupt gzip`);
    }
  } // else: server already decompressed -> parse as-is
  const data = parseWith(schema, parseJsonBytes(bytes, entry.path), entry.path);
  await safe(c?.put(key, version, data), undefined);
  return data;
}

// ---------------------------------------------------------------- public API

/** Latest published bank version. Network-first (never HTTP-cached); falls back to the last seen version offline. */
export async function getLatestVersion(): Promise<number> {
  const c = getCache();
  let v: number;
  try {
    const res = await fetchOk(`${base}/latest.json`, { cache: 'no-store' });
    v = parseWith(latestSchema, await res.json(), 'latest.json').version;
  } catch (e) {
    const last = await safe(c?.getLatest(), undefined);
    if (last !== undefined) return last;
    throw e;
  }
  const prev = await safe(c?.getLatest(), undefined);
  if (prev !== v) {
    await safe(c?.purgeExcept(v), undefined);
    await safe(c?.setLatest(v), undefined);
  }
  return v;
}

export function getManifest(version: number): Promise<Manifest> {
  const key = `manifest:${version}`;
  let p = memo.get(key) as Promise<Manifest> | undefined;
  if (!p) {
    // manifest sha is not recorded anywhere; it is cached per version and validated structurally
    p = (async () => {
      const ck = `${version}:manifest.json`;
      const c = getCache();
      const hit = await safe(c?.get(ck), undefined);
      const parsed = hit !== undefined ? manifestSchema.safeParse(hit) : undefined;
      if (parsed?.success) return parsed.data;
      const res = await fetchOk(`${base}/v${version}/manifest.json`);
      const m = parseWith(manifestSchema, await res.json(), 'manifest.json');
      await safe(c?.put(ck, version, m), undefined);
      return m;
    })();
    p.catch(() => memo.delete(key));
    memo.set(key, p);
  }
  return p;
}

const shardsSchema = shardSchema;

function findShard(m: Manifest, exam: string, subject: string, chapter: string): ManifestFile {
  const e = m.files.find(
    (f) => f.kind === 'shard' && f.exam === exam && f.subject === subject && f.chapter === chapter,
  );
  if (!e) throw new BankError('missing', `no shard for ${exam}/${subject}/${chapter} in v${m.version}`);
  return e;
}

export async function getShard(
  version: number,
  exam: string,
  subject: string,
  chapter: string,
): Promise<Question[]> {
  const entry = findShard(await getManifest(version), exam, subject, chapter);
  return loadFile(version, entry, shardsSchema, true);
}

/** Mock paper with answers/solutions stripped (never shipped in the bank). */
export async function getMockPaper(version: number, paperId: string): Promise<MockPaper> {
  const m = await getManifest(version);
  const entry = m.files.find((f) => f.kind === 'mock' && f.paperId === paperId);
  if (!entry) throw new BankError('missing', `no mock paper ${paperId} in v${version}`);
  return (await loadFile(version, entry, mockPaperSchema, false)) as MockPaper;
}

/**
 * Questions for `ids` (order preserved, unknown ids skipped) among the shards of `exam`.
 * Uses `manifest.qindex` when present. Otherwise, with `chapterHint` (the chapters the ids came from, e.g. a
 * practice session's chapters) only those shards load first; ids still missing fall back to loading every
 * shard of the exam (cached after the first load, in memory per version+exam and in IndexedDB per shard).
 */
export async function getQuestionsByIds(
  version: number,
  exam: string,
  ids: readonly string[],
  chapterHint?: readonly string[],
): Promise<Question[]> {
  const m = await getManifest(version);
  const shards = m.files.filter((f) => f.kind === 'shard' && f.exam === exam);
  const index = (chapters: ManifestFile[], key: string): Promise<Map<string, Question>> => {
    let p = qindexMemo.get(key);
    if (!p) {
      p = (async () => {
        const idx = new Map<string, Question>();
        const loaded = await Promise.all(chapters.map((f) => loadFile(version, f, shardsSchema, true)));
        for (const qs of loaded) for (const q of qs) idx.set(q.id, q);
        return idx;
      })();
      p.catch(() => qindexMemo.delete(key));
      qindexMemo.set(key, p);
    }
    return p;
  };
  const pick = (idx: Map<string, Question>) => ids.map((id) => idx.get(id)).filter((q): q is Question => !!q);

  if (m.qindex) {
    const want = new Set(ids.map((id) => m.qindex![id]).filter((x): x is string => !!x));
    const chapters = shards.filter((f) => f.chapter && want.has(f.chapter));
    return pick(await index(chapters, `${version}:${exam}:${ids.join(',')}`));
  }
  const hint = chapterHint?.length ? new Set(chapterHint) : null;
  if (hint) {
    const part = pick(await index(shards.filter((f) => f.chapter && hint.has(f.chapter)), `${version}:${exam}:ch:${[...hint].sort().join(',')}`));
    if (part.length === ids.length) return part;
  }
  return pick(await index(shards, `${version}:${exam}:*`));
}
