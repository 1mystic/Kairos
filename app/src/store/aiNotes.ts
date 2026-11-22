import { AI_NOTE_MAX, AI_REF_CHAPTER_MAX, AI_REF_EXAM_MAX, AI_REF_STEM_MAX, type AiNote, type AiNoteRef, type AiProvider } from './types';

/** Question ids: u_ (user upload) or q_ (bank). Same rule for guest and cloud. */
export const AI_NOTE_QID = /^[qu]_[A-Za-z0-9_]{1,64}$/;
export const AI_PROVIDERS: readonly AiProvider[] = ['gemini', 'chatgpt', 'google', 'claude', 'perplexity', 'other'];

export function assertAiNoteQid(qid: string): void {
  if (typeof qid !== 'string' || !AI_NOTE_QID.test(qid)) throw new Error(`Bad question id for AI note: ${String(qid)}`);
}

export function isAiProvider(p: unknown): p is AiProvider {
  return typeof p === 'string' && (AI_PROVIDERS as readonly string[]).includes(p);
}

/** Clip to `max` UTF-16 units (string.length, as firestore.rules count) without splitting a surrogate pair. */
export function clipUtf16(s: string, max: number): string {
  if (s.length <= max) return s;
  let end = max;
  const c = s.charCodeAt(end - 1);
  if (c >= 0xd800 && c <= 0xdbff) end -= 1; // lone high surrogate at the cut
  return s.slice(0, end);
}

/** Trim, reject empty, clip to AI_NOTE_MAX UTF-16 units (never splits a surrogate pair). */
export function normaliseAiNoteInput(note: { text: string; provider: AiProvider }): { text: string; provider: AiProvider } {
  if (!isAiProvider(note.provider)) throw new Error(`Bad AI provider: ${String(note.provider)}`);
  const text = clipUtf16(String(note.text ?? '').trim(), AI_NOTE_MAX);
  if (text.length === 0) throw new Error('AI note is empty');
  return { text, provider: note.provider };
}

/** Plain-text snippet of a question stem for list display: images and markdown noise dropped, whitespace collapsed, clipped. */
export function stemSnippet(stem: string | null | undefined): string {
  const t = String(stem ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[`*_#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clipUtf16(t, AI_REF_STEM_MAX);
}

/**
 * Clean a question reference for storage: strings only, trimmed, clipped, empty exam/chapter/stem omitted
 * (firestore.rules want exam 1..20, chapter 1..40, stem 0..300 when present).
 */
export function normaliseAiRef(ref: AiNoteRef | undefined | null): AiNoteRef {
  const out: AiNoteRef = {};
  if (!ref) return out;
  const exam = typeof ref.exam === 'string' ? clipUtf16(ref.exam.trim(), AI_REF_EXAM_MAX) : '';
  const chapter = typeof ref.chapter === 'string' ? clipUtf16(ref.chapter.trim(), AI_REF_CHAPTER_MAX) : '';
  const stem = typeof ref.stem === 'string' ? clipUtf16(ref.stem.replace(/\s+/g, ' ').trim(), AI_REF_STEM_MAX) : '';
  if (exam) out.exam = exam;
  if (chapter) out.chapter = chapter;
  if (stem) out.stem = stem;
  return out;
}

/** The reference call sites pass to the note panel: exam id + taxonomy chapter + stem snippet of a question. */
export function aiRefOf(q: { stem?: string; tax?: { chapter?: string }; appearances?: Array<{ exam: string }> }, exam?: string): AiNoteRef {
  return normaliseAiRef({ exam: exam ?? q.appearances?.[0]?.exam, chapter: q.tax?.chapter, stem: stemSnippet(q.stem) });
}

/** Newest first by display time (updatedAt already prefers savedAt), qid as a stable tie-break. */
export const byNewest = (a: AiNote, b: AiNote): number => b.updatedAt - a.updatedAt || (a.qid < b.qid ? -1 : 1);
