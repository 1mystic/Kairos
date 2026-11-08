import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { UserQuestion } from '@kairos/core';
import { QuestionView } from '../components/QuestionView';
import { imageIdsOf, toPracticeQuestion } from '../store/bank';
import { useBankStore } from '../store/bankHooks';

/** Placeholder text for figures that are not cropped yet, so the preview reads sensibly. */
export function previewQuestion(q: UserQuestion): UserQuestion {
  if (q.pending_figures.length === 0) return q;
  const sub = (s: string) =>
    s.replace(/\{\{fig:(\d+)\}\}/g, (_m, k: string) => {
      const f = q.pending_figures.find((p) => p.k === Number(k));
      return `*[Figure ${k}${f ? `: ${f.alt.replace(/[\][*]/g, ' ')}` : ''}: crop it below]*`;
    });
  return {
    ...q,
    stem: sub(q.stem),
    ...(q.options ? { options: q.options.map((o) => ({ ...o, text: sub(o.text) })) } : {}),
    solution: q.solution == null ? q.solution : sub(q.solution),
  };
}

const ID_IN_SRC = /([0-9a-f]{16})\.w\d+\.webp/;

/** data URLs for the images of these questions: `local` (unsaved crops) first, then the bank media store. */
export function useMediaUrls(qs: readonly UserQuestion[], local?: ReadonlyMap<string, string>): ReadonlyMap<string, string> {
  const store = useBankStore();
  const [loaded, setLoaded] = useState<ReadonlyMap<string, string>>(new Map());
  const need = useMemo(() => [...imageIdsOf(qs)].filter((id) => !local?.has(id)).sort().join(','), [qs, local]);
  useEffect(() => {
    let live = true;
    const ids = need ? need.split(',') : [];
    void Promise.all(ids.map(async (id) => [id, await store.getMedia(id).catch(() => null)] as const)).then((rows) => {
      if (live) setLoaded(new Map(rows.filter((r): r is readonly [string, string] => !!r[1])));
    });
    return () => { live = false; };
  }, [need, store]);
  return useMemo(() => new Map([...loaded, ...(local ?? [])]), [loaded, local]);
}

/**
 * QuestionView (review variant) for a user question. QuestionView resolves `img:<id>` to bank CDN
 * urls, which do not exist for user images, so after render we point those <img> at the data URLs.
 */
export function UserQuestionPreview({ question, urls, showSolution = true }: { question: UserQuestion; urls: ReadonlyMap<string, string>; showSolution?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => toPracticeQuestion(previewQuestion(question)), [question]);
  useLayoutEffect(() => {
    box.current?.querySelectorAll('img').forEach((img) => {
      const id = ID_IN_SRC.exec(img.getAttribute('src') ?? '')?.[1];
      const u = id ? urls.get(id) : undefined;
      if (u && img.getAttribute('src') !== u) {
        img.removeAttribute('srcset');
        img.setAttribute('src', u);
      }
    });
  });
  return (
    <div ref={box}>
      <QuestionView question={shown} variant="review" showSolution={showSolution} />
    </div>
  );
}
