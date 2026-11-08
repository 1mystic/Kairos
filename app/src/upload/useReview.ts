import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveFigure, type UserQuestion } from '@kairos/core';
import { bytesToB64, dataUrl } from '../store/bank';
import { imageRefOf, type CropResult } from './crop';
import { patchQuestion, validateItem, type ReviewItem } from './review';
import type { EditPatch } from './QuestionEditor';

export const REVALIDATE_MS = 300;

export interface CropRecord extends CropResult {
  url: string;
}

/** Review-screen state: edits, debounced re-validation, selection, bulk actions, unsaved crops. */
export function useReview(chapterIds: readonly string[]) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [crops, setCrops] = useState<ReadonlyMap<string, CropRecord>>(new Map());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const ids = useRef(chapterIds);
  ids.current = chapterIds;
  const itemsRef = useRef<ReviewItem[]>([]);

  itemsRef.current = items;
  useEffect(() => {
    const t = timers.current;
    return () => { t.forEach(clearTimeout); t.clear(); };
  }, []);

  const revalidate = useCallback((id: string) => {
    setItems((cur) => cur.map((it) => (it.q.id === id ? { ...it, issues: validateItem(it.q, ids.current) } : it)));
  }, []);

  const load = useCallback((qs: UserQuestion[]) => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    const next = qs.map((q) => ({ q, issues: validateItem(q, ids.current) }));
    setItems(next);
    setSelected(new Set(next.filter((i) => !i.issues.some((x) => x.severity === 'error')).map((i) => i.q.id)));
    setCrops(new Map());
  }, []);

  const edit = useCallback((id: string, patch: EditPatch) => {
    setItems((cur) => cur.map((it) => (it.q.id === id ? { ...it, q: patchQuestion(it.q, patch) } : it)));
    const t = timers.current;
    clearTimeout(t.get(id));
    t.set(id, setTimeout(() => { t.delete(id); revalidate(id); }, REVALIDATE_MS));
  }, [revalidate]);

  const applyCrop = useCallback((id: string, k: number, res: CropResult) => {
    const fig = itemsRef.current.find((i) => i.q.id === id)?.q.pending_figures.find((f) => f.k === k);
    if (!fig) return;
    const ref = imageRefOf(res, fig.alt);
    setCrops((cur) => new Map(cur).set(ref.id, { ...res, url: dataUrl(bytesToB64(res.bytes)) }));
    setItems((cur) => cur.map((it) => {
      if (it.q.id !== id) return it;
      const q = resolveFigure(it.q, k, ref);
      return { q, issues: validateItem(q, ids.current) };
    }));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const selectOk = useCallback(() => {
    setSelected(new Set(items.filter((i) => !i.issues.some((x) => x.severity === 'error')).map((i) => i.q.id)));
  }, [items]);
  const selectAll = useCallback(() => setSelected(new Set(items.map((i) => i.q.id))), [items]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const setChapterForSelected = useCallback((chapter: string) => {
    const ids2 = [...selected];
    setItems((cur) => cur.map((it) => (selected.has(it.q.id) ? (() => { const q = patchQuestion(it.q, { chapter }); return { q, issues: validateItem(q, ids.current) }; })() : it)));
    return ids2.length;
  }, [selected]);
  const dropSelected = useCallback(() => {
    setItems((cur) => cur.filter((it) => !selected.has(it.q.id)));
    setSelected(new Set());
  }, [selected]);

  /** fresh validation of what would be saved (the debounce may not have fired yet) */
  const snapshot = useCallback((): ReviewItem[] => {
    return items.filter((i) => selected.has(i.q.id)).map((i) => ({ q: i.q, issues: validateItem(i.q, ids.current) }));
  }, [items, selected]);

  const urls = useMemo(() => new Map([...crops].map(([id, c]) => [id, c.url])), [crops]);

  return { items, selected, crops, urls, load, edit, applyCrop, toggle, selectOk, selectAll, clearSelection, setChapterForSelected, dropSelected, snapshot, setItems };
}
export type ReviewState = ReturnType<typeof useReview>;
