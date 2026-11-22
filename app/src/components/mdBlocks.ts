/**
 * App-side block markdown that core's `renderContentHtml` does not cover: fenced code blocks
 * and pipe tables (GATE DA stems use both). Everything is escaped; cells go through the same
 * safe renderer as the rest of the text (KaTeX trust:false, no raw HTML).
 */
import { escapeHtml } from '@kairos/core';

const FENCE_RE = /^ {0,3}```([^\n`]*)\n([\s\S]*?)\n {0,3}```[ \t]*$/gm;
const SEP_CELL_RE = /^\s*:?-{1,}:?\s*$/;

/**
 * Splits a table row on `|`, except inside `code` spans, `$math$` (e.g. `$|x|$`) and after a
 * backslash (`\|` is a literal pipe). Leading/trailing pipes are optional.
 */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = '';
  let code = false;
  let math = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '\\' && s[i + 1] === '|' && !code && !math) {
      cur += '|';
      i++;
    } else if (c === '\\' && i + 1 < s.length) {
      cur += c + s[++i]!;
    } else {
      if (c === '`' && !math) code = !code;
      else if (c === '$' && !code) math = !math;
      if (c === '|' && !code && !math) {
        cells.push(cur.trim());
        cur = '';
      } else cur += c;
    }
  }
  cells.push(cur.trim());
  return cells;
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
      // ragged rows: never drop data, widen the table to the longest row
      const cols = Math.max(head.length, ...rows.map((r) => r.length));
      const pad = (r: string[]) => Array.from({ length: cols }, (_x, k) => r[k] ?? '');
      const td = (tag: string, c: string) => `<${tag}>${cell(c)}</${tag}>`;
      out.push({
        kind: 'html',
        html:
          `<div class="kc-table-wrap"><table class="kc-table"><thead><tr>${pad(head).map((c) => td('th', c)).join('')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${pad(r).map((c) => td('td', c)).join('')}</tr>`).join('')}</tbody></table></div>`,
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
    // language tag from the info string: letters/digits only, so the attribute can never carry markup
    const lang = (m[1] ?? '').trim().split(/\s+/)[0]!.toLowerCase();
    const attr = /^[a-z0-9_+#-]{1,20}$/.test(lang) ? ` data-lang="${lang}"` : '';
    out.push(`<pre class="kc-code"${attr}><code>${escapeHtml(m[2]!)}</code></pre>`);
    last = m.index! + m[0].length;
  }
  text(src.slice(last));
  return out.join('');
}
