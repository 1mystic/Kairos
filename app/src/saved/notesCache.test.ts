import { describe, expect, it, vi } from 'vitest';
import type { UserStore } from '../store/types';
import { getSavedNotes, invalidateSavedNotes } from './notesCache';
import { countByChapter } from './useSavedCounts';

const mk = (list: () => Promise<unknown[]>) => ({ listAiNotes: vi.fn(list) }) as unknown as UserStore & { listAiNotes: ReturnType<typeof vi.fn> };

describe('getSavedNotes', () => {
  it('reads once per store until invalidated or forced fresh', async () => {
    invalidateSavedNotes();
    const s = mk(async () => []);
    await getSavedNotes(s);
    await getSavedNotes(s);
    expect(s.listAiNotes).toHaveBeenCalledTimes(1);
    invalidateSavedNotes();
    await getSavedNotes(s);
    await getSavedNotes(s, { fresh: true });
    expect(s.listAiNotes).toHaveBeenCalledTimes(3);
  });
  it('does not cache a failure, and survives a store without listAiNotes', async () => {
    invalidateSavedNotes();
    const bad = mk(async () => { throw new Error('x'); });
    await expect(getSavedNotes(bad)).rejects.toThrow();
    await expect(getSavedNotes(bad)).rejects.toThrow();
    expect(bad.listAiNotes).toHaveBeenCalledTimes(2);
    await expect(getSavedNotes({} as UserStore)).rejects.toThrow();
  });
});

describe('countByChapter', () => {
  it('counts notes per chapter and skips notes without one', () => {
    const n = (qid: string, chapter?: string) => ({ qid, text: 't', provider: 'claude' as const, updatedAt: 1, chapter });
    expect(countByChapter([n('q_1', 'PHY.LOM'), n('q_2', 'PHY.LOM'), n('q_3', 'BIO.CELL'), n('q_4')])).toEqual({ 'PHY.LOM': 2, 'BIO.CELL': 1 });
  });
});
