import { z } from 'zod';
import { questionTypeSchema, type QuestionType } from './question';

const marksSchema = z.object({ correct: z.number(), wrong: z.number(), blank: z.number() });

export const sectionSchema = z.looseObject({
  id: z.string().min(1),
  type: questionTypeSchema,
  count: z.number().int().positive(),
  marks: marksSchema,
  answer_format: z.string().optional(),
});

export const subjectSchema = z.looseObject({
  code: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
});

export const blueprintSchema = z.looseObject({
  id: z.string().min(1),
  exam: z.string().min(1),
  mode: z.string(),
  duration_min: z.number().positive(),
  ui_skin: z.string(),
  subjects: z.array(subjectSchema).min(1),
  chapter_weights: z.string().optional(),
  /** virtual blueprint subject code -> real taxonomy subjects (e.g. GATE DA -> PRS, LA, ...). */
  subject_map: z.record(z.string(), z.array(z.string().min(1))).optional(),
  difficulty_target: z.object({ p_correct_hist: z.array(z.number()) }).optional(),
  time_slots: z.array(z.string()),
});

export type Marks = z.infer<typeof marksSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;

export interface Slot {
  subject: string;
  sectionId: string;
  type: QuestionType;
  /** global 0-based position in the paper */
  index: number;
  /** 0-based position within its section */
  sectionIndex: number;
  marks: Marks;
}

export function parseBlueprint(json: unknown): Blueprint {
  return blueprintSchema.parse(json);
}

/**
 * Taxonomy subjects whose questions may fill a slot of blueprint subject `slotSubject`.
 * `[slotSubject]` when the blueprint has no (non-empty) mapping for it.
 */
export function resolveSubjects(b: Blueprint, slotSubject: string): string[] {
  const m = b.subject_map?.[slotSubject];
  return m && m.length > 0 ? [...m] : [slotSubject];
}

export function totalQuestions(b: Blueprint): number {
  return b.subjects.reduce((n, s) => n + s.sections.reduce((m, sec) => m + sec.count, 0), 0);
}

export function maxMarks(b: Blueprint): number {
  return b.subjects.reduce(
    (n, s) => n + s.sections.reduce((m, sec) => m + sec.count * sec.marks.correct, 0),
    0,
  );
}

export function sectionFor(b: Blueprint, subject: string, sectionId: string): Section | undefined {
  return b.subjects.find((s) => s.code === subject)?.sections.find((sec) => sec.id === sectionId);
}

/** Ordered slots: subjects in file order, sections in file order within each subject. */
export function flattenSlots(b: Blueprint): Slot[] {
  const out: Slot[] = [];
  for (const s of b.subjects) {
    for (const sec of s.sections) {
      for (let i = 0; i < sec.count; i++) {
        out.push({
          subject: s.code,
          sectionId: sec.id,
          type: sec.type,
          index: out.length,
          sectionIndex: i,
          marks: sec.marks,
        });
      }
    }
  }
  return out;
}
