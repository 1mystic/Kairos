import { escapeHtml, renderTex, splitMath } from './katex';

/** `![alt](target)` — same shape as pipeline/schema.py `_MD_IMAGE`. */
export const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)]*)\)/g;
/** `![alt][ref]` reference-style image (rejected). */
export const MD_IMAGE_REF_RE = /!\[[^\]]*\]\[[^\]]*\]/;
export const IMG_TARGET_RE = /^img:([0-9a-f]{16})$/;

export type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'math'; tex: string; display: boolean }
  | { kind: 'image'; id: string; alt: string };

const IMG_INLINE_RE = /!\[([^\]]*)\]\(img:([0-9a-f]{16})\)/g;

/** Split markdown into ordered text / math / image segments. Other image syntaxes stay text. */
export function splitContent(md: string): ContentSegment[] {
  const out: ContentSegment[] = [];
  for (const seg of splitMath(md)) {
    if (seg.kind !== 'text') {
      out.push({ kind: 'math', tex: seg.content, display: seg.kind === 'display' });
      continue;
    }
    let last = 0;
    for (const m of seg.content.matchAll(IMG_INLINE_RE)) {
      const at = m.index!;
      if (at > last) out.push({ kind: 'text', text: seg.content.slice(last, at) });
      out.push({ kind: 'image', id: m[2]!, alt: m[1]! });
      last = at + m[0].length;
    }
    if (last < seg.content.length) out.push({ kind: 'text', text: seg.content.slice(last) });
  }
  return out;
}

export interface RenderContentOptions {
  /** Returns trusted HTML for an image. The callback must escape `alt` itself. */
  imageHtml: (id: string, alt: string) => string;
}

// private-use delimiters for stashed (already rendered) fragments
const OPEN = '';
const CLOSE = '';
const PLACEHOLDER_RE = /(\d+)/g;

function inline(escaped: string, stash: (html: string) => string): string {
  let s = escaped.replace(/`([^`]+)`/g, (_m, c: string) => stash(`<code>${c}</code>`));
  s = s.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '<em>$1</em>');
  return s;
}

/**
 * Safe markdown -> HTML: text is escaped (no raw HTML), math via KaTeX (trust:false),
 * images via `imageHtml`. Supports paragraphs, line breaks, **bold**, *italic*,
 * `code` and simple `- ` lists.
 */
export function renderContentHtml(md: string, opts: RenderContentOptions): string {
  const stashed: string[] = [];
  const stash = (html: string) => `${OPEN}${stashed.push(html) - 1}${CLOSE}`;

  let flat = '';
  for (const seg of splitContent(md.replace(/[]/g, ''))) {
    if (seg.kind === 'text') flat += seg.text;
    else if (seg.kind === 'math') flat += stash(renderTex(seg.tex, seg.display));
    else flat += stash(opts.imageHtml(seg.id, seg.alt));
  }

  const blocks: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(`<div class="kc-p">${para.join('<br>')}</div>`);
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push(`<ul>${list.map((l) => `<li>${l}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const line of flat.replace(/\r\n?/g, '\n').split('\n')) {
    const item = /^\s*[-*]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (item) {
      flushPara();
      list.push(inline(escapeHtml(item[1]!), stash));
    } else {
      flushList();
      para.push(inline(escapeHtml(line.trim()), stash));
    }
  }
  flushPara();
  flushList();

  const restore = (s: string): string =>
    s.replace(PLACEHOLDER_RE, (_m, i: string) => restore(stashed[Number(i)]!));
  return restore(blocks.join(''));
}
