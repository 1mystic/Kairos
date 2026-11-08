import { utf8Bytes } from './sha256';

export const MAX_QUESTIONS = 2000;
export const MAX_IMAGES = 300;
export const MAX_NEW_PER_DAY = 300;
export const MAX_DOC_BYTES = 50_000;
export const MAX_IMAGE_B64_CHARS = 120_000;

export function docSizeBytes(obj: unknown): number {
  return utf8Bytes(JSON.stringify(obj) ?? '').length;
}

export type QuotaCode = 'max_questions' | 'max_images' | 'daily_cap';
export interface QuotaReason {
  code: QuotaCode;
  message: string;
  /** how many of the requested items would still fit */
  allowed: number;
}
export interface QuotaRemaining {
  questions: number;
  images: number;
  today: number;
}
export type QuotaResult =
  | { ok: true; remaining: QuotaRemaining }
  | { ok: false; reasons: QuotaReason[]; remaining: QuotaRemaining };

export interface QuotaInput {
  existingQuestions: number;
  existingImages: number;
  adding: { questions: number; images?: number };
  addedToday: number;
}

export function checkQuota(i: QuotaInput): QuotaResult {
  const remaining: QuotaRemaining = {
    questions: Math.max(0, MAX_QUESTIONS - i.existingQuestions),
    images: Math.max(0, MAX_IMAGES - i.existingImages),
    today: Math.max(0, MAX_NEW_PER_DAY - i.addedToday),
  };
  const reasons: QuotaReason[] = [];
  const addQ = i.adding.questions;
  const addI = i.adding.images ?? 0;
  if (addQ > remaining.questions)
    reasons.push({
      code: 'max_questions',
      allowed: remaining.questions,
      message: `Your bank holds at most ${MAX_QUESTIONS} questions (${remaining.questions} slots left).`,
    });
  if (addI > remaining.images)
    reasons.push({
      code: 'max_images',
      allowed: remaining.images,
      message: `You can store at most ${MAX_IMAGES} images (${remaining.images} slots left).`,
    });
  if (addQ > remaining.today)
    reasons.push({
      code: 'daily_cap',
      allowed: remaining.today,
      message: `At most ${MAX_NEW_PER_DAY} new questions per day (${remaining.today} left today).`,
    });
  return reasons.length ? { ok: false, reasons, remaining } : { ok: true, remaining };
}

export function checkDocSize(obj: unknown): { ok: boolean; bytes: number } {
  const bytes = docSizeBytes(obj);
  return { ok: bytes <= MAX_DOC_BYTES, bytes };
}

export function checkImageB64(b64: string): boolean {
  return b64.length > 0 && b64.length <= MAX_IMAGE_B64_CHARS;
}
