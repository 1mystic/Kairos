import { doc, collection, deleteDoc, getDoc, getDocs, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { checkDocSize, type UserQuestion } from '@kairos/core';
import type { KvDb } from './bankDb';
import { chunkOps } from './batching';
import { dataUrl, toMediaRecord, toStoredQuestion, usageOf, type BankStore, type MediaInput, type MediaRecord } from './bank';

type Data = Record<string, unknown>;

/** Placeholder for `createdAt`: the real adapter swaps it for serverTimestamp() (rules need createdAt == request.time). */
export const SERVER_TIME = { __serverTime: true } as const;

/** The only Firestore surface CloudBankStore touches. Tests inject a fake. */
export interface BankFsAdapter {
  get(path: string): Promise<Data | null>;
  list(collectionPath: string): Promise<Array<{ id: string; data: Data }>>;
  /** one atomic batch; callers keep it <= 400 ops */
  batchSet(ops: Array<{ path: string; data: Data }>): Promise<void>;
  delete(path: string): Promise<void>;
}

export function createBankFirestoreAdapter(db: Firestore): BankFsAdapter {
  const ref = (p: string) => doc(db, p);
  return {
    async get(path) {
      const s = await getDoc(ref(path));
      return s.exists() ? (s.data() as Data) : null;
    },
    async list(path) {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => ({ id: d.id, data: d.data() as Data }));
    },
    async batchSet(ops) {
      const b = writeBatch(db);
      for (const o of ops) {
        const data: Data = {};
        for (const [k, v] of Object.entries(o.data)) data[k] = v === SERVER_TIME ? serverTimestamp() : v;
        b.set(ref(o.path), data);
      }
      await b.commit();
    },
    async delete(path) {
      await deleteDoc(ref(path));
    },
  };
}

export const BATCH_MAX = 400;

/** Signed-in bank: Firestore users/{uid}/bank + users/{uid}/media, blobs cached in IndexedDB. */
export class CloudBankStore implements BankStore {
  readonly kind = 'cloud' as const;
  private cache: UserQuestion[] | null = null;
  private pendingCache = new Map<string, MediaRecord>();
  constructor(readonly uid: string, private fs: BankFsAdapter, private cacheDb: KvDb, private now: () => number = Date.now) {}

  private bank = (id?: string) => `users/${this.uid}/bank${id ? `/${id}` : ''}`;
  private media = (id: string) => `users/${this.uid}/media/${id}`;
  private ck = (id: string) => `${this.uid}/${id}`;

  async listQuestions() {
    if (!this.cache) {
      const rows = await this.fs.list(this.bank());
      this.cache = rows
        .map((r) => ({ solution: null, pending_figures: [], images: [], ...r.data, id: r.id }) as unknown as UserQuestion)
        .sort((a, b) => a.created_at - b.created_at || a.n - b.n);
    }
    return [...this.cache];
  }
  private questionOps(qs: UserQuestion[]) {
    return qs.map((q) => {
      const data = toStoredQuestion({ ...q, owner: this.uid });
      if (!checkDocSize(data).ok) throw new Error(`Question ${q.n} is too long to store (limit 50 KB).`);
      return { path: this.bank(q.id), data };
    });
  }
  private async mediaOps(media: Array<{ id: string } & MediaInput>) {
    const ops: Array<{ path: string; data: Data }> = [];
    for (const m of media) {
      if (await this.fs.get(this.media(m.id))) continue; // media docs are create-only: never re-write an existing one
      const rec = await toMediaRecord(m);
      ops.push({ path: this.media(m.id), data: { b64: rec.b64, w: rec.w, h: rec.h, mime: rec.mime, createdAt: SERVER_TIME } });
      this.pendingCache.set(m.id, rec);
    }
    return ops;
  }
  private async commit(ops: Array<{ path: string; data: Data }>) {
    for (const chunk of chunkOps(ops, BATCH_MAX)) await this.fs.batchSet(chunk);
    this.cache = null;
    for (const [id, rec] of this.pendingCache) await this.cacheDb.put('media_cache', this.ck(id), rec);
    this.pendingCache.clear();
  }
  async putQuestions(qs: UserQuestion[]) {
    await this.commit(this.questionOps(qs));
  }
  async putMedia(id: string, m: MediaInput) {
    await this.commit(await this.mediaOps([{ id, ...m }]));
  }
  async save(qs: UserQuestion[], media: Array<{ id: string } & MediaInput>) {
    await this.commit([...(await this.mediaOps(media)), ...this.questionOps(qs)]);
  }
  async deleteQuestion(id: string) {
    await this.fs.delete(this.bank(id));
    this.cache = null;
  }
  async getMediaRecord(id: string): Promise<MediaRecord | null> {
    const hit = (await this.cacheDb.get('media_cache', this.ck(id))) as MediaRecord | undefined;
    if (hit) return hit;
    const d = await this.fs.get(this.media(id));
    if (!d) return null;
    const rec: MediaRecord = { b64: String(d.b64), w: Number(d.w), h: Number(d.h), mime: 'image/webp' };
    await this.cacheDb.put('media_cache', this.ck(id), rec);
    return rec;
  }
  async getMedia(id: string) {
    const r = await this.getMediaRecord(id);
    return r ? dataUrl(r.b64) : null;
  }
  async deleteMedia(id: string) {
    await this.fs.delete(this.media(id));
    await this.cacheDb.del('media_cache', this.ck(id));
  }
  async usage() {
    return usageOf(await this.listQuestions(), this.now());
  }
  async clearAll() {
    for (const q of await this.listQuestions()) await this.deleteQuestion(q.id);
  }
}
