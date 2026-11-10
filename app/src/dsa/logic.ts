import type { Catalog, Diff, Problem, Track } from './catalog';

export const DIFF_LABEL: Record<Diff, string> = { E: 'Easy', M: 'Medium', H: 'Hard' };
export const DIFF_TONE: Record<Diff, 'good' | 'warn' | 'bad'> = { E: 'good', M: 'warn', H: 'bad' };
export const ALL_TRACK = 'all';
export const LAST_KEY = 'kairos-dsa-last';

export interface Row { slug: string; p: Problem }

export interface Filters { diff: Diff | 'all'; pattern: string; query: string; hideDone: boolean }
export const NO_FILTERS: Filters = { diff: 'all', pattern: '', query: '', hideDone: false };

export const complexity = (p: Problem) => `${p.ot || '?'} · ${p.os || '?'}`;

/** Problems of a track in catalog order. Track id `all` is every problem sorted by LeetCode number. */
export function trackRows(cat: Catalog, trackId: string): { track: Track; rows: Row[] } | null {
  if (trackId === ALL_TRACK) {
    const rows = Object.entries(cat.problems).map(([slug, p]) => ({ slug, p })).sort((a, b) => a.p.n - b.p.n);
    return { track: { id: ALL_TRACK, name: 'All problems', focus: 'Every DSA problem, by LeetCode number.', ids: rows.map((r) => r.slug) }, rows };
  }
  const track = cat.tracks.find((t) => t.id === trackId);
  if (!track) return null;
  return { track, rows: track.ids.flatMap((slug) => (cat.problems[slug] ? [{ slug, p: cat.problems[slug] }] : [])) };
}

export function filterRows(rows: readonly Row[], f: Filters, done: ReadonlySet<string>): Row[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(({ slug, p }) => {
    if (f.diff !== 'all' && p.d !== f.diff) return false;
    if (f.pattern && p.pat !== f.pattern) return false;
    if (f.hideDone && done.has(slug)) return false;
    if (q && !(p.t.toLowerCase().includes(q) || slug.includes(q) || String(p.n) === q || p.pat.toLowerCase().includes(q) || p.tg.some((t) => t.toLowerCase().includes(q)))) return false;
    return true;
  });
}

/** Patterns with counts, most frequent first (ties alphabetical). */
export function patternCounts(rows: readonly Row[]): { pattern: string; count: number }[] {
  const m = new Map<string, number>();
  for (const { p } of rows) if (p.pat) m.set(p.pat, (m.get(p.pat) ?? 0) + 1);
  return [...m].map(([pattern, count]) => ({ pattern, count })).sort((a, b) => b.count - a.count || a.pattern.localeCompare(b.pattern));
}

export function diffCounts(rows: readonly Row[], done: ReadonlySet<string>): Record<Diff, { done: number; total: number }> {
  const out: Record<Diff, { done: number; total: number }> = { E: { done: 0, total: 0 }, M: { done: 0, total: 0 }, H: { done: 0, total: 0 } };
  for (const { slug, p } of rows) {
    out[p.d].total++;
    if (done.has(slug)) out[p.d].done++;
  }
  return out;
}

export const doneCount = (rows: readonly Row[], done: ReadonlySet<string>) => rows.reduce((n, r) => n + (done.has(r.slug) ? 1 : 0), 0);

/** First unsolved problem in track order, or null when everything is solved. */
export function nextUnsolved(rows: readonly Row[], done: ReadonlySet<string>, after?: string): Row | null {
  const start = after ? rows.findIndex((r) => r.slug === after) + 1 : 0;
  const order = [...rows.slice(start), ...rows.slice(0, start)];
  return order.find((r) => !done.has(r.slug) && r.slug !== after) ?? null;
}

export function neighbours(rows: readonly Row[], slug: string): { prev: Row | null; next: Row | null } {
  const i = rows.findIndex((r) => r.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: rows[i - 1] ?? null, next: rows[i + 1] ?? null };
}

export const trackOf = (cat: Catalog, slug: string): Track | undefined => cat.tracks.find((t) => t.ids.includes(slug));

export function readLast(): string | null {
  try { return localStorage.getItem(LAST_KEY); } catch { return null; }
}
export function saveLast(slug: string): void {
  try { localStorage.setItem(LAST_KEY, slug); } catch { /* ignore */ }
}

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${encodeURIComponent(slug)}/`;
export const dryrunUrl = (slug: string, embed = false) => `/dryrun/index.html${embed ? '?embed=1' : ''}#/p/${encodeURIComponent(slug)}`;
