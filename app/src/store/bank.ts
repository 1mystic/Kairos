/**
 * User question bank (W4d). Features read/write the user's uploaded questions through BankStore,
 * never IndexedDB/Firestore directly. Mirrors the UserStore split: LocalBankStore (guest / signed
 * out) and CloudBankStore (signed in). See docs/09_UPLOAD.md.
 *
 * LOCAL KEYS (for the guest -> cloud migration agent). Separate IndexedDB database so the guest
 * store schema is untouched:
 *   DB  `kairos-bank-user` (version 1)
 *     store `questions`    key = question id (`u_<12 hex>`)  value = UserQuestion (core/byo types)
 *     store `media`        key = image id (16 hex)           value = { b64, w, h, mime: 'image/webp', createdAt }
 *     store `media_cache`  cloud read cache, key = `${uid}/${imgId}`; ignore for migration
 * To migrate: BankStore.listQuestions() on the local store, then for every id in q.images call
 * getMediaRecord(id), then CloudBankStore.save(questions, media). Quotas still apply
 * (checkQuota in core/byo). Clear all three stores after a successful migration (clearAll()).
 *
 * CLOUD PATHS: `users/{uid}/bank/{qid}` (one doc per question) and `users/{uid}/media/{imgId}`
 * ({b64, w, h, mime, createdAt}, create-only, see firestore.rules).
 */
import { MAX_IMAGE_B64_CHARS, checkQuota, type Question, type QuotaResult, type UserQuestion } from '@kairos/core';

export interface MediaRecord {
  b64: string;
  w: number;
  h: number;
  mime: 'image/webp';
}
/** What putMedia accepts: raw bytes/blob or an already-encoded base64 string. */
export type MediaInput = { blob: Blob; w: number; h: number } | { bytes: Uint8Array; w: number; h: number } | { b64: string; w: number; h: number };

export interface BankUsage {
  questions: number;
  images: number;
  addedToday: number;
}

export interface BankStore {
  kind: 'local' | 'cloud';
  listQuestions(): Promise<UserQuestion[]>;
  putQuestions(qs: UserQuestion[]): Promise<void>;
  deleteQuestion(id: string): Promise<void>;
  putMedia(id: string, m: MediaInput): Promise<void>;
  /** data URL (`data:image/webp;base64,...`) or null when the image is not stored */
  getMedia(id: string): Promise<string | null>;
  /** raw record (used by migration and by save) */
  getMediaRecord(id: string): Promise<MediaRecord | null>;
  deleteMedia(id: string): Promise<void>;
  usage(): Promise<BankUsage>;
  /** questions + media in as few writes as possible (cloud: one batch when <= 400 ops) */
  save(qs: UserQuestion[], media: Array<{ id: string } & MediaInput>): Promise<void>;
  /** remove every question and image (guest sign-out, post-migration) */
  clearAll(): Promise<void>;
}

export const dataUrl = (b64: string) => `data:image/webp;base64,${b64}`;

export function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function toMediaRecord(m: MediaInput): Promise<MediaRecord> {
  let b64: string;
  if ('b64' in m) b64 = m.b64;
  else if ('bytes' in m) b64 = bytesToB64(m.bytes);
  else b64 = bytesToB64(new Uint8Array(await m.blob.arrayBuffer()));
  if (b64.length === 0 || b64.length > MAX_IMAGE_B64_CHARS) throw new Error('Image is too large to store.');
  return { b64, w: Math.round(m.w), h: Math.round(m.h), mime: 'image/webp' };
}

/** Distinct image ids referenced by a set of questions. */
export function imageIdsOf(qs: readonly Pick<UserQuestion, 'images'>[]): Set<string> {
  return new Set(qs.flatMap((q) => (q.images ?? []).map((i) => i.id)));
}

export function startOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function usageOf(qs: readonly UserQuestion[], now: number = Date.now()): BankUsage {
  const t0 = startOfLocalDay(now);
  return {
    questions: qs.length,
    images: imageIdsOf(qs).size,
    addedToday: qs.filter((q) => q.created_at >= t0).length,
  };
}

/** Strip undefined (Firestore rejects it) and app-only transient fields before persisting. */
export function toStoredQuestion(q: UserQuestion): Record<string, unknown> {
  return JSON.parse(JSON.stringify(q)) as Record<string, unknown>;
}

/** Quota check for a save: new questions only count when their id is not already in the bank. */
export async function checkSaveQuota(
  store: BankStore,
  qs: readonly UserQuestion[],
  newImages: number,
  now: number = Date.now(),
): Promise<QuotaResult> {
  const existing = await store.listQuestions();
  const have = new Set(existing.map((q) => q.id));
  const fresh = qs.filter((q) => !have.has(q.id)).length;
  const u = usageOf(existing, now);
  return checkQuota({
    existingQuestions: u.questions,
    existingImages: u.images,
    adding: { questions: fresh, images: newImages },
    addedToday: u.addedToday,
  });
}

/** Delete questions, then any image no remaining question uses. */
export async function deleteQuestionsAndOrphans(store: BankStore, ids: readonly string[]): Promise<void> {
  const all = await store.listQuestions();
  const gone = new Set(ids);
  const goneImgs = imageIdsOf(all.filter((q) => gone.has(q.id)));
  for (const id of ids) await store.deleteQuestion(id);
  const keep = imageIdsOf(all.filter((q) => !gone.has(q.id)));
  for (const img of goneImgs) if (!keep.has(img)) await store.deleteMedia(img);
}

/** Replace `img:<id>` markdown targets with data URLs, ONLY for ids present in `urls`. */
export function replaceImageTargets(md: string, urls: ReadonlyMap<string, string>): string {
  return md.replace(/!\[([^\]]*)\]\(img:([0-9a-f]{16})\)/g, (m, alt: string, id: string) => {
    const u = urls.get(id);
    return u ? `![${alt}](${u})` : m;
  });
}

/**
 * Copy of the question whose markdown has `img:<id>` swapped for data URLs for ids found in media.
 * NOTE: core renderContentHtml only understands `img:<id>` targets, so QuestionView cannot show
 * these swapped URLs yet (see report). The Review/bank previews use UserQuestionPreview instead.
 */
export async function resolveUserImages<Q extends Pick<UserQuestion, 'stem' | 'options' | 'solution' | 'passage' | 'images'>>(
  q: Q,
  store: Pick<BankStore, 'getMedia'>,
): Promise<Q> {
  const urls = new Map<string, string>();
  for (const im of q.images ?? []) {
    const u = await store.getMedia(im.id);
    if (u) urls.set(im.id, u);
  }
  if (urls.size === 0) return q;
  const sub = (s: string) => replaceImageTargets(s, urls);
  return {
    ...q,
    stem: sub(q.stem),
    ...(q.options ? { options: q.options.map((o) => ({ ...o, text: sub(o.text) })) } : {}),
    ...(q.solution != null ? { solution: sub(q.solution) } : {}),
    ...(q.passage != null ? { passage: sub(q.passage) } : {}),
  };
}

/** UserQuestion -> core Question (drops app-only fields). */
export function toPracticeQuestion(q: UserQuestion): Question {
  const rest: Record<string, unknown> = { ...q };
  for (const k of ['pending_figures', 'n', 'confidence', 'exam', 'created_at', 'owner', 'dropped', 'status']) delete rest[k];
  return rest as unknown as Question;
}

/** Shape of the practice agent's QuestionSource ({id, label, load}). */
export interface UserBankSource {
  id: 'my-bank';
  label: 'My questions';
  load(): Promise<Question[]>;
}

export function userBankSource(store: Pick<BankStore, 'listQuestions'>, opts: { includeSelfCheck?: boolean; exam?: string; chapter?: string } = {}): UserBankSource {
  return {
    id: 'my-bank',
    label: 'My questions',
    async load() {
      const all = await store.listQuestions();
      return all
        .filter((q) => (opts.includeSelfCheck ? true : q.status !== 'needs_answer') && !q.dropped && q.pending_figures.length === 0)
        .filter((q) => (opts.exam ? q.exam === opts.exam : true) && (opts.chapter ? q.tax?.chapter === opts.chapter : true))
        .map(toPracticeQuestion);
    },
  };
}
