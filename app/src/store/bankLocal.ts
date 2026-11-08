import type { UserQuestion } from '@kairos/core';
import { createIdbKv, type KvDb } from './bankDb';
import { toMediaRecord, usageOf, toStoredQuestion, type BankStore, type MediaInput, type MediaRecord, dataUrl } from './bank';

export const BANK_DB_NAME = 'kairos-bank-user';
export const BANK_STORES = ['questions', 'media', 'media_cache'] as const;

export const createBankIdb = (): KvDb => createIdbKv(BANK_DB_NAME, BANK_STORES);

type StoredMedia = MediaRecord & { createdAt: number };

/** Guest / signed-out bank: everything in IndexedDB `kairos-bank-user`. */
export class LocalBankStore implements BankStore {
  readonly kind = 'local' as const;
  constructor(private db: KvDb, private now: () => number = Date.now) {}

  async listQuestions() {
    const rows = await this.db.getAll('questions');
    return rows.map((r) => r.value as UserQuestion).sort((a, b) => a.created_at - b.created_at || a.n - b.n);
  }
  async putQuestions(qs: UserQuestion[]) {
    for (const q of qs) await this.db.put('questions', q.id, toStoredQuestion(q));
  }
  deleteQuestion(id: string) {
    return this.db.del('questions', id);
  }
  async putMedia(id: string, m: MediaInput) {
    const rec = await toMediaRecord(m);
    await this.db.put('media', id, { ...rec, createdAt: this.now() } satisfies StoredMedia);
  }
  async getMediaRecord(id: string) {
    const r = (await this.db.get('media', id)) as StoredMedia | undefined;
    return r ? { b64: r.b64, w: r.w, h: r.h, mime: 'image/webp' as const } : null;
  }
  async getMedia(id: string) {
    const r = await this.getMediaRecord(id);
    return r ? dataUrl(r.b64) : null;
  }
  deleteMedia(id: string) {
    return this.db.del('media', id);
  }
  async usage() {
    return usageOf(await this.listQuestions(), this.now());
  }
  async save(qs: UserQuestion[], media: Array<{ id: string } & MediaInput>) {
    for (const m of media) await this.putMedia(m.id, m); // images first: a question never points at a missing image
    await this.putQuestions(qs);
  }
  async clearAll() {
    await Promise.all(BANK_STORES.map((s) => this.db.clear(s)));
  }
}
