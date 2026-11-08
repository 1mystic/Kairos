import raw from '../../../content/taxonomy/taxonomy.json';

export const EXAMS = [
  { id: 'JEE_MAIN', label: 'JEE Main', blurb: 'Physics, Chemistry, Mathematics' },
  { id: 'NEET_UG', label: 'NEET UG', blurb: 'Physics, Chemistry, Biology' },
  { id: 'IAT', label: 'IAT', blurb: 'IISER Aptitude Test' },
] as const;
export type ExamId = (typeof EXAMS)[number]['id'];
export const examLabel = (id: string) => EXAMS.find((e) => e.id === id)?.label ?? id;

export interface Chapter {
  id: string;
  name: string;
  subject: string;
  subjectName: string;
}
interface RawTax {
  subjects: { id: string; name: string; chapters: { id: string; name: string; exams?: Record<string, boolean> }[] }[];
}

const tax = raw as unknown as RawTax;

/** Chapters of the taxonomy that are in the syllabus of `exam` (by the taxonomy exam flags). */
export function chaptersForExam(exam: string): Chapter[] {
  return tax.subjects.flatMap((s) =>
    s.chapters
      .filter((c) => c.exams?.[exam])
      .map((c) => ({ id: c.id, name: c.name, subject: s.id, subjectName: s.name })),
  );
}

export function chapterGroups(exam: string): { subject: string; name: string; chapters: Chapter[] }[] {
  const out: { subject: string; name: string; chapters: Chapter[] }[] = [];
  for (const c of chaptersForExam(exam)) {
    let g = out.find((x) => x.subject === c.subject);
    if (!g) out.push((g = { subject: c.subject, name: c.subjectName, chapters: [] }));
    g.chapters.push(c);
  }
  return out;
}

/** Every chapter of any exam (for showing a name regardless of the exam picked). */
export function chapterName(id: string): string {
  for (const s of tax.subjects) for (const c of s.chapters) if (c.id === id) return c.name;
  return id;
}
