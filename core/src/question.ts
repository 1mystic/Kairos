import { z } from 'zod';
import { IMG_TARGET_RE, MD_IMAGE_REF_RE, MD_IMAGE_RE } from './markdown';

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

/**
 * Mirrors pipeline/schema.py `ImageRef`. id = sha256(source bytes)[:16]; `variants` are the
 * actually generated widths (e.g. [480, 659]) and w = max(variants). Never assume 960.
 */
export const imageRefSchema = z
  .object({
    id: z.string().regex(/^[0-9a-f]{16}$/),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
    alt: z.string().min(1).refine((a) => a.trim().length > 0, 'alt must not be blank'),
    variants: z.array(z.number().int().positive()).min(1),
  })
  .strict()
  .superRefine((im, ctx) => {
    if (new Set(im.variants).size !== im.variants.length)
      ctx.addIssue({ code: 'custom', message: 'variants must be unique', path: ['variants'] });
    if (Math.max(...im.variants) !== im.w)
      ctx.addIssue({ code: 'custom', message: 'w must equal the largest variant width', path: ['w'] });
  });
export type ImageRef = z.infer<typeof imageRefSchema>;

/** Every `![alt](img:<id>)` is declared, every declared image referenced, no other image syntax. */
function checkImages(
  q: {
    stem: string;
    solution?: string | null;
    passage?: string | null;
    options?: { text: string }[];
    images?: { id: string }[];
  },
  ctx: z.RefinementCtx,
): void {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message, path: ['images'] });
  const texts = [q.stem, q.solution ?? '', q.passage ?? '', ...(q.options ?? []).map((o) => o.text)];
  const used = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(MD_IMAGE_RE)) {
      const t2 = IMG_TARGET_RE.exec(m[2]!.trim());
      if (!t2) issue(`image target '${m[2]}' not allowed (use ![alt](img:<id>))`);
      else {
        used.add(t2[1]!);
        if (!m[1]!.trim()) issue(`image img:${t2[1]} has empty alt text in markdown`);
      }
    }
    if (MD_IMAGE_REF_RE.test(t)) issue('reference-style images not allowed (use ![alt](img:<id>))');
  }
  const declared = (q.images ?? []).map((i) => i.id);
  if (new Set(declared).size !== declared.length) issue('duplicate image ids');
  for (const u of [...used].sort()) if (!declared.includes(u)) issue(`img:${u} referenced but not declared in images`);
  for (const d of [...new Set(declared)].sort()) if (!used.has(d)) issue(`${d} declared but never referenced`);
}

/** Base (unrefined) object so it can be `.omit`ted for the public shape. */
export const baseQuestionSchema = z.object({
  id: z.string().min(1),
  type: questionTypeSchema,
  stem: z.string(),
  images: z.array(imageRefSchema).optional(),
  passage_id: z.string().optional(),
  passage: z.string().nullable().optional(),
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
  checkImages(q, ctx);
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

export const publicQuestionSchema = baseQuestionSchema
  .omit({ answer: true, solution: true, solution_source: true })
  .superRefine(checkImages);
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
