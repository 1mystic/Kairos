// Copies the fenced ```text block of ../prompts/extract_questions_v2.md into
// src/upload/prompt/extract_v2.txt. Run: pnpm --filter @kairos/app run sync:prompt
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../../prompts/extract_questions_v2.md');
const out = join(here, '../src/upload/prompt/extract_v2.txt');

export function extractPrompt(md) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.trim() === '```text');
  if (start < 0) throw new Error('no ```text block found');
  const end = lines.findIndex((l, i) => i > start && l.trim() === '```');
  if (end < 0) throw new Error('unterminated ```text block');
  return lines.slice(start + 1, end).join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(out, extractPrompt(readFileSync(src, 'utf8')));
  console.log('wrote', out);
}
