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

/**
 * The exam registry. `kind: 'exam'` has an official sitting (calendar or own date); `kind: 'interview'` is an interview-prep track
 * with no official date (a target date is optional). Keep the order: entrance exams first, then interview tracks.
 */
export const EXAMS = [
  { id: 'JEE_MAIN', label: 'JEE Main', kind: 'exam' },
  { id: 'NEET_UG', label: 'NEET UG', kind: 'exam' },
  { id: 'IAT', label: 'IAT', kind: 'exam' },
  { id: 'GATE_DA', label: 'GATE DA', kind: 'exam' },
  { id: 'DSA_INTERVIEW', label: 'DSA Interview', kind: 'interview' },
  { id: 'SYS_DESIGN', label: 'System Design', kind: 'interview' },
  { id: 'ML_SYS_DESIGN', label: 'AI/ML System Design', kind: 'interview' },
] as const;

/** Long names, for headings and the landing page. */
export const EXAM_LONG_NAMES: Record<string, string> = {
  JEE_MAIN: 'JEE Main', NEET_UG: 'NEET UG', IAT: 'IISER Aptitude Test', GATE_DA: 'GATE Data Science & AI',
  DSA_INTERVIEW: 'Data Structures & Algorithms interviews', SYS_DESIGN: 'System Design interviews', ML_SYS_DESIGN: 'AI/ML System Design interviews',
};

/** Subject names for the GATE DA taxonomy ids (the other subjects take their name from the taxonomy). */
export const GATE_SUBJECT_LABELS: Record<string, string> = {
  GA: 'General Aptitude', PRS: 'Probability & Statistics', LA: 'Linear Algebra', CO: 'Calculus & Optimization',
  PDS: 'Programming', DBW: 'Database & Warehousing', ML: 'Machine Learning', AI: 'Artificial Intelligence',
};
export type ExamId = (typeof EXAMS)[number]['id'];
export const isExamId = (s: string | undefined): s is ExamId => EXAMS.some((e) => e.id === s);
export type ExamKindOf = (typeof EXAMS)[number]['kind'];
/** True for interview-prep tracks (no official exam date). */
export const isInterviewExam = (s: string | undefined | null): boolean => EXAMS.some((e) => e.id === s && e.kind === 'interview');
export const examKindOf = (s: string | undefined | null): ExamKindOf | undefined => EXAMS.find((e) => e.id === s)?.kind;

/**
 * Primary exam id from the profile's PACKED exam string ("JEE_MAIN.1", "JEE_MAIN.2+NEET_UG.1@2027-05-03").
 * Also accepts a bare id ("JEE_MAIN"). Undefined when empty or unknown.
 */
export function primaryExamId(packed: string | undefined | null): ExamId | undefined {
  const id = (packed ?? '').split('+')[0]?.split('@')[0]?.split('.')[0] ?? '';
  return isExamId(id) ? id : undefined;
}

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
