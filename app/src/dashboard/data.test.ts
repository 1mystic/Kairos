import { describe, expect, it } from 'vitest';
import type { MockDoc, SessionDoc } from '../store';
import { deltaWords, makeDelta, selectRangeData, selectReadiness, streakOf, titleCase } from './data';
import { pickTip } from './tips';
import type { Range } from './range';

const at = (date: string, h = 12) => { const [y, m, d] = date.split('-').map(Number); return new Date(y!, m! - 1, d!, h).getTime(); };
const sess = (id: string, date: string, n: number, correct: number, chapter = 'PHY.ROT', extra: Record<string, unknown> = {}): SessionDoc => ({
  id, startedAt: at(date), exam: 'JEE_MAIN', chapter,
  summary: { n, correct, wrong: n - correct, skipped: 0, totalTimeMs: n * 60_000, byChapter: { [chapter]: { n, correct, wrong: n - correct, skipped: 0, timeMs: n * 60_000 } }, labels: {}, ...extra },
});
const mock = (id: string, date: string, marks: number): MockDoc => ({ id, paperId: 'p', submittedAt: at(date), score: { marks, max: 300 }, analysis: { v: 1, title: 'Mini', usedMs: 60_000 * 90 } });
const day: Range = { kind: 'daily', end: '2026-11-08' };
const week: Range = { kind: 'week', end: '2026-11-08' };

describe('selectRangeData', () => {
  const sessions = [sess('a', '2026-11-08', 20, 15), sess('b', '2026-11-08', 10, 5, 'CHE.BOND'), sess('c', '2026-11-07', 10, 5), sess('d', '2026-11-02', 30, 24)];
  it('totals for the window and previous-window deltas', () => {
    const d = selectRangeData(sessions, [], null, day);
    expect(d.totals.questions).toBe(30);
    expect(d.totals.accuracy).toBe(67);
    expect(d.totals.minutes).toBe(30);
    expect(d.hasPrev).toBe(true);
    expect(d.deltas.questions).toMatchObject({ dir: 'up', pct: 200 });
    expect(deltaWords(d.deltas.questions!)).toBe('Up 200%');
    expect(d.deltas.accuracy).toMatchObject({ dir: 'up', unit: 'points' });
  });
  it('shows a down delta with words', () => {
    const d = selectRangeData([sess('x', '2026-11-08', 5, 2), sess('y', '2026-11-07', 20, 15)], [], null, day);
    expect(d.deltas.questions).toMatchObject({ dir: 'down', pct: -75 });
    expect(deltaWords(d.deltas.questions!)).toBe('Down 75%');
    expect(deltaWords(d.deltas.accuracy!)).toBe('Down 35 pts');
  });
  it('hides deltas when the previous window is empty', () => {
    const d = selectRangeData([sess('a', '2026-11-08', 20, 15)], [], null, day);
    expect(d.hasPrev).toBe(false);
    expect(Object.values(d.deltas).every((x) => x === null)).toBe(true);
  });
  it('week window and previous week do not overlap', () => {
    const d = selectRangeData(sessions, [], null, week);
    expect(d.totals.questions).toBe(70);
    expect(selectRangeData([sess('o', '2026-11-01', 10, 5)], [], null, week).prevTotals.questions).toBe(10);
  });
  it('top chapters sorted by volume, with accuracy and link exam', () => {
    const d = selectRangeData(sessions, [], null, week, { names: { 'PHY.ROT': 'Rotational Motion' } });
    expect(d.chapters.map((c) => c.id)).toEqual(['PHY.ROT', 'CHE.BOND']);
    expect(d.chapters[0]).toMatchObject({ name: 'Rotational Motion', n: 60, correct: 44, accuracy: 73, exam: 'JEE_MAIN' });
    expect(d.weakest?.id).toBe('CHE.BOND');
  });
  it('trend has per-day metrics (7 days for daily)', () => {
    const d = selectRangeData(sessions, [], null, day);
    expect(d.trend).toHaveLength(7);
    expect(d.trend.at(-1)).toMatchObject({ date: '2026-11-08', questions: 30, sessions: 2 });
    expect(d.trend[0]).toMatchObject({ date: '2026-11-02', questions: 30 });
    expect(d.trend[1]!.accuracy).toBeNull();
  });
  it('mocks: counted, best score, activity, minutes', () => {
    const d = selectRangeData([], [mock('m1', '2026-11-08', 120), mock('m2', '2026-11-05', 200)], null, week);
    expect(d.totals.mocks).toBe(2);
    expect(d.totals.bestMock).toEqual({ marks: 200, max: 300 });
    expect(d.activity.map((e) => e.title)).toEqual(['Mock completed: 120/300', 'Mock completed: 200/300']);
    expect(d.totals.minutes).toBe(180);
  });
  it('pending mock has no score', () => {
    const d = selectRangeData([], [{ id: 'm', paperId: 'p', submittedAt: at('2026-11-08'), score: null, analysis: { v: 1, pending: true } }], null, day);
    expect(d.activity[0]!.title).toMatch(/pending/);
    expect(d.totals.bestMock).toBeNull();
  });
  it('activity: practice events newest first plus mastery changes', () => {
    const mastery = { 'PHY.ROT': { θ: -0.8, rd: 0.2, n: 20, last: at('2026-11-08', 20) }, 'CHE.BOND': { θ: 0.9, rd: 0.9, n: 1, last: at('2026-11-08', 21) } };
    const d = selectRangeData(sessions, [], mastery, day, { names: { 'PHY.ROT': 'Rotation' } });
    expect(d.activity.map((e) => e.kind)).toEqual(['mastery', 'practice', 'practice']);
    expect(d.activity[0]!.title).toBe('Rotation needs attention');
    expect(d.activity.find((e) => e.kind === 'practice')!.detail).toMatch(/correct/);
  });
  it('label counts and silly-mistake rate', () => {
    const d = selectRangeData([sess('a', '2026-11-08', 20, 10, 'PHY.ROT', { labels: { silly_mistake: 4 } }), sess('b', '2026-11-08', 20, 10, 'PHY.ROT', { labels: { silly_mistake: 2, time_sink: 1 } })], [], null, day);
    expect(d.totals.labels).toEqual({ silly_mistake: 6, time_sink: 1 });
    expect(d.totals.sillyRate).toBe(15);
  });
  it('streak counts back from the end day, or from yesterday while today is empty', () => {
    expect(streakOf(new Set(['2026-11-08', '2026-11-07', '2026-11-06', '2026-11-03']), '2026-11-08')).toBe(3);
    expect(streakOf(new Set(['2026-11-07', '2026-11-06']), '2026-11-08')).toBe(2);
    expect(streakOf(new Set(['2026-11-05']), '2026-11-08')).toBe(0);
  });
  it('empty input is safe', () => {
    const d = selectRangeData([], [], null, week);
    expect(d.hasAnyData).toBe(false);
    expect(d.totals.accuracy).toBeNull();
    expect(d.chapters).toEqual([]);
    expect(d.lastActivityAt).toBeNull();
  });
  it('ignores malformed docs', () => {
    const d = selectRangeData([{ id: 'z', startedAt: NaN } as SessionDoc, { id: 'y', startedAt: at('2026-11-08') }], [{ id: 'q', paperId: 'p' }], null, day);
    expect(d.totals.questions).toBe(0);
    expect(d.totals.sessions).toBe(1);
  });
  it('trend mastery metric averages topics last touched that day', () => {
    const d = selectRangeData([], [], { a: { θ: 0, rd: 0.2, n: 5, last: at('2026-11-08') } }, day);
    expect(d.trend.at(-1)!.mastery).toBe(50);
  });
});

describe('helpers', () => {
  it('makeDelta flat/null', () => {
    expect(makeDelta(10, 10, 'count', true)).toMatchObject({ dir: 'flat' });
    expect(deltaWords(makeDelta(10, 10, 'count', true)!)).toBe('Same');
    expect(makeDelta(5, null, 'points', true)).toBeNull();
    expect(makeDelta(5, 0, 'count', true)).toMatchObject({ dir: 'up', pct: null });
  });
  it('titleCase uses names then falls back', () => {
    expect(titleCase('PHY.ROT', { 'PHY.ROT': 'Rotation' })).toBe('Rotation');
    expect(titleCase('PHY.ROT')).toBe('PHY ROT');
    expect(titleCase('ionic_equilibrium')).toBe('Ionic Equilibrium');
  });
  it('readiness: null without data; label from core', () => {
    expect(selectReadiness(null)).toBeNull();
    expect(selectReadiness({ a: { θ: 0, rd: 0.9, n: 0 } })).toBeNull();
    const r = selectReadiness({ a: { θ: 1, rd: 0.1, n: 40 }, b: { θ: 1, rd: 0.1, n: 40 } })!;
    expect(r.label).toBe('confident');
    expect(r.pct).toBeGreaterThan(65);
    expect(selectReadiness({ a: { θ: 0.2, rd: 0.95, n: 2 } })!.label).toBe('not_enough_data');
  });
});

describe('tips', () => {
  it('first-time tip', () => expect(pickTip({ labels: {}, questions: 0, accuracy: null }).id).toBe('start'));
  it('silly mistakes tip', () => {
    const t = pickTip({ labels: { silly_mistake: 5, time_sink: 1 }, questions: 20, accuracy: 60 });
    expect(t.id).toBe('silly');
    expect(t.body).toMatch(/re-reading/);
  });
  it('time sinks tip', () => expect(pickTip({ labels: { time_sink: 3 }, questions: 12, accuracy: 60 }).body).toMatch(/2-minute/));
  it('falls back calmly', () => {
    expect(pickTip({ labels: {}, questions: 20, accuracy: 90 }).id).toBe('strong');
    expect(pickTip({ labels: { silly_mistake: 1 }, questions: 20, accuracy: 50 }).id).toBe('steady');
  });
});
