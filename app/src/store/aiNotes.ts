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

/** Trim, reject empty, clip to AI_NOTE_MAX code points (never splits a surrogate pair). */
export function normaliseAiNoteInput(note: { text: string; provider: AiProvider }): { text: string; provider: AiProvider } {
  if (!isAiProvider(note.provider)) throw new Error(`Bad AI provider: ${String(note.provider)}`);
  const text = Array.from(String(note.text ?? '').trim()).slice(0, AI_NOTE_MAX).join('');
  if (text.length === 0) throw new Error('AI note is empty');
  return { text, provider: note.provider };
}
