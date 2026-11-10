import { useCallback, useEffect, useState } from 'react';

/** Catalog contract with the DryRun embed (generated at /dsa/catalog.json). */
export type Diff = 'E' | 'M' | 'H';

export interface Problem {
  n: number;
  t: string;
  d: Diff;
  tg: string[];
  pat: string;
  br: string;
  bt: string;
  bs: string;
  ot: string;
  os: string;
  trick: string;
  real: string;
  lang: 'py' | 'js';
  chapter: string;
}

export interface Track { id: string; name: string; focus: string; ids: string[] }

export interface Catalog {
  version: 1;
  tracks: Track[];
  problems: Record<string, Problem>;
}

export const CATALOG_URL = '/dsa/catalog.json';

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);

/** Tolerant parser: drops malformed problems / tracks instead of failing the whole page. Throws only when the shape is unusable. */
export function parseCatalog(raw: unknown): Catalog {
  if (!raw || typeof raw !== 'object') throw new Error('Catalog is not an object');
  const r = raw as Record<string, unknown>;
  if (!r.problems || typeof r.problems !== 'object' || !Array.isArray(r.tracks)) throw new Error('Catalog is missing tracks or problems');
  const problems: Record<string, Problem> = {};
  for (const [slug, v] of Object.entries(r.problems as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const p = v as Record<string, unknown>;
    const d = p.d === 'E' || p.d === 'M' || p.d === 'H' ? p.d : null;
    if (!d || typeof p.t !== 'string') continue;
    problems[slug] = {
      n: typeof p.n === 'number' ? p.n : 0,
      t: p.t,
      d,
      tg: Array.isArray(p.tg) ? p.tg.filter((x): x is string => typeof x === 'string') : [],
      pat: str(p.pat),
      br: str(p.br),
      bt: str(p.bt),
      bs: str(p.bs),
      ot: str(p.ot),
      os: str(p.os),
      trick: str(p.trick),
      real: str(p.real),
      lang: p.lang === 'js' ? 'js' : 'py',
      chapter: str(p.chapter),
    };
  }
  const tracks: Track[] = [];
  for (const t of r.tracks) {
    if (!t || typeof t !== 'object') continue;
    const o = t as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.name !== 'string') continue;
    const ids = Array.isArray(o.ids) ? o.ids.filter((x): x is string => typeof x === 'string' && x in problems) : [];
    tracks.push({ id: o.id, name: o.name, focus: str(o.focus), ids });
  }
  return { version: 1, tracks, problems };
}

let memo: Promise<Catalog> | null = null;

/** Fetch once and memoise (a failure is not memoised, so retry works). The service worker caches the file at runtime. */
export function fetchCatalog(fetchImpl: typeof fetch = fetch): Promise<Catalog> {
  memo ??= fetchImpl(CATALOG_URL, { headers: { accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
      return res.json();
    })
    .then(parseCatalog)
    .catch((e) => {
      memo = null;
      throw e;
    });
  return memo;
}

export function resetCatalogCache(): void {
  memo = null;
}

export interface CatalogState { data: Catalog | null; loading: boolean; error: Error | null; retry(): void }

export function useCatalog(): CatalogState {
  const [state, setState] = useState<{ data: Catalog | null; error: Error | null }>({ data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    fetchCatalog().then(
      (data) => live && setState({ data, error: null }),
      (error: unknown) => live && setState({ data: null, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => { live = false; };
  }, [attempt]);
  const retry = useCallback(() => {
    setState({ data: null, error: null });
    setAttempt((a) => a + 1);
  }, []);
  return { data: state.data, loading: !state.data && !state.error, error: state.error, retry };
}
