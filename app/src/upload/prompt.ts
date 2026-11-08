import template from './prompt/extract_v2.txt?raw';
import { chaptersForExam, examLabel } from './taxonomy';

export const PROMPT_VERSION = 2;
export const PROMPT_TEMPLATE: string = template;

/** The copy-paste prompt for `exam` with {{EXAM}} and {{CHAPTER_LIST}} filled in. */
export function renderPrompt(exam: string): string {
  const list = chaptersForExam(exam)
    .map((c) => `${c.id} — ${c.name}`)
    .join('\n');
  return template.replaceAll('{{EXAM}}', examLabel(exam)).replace('{{CHAPTER_LIST}}', () => list).trimEnd();
}

/** Clipboard API with a hidden-textarea fallback (older browsers / insecure origins). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
