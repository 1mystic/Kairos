/**
 * Lightweight "smart" search for saved notes: tokenise, lowercase, drop stop words, strip common English suffixes,
 * match with a small typo tolerance (Damerau-Levenshtein <= 1 for tokens of 5+ letters) and rank by weighted hits.
 * Pure: no models, no network.
 */
import type { AiNote } from '../store/types';

const STOP = new Set((
  'a an and are as at be been but by can did do does for from had has have how i if in into is it its me my of on or our so ' +
  'than that the their them then there these this those to up was we were what when where which who why will with you your'
).split(' '));

/** Strip the most common English suffixes (never below 3 letters), so "reflections", "reflecting", "reflected" meet. */
export function stem(w: string): string {
  if (w.endsWith('sses')) return w.length - 2 >= 3 ? w.slice(0, -2) : w;
  if (w.endsWith('ies')) return w.length >= 5 ? `${w.slice(0, -3)}y` : w;
  for (const suf of ['ingly', 'edly', 'ing', 'ed', 'ment', 'ness', 'ly', 'ers', 'er']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length);
  }
  if (/(?:ch|sh|x|z)es$/.test(w) && w.length - 2 >= 3) return w.slice(0, -2);
  if (w.endsWith('s') && !/(?:ss|us|is)$/.test(w) && w.length - 1 >= 3) return w.slice(0, -1);
  return w;
}

/** Lowercase word tokens (letters, marks and digits, including non-Latin scripts), stop words and 1-letter words removed, stemmed. */
export function tokenize(s: string): string[] {
  const out: string[] = [];
  for (const raw of s.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u)) {
    if (!raw || STOP.has(raw)) continue;
    if (raw.length < 2 && !/\d/.test(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions), bounded: returns > max early. */
export function damerauLevenshtein(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

/** How well a query token matches a document token: 1 exact, 0.7 prefix (3+ letters), 0.6 one typo (5+ letters), else 0. */
export function tokenMatch(q: string, t: string): number {
  if (q === t) return 1;
  if (q.length >= 3 && t.startsWith(q)) return 0.7;
  if (q.length >= 5 && t.length >= 5 && damerauLevenshtein(q, t, 1) <= 1) return 0.6;
  return 0;
}

export const FIELD_WEIGHT = { chapter: 3, stem: 2, note: 1, meta: 0.5 } as const;
type Field = keyof typeof FIELD_WEIGHT;

export interface SearchCtx {
  /** chapter id -> display name */
  chapterNames?: Readonly<Record<string, string>>;
  /** chapter id -> topic names (taxonomy) */
  topicNames?: Readonly<Record<string, readonly string[]>>;
  /** extra searchable words for a note (exam label, provider) */
  meta?: (n: AiNote) => string;
}

function fields(n: AiNote, ctx: SearchCtx): Record<Field, string[]> {
  const chapter = n.chapter ? [ctx.chapterNames?.[n.chapter] ?? '', ...(ctx.topicNames?.[n.chapter] ?? [])].join(' ') : '';
  return {
    chapter: tokenize(chapter),
    stem: tokenize(n.stem ?? ''),
    note: tokenize(n.text),
    meta: tokenize(`${n.qid} ${n.chapter ?? ''} ${ctx.meta?.(n) ?? ''}`),
  };
}

/** Weighted score of one note for the query tokens; 0 when too few of the tokens match anywhere. */
export function scoreNote(n: AiNote, q: readonly string[], ctx: SearchCtx = {}): number {
  if (q.length === 0) return 0;
  const f = fields(n, ctx);
  let total = 0;
  let matched = 0;
  for (const qt of q) {
    let best = 0;
    for (const field of Object.keys(FIELD_WEIGHT) as Field[]) {
      let hits = 0;
      let top = 0;
      for (const t of f[field]) {
        const m = tokenMatch(qt, t);
        if (m > 0) { hits++; top = Math.max(top, m); }
      }
      if (hits) best = Math.max(best, FIELD_WEIGHT[field] * top * (1 + 0.1 * (Math.min(hits, 5) - 1)));
    }
    if (best > 0) { matched++; total += best; }
  }
  const need = q.length <= 2 ? q.length : Math.ceil(q.length * 0.6);
  return matched >= need ? total : 0;
}

/**
 * Notes matching `query`, best first (ties: newest first). An empty query returns the notes unchanged. A query made only of
 * stop words or single characters ("q_3") falls back to a plain substring match.
 */
export function searchNotes(notes: readonly AiNote[], query: string, ctx: SearchCtx = {}): AiNote[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [...notes];
  const q = tokenize(raw);
  if (q.length === 0) {
    return notes.filter((n) => [n.stem, n.text, n.qid, n.chapter].filter(Boolean).join('\n').toLowerCase().includes(raw));
  }
  return notes
    .map((n) => ({ n, s: scoreNote(n, q, ctx) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.n.updatedAt - a.n.updatedAt)
    .map((x) => x.n);
}
