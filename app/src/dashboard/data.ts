import { addDays, aggregate, confidenceLabel, pCorrect, type BehaviourLabel, type ConfidenceLabel } from '@kairos/core';
import type { MockDoc, SessionDoc } from '../store';
import { inWindow, localDate, previousRange, trendDays, windowDays, windowStart, type Range } from './range';

/** Pure selectors: sessions + mocks + mastery doc + range -> everything the cards show. No I/O, no clock reads. */

export type MasteryLike = Record<string, { θ?: number; rd?: number; n?: number; last?: number }>;
export interface UploadEvent { at: number; count: number }

export interface DashboardInputs {
  sessions: SessionDoc[];
  mocks: MockDoc[];
  mastery: MasteryLike | null;
  uploads?: UploadEvent[];
  /** chapter/topic id -> display name (from the taxonomy, when available) */
  names?: Record<string, string>;
}

export interface SelectOpts { today?: string; names?: Record<string, string>; uploads?: UploadEvent[] }

// ---------------------------------------------------------------- parsing

interface ChapterFacts { n: number; correct: number; timeMs: number }
interface SessionFacts {
  id: string; date: string; at: number; n: number; correct: number; wrong: number; skipped: number; timeMs: number;
  byChapter: Record<string, ChapterFacts>; labels: Partial<Record<BehaviourLabel, number>>; exam?: string; chapter?: string;
}
interface MockFacts { id: string; date: string; at: number; marks: number | null; max: number | null; title: string; pending: boolean; usedMs: number }

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

function sessionFacts(s: SessionDoc): SessionFacts | null {
  if (!Number.isFinite(s.startedAt)) return null;
  const sum = rec(s.summary);
  const n = num(sum.n);
  const wall = s.endedAt && s.endedAt > s.startedAt ? s.endedAt - s.startedAt : 0;
  const byChapter: Record<string, ChapterFacts> = {};
  for (const [id, c] of Object.entries(rec(sum.byChapter))) {
    const r = rec(c);
    byChapter[id] = { n: num(r.n), correct: num(r.correct), timeMs: num(r.timeMs) };
  }
  const chapter = typeof s.chapter === 'string' ? s.chapter : undefined;
  if (!Object.keys(byChapter).length && chapter && n) byChapter[chapter] = { n, correct: num(sum.correct), timeMs: num(sum.totalTimeMs) };
  return {
    id: s.id, date: localDate(s.startedAt), at: s.startedAt, n, correct: num(sum.correct), wrong: num(sum.wrong), skipped: num(sum.skipped),
    timeMs: num(sum.totalTimeMs) || wall, byChapter, labels: rec(sum.labels) as Partial<Record<BehaviourLabel, number>>,
    exam: typeof s.exam === 'string' ? s.exam : undefined, chapter,
  };
}

function mockFacts(m: MockDoc): MockFacts | null {
  if (!m.submittedAt || !Number.isFinite(m.submittedAt)) return null;
  const score = rec(m.score);
  const an = rec(m.analysis);
  const hasScore = typeof score.marks === 'number' && typeof score.max === 'number';
  return {
    id: m.id, date: localDate(m.submittedAt), at: m.submittedAt, marks: hasScore ? (score.marks as number) : null, max: hasScore ? (score.max as number) : null,
    title: typeof an.title === 'string' ? an.title : 'Mock', pending: !hasScore || an.pending === true, usedMs: num(an.usedMs),
  };
}

// ---------------------------------------------------------------- types

export interface Delta { abs: number; pct: number | null; dir: 'up' | 'down' | 'flat'; unit: 'count' | 'points' }

export interface DayMetrics { date: string; questions: number; correct: number; accuracy: number | null; minutes: number; mastery: number | null; sessions: number; mocks: number }

export interface Totals {
  sessions: number; questions: number; correct: number; wrong: number; skipped: number; accuracy: number | null; minutes: number; activeDays: number;
  mocks: number; bestMock: { marks: number; max: number } | null; avgSecPerQuestion: number | null; sillyRate: number | null;
  labels: Partial<Record<BehaviourLabel, number>>;
}

export interface ChapterRow { id: string; name: string; n: number; correct: number; accuracy: number | null; minutes: number; exam?: string }

export type ActivityKind = 'practice' | 'mock' | 'mastery' | 'upload';
export interface ActivityEvent { id: string; kind: ActivityKind; at: number; title: string; detail?: string; tone: 'neutral' | 'primary' | 'accent' }

export interface RangeData {
  range: Range;
  trend: DayMetrics[];
  totals: Totals;
  prevTotals: Totals;
  /** previous window has any activity: deltas are only shown then */
  hasPrev: boolean;
  deltas: { questions: Delta | null; accuracy: Delta | null; minutes: Delta | null; sessions: Delta | null; activeDays: Delta | null; mocks: Delta | null };
  chapters: ChapterRow[];
  weakest: { id: string; name: string } | null;
  activity: ActivityEvent[];
  streak: number;
  lastActivityAt: number | null;
  hasAnyData: boolean;
}

// ---------------------------------------------------------------- helpers

export function titleCase(id: string, names?: Record<string, string>): string {
  const hit = names?.[id];
  if (hit) return hit;
  const [subject, rest] = id.includes('.') ? [id.split('.')[0], id.split('.').slice(1).join(' ')] : [undefined, id];
  const body = (rest ?? '').replace(/[_-]+/g, ' ').trim();
  const words = /^[A-Z0-9 ]+$/.test(body) ? body : body.replace(/\b\w/g, (c) => c.toUpperCase());
  return subject ? `${subject} ${words}` : words || id;
}

export function makeDelta(cur: number | null, prev: number | null, unit: Delta['unit'], hasPrev: boolean): Delta | null {
  if (!hasPrev || cur === null || prev === null) return null;
  const abs = cur - prev;
  const dir = Math.abs(abs) < (unit === 'points' ? 0.5 : 0.5) ? 'flat' : abs > 0 ? 'up' : 'down';
  const pct = unit === 'count' && prev > 0 ? Math.round((abs / prev) * 100) : null;
  return { abs, pct, dir, unit };
}

/** "Up 8%" / "Down 3 pts" / "Same". Words always accompany the arrow. */
export function deltaWords(d: Delta): string {
  if (d.dir === 'flat') return 'Same';
  const word = d.dir === 'up' ? 'Up' : 'Down';
  if (d.unit === 'points') return `${word} ${Math.round(Math.abs(d.abs))} pts`;
  return d.pct !== null ? `${word} ${Math.abs(d.pct)}%` : `${word} ${Math.round(Math.abs(d.abs))}`;
}

const masteryPct = (θ: number) => Math.round(pCorrect(θ, 0) * 100);

function totalsFor(days: string[], sessions: SessionFacts[], mocks: MockFacts[]): Totals {
  const set = new Set(days);
  const ss = sessions.filter((s) => set.has(s.date));
  const ms = mocks.filter((m) => set.has(m.date));
  const t: Totals = {
    sessions: ss.length, questions: 0, correct: 0, wrong: 0, skipped: 0, accuracy: null, minutes: 0, activeDays: 0, mocks: ms.length,
    bestMock: null, avgSecPerQuestion: null, sillyRate: null, labels: {},
  };
  let timeMs = 0;
  let qTimeMs = 0;
  for (const s of ss) {
    t.questions += s.n; t.correct += s.correct; t.wrong += s.wrong; t.skipped += s.skipped; timeMs += s.timeMs; qTimeMs += s.timeMs;
    for (const [l, c] of Object.entries(s.labels)) t.labels[l as BehaviourLabel] = (t.labels[l as BehaviourLabel] ?? 0) + num(c);
  }
  for (const m of ms) {
    timeMs += m.usedMs;
    if (m.marks !== null && m.max !== null && (!t.bestMock || m.marks / m.max > t.bestMock.marks / t.bestMock.max)) t.bestMock = { marks: m.marks, max: m.max };
  }
  t.minutes = Math.round(timeMs / 60_000);
  t.accuracy = t.questions ? Math.round((t.correct / t.questions) * 100) : null;
  t.avgSecPerQuestion = t.questions && qTimeMs ? Math.round(qTimeMs / t.questions / 1000) : null;
  t.sillyRate = t.questions ? Math.round(((t.labels.silly_mistake ?? 0) / t.questions) * 100) : null;
  t.activeDays = new Set([...ss.map((s) => s.date), ...ms.map((m) => m.date)]).size;
  return t;
}

/** Consecutive active days ending at `end` (or the day before when `end` itself is still empty). */
export function streakOf(activeDates: Set<string>, end: string): number {
  let d = activeDates.has(end) ? end : addDays(end, -1);
  let n = 0;
  while (activeDates.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// ---------------------------------------------------------------- main selector

export function selectRangeData(sessionDocs: readonly SessionDoc[], mockDocs: readonly MockDoc[], mastery: MasteryLike | null | undefined, range: Range, opts: SelectOpts = {}): RangeData {
  const sessions = sessionDocs.map(sessionFacts).filter((s): s is SessionFacts => !!s);
  const mocks = mockDocs.map(mockFacts).filter((m): m is MockFacts => !!m);
  const days = windowDays(range);
  const prev = previousRange(range);
  const totals = totalsFor(days, sessions, mocks);
  const prevTotals = totalsFor(windowDays(prev), sessions, mocks);
  const hasPrev = prevTotals.sessions > 0 || prevTotals.mocks > 0;

  const topics = Object.entries(mastery ?? {}).filter(([, v]) => v && typeof v.θ === 'number');
  const byDayMastery = new Map<string, number[]>();
  for (const [, v] of topics) if (v.last) {
    const d = localDate(v.last);
    (byDayMastery.get(d) ?? byDayMastery.set(d, []).get(d)!).push(masteryPct(v.θ as number));
  }
  const trend: DayMetrics[] = trendDays(range).map((date) => {
    const ss = sessions.filter((s) => s.date === date);
    const q = ss.reduce((a, s) => a + s.n, 0);
    const c = ss.reduce((a, s) => a + s.correct, 0);
    const mk = mocks.filter((m) => m.date === date);
    const ms = ss.reduce((a, s) => a + s.timeMs, 0) + mk.reduce((a, m) => a + m.usedMs, 0);
    const md = byDayMastery.get(date);
    return { date, questions: q, correct: c, accuracy: q ? Math.round((c / q) * 100) : null, minutes: Math.round(ms / 60_000), mastery: md ? Math.round(md.reduce((a, b) => a + b, 0) / md.length) : null, sessions: ss.length, mocks: mk.length };
  });

  const ch = new Map<string, ChapterRow & { timeMs: number; lastAt: number }>();
  for (const s of sessions) if (inWindow(s.date, range)) {
    for (const [id, c] of Object.entries(s.byChapter)) {
      const row = ch.get(id) ?? { id, name: titleCase(id, opts.names), n: 0, correct: 0, accuracy: null, minutes: 0, timeMs: 0, lastAt: 0 };
      row.n += c.n; row.correct += c.correct; row.timeMs += c.timeMs;
      if (s.at >= row.lastAt) { row.lastAt = s.at; row.exam = s.exam ?? row.exam; }
      ch.set(id, row);
    }
  }
  const chapters: ChapterRow[] = [...ch.values()]
    .map((r) => ({ id: r.id, name: r.name, n: r.n, correct: r.correct, accuracy: r.n ? Math.round((r.correct / r.n) * 100) : null, minutes: Math.round(r.timeMs / 60_000), exam: r.exam }))
    .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));
  const weakRow = chapters.filter((c) => c.n >= 3 && c.accuracy !== null).sort((a, b) => (a.accuracy as number) - (b.accuracy as number))[0];

  const activity: ActivityEvent[] = [];
  for (const s of sessions) if (inWindow(s.date, range) && (s.n > 0 || s.chapter)) {
    const ids = Object.keys(s.byChapter);
    const first = titleCase(s.chapter ?? ids[0] ?? 'practice', opts.names);
    activity.push({ id: `s:${s.id}`, kind: 'practice', at: s.at, title: `Practised ${ids.length > 1 ? `${first} and ${ids.length - 1} more` : first}`, detail: `${s.correct}/${s.n} correct`, tone: 'neutral' });
  }
  for (const m of mocks) if (inWindow(m.date, range)) {
    activity.push({ id: `m:${m.id}`, kind: 'mock', at: m.at, title: m.pending ? 'Mock submitted: result pending' : `Mock completed: ${m.marks}/${m.max}`, detail: m.title, tone: 'primary' });
  }
  const mEv: ActivityEvent[] = [];
  for (const [id, v] of topics) {
    if (!v.last || !inWindow(localDate(v.last), range)) continue;
    const label: ConfidenceLabel = confidenceLabel(num(v.rd) || 1);
    if (label === 'not_enough_data') continue;
    const θ = v.θ as number;
    if (θ <= -0.4) mEv.push({ id: `a:${id}`, kind: 'mastery', at: v.last, title: `${titleCase(id, opts.names)} needs attention`, tone: 'accent' });
    else if (θ >= 0.4) mEv.push({ id: `a:${id}`, kind: 'mastery', at: v.last, title: `${titleCase(id, opts.names)} is getting stronger`, tone: 'primary' });
  }
  activity.push(...mEv.sort((a, b) => b.at - a.at).slice(0, 4));
  for (const u of opts.uploads ?? []) if (inWindow(localDate(u.at), range)) activity.push({ id: `u:${u.at}`, kind: 'upload', at: u.at, title: `Added ${u.count} question${u.count === 1 ? '' : 's'}`, tone: 'neutral' });
  activity.sort((a, b) => b.at - a.at);

  const active = new Set([...sessions.filter((s) => s.n > 0).map((s) => s.date), ...mocks.map((m) => m.date)]);
  const all = [...sessions.map((s) => s.at), ...mocks.map((m) => m.at)];
  return {
    range, trend, totals, prevTotals, hasPrev,
    deltas: {
      questions: makeDelta(totals.questions, prevTotals.questions, 'count', hasPrev),
      accuracy: makeDelta(totals.accuracy, prevTotals.accuracy, 'points', hasPrev),
      minutes: makeDelta(totals.minutes, prevTotals.minutes, 'count', hasPrev),
      sessions: makeDelta(totals.sessions, prevTotals.sessions, 'count', hasPrev),
      activeDays: makeDelta(totals.activeDays, prevTotals.activeDays, 'count', hasPrev),
      mocks: makeDelta(totals.mocks, prevTotals.mocks, 'count', hasPrev),
    },
    chapters,
    weakest: weakRow ? { id: weakRow.id, name: weakRow.name } : null,
    activity,
    streak: streakOf(active, opts.today && opts.today < range.end ? opts.today : range.end),
    lastActivityAt: all.length ? Math.max(...all) : null,
    hasAnyData: all.length > 0,
  };
}

// ---------------------------------------------------------------- readiness (mastery only)

export interface Readiness { pct: number; label: ConfidenceLabel; topics: number; n: number }

/** Overall mastery as P(correct) on a medium item, with core's confidence label. Null when nothing has been practised. */
export function selectReadiness(mastery: MasteryLike | null | undefined): Readiness | null {
  const items = Object.entries(mastery ?? {})
    .filter(([, v]) => v && typeof v.θ === 'number')
    .map(([id, v]) => ({ id, theta: v.θ as number, rd: typeof v.rd === 'number' ? v.rd : 1, n: num(v.n) }));
  if (!items.length || items.every((i) => i.n === 0)) return null;
  const a = aggregate(items);
  return { pct: masteryPct(a.theta), label: a.label, topics: items.length, n: a.n };
}

export const BEHAVIOUR_NAMES: Record<BehaviourLabel, string> = {
  guess_careless: 'Careless guesses', concept_gap: 'Concept gaps', fluency: 'Needs speed practice', overthinking: 'Changed a right answer',
  silly_mistake: 'Silly mistakes', strategy: 'Skipped an easy one', time_sink: 'Took too long',
};

export { windowStart };
