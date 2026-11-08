import {
  convertUpload, extractJsonBlocks, mergeBlocks, parseUpload,
  type Issue, type MergeableBlock, type UserQuestion,
} from '@kairos/core';

export interface ParseProblem {
  /** which pasted block (1-based) */
  block: number;
  message: string;
  line?: number;
  col?: number;
  /** plain-language fix */
  hint: string;
}

export interface PipelineContext {
  exam: string;
  chapterIds: readonly string[];
  existingIds: Iterable<string>;
  now: number;
}

export type PipelineResult =
  | { ok: false; problems: ParseProblem[] }
  | {
      ok: true;
      questions: UserQuestion[];
      /** convert-level issues about questions that were left out (duplicates, dropped, rejected) */
      skipped: Issue[];
      notices: string[];
      incomplete: number | null;
      title: string;
    };

export function hintFor(message: string): string {
  if (/no json found/i.test(message))
    return 'Paste the whole reply from the AI. It should contain a block that starts with ```json.';
  if (/unexpected end|end of (json|data)|unterminated/i.test(message))
    return 'The reply was cut off. Ask the AI to "continue", then press "Add another block" and paste the next part too.';
  if (/unexpected (token|non-whitespace)|expected|invalid json|bad (control|escaped)/i.test(message))
    return 'Something near this spot is not valid JSON, often a missing comma or quote. Ask the AI to "send that JSON block again, fixed", or correct the character at this line.';
  return 'Ask the AI to resend the JSON block exactly in the format of the prompt.';
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** pasted text(s) -> extract -> merge -> parse -> convert. Pure; never throws. */
export function runPipeline(texts: readonly string[], ctx: PipelineContext): PipelineResult {
  const problems: ParseProblem[] = [];
  const blocks: MergeableBlock[] = [];
  const nonEmpty = texts.map((t, i) => ({ t, i })).filter((x) => x.t.trim());
  if (nonEmpty.length === 0)
    return { ok: false, problems: [{ block: 1, message: 'Nothing pasted yet.', hint: 'Paste the AI reply into the box.' }] };

  for (const { t, i } of nonEmpty) {
    const r = extractJsonBlocks(t);
    const lastLine = t.trimEnd().split('\n').length;
    // an unclosed code fence, or an error on the very last lines, means the reply stopped early
    const cutOff = (t.match(/```/g)?.length ?? 0) % 2 === 1;
    for (const e of r.errors)
      problems.push({
        block: i + 1, message: e.message, line: e.line, col: e.col,
        hint: !/no json found/i.test(e.message) && (cutOff || e.line >= lastLine - 1) ? hintFor('Unexpected end of JSON input') : hintFor(e.message),
      });
    for (const b of r.blocks) {
      if (!isObj(b.value) || !Array.isArray(b.value.questions)) {
        problems.push({
          block: i + 1,
          message: 'This JSON has no "questions" list.',
          line: b.line,
          hint: 'Check that the AI used the exact format from the prompt (a top-level object with "questions").',
        });
        continue;
      }
      blocks.push(b.value as unknown as MergeableBlock);
    }
  }
  if (problems.length > 0 || blocks.length === 0) return { ok: false, problems };

  const m = mergeBlocks(blocks);
  const parsed = parseUpload({ prompt_version: 2, ...m.merged });
  if (!parsed.ok)
    return { ok: false, problems: [{ block: 1, message: parsed.message, hint: 'The structure does not match the prompt format. Ask the AI to follow the schema exactly.' }] };

  const conv = convertUpload(parsed.upload, {
    exam: ctx.exam,
    chapterIds: ctx.chapterIds,
    now: ctx.now,
    existingIds: ctx.existingIds,
  });
  const have = new Set(conv.questions.map((q) => q.id));
  const skipped = conv.issues.filter((i) => !i.qid || !have.has(i.qid));
  const notices = m.warnings.map((w) =>
    /incomplete/.test(w) ? `The reply stops at question ${m.incomplete}. Type "continue" to the AI and paste the next block too.` : capital(w),
  );
  return { ok: true, questions: conv.questions, skipped, notices, incomplete: m.incomplete, title: parsed.upload.meta.title ?? '' };
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
