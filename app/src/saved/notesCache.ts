import type { AiNote, UserStore } from '../store/types';

/**
 * One list read of the student's AI notes per session, shared by /saved and the analysis page (signed-in: one Firestore list read;
 * guests: IndexedDB, free). Kept per store instance; saving or deleting a note anywhere calls invalidateSavedNotes().
 */
let cache: { store: UserStore; notes: Promise<AiNote[]> } | null = null;

export function getSavedNotes(store: UserStore, opts: { fresh?: boolean } = {}): Promise<AiNote[]> {
  if (!cache || cache.store !== store || opts.fresh) {
    const notes = Promise.resolve().then(() => store.listAiNotes());
    const mine = { store, notes };
    cache = mine;
    notes.catch(() => { if (cache === mine) cache = null; });
  }
  return cache.notes;
}

export function invalidateSavedNotes(): void {
  cache = null;
}
