import katex from 'katex';

export interface MathSegment {
  kind: 'text' | 'inline' | 'display';
  /** text: literal text with `\$` unescaped; math: the TeX source without delimiters */
  content: string;
}

/** Split markdown into text / $inline$ / $$display$$ segments. `\$` is a literal dollar. */
export function splitMath(src: string): MathSegment[] {
  const out: MathSegment[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ kind: 'text', content: text });
    text = '';
  };
  /** find closing delimiter starting at `from`; skips backslash-escaped chars */
  const findClose = (from: number, delim: string): number => {
    for (let j = from; j < src.length; j++) {
      if (src[j] === '\\') j++;
      else if (src.startsWith(delim, j)) return j;
    }
    return -1;
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\' && src[i + 1] === '$') {
      text += '$';
      i += 2;
    } else if (c === '$') {
      const delim = src[i + 1] === '$' ? '$$' : '$';
      const end = findClose(i + delim.length, delim);
      if (end === -1 || end === i + delim.length) {
        text += delim; // unclosed / empty: literal
        i += delim.length;
      } else {
        flush();
        out.push({
          kind: delim === '$$' ? 'display' : 'inline',
          content: src.slice(i + delim.length, end),
        });
        i = end + delim.length;
      }
    } else {
      text += c;
      i++;
    }
  }
  flush();
  return out;
}

export interface MathCheck {
  ok: boolean;
  errors: { segment: string; message: string }[];
}

export function checkMath(markdown: string): MathCheck {
  const errors: MathCheck['errors'] = [];
  for (const seg of splitMath(markdown)) {
    if (seg.kind === 'text') continue;
    try {
      katex.renderToString(seg.content, {
        displayMode: seg.kind === 'display',
        throwOnError: true,
        trust: false,
        strict: 'warn',
      });
    } catch (e) {
      errors.push({ segment: seg.content, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok: errors.length === 0, errors };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Replace math with KaTeX HTML; all other text is escaped (no raw HTML passthrough). */
export function renderMath(markdown: string): string {
  return splitMath(markdown)
    .map((seg) =>
      seg.kind === 'text'
        ? escapeHtml(seg.content)
        : katex.renderToString(seg.content, {
            displayMode: seg.kind === 'display',
            throwOnError: false,
            trust: false,
            strict: 'ignore',
          }),
    )
    .join('');
}
