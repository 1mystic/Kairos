import { describe, expect, it } from 'vitest';
import { addDays, type MasteryDoc, type Task } from '@kairos/core';
import { LocalStore, createMemoryLocalDb } from '../store';
import {
  PLAN_WRITE_CAP, advanceFu, autoMarkDone, backlogFromPlans, bandsFor, buildPlanContext, buildSnapshot, commitDay, computeTodayPace, doneMinutes,
  examState, fuFromPaceLog, mergeWithStored, parkedItems, seenRecentlyFrom, snapshotDue, stableStringify, taskLink, todayPlan, yesterdayStats,
  type ContextInput, type PlanSetup, type StoredPlan,
} from './engine';
import { buildSyllabus, chapterMasteryDoc } from './syllabus';
import { TAX } from './harness.test-util';

const TODAY = '2026-11-08';
const MIN = { 0: 180, 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 180 };
const setup = (over: Partial<PlanSetup> = {}): PlanSetup => ({
  exams: [{ exam: 'JEE_MAIN', session: 1, date: '2027-02-14' }],
  ambition: 'competitive',
  minutesPerWeekday: MIN,
  offDay: 0,
  chaptersDone: [],
  ...over,
});
const input = (over: Partial<ContextInput> = {}): ContextInput => ({ setup: setup(), tax: TAX, today: TODAY, mastery: null, sessions: [], recentPlans: [], pace: {}, fu: 1, ...over });
const ctxOf = (over: Partial<ContextInput> = {}) => buildPlanContext(input(over))!;

describe('syllabus', () => {
  it('splits weight equally per chapter and adds only the second exam\'s unique chapters', () => {
    const jee = buildSyllabus(TAX, ['JEE_MAIN']);
    const n = jee.chapters.length;
    expect(n).toBeGreaterThan(50);
    expect(Object.values(jee.meta).every((m) => Math.abs(m.weight - 1 / n) < 1e-9 && m.tMinPerItem === 3)).toBe(true);
    const both = buildSyllabus(TAX, ['JEE_MAIN', 'NEET_UG']);
    expect(both.chapters.slice(0, n)).toEqual(jee.chapters);
    expect(both.chapters.length).toBeGreaterThan(n);
    expect(new Set(both.chapters).size).toBe(both.chapters.length);
  });
  it('folds topic mastery into a chapter entry', () => {
    const ch = TAX.subjects[0]!.chapters.find((c) => c.topics.length >= 2) ?? TAX.subjects.flatMap((s) => s.chapters).find((c) => c.topics.length >= 1)!;
    const t = (θ: number, n: number) => ({ θ, rd: 0.3, n, last: 1, S: 5, D: 5, due: 9, err_mix: {}, reps: 1, lapses: 0, st: 2 });
    const doc: MasteryDoc = { [ch.topics[0]!.id]: t(1, 4) };
    expect(chapterMasteryDoc(doc, TAX)[ch.id]?.n).toBe(4);
    expect(chapterMasteryDoc(null, TAX)).toEqual({});
  });
});

describe('context', () => {
  it('builds the reverse schedule and equal-weight meta; tracks the nearest exam', () => {
    const c = ctxOf({ setup: setup({ exams: [{ exam: 'NEET_UG', session: 1, date: '2027-05-03' }, { exam: 'JEE_MAIN', session: 1, date: '2027-01-22' }] }) });
    expect(c.exam.exam).toBe('JEE_MAIN');
    expect(c.daysLeft).toBe(75);
    expect(c.schedule).toHaveLength(75);
    expect(c.examId).toBe('jee_main');
    expect(c.others[0]?.exam).toBe('NEET_UG');
  });
  it('has no context when the exam passed or none is set', () => {
    expect(buildPlanContext(input({ setup: setup({ exams: [{ exam: 'JEE_MAIN', session: 0, date: '2026-11-01' }] }) }))).toBeNull();
    expect(examState({ exams: [] }, TODAY).kind).toBe('none');
    expect(examState(setup(), TODAY).kind).toBe('ok');
  });
  it('seenRecently counts questions per chapter, splitting mixed sessions', () => {
    const now = Date.parse('2026-11-08T12:00:00');
    const s = seenRecentlyFrom([
      { id: 'a', startedAt: now - 1000, chapters: ['PHY.LOM'], qids: ['1', '2', '3', '4'] },
      { id: 'b', startedAt: now - 1000, chapters: ['PHY.LOM', 'PHY.GRAV'], qids: ['1', '2', '3', '4'] },
      { id: 'c', startedAt: now - 40 * 86_400_000, chapters: ['PHY.LOM'], qids: ['9'] },
    ], now);
    expect(s).toEqual({ 'PHY.LOM': 6, 'PHY.GRAV': 2 });
  });
  it('backlog = latest past plan\'s open tasks plus its spread; reconcile feeds carry into planning', () => {
    const open: Task = { id: '2026-11-07#1', kind: 'practice', topic: 'PHY.LOM', chapter: 'PHY.LOM', subject: 'physics', items: 10, est_min: 30, priority: 1, status: 'todo', bucket: 'weak' };
    const done: Task = { ...open, id: '2026-11-07#2', topic: 'PHY.GRAV', chapter: 'PHY.GRAV', status: 'done' };
    const spread: Task = { ...open, id: '2026-11-06#9', topic: 'CHE.CHEQ', chapter: 'CHE.CHEQ' };
    const plans = [{ date: '2026-11-07', tasks: [open, done], spread: { '2026-11-09': [spread] } }, { date: '2026-11-01', tasks: [{ ...open, id: 'old' }] }];
    const b = backlogFromPlans(plans, TODAY);
    expect(b.tasks.map((t) => t.topic).sort()).toEqual(['CHE.CHEQ', 'PHY.LOM']);
    expect(b.tasks.find((t) => t.topic === 'PHY.LOM')?.carried_from).toBe('2026-11-07');
    const c = ctxOf({ recentPlans: plans, setup: setup({ offDay: null }) });
    expect(c.backlogResult).not.toBeNull();
    expect(c.backlog.length).toBeGreaterThan(0);
    const { plan } = todayPlan(c);
    expect(plan.tasks.some((t) => t.carried_from)).toBe(true);
    expect(plan.backlogNote).toBeTruthy();
  });
  it('prevLoadMin comes from yesterday\'s plan', () => {
    const c = ctxOf({ recentPlans: [{ date: '2026-11-07', tasks: [], loadMin: 100 } as never] });
    expect(c.prevLoadMin).toBe(100);
  });
});

describe('f_u', () => {
  it('is neutral on day one and follows done/planned afterwards', () => {
    expect(advanceFu(null, null)).toEqual({ ewma: null, fu: 1 });
    const a = advanceFu(null, { planned: 100, done: 50 });
    expect(a.ewma).toBeCloseTo(0.5);
    expect(a.fu).toBeCloseTo(0.55);
    const b = advanceFu(a.ewma, { planned: 100, done: 100 });
    expect(b.ewma).toBeGreaterThan(0.5);
    expect(advanceFu(0.9, { planned: 0, done: 0 }).ewma).toBe(0.9);
  });
  it('fuFromPaceLog replays updateFu in date order', () => {
    const logs = [{ date: '2026-11-02', planned: 100, done: 100 }, { date: '2026-11-01', planned: 100, done: 50 }];
    const r = fuFromPaceLog(logs);
    expect(r.ewma).toBeGreaterThan(0.5);
    expect(r.ewma).toBeLessThan(1);
    expect(fuFromPaceLog([])).toEqual({ ewma: null, fu: 1 });
  });
});

describe('pace', () => {
  it('moves from ahead to behind as stated minutes shrink', () => {
    const at = (m: number) => computeTodayPace(ctxOf({ setup: setup({ minutesPerWeekday: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, m])), chaptersDone: buildSyllabus(TAX, ['JEE_MAIN']).chapters }) }));
    expect(at(480).pace.status).toBe('ahead');
    expect(at(15).pace.status).toBe('behind');
    const b = at(15);
    expect(b.behind?.requiresConsent).toBe(true);
    expect(b.behind?.dropChapters.length).toBeGreaterThan(0);
    expect(b.chapters.every((c) => c.marksCost >= 0)).toBe(true);
  });
  it('counts buffers left and names the ones to spend when slightly behind', () => {
    const c = ctxOf();
    const p = computeTodayPace(c);
    expect(p.bufferDaysLeft).toBe(c.fromToday.filter((d) => d.kind === 'buffer').length);
    expect(p.bufferDates.length).toBe(p.pace.bufferToSpend);
  });
  it('chapters marked done start from a higher prior, so the same time gives a lower rho', () => {
    const base = computeTodayPace(ctxOf()).pace.rho;
    const some = computeTodayPace(ctxOf({ setup: setup({ chaptersDone: buildSyllabus(TAX, ['JEE_MAIN']).chapters.slice(0, 30) }) })).pace.rho;
    expect(some).toBeLessThan(base);
  });
  it('parked items list triage and chosen chapters with a marks cost', () => {
    const c = ctxOf({ pace: { dropped: ['PHY.LOM'] } });
    const bundle = computeTodayPace(c);
    expect(c.liveChapters).not.toContain('PHY.LOM');
    const parked = parkedItems(c, todayPlan(c).plan, bundle);
    expect(parked.find((p) => p.chapter === 'PHY.LOM')?.source).toBe('chosen');
  });
});

describe('plan', () => {
  it('never exceeds stated capacity and is deterministic', () => {
    for (const cap of [30, 60, 120, 180, 240]) {
      const c = ctxOf({ setup: setup({ minutesPerWeekday: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, cap])), offDay: null }) });
      const { plan, horizon } = todayPlan(c);
      for (const d of horizon) expect(d.tasks.reduce((a, t) => a + t.est_min, 0)).toBeLessThanOrEqual(cap + 1e-6);
      expect(stableStringify(todayPlan(c).plan)).toBe(stableStringify(plan));
    }
  });
  it('keeps load change within 15% of yesterday', () => {
    const c = ctxOf({ setup: setup({ offDay: null }), recentPlans: [{ date: '2026-11-07', tasks: [], loadMin: 90 } as never], fu: 1 });
    const { plan } = todayPlan(c);
    if (plan.loadMin !== null) {
      expect(plan.loadMin).toBeLessThanOrEqual(90 * 1.15 + 1e-6);
      expect(plan.loadMin).toBeGreaterThanOrEqual(90 * 0.85 - 3.5);
    }
  });
  it('restricts planning to chapters that have questions but still counts all in pace', () => {
    const available = new Set(['PHY.LOM', 'PHY.GRAV', 'CHE.CHEQ']);
    const c = ctxOf({ available });
    expect(c.planChapters.sort()).toEqual([...available].sort());
    expect(c.liveChapters.length).toBeGreaterThan(3);
    expect(todayPlan(c).plan.tasks.every((t) => available.has(t.chapter) || t.items === 0)).toBe(true);
  });
  it('merges done tasks into a replan and respects remaining capacity', () => {
    const c = ctxOf({ setup: setup({ offDay: null }) });
    const first = todayPlan(c).plan;
    const t0 = first.tasks[0]!;
    const stored: StoredPlan = { ...first, tasks: first.tasks.map((t) => (t.id === t0.id ? { ...t, status: 'done' as const } : t)) };
    const again = todayPlan(c, { stored }).plan;
    expect(again.tasks.find((t) => t.id === t0.id)?.status).toBe('done');
    expect(again.tasks.filter((t) => t.kind === t0.kind && t.topic === t0.topic)).toHaveLength(1);
    expect(again.tasks.reduce((a, t) => a + t.est_min, 0)).toBeLessThanOrEqual(again.capacityMin + 1e-6);
    expect(new Set(again.tasks.map((t) => t.id)).size).toBe(again.tasks.length);
    expect(mergeWithStored(first, null)).toBe(first);
  });
  it('auto-ticks tasks whose questions were answered today', () => {
    const c = ctxOf({ setup: setup({ offDay: null }) });
    const t = todayPlan(c).plan.tasks.find((x) => x.kind === 'practice' && x.items > 0)!;
    const startedAt = Date.parse('2026-11-08T10:00:00');
    const out = autoMarkDone([t], [{ id: 's', startedAt, chapters: [t.chapter], qids: Array.from({ length: t.items }, (_, i) => `q${i}`) }], TODAY);
    expect(out[0]?.status).toBe('done');
    expect(autoMarkDone([t], [{ id: 's', startedAt, chapters: [t.chapter], qids: ['q'] }], TODAY)[0]?.status).toBe('todo');
  });
  it('stats of yesterday and links', () => {
    const t = { id: 'a', kind: 'practice', topic: 'x', chapter: 'PHY.LOM', subject: 'physics', items: 10, est_min: 30, priority: 1, status: 'done' } as Task;
    const y = yesterdayStats([{ date: addDays(TODAY, -1), tasks: [t, { ...t, id: 'b', status: 'todo' }] }], TODAY);
    expect(y).toEqual({ planned: 60, done: 30 });
    expect(doneMinutes([t])).toBe(30);
    expect(taskLink(t, {}, 'JEE_MAIN')).toBe('/practice/JEE_MAIN/PHY.LOM?size=10&bands=E,M,H&mode=relaxed');
    expect(taskLink({ ...t, target_p: 0.7 }, { 'PHY.LOM': 'NEET_UG' }, 'JEE_MAIN')).toContain('/practice/NEET_UG/PHY.LOM?size=10&bands=M');
    expect(taskLink({ ...t, kind: 'mock' }, {}, 'JEE_MAIN')).toBe('/exam/sample_jee_mini_v1');
    expect(bandsFor(0.85)).toBe('E');
    expect(bandsFor(0.55)).toBe('M,H');
  });
});

describe('daily commit and write budget', () => {
  const counted = () => {
    const store = new LocalStore(createMemoryLocalDb());
    const calls = { putPlan: 0, putPaceLog: 0, putState: 0 };
    const orig = { p: store.putPlan.bind(store), l: store.putPaceLog.bind(store), s: store.putState.bind(store) };
    store.putPlan = async (d, p) => { calls.putPlan++; return orig.p(d, p); };
    store.putPaceLog = async (d, p) => { calls.putPaceLog++; return orig.l(d, p); };
    store.putState = async (d, p) => { calls.putState++; return orig.s(d, p); };
    return { store, calls };
  };
  const day = (stored: StoredPlan | null, pace = {}) => {
    const c = ctxOf({ pace });
    const bundle = computeTodayPace(c);
    const plan = todayPlan(c, { stored }).plan;
    const snap = snapshotDue(pace, TODAY) ? buildSnapshot({ ctx: c, bundle, tax: TAX, mastery: null, yesterday: null, fuState: { ewma: null, fu: 1 }, prev: pace }) : null;
    return { c, plan, snap };
  };
  it('first open writes plan + pace_log + state/pace (3 writes); the second open writes nothing', async () => {
    const { store, calls } = counted();
    const a = day(null);
    const r1 = await commitDay({ store, today: TODAY, plan: a.plan, stored: null, planWritesToday: 0, snapshot: a.snap });
    expect(r1).toMatchObject({ planWritten: true, snapshotWritten: true, writes: 3 });
    const stored = (await store.getPlan(TODAY)) as unknown as StoredPlan;
    const pace = (await store.getState('pace'))!;
    expect(pace.snapshotDate).toBe(TODAY);
    expect((await store.listPaceLog())).toHaveLength(1);
    const b = day(stored, pace);
    expect(b.snap).toBeNull();
    const r2 = await commitDay({ store, today: TODAY, plan: b.plan, stored, planWritesToday: 0, snapshot: b.snap });
    expect(r2.writes).toBe(0);
    expect(calls).toEqual({ putPlan: 1, putPaceLog: 1, putState: 1 });
  });
  it('a changed plan is written until the daily replan cap, then held', async () => {
    const { store, calls } = counted();
    const a = day(null);
    const changed = { ...a.plan, warnings: ['x'] };
    expect((await commitDay({ store, today: TODAY, plan: changed, stored: a.plan, planWritesToday: 0, snapshot: null })).planWritten).toBe(true);
    expect((await commitDay({ store, today: TODAY, plan: changed, stored: a.plan, planWritesToday: PLAN_WRITE_CAP, snapshot: null })).planWritten).toBe(false);
    expect(calls.putPlan).toBe(1);
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: undefined }] })).toBe('{"a":[2,{"d":1}],"b":1}');
  });
  it('pace_log carries yesterday and mastery by subject', () => {
    const c = ctxOf();
    const snap = buildSnapshot({ ctx: c, bundle: computeTodayPace(c), tax: TAX, mastery: null, yesterday: { planned: 100, done: 60 }, fuState: { ewma: 0.6, fu: 0.66 }, prev: { dropped: ['X'] } });
    expect(snap.log).toMatchObject({ date: TODAY, planned: 100, done: 60, daysLeft: c.daysLeft });
    expect(snap.state).toMatchObject({ snapshotDate: TODAY, ewma: 0.6, dropped: ['X'] });
  });
});
