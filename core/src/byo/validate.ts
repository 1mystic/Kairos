import { checkMath, splitMath } from '../katex';
import { MD_IMAGE_RE } from '../markdown';
import { questionSchema } from '../question';
import type { Issue, UserQuestion } from './types';

export interface ValidateContext {
  chapterIds: readonly string[];
}

/** firestore.rules `validBankDoc` caps. */
export const MAX_FIELD_CHARS = 12000;
export const MAX_OPTIONS = 10;
export const MAX_FIGURES = 12;

const FIG_RE = /\{\{fig:(\d+)\}\}/g;
const HTML_RE = /<\/?[a-zA-Z][^<>]*>|<!--|<!\[CDATA\[/;
const CHOICE = new Set(['SCQ', 'MSQ', 'MATCH', 'ASSERT_REASON']);

export function subjectOfChapter(chapterId: string): string {
  const p = chapterId.split('.')[0] ?? '';
  return /^[A-Z]{2,6}$/.test(p) ? p : 'UNK';
}

/** Placeholder numbers used in any text of the question. */
export function placeholderKs(q: Pick<UserQuestion, 'stem' | 'options' | 'solution'>): number[] {
  const ks = new Set<number>();
  for (const t of [q.stem, q.solution ?? '', ...(q.options ?? []).map((o) => o.text)])
    for (const m of t.matchAll(FIG_RE)) ks.add(Number(m[1]));
  return [...ks].sort((a, b) => a - b);
}

/** True if text (outside math) contains raw HTML or a non-`img:` markdown image. */
export function findHtml(md: string): string | null {
  for (const seg of splitMath(md)) {
    if (seg.kind !== 'text') continue;
    const m = HTML_RE.exec(seg.content);
    if (m) return m[0];
    for (const im of seg.content.matchAll(MD_IMAGE_RE))
      if (!/^img:[0-9a-f]{16}$/.test(im[2]!.trim())) return im[0];
  }
  return null;
}

/** All issues for a question in its current state. Used on convert and after every edit. */
export function validateUserQuestion(q: UserQuestion, ctx: ValidateContext): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: Issue['severity'], code: Issue['code'], message: string, field?: string) =>
    issues.push({ qid: q.id, n: q.n, severity, code, message, ...(field ? { field } : {}) });

  const fields: [string, string][] = [
    ['stem', q.stem],
    ...(q.options ?? []).map((o, i): [string, string] => [`options.${i}`, o.text]),
    ['solution', q.solution ?? ''],
    ['passage', q.passage ?? ''],
  ];
  for (const [f, t] of fields) {
    if (!t) continue;
    const mc = checkMath(t);
    if (!mc.ok) add('error', 'bad_math', `Math does not render in ${f}: ${mc.errors[0]!.message}`, f);
    const h = findHtml(t);
    if (h) add('error', 'html_not_allowed', `Raw HTML or external image not allowed in ${f}: ${h.slice(0, 40)}`, f);
  }

  // size caps that firestore.rules enforce on users/{uid}/bank/{id} (a violating doc would fail the whole batched save)
  for (const [f, t] of fields)
    if (t.length > MAX_FIELD_CHARS && (f === 'stem' || f === 'solution' || f === 'passage'))
      add('error', 'invalid_schema', `The ${f} is too long to store (${t.length} of ${MAX_FIELD_CHARS} characters). Shorten it.`, f);
  if ((q.options ?? []).length > MAX_OPTIONS) add('error', 'bad_options', `At most ${MAX_OPTIONS} options are allowed.`, 'options');
  if (q.images.length + q.pending_figures.length > MAX_FIGURES)
    add('error', 'invalid_schema', `At most ${MAX_FIGURES} figures per question.`, 'figures');

  // chapter
  if (!q.tax?.chapter || !ctx.chapterIds.includes(q.tax.chapter))
    add('error', 'unknown_chapter', 'Pick a chapter for this question.', 'chapter');

  // options
  const opts = q.options ?? [];
  const keys = opts.map((o) => o.key);
  const choice = CHOICE.has(q.type) || (q.type === 'PARA_CHILD' && opts.length > 0);
  if (choice) {
    if (opts.length < 2) add('error', 'bad_options', 'Choice questions need at least 2 options.', 'options');
    if (new Set(keys).size !== keys.length) add('error', 'bad_options', 'Option keys must be unique.', 'options');
    opts.forEach((o, i) => {
      if (!o.text.trim()) add('error', 'bad_options', `Option ${o.key} is empty.`, `options.${i}`);
    });
  }

  // answer
  const a = q.answer;
  if (a == null) {
    add('warn', 'needs_answer', 'No answer given: saved for self-check only.', 'answer');
  } else if ('keys' in a) {
    if (!choice) add('error', 'invalid_schema', `${q.type} needs a numeric answer, not option keys.`, 'answer');
    else {
      for (const k of a.keys)
        if (!keys.includes(k)) add('error', 'answer_not_in_options', `Answer key ${k} is not one of the options.`, 'answer');
      if (q.type !== 'MSQ' && a.keys.length !== 1)
        add('error', 'invalid_schema', `${q.type} needs exactly one answer key.`, 'answer');
    }
  } else if ('value' in a) {
    if (choice) add('error', 'invalid_schema', `${q.type} needs option keys as the answer.`, 'answer');
    else if (!Number.isFinite(a.value)) add('error', 'invalid_schema', 'Numeric answer is not a number.', 'answer');
    else if (q.type === 'INT' && !Number.isInteger(a.value))
      add('error', 'invalid_schema', 'INT answer must be an integer.', 'answer');
  }

  // figures
  if (q.pending_figures.length > 0)
    add(
      'error',
      'figure_missing',
      `Figure${q.pending_figures.length > 1 ? 's' : ''} ${q.pending_figures.map((f) => f.k).join(', ')} still need a crop.`,
      'figures',
    );
  const declared = new Set(q.pending_figures.map((f) => f.k));
  for (const k of placeholderKs(q))
    if (!declared.has(k)) add('error', 'figure_missing', `{{fig:${k}}} has no figure entry.`, 'figures');

  if (q.confidence === 'low') add('warn', 'low_confidence', 'The AI marked this question as low confidence: check it against your paper.');

  // core schema (only once images are all resolved; pending placeholders aren't image refs yet)
  if (q.pending_figures.length === 0) {
    const proj = {
      id: q.id,
      type: q.type,
      stem: q.stem,
      images: q.images,
      passage_id: q.passage_id,
      passage: q.passage,
      options: q.options,
      answer: q.answer,
      solution: q.solution,
    };
    const r = questionSchema.safeParse(proj);
    if (!r.success) {
      const have = new Set(issues.map((i) => i.code));
      for (const iss of r.error.issues) {
        const f = String(iss.path[0] ?? '');
        // answer problems already reported with better codes
        if (f === 'answer' && (have.has('answer_not_in_options') || have.has('invalid_schema'))) continue;
        add('error', 'invalid_schema', iss.message, f || undefined);
      }
    }
  }
  return issues;
}
