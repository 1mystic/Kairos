import { getLatestVersion } from '../bank/client';
import { BANK_BASE } from '../bank/config';
import type { AiNote } from '../store/types';

/** qid -> [exam, chapter]: bank/v{N}/qindex.json (one entry per published question; runtime-cached by the service worker bank rule). */
export type QIndex = Readonly<Record<string, readonly [string, string]>>;

let memo: Promise<QIndex> | undefined;
export function loadQIndex(): Promise<QIndex> {
  memo ??= (async () => {
    const v = await getLatestVersion();
    const res = await fetch(`${BANK_BASE}/v${v}/qindex.json`);
    if (!res.ok) throw new Error(`qindex: HTTP ${res.status}`);
    return (await res.json()) as QIndex;
  })();
  memo.catch(() => (memo = undefined));
  return memo;
}
export function resetQIndexMemo(): void {
  memo = undefined;
}

/** True when the note cannot be placed without the index. */
export const needsRef = (n: AiNote): boolean => !n.exam || !n.chapter;

/**
 * Fill exam/chapter from the index for notes that lack them (in memory only: nothing is written back; the reference is
 * stored only when the student saves the note again). Notes already carrying a reference, or unknown to the index, are returned as-is.
 */
export function resolveRefs(notes: readonly AiNote[], index: QIndex): AiNote[] {
  return notes.map((n) => {
    if (!needsRef(n)) return n;
    const hit = index[n.qid];
    return hit ? { ...n, exam: n.exam || hit[0], chapter: n.chapter || hit[1] } : n;
  });
}
