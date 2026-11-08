import type { Manifest, Question } from '@kairos/core';
import { fakeStore, mkQ } from '../practice/fixtures.test-util';
import type { Taxonomy } from '../practice/taxonomy';
import type { UserStore } from '../store';

export { fakeStore, mkQ };

/** `perChapter` questions in each chapter, SCQ with answer B, b spread so selection is deterministic. */
export function synthBank(chapters: { id: string; subject: string }[], perChapter: number, over: (c: string, i: number) => Record<string, unknown> = () => ({})): Question[] {
  return chapters.flatMap((c) =>
    Array.from({ length: perChapter }, (_, i) =>
      mkQ(`${c.id}.${i}`, { tax: { subject: c.subject, chapter: c.id, topics: [] }, difficulty: { label: 'M', b: i * 0.5 - 0.5, p_correct: 0.5, median_time_s: 60 }, ...over(c.id, i) }),
    ),
  );
}

export function synthTaxonomy(chapters: { id: string; subject: string; name?: string }[]): Taxonomy {
  const subs = [...new Set(chapters.map((c) => c.subject))];
  return {
    subjects: subs.map((s) => ({
      id: s,
      name: s === 'PHY' ? 'Physics' : s,
      chapters: chapters.filter((c) => c.subject === s).map((c) => ({ id: c.id, name: c.name ?? `Chapter ${c.id}`, exams: { JEE_MAIN: true }, topics: [] })),
    })),
  };
}

export function synthManifest(bank: Question[], exam = 'JEE_MAIN'): Manifest {
  const by = new Map<string, number>();
  for (const q of bank) by.set(`${q.tax!.subject}/${q.tax!.chapter}`, (by.get(`${q.tax!.subject}/${q.tax!.chapter}`) ?? 0) + 1);
  return {
    version: 1,
    files: [...by].map(([k, count]) => ({ path: `${k}.json`, sha256: '', bytes: 0, kind: 'shard', exam, subject: k.split('/')[0], chapter: k.split('/')[1], count })),
  } as unknown as Manifest;
}

export function storeWith(profile: Record<string, unknown> | null, extra: Partial<UserStore> = {}) {
  const f = fakeStore({ getProfile: async () => profile, listMocks: async () => [], ...extra } as Partial<UserStore>);
  return f;
}
