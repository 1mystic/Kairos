import { providerLabel } from '../lib/askAi';
import { examLabel } from '../plan/syllabus';
import { clipUtf16 } from '../store/aiNotes';
import { searchNotes } from './search';
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
  /** '' = every chapter (taxonomy chapter id) */
  chapter?: string;
  sort: SortOrder;
  /** chapter id -> display name, so a search for "kinematics" finds notes by chapter */
  chapterNames?: Readonly<Record<string, string>>;
  /** chapter id -> topic names, also searched */
  topicNames?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Exam and chapter filters, then smart search (stemming, typo tolerance, weighted: chapter/topic > stem > note). With a query the
 * result is ranked by score; without one it follows the chosen date sort. Never mutates the input.
 */
export function filterNotes(notes: readonly AiNote[], f: SavedFilter): AiNote[] {
  const kept = notes.filter((n) => (!f.exam || n.exam === f.exam) && (!f.chapter || n.chapter === f.chapter));
  if (f.query.trim()) return searchNotes(kept, f.query, { chapterNames: f.chapterNames, topicNames: f.topicNames, meta: (n) => `${n.exam ? examLabel(n.exam) : ''} ${providerLabel(n.provider)}` });
  return kept.sort((a, b) => (f.sort === 'oldest' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt) || (a.qid < b.qid ? -1 : 1));
}

/** Exams present in the notes, in a stable order. */
export const examsIn = (notes: readonly AiNote[]): string[] => [...new Set(notes.map((n) => n.exam).filter((e): e is string => !!e))].sort();
