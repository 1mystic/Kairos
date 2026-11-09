/**
 * App-side block markdown that core's `renderContentHtml` does not cover: fenced code blocks
 * and pipe tables (GATE DA stems use both). Everything is escaped; cells go through the same
 * safe renderer as the rest of the text (KaTeX trust:false, no raw HTML).
 */
import { escapeHtml } from '@kairos/core';

const FENCE_RE = /^ {0,3}```[^\n`]*\n([\s\S]*?)\n {0,3}```[ \t]*$/gm;
const SEP_CELL_RE = /^\s*:?-{1,}:?\s*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

const isSep = (line: string | undefined): boolean => {
  if (!line || !line.includes('-')) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => SEP_CELL_RE.test(c));
};

type Chunk = { kind: 'text'; text: string } | { kind: 'html'; html: string };

/** Pull pipe tables out of a text chunk. */
function tablesOf(text: string, cell: (md: string) => string): Chunk[] {
  const lines = text.split('\n');
  const out: Chunk[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) out.push({ kind: 'text', text: buf.join('\n') });
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.includes('|') && isSep(lines[i + 1]) && splitRow(line).length === splitRow(lines[i + 1]!).length) {
      flush();
      const head = splitRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j]!.includes('|') && lines[j]!.trim() !== '') rows.push(splitRow(lines[j++]!));
      const td = (tag: string, c: string) => `<${tag}>${cell(c)}</${tag}>`;
      out.push({
        kind: 'html',
        html:
          `<div class="kc-table-wrap"><table class="kc-table"><thead><tr>${head.map((c) => td('th', c)).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${head.map((_h, k) => td('td', r[k] ?? '')).join('')}</tr>`).join('')}</tbody></table></div>`,
      });
      i = j - 1;
    } else buf.push(line);
  }
  flush();
  return out;
}

/** Renders `md`, handing plain text chunks to `renderText` (core's inline renderer). */
export function renderWithBlocks(md: string, renderText: (md: string) => string): string {
  const src = md.replace(/\r\n?/g, '\n');
  if (!src.includes('```') && !src.includes('|')) return renderText(src);
  // inside a table cell: inline content only, drop the paragraph wrapper
  const cell = (c: string) => renderText(c).replace(/^<div class="kc-p">([\s\S]*)<\/div>$/, '$1');
  const out: string[] = [];
  const text = (t: string) => {
    for (const ch of tablesOf(t, cell)) {
      if (ch.kind === 'html') out.push(ch.html);
      else if (ch.text.trim()) out.push(renderText(ch.text));
    }
  };
  let last = 0;
  for (const m of src.matchAll(FENCE_RE)) {
    text(src.slice(last, m.index!));
    out.push(`<pre class="kc-code"><code>${escapeHtml(m[1]!)}</code></pre>`);
    last = m.index! + m[0].length;
  }
  text(src.slice(last));
  return out.join('');
}
