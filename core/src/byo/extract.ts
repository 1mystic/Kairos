/**
 * Pull JSON out of a pasted AI chat reply. Tolerates prose around the block, smart quotes,
 * trailing commas, raw newlines inside strings and unescaped LaTeX backslashes. Never uses eval.
 */

export interface ExtractedBlock {
  /** 0-based position among the blocks found in the paste */
  index: number;
  value: unknown;
  /** human-readable list of repairs that were needed (empty when the JSON was already valid) */
  repairs: string[];
  /** 1-based line of the block start in the pasted text */
  line: number;
}

export interface ExtractError {
  blockIndex: number;
  message: string;
  /** 1-based, relative to the whole pasted text */
  line: number;
  col: number;
}

export interface ExtractResult {
  blocks: ExtractedBlock[];
  errors: ExtractError[];
}

const OPEN_SMART = new Set(['“', '”', '„', '‟', '«', '»']);
const CLOSE_SMART = new Set(['“', '”', '„', '‟', '»', '«']);
const SMART_SINGLE = /[‘’]/;

export function lineCol(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let last = -1;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text[i] === '\n') {
      line++;
      last = i;
    }
  }
  return { line, col: offset - last };
}

const VALID_ESC = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);

interface Repaired {
  text: string;
  /** map[i] = source offset of repaired char i */
  map: number[];
  repairs: Set<string>;
}

/** One-pass, string-aware repair. Offsets are mapped back so errors point at the original. */
function repair(src: string): Repaired {
  const out: string[] = [];
  const map: number[] = [];
  const repairs = new Set<string>();
  const emit = (s: string, at: number) => {
    for (const ch of s) {
      out.push(ch);
      map.push(at);
    }
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || OPEN_SMART.has(c)) {
      const smart = c !== '"';
      if (smart) repairs.add('smart quotes');
      emit('"', i);
      i++;
      while (i < src.length) {
        const d = src[i]!;
        if (d === '\\') {
          const n = src[i + 1];
          if (n === undefined) {
            i++;
            break;
          }
          if (VALID_ESC.has(n) && !(n === 'u' && !/^[0-9a-fA-F]{4}/.test(src.slice(i + 2, i + 6)))) {
            emit(d + n, i);
          } else {
            repairs.add('unescaped backslash');
            emit('\\\\' + n, i);
          }
          i += 2;
        } else if (d === '"' || (smart && CLOSE_SMART.has(d))) {
          emit('"', i);
          i++;
          break;
        } else if (d === '\n') {
          repairs.add('raw newline in string');
          emit('\\n', i);
          i++;
        } else if (d === '\r') {
          i++;
        } else if (d === '\t') {
          repairs.add('raw tab in string');
          emit('\\t', i);
          i++;
        } else {
          emit(d, i);
          i++;
        }
      }
    } else if (c === ',') {
      // trailing comma: next non-space char closes a container
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j]!)) j++;
      if (src[j] === '}' || src[j] === ']') repairs.add('trailing comma');
      else emit(',', i);
      i++;
    } else if (SMART_SINGLE.test(c) && /^\s*[:,}\]]/.test(src.slice(i + 1))) {
      // stray smart single quote used as delimiter: leave it, parser reports it
      emit(c, i);
      i++;
    } else {
      emit(c, i);
      i++;
    }
  }
  return { text: out.join(''), map, repairs };
}


/** After parsing: control chars that are really LaTeX commands whose backslash was eaten. */
function fixLatexEscapes(v: unknown, hit: { n: number }): unknown {
  if (typeof v === 'string') {
    const r = v
      .replace(/\f/g, () => '\\f')
      .replace(new RegExp(String.fromCharCode(8), 'g'), () => '\\b')
      .replace(/\t(?=[a-zA-Z])/g, () => '\\t')
      .replace(/\r(?=[a-zA-Z])/g, () => '\\r')
      .replace(/\n(?=(?:eq|abla|otin|leq|geq|parallel|rightarrow|cong|subset|u(?![a-z])))/g, () => '\\n');
    if (r !== v) hit.n++;
    return r;
  }
  if (Array.isArray(v)) return v.map((x) => fixLatexEscapes(x, hit));
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = fixLatexEscapes(x, hit);
    return o;
  }
  return v;
}

/** Fenced blocks whose info string is empty or `json` (case-insensitive). */
function findFences(text: string): { start: number; body: string }[] {
  const out: { start: number; body: string }[] = [];
  const open = /^[ \t]*(`{3,}|~{3,})[ \t]*([A-Za-z0-9_-]*)[^\n]*\n/gm;
  let m: RegExpExecArray | null;
  let from = 0;
  while ((m = open.exec(text))) {
    if (m.index < from) continue;
    const fence = m[1]!;
    const lang = m[2]!.toLowerCase();
    const bodyStart = m.index + m[0].length;
    const closeRe = new RegExp(`^[ \\t]*${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`, 'm');
    const rest = text.slice(bodyStart);
    const cm = closeRe.exec(rest);
    const bodyEnd = cm ? bodyStart + cm.index : text.length;
    from = cm ? bodyEnd + cm[0].length : text.length;
    open.lastIndex = from;
    if (lang === '' || lang === 'json' || lang === 'jsonc' || lang === 'json5')
      out.push({ start: bodyStart, body: text.slice(bodyStart, bodyEnd) });
  }
  return out;
}

/** Top-level `{...}` objects in free text (string/smart-quote aware brace matching). */
function findBareObjects(text: string): { start: number; body: string }[] {
  const out: { start: number; body: string }[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '{') {
      i++;
      continue;
    }
    let depth = 0;
    let j = i;
    let closed = false;
    while (j < text.length) {
      const c = text[j]!;
      if (c === '"' || OPEN_SMART.has(c)) {
        const smart = c !== '"';
        j++;
        while (j < text.length) {
          const d = text[j]!;
          if (d === '\\') j++;
          else if (d === '"' || (smart && CLOSE_SMART.has(d))) break;
          j++;
        }
      } else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          closed = true;
          break;
        }
      }
      j++;
    }
    const end = closed ? j + 1 : text.length;
    out.push({ start: i, body: text.slice(i, end) });
    i = end;
  }
  return out;
}

export function extractJsonBlocks(text: string): ExtractResult {
  const src = text.replace(/^\uFEFF/, '');
  let cands = findFences(src).filter((f) => f.body.trim().length > 0);
  if (cands.length === 0) cands = findBareObjects(src);
  const blocks: ExtractedBlock[] = [];
  const errors: ExtractError[] = [];
  if (cands.length === 0) {
    errors.push({
      blockIndex: 0,
      message: 'No JSON found. Paste the whole reply (it should contain a ```json block).',
      line: 1,
      col: 1,
    });
    return { blocks, errors };
  }
  cands.forEach((cand, index) => {
    const lead = cand.body.length - cand.body.trimStart().length;
    const startOff = cand.start + lead;
    const body = cand.body.trim();
    const { line } = lineCol(src, startOff);
    const rep = repair(body);
    try {
      let value = JSON.parse(rep.text) as unknown;
      const hit = { n: 0 };
      value = fixLatexEscapes(value, hit);
      if (hit.n > 0) rep.repairs.add('LaTeX backslashes eaten by JSON escapes');
      blocks.push({ index, value, repairs: [...rep.repairs], line });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const pm = /position (\d+)/.exec(msg);
      const pos = pm ? Number(pm[1]) : rep.text.length;
      const srcPos = rep.map[Math.min(pos, rep.map.length - 1)] ?? 0;
      const { line: l, col } = lineCol(src, startOff + srcPos);
      const clean = msg.replace(/\s*in JSON at position \d+.*$/, '').replace(/\s*\(line \d+ column \d+\)/, '');
      errors.push({
        blockIndex: index,
        message: `Invalid JSON at line ${l}, col ${col}: ${clean}`,
        line: l,
        col,
      });
    }
  });
  return { blocks, errors };
}

// ---------------------------------------------------------------- merging

export interface MergeableBlock {
  meta?: unknown;
  passages?: { id: string; text: string }[];
  questions: { n: number }[];
  continue_from?: number | null;
  [k: string]: unknown;
}

export interface MergeResult<B extends MergeableBlock> {
  merged: { meta?: B['meta']; passages: { id: string; text: string }[]; questions: B['questions']; continue_from: number | null };
  /** question numbers that appeared in more than one block (first copy kept) */
  duplicates: number[];
  /** question numbers missing between the lowest and highest n, or between a chunk and its continuation */
  gaps: number[];
  /** passage ids defined twice with different text */
  passageConflicts: string[];
  /** last chunk still asks to continue from this n */
  incomplete: number | null;
  warnings: string[];
}

export function mergeBlocks<B extends MergeableBlock>(blocks: B[]): MergeResult<B> {
  const questions: B['questions'] = [];
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  const passages = new Map<string, string>();
  const passageConflicts = new Set<string>();
  const gaps = new Set<number>();
  const warnings: string[] = [];
  blocks.forEach((b, bi) => {
    for (const q of b.questions) {
      if (seen.has(q.n)) duplicates.add(q.n);
      else {
        seen.add(q.n);
        questions.push(q);
      }
    }
    for (const p of b.passages ?? []) {
      const prev = passages.get(p.id);
      if (prev === undefined) passages.set(p.id, p.text);
      else if (prev !== p.text) passageConflicts.add(p.id);
    }
    const next = blocks[bi + 1];
    if (b.continue_from != null && next && next.questions.length > 0) {
      const first = Math.min(...next.questions.map((q) => q.n));
      for (let n = b.continue_from; n < first; n++) gaps.add(n);
      if (first > b.continue_from) warnings.push(`block ${bi + 2} starts at ${first} but block ${bi + 1} asked to continue from ${b.continue_from}`);
    }
  });
  const ns = [...seen].sort((a, b) => a - b);
  for (let k = 1; k < ns.length; k++) for (let n = ns[k - 1]! + 1; n < ns[k]!; n++) gaps.add(n);
  const last = blocks[blocks.length - 1];
  const incomplete = last?.continue_from ?? null;
  if (duplicates.size) warnings.push(`duplicate question numbers ignored: ${[...duplicates].sort((a, b) => a - b).join(', ')}`);
  if (gaps.size) warnings.push(`missing question numbers: ${[...gaps].sort((a, b) => a - b).join(', ')}`);
  if (passageConflicts.size) warnings.push(`passages with conflicting text: ${[...passageConflicts].join(', ')}`);
  if (incomplete != null) warnings.push(`reply is incomplete: ask the AI to "continue" from question ${incomplete}`);
  return {
    merged: {
      meta: blocks[0]?.meta,
      passages: [...passages].map(([id, text]) => ({ id, text })),
      questions,
      continue_from: incomplete,
    },
    duplicates: [...duplicates].sort((a, b) => a - b),
    gaps: [...gaps].sort((a, b) => a - b),
    passageConflicts: [...passageConflicts],
    incomplete,
    warnings,
  };
}
