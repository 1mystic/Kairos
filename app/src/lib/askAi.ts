import type { PublicQuestion, Question } from '@kairos/core';
import { examLabel } from '../plan/syllabus';
import type { AiProvider } from '../store/types';

/** Providers offered in the Ask AI menu. `prefill` = the site accepts the prompt in the URL; otherwise it goes via the clipboard. */
export interface ProviderInfo { id: Exclude<AiProvider, 'other'>; label: string; prefill: boolean }

export const PROVIDERS: readonly ProviderInfo[] = [
  { id: 'gemini', label: 'Gemini', prefill: false },
  { id: 'chatgpt', label: 'ChatGPT', prefill: true },
  { id: 'google', label: 'Google AI search', prefill: true },
  { id: 'claude', label: 'Claude', prefill: true },
  { id: 'perplexity', label: 'Perplexity', prefill: true },
];

/** Sites the Ask AI menu opens: only those that accept the prompt in the URL (Gemini does not, so it is left out; the menu offers 'Copy prompt' instead). */
export const LAUNCH_PROVIDERS: readonly ProviderInfo[] = PROVIDERS.filter((p) => p.prefill);

export const DEFAULT_PROVIDER: Exclude<AiProvider, 'other'> = 'chatgpt';

export const providerLabel = (id: AiProvider): string => PROVIDERS.find((p) => p.id === id)?.label ?? 'another AI';

/** Longest encoded URL we put a prompt in (browsers and sites cut off well past this). */
export const MAX_URL_LENGTH = 7000;

export interface PromptOptions {
  /** exam id (e.g. JEE_MAIN). Falls back to the first listed appearance of the question. */
  exam?: string;
  /** only when the student has answered or revealed the solution: includes the answer key, solution and their answer */
  revealed?: boolean;
  /** the student's answer as typed or chosen (option keys joined with commas, or a number) */
  given?: string;
}

type Q = Question | PublicQuestion;

const FORMAT: Record<string, string> = {
  SCQ: 'Single correct: exactly one option is right. Give the option key.',
  MSQ: 'Multiple correct: one or more options can be right. List every correct option key.',
  NVQ: 'Numerical value: no options. Give a single number as the final answer.',
  INT: 'Integer type: no options. Give a single integer as the final answer.',
};

function answerText(q: Q): string {
  const a = (q as Question).answer;
  if (!a) return '';
  if ('keys' in a) return a.keys.join(', ');
  if ('value' in a) return `${a.value}${a.tol ? ` (within ${a.tol})` : ''}`;
  return `${a.range[0]} to ${a.range[1]}`;
}

/** First line of every prompt Kairos builds; also how a pasted prompt is recognised. */
export const PROMPT_OPENING = 'I am preparing for an Indian entrance exam and need help with this question.';

/** True when `text` is (mostly) the prompt Kairos copied rather than an AI's reply: it starts with our opening line or carries our fixed closing instructions. */
export function looksLikeKairosPrompt(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (t.startsWith(PROMPT_OPENING.toLowerCase())) return true;
  return t.includes('please: 1. explain the solution step by step.') || t.includes('(the full details, including the solution, are copied to my clipboard');
}

function header(q: Q, o: PromptOptions): string[] {
  const exam = o.exam ?? q.appearances?.[0]?.exam;
  const lines = [PROMPT_OPENING];
  if (exam) lines.push(`Exam: ${examLabel(exam)}`);
  const where = [q.tax?.subject, q.tax?.chapter].filter(Boolean).join(' / ');
  if (where) lines.push(`Subject / chapter: ${where}`);
  lines.push(`Question type: ${FORMAT[q.type] ?? q.type}`);
  return lines;
}

function body(q: Q, stem: string): string[] {
  const out: string[] = [];
  if (q.passage) out.push('', 'Passage:', q.passage);
  out.push('', 'Question:', stem);
  const opts = q.type === 'NVQ' || q.type === 'INT' ? [] : (q.options ?? []);
  if (opts.length) out.push('', 'Options:', ...opts.map((x) => `(${x.key}) ${x.text}`));
  return out;
}

/** The full prompt copied to the clipboard. Markdown and LaTeX in the bank text are kept as plain text. */
export function buildAiPrompt(q: Q, opts: PromptOptions = {}): string {
  const lines = [...header(q, opts), ...body(q, q.stem)];
  const revealed = !!opts.revealed;
  const key = revealed ? answerText(q) : '';
  const solution = revealed ? ((q as Question).solution ?? '') : '';
  if (revealed) {
    lines.push('');
    if (key) lines.push(`Correct answer (official key): ${key}`);
    if (opts.given !== undefined) lines.push(`My answer: ${opts.given.trim() || 'none (I did not answer)'}`);
    if (solution) lines.push('', 'Official solution (use it as guidelines, check it, do not just repeat it):', solution);
  }
  lines.push(
    '',
    'Please:',
    '1. Explain the solution step by step.',
    '2. State the final answer clearly.',
    revealed && opts.given !== undefined ? '3. Point out the common mistake, and say where my answer may have gone wrong.' : '3. Point out the common mistake students make here.',
    '4. Keep it exam-focused: short, with the key idea and any time-saving trick.',
  );
  return lines.join('\n');
}

const BASE: Record<Exclude<AiProvider, 'other'>, string> = {
  chatgpt: 'https://chatgpt.com/?q=',
  claude: 'https://claude.ai/new?q=',
  perplexity: 'https://www.perplexity.ai/search?q=',
  google: 'https://www.google.com/search?udm=50&q=',
  gemini: 'https://gemini.google.com/app',
};

export interface AiTarget { url: string; /** the prompt could not travel whole in the URL (or the site has no prefill): rely on the clipboard */ clipboardOnly: boolean; /** prompt shortened to fit the URL */ shortened: boolean }

/** Shorter prompt for the URL: header, stem and options only, pointing at the clipboard for the rest. */
export function shortPrompt(q: Q, opts: PromptOptions = {}, stemChars?: number): string {
  const stem = stemChars !== undefined && q.stem.length > stemChars ? `${q.stem.slice(0, stemChars)} ...` : q.stem;
  return [...header(q, opts), ...body(q, stem), '', 'Explain step by step and give the final answer. (The full details, including the solution, are copied to my clipboard; I will paste them if needed.)'].join('\n');
}

/** Where to send the student for a provider. `prompt` is the full prompt; pass `q` so an over-long one can be shortened. */
export function aiTargetUrl(provider: AiProvider, prompt: string, q?: Q, opts: PromptOptions = {}): string {
  return aiTarget(provider, prompt, q, opts).url;
}

export function aiTarget(provider: AiProvider, prompt: string, q?: Q, opts: PromptOptions = {}): AiTarget {
  const p = provider === 'other' ? 'gemini' : provider;
  if (p === 'gemini') return { url: BASE.gemini, clipboardOnly: true, shortened: false };
  const base = BASE[p];
  const full = base + encodeURIComponent(prompt);
  if (full.length <= MAX_URL_LENGTH) return { url: full, clipboardOnly: false, shortened: false };
  let text = q ? shortPrompt(q, opts) : prompt.slice(0, 1500);
  let url = base + encodeURIComponent(text);
  for (let n = 3000; url.length > MAX_URL_LENGTH && q && n > 200; n = Math.floor(n / 2)) {
    text = shortPrompt(q, opts, n);
    url = base + encodeURIComponent(text);
  }
  if (url.length > MAX_URL_LENGTH) url = base + encodeURIComponent(prompt.slice(0, 500));
  return { url, clipboardOnly: true, shortened: true };
}
