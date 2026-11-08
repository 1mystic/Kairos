import {
  setChapter, validateUserQuestion,
  type Issue, type IssueCode, type UserQuestion,
} from '@kairos/core';

export type Category = 'ready' | 'needs_answer' | 'problem';

export function categorize(issues: readonly Issue[]): Category {
  if (issues.some((i) => i.severity === 'error')) return 'problem';
  if (issues.some((i) => i.code === 'needs_answer')) return 'needs_answer';
  return 'ready';
}

export interface Summary {
  ready: number;
  needsAnswer: number;
  problem: number;
  total: number;
}
export function summarize(items: readonly { issues: readonly Issue[] }[]): Summary {
  const s: Summary = { ready: 0, needsAnswer: 0, problem: 0, total: items.length };
  for (const it of items) {
    const c = categorize(it.issues);
    if (c === 'ready') s.ready++;
    else if (c === 'needs_answer') s.needsAnswer++;
    else s.problem++;
  }
  return s;
}

export function summaryText(s: Summary): string {
  const parts = [`${s.ready} ready`];
  if (s.needsAnswer) parts.push(`${s.needsAnswer} need${s.needsAnswer === 1 ? 's' : ''} an answer`);
  if (s.problem) parts.push(`${s.problem} ${s.problem === 1 ? 'has' : 'have'} a problem`);
  return parts.join(' · ');
}

export interface ChipSpec {
  code: IssueCode;
  label: string;
  /** error = saffron solid, warn = saffron tint, ok = indigo tint */
  level: 'error' | 'warn' | 'ok';
  title: string;
}

const LABEL: Record<IssueCode, string> = {
  needs_answer: 'Needs answer',
  bad_math: 'Bad math',
  unknown_chapter: 'Pick a chapter',
  figure_missing: 'Figure missing',
  low_confidence: 'Low confidence',
  duplicate: 'Duplicate',
  answer_not_in_options: 'Answer not in options',
  bad_options: 'Check options',
  html_not_allowed: 'No HTML allowed',
  invalid_schema: 'Needs a fix',
};

/** One chip per code (worst severity wins), plus an "ok" chip when nothing is wrong. */
export function chipsFor(issues: readonly Issue[]): ChipSpec[] {
  const by = new Map<IssueCode, ChipSpec>();
  for (const i of issues) {
    const prev = by.get(i.code);
    if (prev && (prev.level === 'error' || i.severity === 'warn')) continue;
    by.set(i.code, { code: i.code, label: LABEL[i.code], level: i.severity, title: i.message });
  }
  const chips = [...by.values()].sort((a, b) => Number(b.level === 'error') - Number(a.level === 'error'));
  if (chips.length === 0) return [{ code: 'needs_answer', label: 'Looks good', level: 'ok', title: 'No problems found.' }];
  return chips;
}

export interface ReviewItem {
  q: UserQuestion;
  issues: Issue[];
}

export function validateItem(q: UserQuestion, chapterIds: readonly string[]): Issue[] {
  return validateUserQuestion(q, { chapterIds });
}

const NUMERIC = new Set(['NVQ', 'INT']);

/** Apply an editor change. Keeps answer/options consistent with the type. */
export function patchQuestion(q: UserQuestion, patch: Partial<Pick<UserQuestion, 'stem' | 'options' | 'answer' | 'solution' | 'type'>> & { chapter?: string }): UserQuestion {
  let next: UserQuestion = { ...q };
  const { chapter, ...rest } = patch;
  Object.assign(next, rest);
  if (rest.type && rest.type !== q.type) {
    if (NUMERIC.has(rest.type)) {
      delete next.options;
      if (next.answer && 'keys' in next.answer) next.answer = null;
    } else {
      if (!next.options || next.options.length === 0)
        next.options = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: '' }));
      if (next.answer && 'value' in next.answer) next.answer = null;
      if (next.answer && 'keys' in next.answer && rest.type !== 'MSQ' && next.answer.keys.length > 1) next.answer = { keys: [next.answer.keys[0]!] };
    }
  }
  if (chapter !== undefined) next = chapter ? setChapter(next, chapter) : { ...next, tax: { subject: 'UNK' } };
  next.status = next.answer == null ? 'needs_answer' : 'user_ok';
  return next;
}
