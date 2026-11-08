import type { MasteryDoc, PlannerTopicMeta, TopicMastery } from '@kairos/core';
import { secondaryOnlyTopics } from '@kairos/core';
import type { Taxonomy, TaxChapter } from '../practice/taxonomy';

export const EXAM_LABELS: Record<string, string> = { JEE_MAIN: 'JEE Main', NEET_UG: 'NEET UG', IAT: 'IAT' };
export const examLabel = (id: string): string => EXAM_LABELS[id] ?? id;

/** Total marks per paper (docs/01 table), for the marks-cost estimates. */
export const PAPER_MARKS: Record<string, number> = { JEE_MAIN: 300, NEET_UG: 720, IAT: 240 };
export const DEFAULT_ITEM_MIN = 3;
/** Mastery assumed for a chapter with no practice yet: marked "done" in onboarding, or not started. */
export const PRIOR_DONE = 0.5;
export const PRIOR_NEW = 0.15;

const SUBJECT_CANON: Record<string, string> = { PHY: 'physics', CHE: 'chemistry', MAT: 'mathematics', BOT: 'biology', ZOO: 'biology' };
/** Planner subject name (lets core subjectBalance apply NEET biology ~50%, JEE thirds). */
export const canonicalSubject = (taxId: string): string => SUBJECT_CANON[taxId] ?? taxId.toLowerCase();
export const subjectLabel = (canon: string): string => canon.charAt(0).toUpperCase() + canon.slice(1);

export interface SyllabusChapter extends TaxChapter {
  subject: string;
}

/** Chapters flagged for an exam in the taxonomy. */
export function chaptersForExam(tax: Taxonomy, exam: string): SyllabusChapter[] {
  return tax.subjects.flatMap((s) => s.chapters.filter((c) => c.exams?.[exam] === true).map((c) => ({ ...c, subject: s.id })));
}

export interface Syllabus {
  /** chapter id -> planner meta (a chapter is one planning unit; weight is an equal split) */
  meta: Record<string, PlannerTopicMeta>;
  /** primary exam chapters plus the unique chapters of the secondary exams */
  chapters: string[];
  names: Record<string, string>;
  /** chapter id -> exam id whose practice shard to open (the first exam that has it) */
  examOf: Record<string, string>;
}

/** Equal weight per chapter (the taxonomy has no weights yet). `exams[0]` is the nearest exam and drives the syllabus. */
export function buildSyllabus(tax: Taxonomy, exams: readonly string[], itemMin = DEFAULT_ITEM_MIN): Syllabus {
  const primary = exams[0];
  const meta: Record<string, PlannerTopicMeta> = {};
  const names: Record<string, string> = {};
  const examOf: Record<string, string> = {};
  if (!primary) return { meta, chapters: [], names, examOf };
  const lists = exams.map((e) => chaptersForExam(tax, e));
  let ids = lists[0]!.map((c) => c.id);
  for (let i = 1; i < lists.length; i++) ids = [...ids, ...secondaryOnlyTopics(ids, lists[i]!.map((c) => c.id))];
  const idSet = new Set(ids);
  lists.forEach((list, i) => {
    for (const c of list) {
      if (!idSet.has(c.id)) continue;
      names[c.id] ??= c.name;
      examOf[c.id] ??= exams[i]!;
      meta[c.id] ??= { chapter: c.id, subject: canonicalSubject(c.subject), weight: 1 / ids.length, tMinPerItem: itemMin };
    }
  });
  return { meta, chapters: ids, names, examOf };
}

/**
 * Chapter-level mastery doc: the planner plans per chapter, while practice stores mastery per topic (or per chapter
 * when a chapter has no topics). Topic entries fold into one chapter entry (n-weighted theta, weakest memory).
 */
export function chapterMasteryDoc(doc: MasteryDoc | null | undefined, tax: Taxonomy): MasteryDoc {
  if (!doc) return {};
  const out: MasteryDoc = {};
  for (const s of tax.subjects)
    for (const c of s.chapters) {
      const ids = [c.id, ...c.topics.map((t) => t.id)].filter((id) => doc[id] && doc[id]!.n > 0);
      if (ids.length === 0) continue;
      if (ids.length === 1) {
        out[c.id] = doc[ids[0]!]!;
        continue;
      }
      const ms = ids.map((id) => doc[id]!);
      const n = ms.reduce((a, m) => a + m.n, 0);
      const wavg = (f: (m: TopicMastery) => number) => ms.reduce((a, m) => a + f(m) * m.n, 0) / n;
      const err: TopicMastery['err_mix'] = {};
      for (const m of ms) for (const [k, v] of Object.entries(m.err_mix)) (err as Record<string, number>)[k] = ((err as Record<string, number>)[k] ?? 0) + (v ?? 0);
      const weakest = ms.reduce((a, m) => (m.S < a.S ? m : a), ms[0]!);
      out[c.id] = { ...weakest, θ: wavg((m) => m.θ), rd: wavg((m) => m.rd), n, last: Math.max(...ms.map((m) => m.last)), due: Math.min(...ms.map((m) => m.due)), err_mix: err };
    }
  return out;
}
