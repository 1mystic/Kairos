import { z } from 'zod';

export const QUESTION_TYPES = [
  'SCQ',
  'MSQ',
  'NVQ',
  'INT',
  'MATCH',
  'PARA_CHILD',
  'ASSERT_REASON',
] as const;
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const answerSchema = z.union([
  z.object({ keys: z.array(z.string()).min(1) }),
  z.object({ value: z.number(), tol: z.number().min(0).optional() }),
  z.object({ range: z.tuple([z.number(), z.number()]) }),
]);
export type Answer = z.infer<typeof answerSchema>;

const optionSchema = z.object({ key: z.string().min(1), text: z.string() });

/** Base (unrefined) object so it can be `.omit`ted for the public shape. */
export const baseQuestionSchema = z.object({
  id: z.string().min(1),
  type: questionTypeSchema,
  stem: z.string(),
  images: z.array(z.string()).optional(),
  options: z.array(optionSchema).optional(),
  answer: answerSchema.nullable().optional(),
  solution: z.string().nullable().optional(),
  solution_source: z.enum(['official', 'in_house', 'llm_verified', 'user']).nullable().optional(),
  tax: z
    .object({
      subject: z.string(),
      chapter: z.string().optional(),
      topics: z.array(z.string()).optional(),
      concepts: z.array(z.string()).optional(),
    })
    .optional(),
  skills: z.array(z.string()).optional(),
  ncert_ref: z
    .object({ class: z.number(), chapter: z.number(), page: z.number().optional() })
    .optional(),
  appearances: z
    .array(
      z.object({
        exam: z.string(),
        year: z.number(),
        session: z.number().optional(),
        shift: z.string().optional(),
        qno: z.number().optional(),
      }),
    )
    .optional(),
  in_syllabus: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  difficulty: z
    .object({
      label: z.string().optional(),
      b: z.number().optional(),
      a: z.number().optional(),
      p_correct: z.number().optional(),
      median_time_s: z.number().optional(),
      n: z.number().optional(),
    })
    .optional(),
  source: z
    .object({
      kind: z.enum(['official', 'dataset', 'user', 'authored']),
      license: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  fingerprint: z
    .object({ simhash: z.string().optional(), emb_id: z.string().optional() })
    .optional(),
  status: z.enum(['verified', 'needs_review', 'quarantined']).optional(),
  version: z.number().optional(),
});

export const questionSchema = baseQuestionSchema.superRefine((q, ctx) => {
  const a = q.answer;
  if (!a) return;
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message, path: ['answer'] });
  if (q.type === 'SCQ' || q.type === 'MSQ' || q.type === 'ASSERT_REASON') {
    if (!('keys' in a)) return issue(`${q.type} needs a {keys} answer`);
    if (q.type !== 'MSQ' && a.keys.length !== 1) issue(`${q.type} needs exactly 1 key`);
    const optionKeys = new Set((q.options ?? []).map((o) => o.key));
    for (const k of a.keys) if (!optionKeys.has(k)) issue(`answer key ${k} not in options`);
  } else if (q.type === 'NVQ' || q.type === 'INT') {
    if ('keys' in a) return issue(`${q.type} needs a numeric answer ({value} or {range})`);
    if ('range' in a && a.range[0] > a.range[1]) issue('range must be [low, high]');
    if (q.type === 'INT' && 'value' in a && !Number.isInteger(a.value))
      issue('INT answer must be an integer');
  }
});
export type Question = z.infer<typeof questionSchema>;

export const publicQuestionSchema = baseQuestionSchema.omit({
  answer: true,
  solution: true,
  solution_source: true,
});
export type PublicQuestion = Omit<Question, 'answer' | 'solution' | 'solution_source'>;

export function parseQuestion(json: unknown): Question {
  return questionSchema.parse(json);
}

/** Remove everything that leaks the answer (mock shards, client delivery). */
export function stripAnswer(q: Question | PublicQuestion): PublicQuestion {
  const rest: Partial<Question> = { ...(q as Question) };
  delete rest.answer;
  delete rest.solution;
  delete rest.solution_source;
  return rest as PublicQuestion;
}

/** A student's response: chosen option keys, or a numeric entry (string from keypad or number). */
export type Response = { keys: string[] } | { value: number | string };
