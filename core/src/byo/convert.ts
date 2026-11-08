import type { ImageRef } from '../question';
import type { ParsedUpload, UploadQuestion } from './schema';
import { sha256Hex } from './sha256';
import type { Issue, PendingFigure, UserQuestion } from './types';
import { subjectOfChapter, validateUserQuestion } from './validate';

export interface ConvertOptions {
  exam: string;
  chapterIds: readonly string[];
  /** epoch ms, injected for determinism */
  now: number;
  uid?: string;
  /** ids already in the user's bank (deduped, reported as 'duplicate') */
  existingIds?: Iterable<string>;
  /** keep questions the key marked dropped/bonus (as needs_answer). Default false. */
  keepDropped?: boolean;
}

export interface ConvertResult {
  questions: UserQuestion[];
  issues: Issue[];
}

/** NFKC + whitespace collapse. Case and punctuation are kept (they matter in math). */
export function normalizeForId(s: string): string {
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/**
 * `u_` + first 12 hex of sha256(normalised stem + option texts).
 * Two additions to the doc formula so distinct questions never collapse: PARA_CHILD also hashes its
 * passage text, and questions with figures hash the figure alt texts.
 */
export function questionId(q: {
  type: string;
  stem: string;
  options?: { text: string }[] | null;
  passage?: string | null;
  figures?: { alt: string }[];
}): string {
  const parts = [normalizeForId(q.stem), ...(q.options ?? []).map((o) => normalizeForId(o.text))];
  if (q.type === 'PARA_CHILD' && q.passage) parts.push('passage:' + normalizeForId(q.passage));
  if (q.figures?.length) parts.push(...q.figures.map((f) => 'fig:' + normalizeForId(f.alt)));
  return 'u_' + sha256Hex(parts.join('␟')).slice(0, 12);
}

function toUserQuestion(
  uq: UploadQuestion,
  up: ParsedUpload,
  opts: ConvertOptions,
  passage: string | null,
  dropped: boolean,
): UserQuestion {
  const choiceOpts = uq.options && uq.options.length > 0 ? uq.options : null;
  const isNumeric = uq.type === 'NVQ' || uq.type === 'INT';
  const options = isNumeric ? undefined : (choiceOpts ?? undefined);
  const id = questionId({ type: uq.type, stem: uq.stem, options, passage, figures: uq.figures });

  const placeholders = new Set<number>();
  for (const t of [uq.stem, uq.solution ?? '', ...(options ?? []).map((o) => o.text)])
    for (const m of t.matchAll(/\{\{fig:(\d+)\}\}/g)) placeholders.add(Number(m[1]));
  const pending: PendingFigure[] = uq.figures
    .filter((f) => placeholders.has(f.id))
    .map((f) => ({ k: f.id, where: f.where, page: f.page, bbox: f.bbox, alt: f.alt }));

  const src = up.meta.source;
  const appearances: NonNullable<UserQuestion['appearances']> = [];
  if (src?.exam && src.year != null) {
    const sess = src.session != null && /^\d+$/.test(src.session) ? Number(src.session) : undefined;
    appearances.push({
      exam: src.exam,
      year: src.year,
      qno: uq.n,
      ...(sess !== undefined ? { session: sess } : {}),
      ...(src.session != null && sess === undefined ? { shift: src.session } : {}),
    });
  }
  const known = opts.chapterIds.includes(uq.chapter);
  const q: UserQuestion = {
    id,
    type: uq.type,
    stem: uq.stem,
    ...(options ? { options } : {}),
    answer: dropped ? null : uq.answer,
    solution: uq.solution,
    solution_source: 'user',
    tax: known ? { subject: subjectOfChapter(uq.chapter), chapter: uq.chapter } : { subject: 'UNK' },
    appearances,
    source: { kind: 'user' },
    images: [],
    ...(uq.passage_id ? { passage_id: uq.passage_id } : {}),
    ...(passage ? { passage } : {}),
    status: 'needs_answer',
    n: uq.n,
    confidence: uq.confidence,
    exam: opts.exam,
    created_at: opts.now,
    ...(opts.uid ? { owner: opts.uid } : {}),
    pending_figures: pending,
    ...(dropped ? { dropped: true } : {}),
  };
  q.status = q.answer == null ? 'needs_answer' : 'user_ok';
  return q;
}

export function convertUpload(parsed: ParsedUpload, opts: ConvertOptions): ConvertResult {
  const questions: UserQuestion[] = [];
  const issues: Issue[] = [];
  const seen = new Set<string>(opts.existingIds ?? []);
  const passages = new Map(parsed.passages.map((p) => [p.id, p.text]));

  for (const r of parsed.rejected)
    issues.push({
      ...(r.n != null ? { n: r.n } : {}),
      severity: 'error',
      code: 'invalid_schema',
      message: `Question ${r.n ?? `#${r.index + 1}`} was rejected: ${r.message}`,
    });

  for (const uq of parsed.questions) {
    const dropped = /^\s*dropped\s*$/i.test(uq.note ?? '') || /\b(dropped|bonus)\b/i.test(uq.note ?? '');
    const extra: Issue[] = [];
    let passage: string | null = null;
    if (uq.type === 'PARA_CHILD') {
      passage = uq.passage_id ? (passages.get(uq.passage_id) ?? null) : null;
      if (!passage)
        extra.push({
          n: uq.n,
          severity: 'error',
          code: 'invalid_schema',
          message: uq.passage_id ? `Passage ${uq.passage_id} not found.` : 'PARA_CHILD has no passage_id.',
          field: 'passage_id',
        });
    }
    const q = toUserQuestion(uq, parsed, opts, passage, dropped);

    if (dropped && !opts.keepDropped) {
      issues.push({
        qid: q.id,
        n: uq.n,
        severity: 'warn',
        code: 'needs_answer',
        message: `Question ${uq.n} was marked dropped/bonus in the key and was left out.`,
      });
      continue;
    }
    if (seen.has(q.id)) {
      issues.push({
        qid: q.id,
        n: uq.n,
        severity: 'warn',
        code: 'duplicate',
        message: `Question ${uq.n} is already in your bank or earlier in this upload and was skipped.`,
      });
      continue;
    }
    seen.add(q.id);

    const numeric = uq.type === 'NVQ' || uq.type === 'INT';
    if (numeric && uq.options && uq.options.length > 0)
      extra.push({
        qid: q.id,
        n: uq.n,
        severity: 'warn',
        code: 'bad_options',
        message: `${uq.type} should not have options: they were removed.`,
        field: 'options',
      });
    for (const f of uq.figures)
      if (!q.pending_figures.some((p) => p.k === f.id))
        extra.push({
          qid: q.id,
          n: uq.n,
          severity: 'warn',
          code: 'figure_missing',
          message: `Figure ${f.id} has no {{fig:${f.id}}} placeholder and was ignored.`,
          field: 'figures',
        });
    if (uq.chapter !== 'UNKNOWN' && !opts.chapterIds.includes(uq.chapter))
      extra.push({
        qid: q.id,
        n: uq.n,
        severity: 'error',
        code: 'unknown_chapter',
        message: `Chapter "${uq.chapter}" is not in the ${opts.exam} list.`,
        field: 'chapter',
      });

    const v = validateUserQuestion(q, { chapterIds: opts.chapterIds });
    // the generic chapter issue is superseded by the more specific message above
    const merged = extra.some((e) => e.code === 'unknown_chapter')
      ? v.filter((i) => i.code !== 'unknown_chapter')
      : v;
    issues.push(...extra, ...merged);
    questions.push(q);
  }
  return { questions, issues };
}

const esc = (s: string) => s.replace(/[\][]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Swap `{{fig:k}}` for `![alt](img:<id>)` everywhere in the question, append the image ref and
 * clear the pending figure. Pure: returns a new question.
 */
export function resolveFigure(q: UserQuestion, k: number, image: ImageRef): UserQuestion {
  if (!q.pending_figures.some((f) => f.k === k)) throw new Error(`question ${q.id} has no pending figure ${k}`);
  const md = `![${esc(image.alt)}](img:${image.id})`;
  const re = new RegExp(`\\{\\{fig:${k}\\}\\}`, 'g');
  const sub = (s: string) => s.replace(re, () => md);
  return {
    ...q,
    stem: sub(q.stem),
    ...(q.options ? { options: q.options.map((o) => ({ ...o, text: sub(o.text) })) } : {}),
    solution: q.solution == null ? q.solution : sub(q.solution),
    images: q.images.some((i) => i.id === image.id) ? q.images : [...q.images, image],
    pending_figures: q.pending_figures.filter((f) => f.k !== k),
  };
}

/** Set a chapter (editor dropdown / bulk action). */
export function setChapter(q: UserQuestion, chapterId: string): UserQuestion {
  return { ...q, tax: { subject: subjectOfChapter(chapterId), chapter: chapterId } };
}
