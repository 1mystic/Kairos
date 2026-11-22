import { useEffect, useState } from 'react';
import { useStore } from '../store';
import type { AiNote } from '../store/types';
import { getSavedNotes } from './notesCache';
import { loadQIndex, needsRef, resolveRefs } from './qindex';

/** chapter id -> number of saved notes. Notes without a reference are placed through the bank question index. */
export function countByChapter(notes: readonly AiNote[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of notes) if (n.chapter) out[n.chapter] = (out[n.chapter] ?? 0) + 1;
  return out;
}

/** Saved-answer counts per chapter for the analysis page. One cached list read; any failure just means no counts. */
export function useSavedCounts(): Record<string, number> {
  const store = useStore();
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    getSavedNotes(store).then(async (notes) => {
      let all = notes;
      if (notes.some(needsRef)) {
        try { all = resolveRefs(notes, await loadQIndex()); } catch { /* index unavailable: count what has a reference */ }
      }
      if (live) setCounts(countByChapter(all));
    }, () => { /* no counts */ });
    return () => { live = false; };
  }, [store]);
  return counts;
}
