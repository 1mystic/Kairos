import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCatalog, parseCatalog, resetCatalogCache } from '../catalog';
import { DONE_KEY, parseDone, serializeDone, setDone } from '../done';
import { DsaHubView } from '../DsaHub';
import { filterRows, neighbours, nextUnsolved, NO_FILTERS, patternCounts, trackRows } from '../logic';
import { ProblemView } from '../ProblemPage';
import { dsaRoutes } from '../routes';
import { parseDryrunMessage, writeDryrunTheme } from '../theme';
import { TrackView } from '../TrackPage';
import { fakeCatalog } from './fixtures';

const at = (ui: React.ReactElement, url = '/') => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

beforeEach(() => { localStorage.clear(); resetCatalogCache(); });

describe('catalog', () => {
  it('parses, drops malformed problems and unknown track ids', () => {
    const raw = { version: 1, tracks: [{ id: 'a', name: 'A', focus: 'f', ids: ['x', 'ghost'] }, { id: 5 }], problems: { x: { n: 1, t: 'X', d: 'E', pat: 'p' }, bad: { t: 'no diff' } } };
    const c = parseCatalog(raw);
    expect(Object.keys(c.problems)).toEqual(['x']);
    expect(c.tracks).toEqual([{ id: 'a', name: 'A', focus: 'f', ids: ['x'] }]);
    expect(c.problems.x!.lang).toBe('py');
  });
  it('rejects unusable shapes', () => {
    expect(() => parseCatalog(null)).toThrow();
    expect(() => parseCatalog({ tracks: [] })).toThrow();
  });
  it('memoises a success and retries after a failure', async () => {
    const f = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValue({ ok: true, json: async () => fakeCatalog() });
    await expect(fetchCatalog(f as unknown as typeof fetch)).rejects.toThrow();
    await fetchCatalog(f as unknown as typeof fetch);
    await fetchCatalog(f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('done', () => {
  it('reads object, array, empty and garbage', () => {
    expect([...parseDone('{"a":1,"b":0,"c":true}')]).toEqual(['a', 'c']);
    expect([...parseDone('["a","b",3]')]).toEqual(['a', 'b']);
    expect(parseDone('').size).toBe(0);
    expect(parseDone(null).size).toBe(0);
    expect(parseDone('not json').size).toBe(0);
    expect(parseDone('42').size).toBe(0);
  });
  it('writes the object form, converts arrays and notifies', () => {
    localStorage.setItem(DONE_KEY, '["a"]');
    const cb = vi.fn();
    window.addEventListener('kairos-dsa-done', cb);
    setDone('b', true);
    expect(JSON.parse(localStorage.getItem(DONE_KEY)!)).toEqual({ a: 1, b: 1 });
    setDone('a', false);
    expect(localStorage.getItem(DONE_KEY)).toBe(serializeDone(new Set(['b'])));
    expect(cb).toHaveBeenCalledTimes(2);
  });
});

describe('logic', () => {
  const cat = fakeCatalog();
  const { rows } = trackRows(cat, 'backend')!;
  it('filters by difficulty, pattern, query and done', () => {
    expect(filterRows(rows, { ...NO_FILTERS, diff: 'M' }, new Set()).map((r) => r.slug)).toEqual(['course-schedule']);
    expect(filterRows(rows, { ...NO_FILTERS, pattern: 'Hash map' }, new Set())).toHaveLength(2);
    expect(filterRows(rows, { ...NO_FILTERS, query: '242' }, new Set()).map((r) => r.slug)).toEqual(['valid-anagram']);
    expect(filterRows(rows, { ...NO_FILTERS, hideDone: true }, new Set(['two-sum']))).toHaveLength(2);
  });
  it('sorts patterns by count, finds next unsolved and neighbours', () => {
    expect(patternCounts(rows)[0]).toEqual({ pattern: 'Hash map', count: 2 });
    expect(nextUnsolved(rows, new Set(['two-sum']))!.slug).toBe('valid-anagram');
    expect(nextUnsolved(rows, new Set(rows.map((r) => r.slug)))).toBeNull();
    expect(neighbours(rows, 'valid-anagram')).toMatchObject({ prev: { slug: 'two-sum' }, next: { slug: 'course-schedule' } });
    expect(trackRows(cat, 'all')!.rows.map((r) => r.p.n)).toEqual([1, 207, 242, 347]);
    expect(trackRows(cat, 'nope')).toBeNull();
  });
});

describe('screens', () => {
  it('hub shows progress, tracks and the practice link', () => {
    localStorage.setItem(DONE_KEY, '{"two-sum":1}');
    at(<DsaHubView cat={fakeCatalog()} last="two-sum" />);
    expect(screen.getByText('Solved 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('ML engineer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practise DSA questions' })).toHaveAttribute('href', '/practice');
    expect(screen.getByText('1. Two Sum')).toBeInTheDocument();
  });
  it('track list filters, writes dr-done and hides done', () => {
    at(<TrackView cat={fakeCatalog()} trackId="backend" wide />, '/dsa/t/backend');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark Two Sum solved' }));
    expect(JSON.parse(localStorage.getItem(DONE_KEY)!)).toEqual({ 'two-sum': 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Hide done' }));
    expect(screen.queryByText('Two Sum')).toBeNull();
    fireEvent.change(screen.getByLabelText('Search problems'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nothing matches')).toBeInTheDocument();
  });
  it('unknown track and unknown problem show an empty state', () => {
    at(<TrackView cat={fakeCatalog()} trackId="zzz" />);
    expect(screen.getByText('We could not find that track')).toBeInTheDocument();
  });
  it('viewer: sandboxed iframe, theme written before src, mark solved, prev/next, last saved', () => {
    document.documentElement.dataset.theme = 'dark';
    at(<ProblemView cat={fakeCatalog()} slug="valid-anagram" trackParam="backend" />);
    expect(localStorage.getItem('dr-theme')).toBe('dark');
    const frame = screen.getByTitle(/Valid Anagram/) as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toBe('/dryrun/index.html?embed=1#/p/valid-anagram');
    expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
    expect(screen.getByRole('link', { name: 'Open on LeetCode' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /Previous problem: Two Sum/ })).toHaveAttribute('href', '/dsa/p/two-sum?track=backend');
    fireEvent.click(screen.getByRole('button', { name: 'Mark solved' }));
    expect(parseDone(localStorage.getItem(DONE_KEY)).has('valid-anagram')).toBe(true);
    expect(localStorage.getItem('kairos-dsa-last')).toBe('valid-anagram');
  });
  it('viewer: done message from own frame updates state; foreign origin ignored', () => {
    at(<ProblemView cat={fakeCatalog()} slug="two-sum" />);
    const frame = screen.getByTitle(/Two Sum/) as HTMLIFrameElement;
    const send = (origin: string, source: Window | null) =>
      act(() => { window.dispatchEvent(new MessageEvent('message', { origin, source, data: { type: 'dryrun:done', slug: 'two-sum', done: true } })); });
    send('https://evil.example', frame.contentWindow);
    expect(parseDone(localStorage.getItem(DONE_KEY)).size).toBe(0);
    send(location.origin, frame.contentWindow);
    expect(parseDone(localStorage.getItem(DONE_KEY)).has('two-sum')).toBe(true);
  });
  it('viewer: unknown slug', () => {
    at(<ProblemView cat={fakeCatalog()} slug="nope" />);
    expect(screen.getByText('We could not find that problem')).toBeInTheDocument();
  });
});

describe('messages and theme', () => {
  const win = {} as Window;
  it('origin and source checks', () => {
    const data = { type: 'dryrun:ready', slug: 's' };
    expect(parseDryrunMessage({ origin: location.origin, source: win, data }, win)).toEqual(data);
    expect(parseDryrunMessage({ origin: 'https://x.test', source: win, data }, win)).toBeNull();
    expect(parseDryrunMessage({ origin: location.origin, source: {}, data }, win)).toBeNull();
    expect(parseDryrunMessage({ origin: location.origin, source: win, data: { type: 'dryrun:done', slug: 's' } }, win)).toBeNull();
  });
  it('writes dr-theme', () => {
    writeDryrunTheme('light');
    expect(localStorage.getItem('dr-theme')).toBe('light');
  });
});

describe('routes', () => {
  it('exposes exactly the three paths, none shadowing another', () => {
    expect(dsaRoutes.map((r) => r.path)).toEqual(['/dsa', '/dsa/t/:track', '/dsa/p/:slug']);
  });
  it('no border or shadow utilities in dsa sources', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const dir = fileURLToPath(new URL('..', import.meta.url));
    for (const f of readdirSync(dir).filter((n) => /\.tsx$/.test(n))) {
      expect(readFileSync(dir + f, 'utf8'), f).not.toMatch(/['"` ](?:border|shadow|ring|outline)(?:-[\w]+)*['"` ]/);
    }
  });
});
