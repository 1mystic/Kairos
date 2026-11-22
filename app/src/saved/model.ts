import { providerLabel } from '../lib/askAi';
import { examLabel } from '../plan/syllabus';
import { clipUtf16 } from '../store/aiNotes';
import type { AiNote } from '../store/types';

export type SortOrder = 'newest' | 'oldest';

/** Short plain-text preview of a note: fences and markdown marks dropped, whitespace collapsed. */
export function notePreview(text: string, max = 220): string {
  const t = text
    .replace(/```[^\n]*\n[\s\S]*?\n\s*```/g, ' [code] ')
    .replace(/[`*_#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${clipUtf16(t, max).trimEnd()}...` : t;
}

/** What a list card shows as its title. */
export const noteTitle = (n: Pick<AiNote, 'qid' | 'stem'>): string => (n.stem?.trim() ? n.stem : `Question ${n.qid}`);

export interface SavedFilter {
  query: string;
  /** '' = every exam */
  exam: string;
  sort: SortOrder;
  /** chapter id -> display name, so a search for "kinematics" finds notes by chapter */
  chapterNames?: Readonly<Record<string, string>>;
}

/** Search (stem, note text, chapter, exam, provider, qid), exam filter and date sort. Never mutates the input. */
export function filterNotes(notes: readonly AiNote[], f: SavedFilter): AiNote[] {
  const q = f.query.trim().toLowerCase();
  const out = notes.filter((n) => {
    if (f.exam && n.exam !== f.exam) return false;
    if (!q) return true;
    const hay = [n.stem, n.text, n.qid, n.chapter, n.chapter && f.chapterNames?.[n.chapter], n.exam && examLabel(n.exam), providerLabel(n.provider)].filter(Boolean).join('\n').toLowerCase();
    return hay.includes(q);
  });
  return out.sort((a, b) => (f.sort === 'oldest' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt) || (a.qid < b.qid ? -1 : 1));
}

/** Exams present in the notes, in a stable order. */
export const examsIn = (notes: readonly AiNote[]): string[] => [...new Set(notes.map((n) => n.exam).filter((e): e is string => !!e))].sort();
