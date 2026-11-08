import { masteryByChapter, type Aggregate, type Manifest, type MasteryDoc, type TopicMeta } from '@kairos/core';
import { BANK_BASE } from '../bank/config';
import { getLatestVersion } from '../bank/client';

export interface TaxChapter {
  id: string;
  name: string;
  class?: number;
  exams?: Record<string, boolean>;
  topics: { id: string; name: string }[];
}
export interface TaxSubject {
  id: string;
  name: string;
  chapters: TaxChapter[];
}
export interface Taxonomy {
  subjects: TaxSubject[];
}

export const EXAMS = [
  { id: 'JEE_MAIN', label: 'JEE Main' },
  { id: 'NEET_UG', label: 'NEET UG' },
  { id: 'IAT', label: 'IAT' },
] as const;
export type ExamId = (typeof EXAMS)[number]['id'];
export const isExamId = (s: string | undefined): s is ExamId => EXAMS.some((e) => e.id === s);

let taxMemo: Promise<Taxonomy> | undefined;
/** Taxonomy is published next to the manifest (`v{N}/taxonomy.json`), so it works offline via the SW cache. */
export function loadTaxonomy(): Promise<Taxonomy> {
  taxMemo ??= (async () => {
    const v = await getLatestVersion();
    const res = await fetch(`${BANK_BASE}/v${v}/taxonomy.json`);
    if (!res.ok) throw new Error(`taxonomy: HTTP ${res.status}`);
    return (await res.json()) as Taxonomy;
  })();
  taxMemo.catch(() => (taxMemo = undefined));
  return taxMemo;
}
export function resetTaxonomyMemo(): void {
  taxMemo = undefined;
}

export interface ChapterRow {
  id: string;
  name: string;
  subject: string;
  count: number;
}
export interface SubjectRows {
  id: string;
  name: string;
  chapters: ChapterRow[];
}

/** Subjects and chapters of one exam with the number of questions in each shard. */
export function buildChapterRows(tax: Taxonomy, manifest: Manifest, exam: string): SubjectRows[] {
  const counts = new Map<string, number>();
  for (const f of manifest.files)
    if (f.kind === 'shard' && f.exam === exam && f.chapter)
      counts.set(`${f.subject}/${f.chapter}`, f.count ?? 0);
  const out: SubjectRows[] = [];
  for (const s of tax.subjects) {
    const chapters = s.chapters
      .filter((c) => c.exams?.[exam] !== false && (c.exams?.[exam] || counts.has(`${s.id}/${c.id}`)))
      .map((c) => ({ id: c.id, name: c.name, subject: s.id, count: counts.get(`${s.id}/${c.id}`) ?? 0 }));
    if (chapters.length) out.push({ id: s.id, name: s.name, chapters });
  }
  return out;
}

/** topic id (and chapter id) -> chapter/subject, for core masteryByChapter. */
export function topicMeta(tax: Taxonomy): Record<string, TopicMeta> {
  const meta: Record<string, TopicMeta> = {};
  for (const s of tax.subjects)
    for (const c of s.chapters) {
      meta[c.id] = { chapter: c.id, subject: s.id };
      for (const t of c.topics) meta[t.id] = { chapter: c.id, subject: s.id };
    }
  return meta;
}

export function chapterMastery(doc: MasteryDoc | null | undefined, tax: Taxonomy): Record<string, Aggregate> {
  return doc ? masteryByChapter(doc, topicMeta(tax)) : {};
}

/** Plain words for the core confidence label. Never "weak" while the estimate is wide. */
export function masteryWords(a: Aggregate | undefined): { text: string; tone: 'neutral' | 'primary' | 'accent' } | null {
  if (!a || a.n === 0) return null;
  if (a.label === 'not_enough_data') return { text: 'Not enough data', tone: 'neutral' };
  const lvl = a.theta >= 0.4 ? 'strong' : a.theta <= -0.4 ? 'needs work' : 'steady';
  const tone = lvl === 'strong' ? 'primary' : lvl === 'needs work' ? 'accent' : 'neutral';
  return { text: `${a.label === 'rough' ? 'Rough: ' : 'Confident: '}${lvl}`, tone };
}

/** Lowest θ first, only where we are at least roughly sure; unknown chapters after. */
export function weakFirst<T extends { id: string }>(rows: T[], agg: Record<string, Aggregate>): T[] {
  const score = (id: string): number => {
    const a = agg[id];
    return a && a.label !== 'not_enough_data' ? a.theta : Number.POSITIVE_INFINITY;
  };
  return [...rows].sort((x, y) => score(x.id) - score(y.id));
}
