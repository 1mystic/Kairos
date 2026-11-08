import { z } from 'zod';
import { QUESTION_TYPES } from '../question';

/** "1" | "(a)" | "a." | "B)" -> "A".."Z". Anything else is just trimmed + upper-cased. */
export function normalizeOptionKey(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/^[([{]+|[)\]}.:]+$/g, '')
    .trim();
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    if (n >= 1 && n <= 26) return String.fromCharCode(64 + n);
  }
  return s.toUpperCase();
}

const num = z.preprocess((v) => {
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.trim().replace(/,/g, '')))) {
    return Number(v.trim().replace(/,/g, ''));
  }
  return v;
}, z.number().finite());
const int = num.pipe(z.number().int());
const text = z.preprocess((v) => (typeof v === 'number' ? String(v) : v), z.string()).transform((s) => s.trim());
const nullableText = z
  .preprocess((v) => (v === undefined ? null : v), z.union([text, z.null()]))
  .transform((s) => (s === '' ? null : s));

const key = z.preprocess((v) => normalizeOptionKey(v), z.string().min(1));

const optionsSchema = z.preprocess(
  (v) => {
    if (v == null) return null;
    if (Array.isArray(v)) return v.length === 0 ? null : v;
    if (typeof v === 'object') {
      // {"A": "text", ...}
      return Object.entries(v as Record<string, unknown>).map(([k, t]) => ({ key: k, text: t }));
    }
    return v;
  },
  z.union([z.array(z.object({ key, text })), z.null()]),
);

const answerSchemaV2 = z.preprocess(
  (v) => {
    if (v == null) return null;
    if (typeof v === 'string' || typeof v === 'number') return typeof v === 'number' ? { value: v } : { keys: v.split(/[\s,;/&]+/).filter(Boolean) };
    if (typeof v === 'object' && 'keys' in v) {
      const k = (v as { keys: unknown }).keys;
      if (typeof k === 'string') return { keys: k.split(/[\s,;/&]+/).filter(Boolean) };
    }
    return v;
  },
  z.union([
    z.object({ keys: z.array(key).min(1) }),
    z.object({ value: num, tol: num.optional().nullable() }).transform((a) =>
      a.tol == null ? { value: a.value } : { value: a.value, tol: Math.abs(a.tol) },
    ),
    z.null(),
  ]),
);

/** bbox fractions of page size; strict: all in [0,1], x0<x1, y0<y1. */
export const bboxSchema = z
  .tuple([num, num, num, num])
  .refine((b) => b.every((x) => x >= 0 && x <= 1), 'bbox values must be between 0 and 1')
  .refine((b) => b[0] < b[2] && b[1] < b[3], 'bbox needs x0<x1 and y0<y1');
export type Bbox = [number, number, number, number];

export const figureSchema = z.object({
  id: int.pipe(z.number().min(1)),
  where: text.pipe(z.string().min(1)).transform((w) => w.toLowerCase()),
  page: int.pipe(z.number().min(1)),
  bbox: bboxSchema,
  alt: text.pipe(z.string().min(1, 'alt text is required')),
});
export type UploadFigure = z.infer<typeof figureSchema>;

const typeEnum = z.enum(QUESTION_TYPES);

export const uploadQuestionSchema = z.object({
  n: int,
  type: z.preprocess((v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/[\s-]+/g, '_') : v), typeEnum),
  passage_id: nullableText.optional().transform((v) => v ?? null),
  stem: text.pipe(z.string().min(1, 'stem is empty')),
  options: optionsSchema.optional().transform((v) => v ?? null),
  answer: answerSchemaV2.optional().transform((v) => v ?? null),
  solution: nullableText.optional().transform((v) => v ?? null),
  chapter: z
    .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1))
    .optional()
    .transform((v) => v ?? 'UNKNOWN'),
  figures: z.array(figureSchema).optional().transform((v) => v ?? []),
  confidence: z
    .preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), z.enum(['high', 'low']))
    .optional()
    .transform((v) => v ?? 'high'),
  note: nullableText.optional().transform((v) => v ?? null),
});
export type UploadQuestion = z.infer<typeof uploadQuestionSchema>;

export const uploadMetaSchema = z
  .object({
    title: nullableText.optional().transform((v) => v ?? ''),
    language: z.enum(['en', 'hi']).optional().catch(undefined),
    source: z
      .object({
        exam: nullableText.optional().transform((v) => v ?? null),
        year: int.optional().nullable().catch(null),
        session: nullableText.optional().transform((v) => v ?? null),
        paper: nullableText.optional().transform((v) => v ?? null),
      })
      .nullable()
      .optional()
      .catch(null)
      .transform((v) => v ?? null),
    has_answer_key: z.boolean().optional().catch(undefined),
    has_solutions: z.boolean().optional().catch(undefined),
  })
  .optional()
  .transform((m) => m ?? { title: '', source: null });
export type UploadMeta = z.infer<typeof uploadMetaSchema>;

const passageSchema = z.object({ id: text.pipe(z.string().min(1)), text });

export interface RejectedQuestion {
  /** index in the questions array */
  index: number;
  n: number | null;
  message: string;
}

export interface ParsedUpload {
  prompt_version: number | null;
  meta: UploadMeta;
  passages: { id: string; text: string }[];
  questions: UploadQuestion[];
  /** questions that failed schema validation (strict bbox etc.), reported as issues */
  rejected: RejectedQuestion[];
  continue_from: number | null;
}

export type ParseUploadResult = { ok: true; upload: ParsedUpload } | { ok: false; message: string };

function formatZod(e: z.ZodError): string {
  return e.issues.map((i) => `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`).join('; ');
}

/** Parse one prompt-v2 JSON object. Bad questions are collected in `rejected`, not fatal. */
export function parseUpload(raw: unknown): ParseUploadResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, message: 'Expected a JSON object with a "questions" array.' };
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.questions)) return { ok: false, message: 'Missing "questions" array.' };
  const metaRes = uploadMetaSchema.safeParse(o.meta);
  const questions: UploadQuestion[] = [];
  const rejected: RejectedQuestion[] = [];
  o.questions.forEach((q, index) => {
    const r = uploadQuestionSchema.safeParse(q);
    if (r.success) questions.push(r.data);
    else {
      const n = (q as { n?: unknown } | null)?.n;
      const nn = typeof n === 'number' ? n : typeof n === 'string' && /^\d+$/.test(n) ? Number(n) : null;
      rejected.push({ index, n: nn, message: formatZod(r.error) });
    }
  });
  const passages: { id: string; text: string }[] = [];
  for (const p of Array.isArray(o.passages) ? o.passages : []) {
    const r = passageSchema.safeParse(p);
    if (r.success) passages.push(r.data);
  }
  const cf = int.nullable().safeParse(o.continue_from ?? null);
  const pv = int.safeParse(o.prompt_version);
  return {
    ok: true,
    upload: {
      prompt_version: pv.success ? pv.data : null,
      meta: metaRes.success ? metaRes.data : { title: '', source: null },
      passages,
      questions,
      rejected,
      continue_from: cf.success ? cf.data : null,
    },
  };
}
