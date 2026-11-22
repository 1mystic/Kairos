import { AI_NOTE_MAX, type AiProvider } from './types';

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
