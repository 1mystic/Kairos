import { describe, expect, it } from 'vitest';
import type { MasteryDoc } from '../measure/mastery';
import { mulberry32 } from '../sim/rng';
import { makeWorld } from '../sim/world';
import { addDays } from './calendar';
import { reconcileBacklog, upcomingDates, type BacklogInput } from './backlog';
import type { Bucket, Task } from './types';

const world = makeWorld({ seed: 3 });
const TOPICS = world.topics.map((t) => t.id);
const TODAY = '2026-03-02';

function mkTask(i: number, over: Partial<Task> = {}): Task {
  const id = TOPICS[i % TOPICS.length]!;
  return {
    id: `t${i}`,
    kind: 'practice',
    topic: id,
    chapter: world.meta[id]!.chapter,
    subject: world.meta[id]!.subject,
    items: 10,
    est_min: 30,
    priority: 0.5,
    status: 'todo',
    bucket: 'weak',
    carried_from: '2026-02-28',
    ...over,
  };
}

function caps(n: number, c: number): Record<string, number> {
  const out: Record<string, number> = { [TODAY]: c };
  for (const d of upcomingDates(TODAY, n)) out[d] = c;
  return out;
}

const base = (over: Partial<BacklogInput> = {}): BacklogInput => ({
  backlog: [],
  mastery: {},
  today: TODAY,
  daysLeft: 80,
  capacities: caps(10, 180),
  topicMeta: world.meta,
  ...over,
});

const mins = (ts: Task[]): number => ts.reduce((a, t) => a + t.est_min, 0);
const nonMock = (ts: Task[]): Task[] => ts.filter((t) => t.kind !== 'mock');

describe('reconcileBacklog', () => {
  it('empty backlog is a no-op with a plain message', () => {
    const r = reconcileBacklog(base());
    expect(r.carry).toEqual([]);
    expect(r.spread).toEqual({});
    expect(r.shed).toEqual([]);
    expect(r.message).toBe('Nothing is backed up.');
    expect(r.freshPlanNeeded).toBe(false);
  });

  it('carries at most 30% of today and spreads the rest over k = min(7, floor(N/10)) days', () => {
    const backlog = Array.from({ length: 8 }, (_, i) => mkTask(i, { priority: 1 - i / 10 }));
    const r = reconcileBacklog(base({ backlog, daysLeft: 35, capacities: caps(10, 400) }));
    expect(mins(r.carry)).toBeLessThanOrEqual(0.3 * 400 + 1e-9);
    expect(r.carry[0]!.priority).toBe(1);
    expect(Object.keys(r.spread).length).toBeLessThanOrEqual(3); // floor(35/10) = 3
    expect(r.carry.every((t) => t.carried_from === '2026-02-28')).toBe(true);
    const r2 = reconcileBacklog(base({ backlog, daysLeft: 200, capacities: caps(10, 400) }));
    expect(Object.keys(r2.spread).length).toBeLessThanOrEqual(7);
    // with under 10 days left at least one day is used
    const r3 = reconcileBacklog(base({ backlog: backlog.slice(0, 4), daysLeft: 5, capacities: caps(3, 100) }));
    expect(Object.keys(r3.spread).length).toBe(1);
  });

  it('spread is proportional to spare capacity (more room -> more minutes)', () => {
    const backlog = Array.from({ length: 6 }, (_, i) => mkTask(i, { est_min: 20, items: 7 }));
    const c = caps(4, 100);
    c[addDays(TODAY, 1)] = 600;
    const r = reconcileBacklog(base({ backlog, capacities: c, daysLeft: 40, carryCap: 0.3 }));
    const big = mins(r.spread[addDays(TODAY, 1)] ?? []);
    for (const [d, ts] of Object.entries(r.spread)) if (d !== addDays(TODAY, 1)) expect(big).toBeGreaterThanOrEqual(mins(ts));
  });

  it('shed order: low-pi review first, then low-weight new, then extra mixed; never mocks', () => {
    const mk = (i: number, bucket: Bucket, kind: Task['kind'], pr: number): Task => mkTask(i, { bucket, kind, priority: pr, est_min: 40, items: 13 });
    const backlog = [
      mk(0, 'weak', 'practice', 0.9),
      mk(1, 'mixed', 'practice', 0.3),
      mk(2, 'new', 'practice', 0.2),
      mk(3, 'review', 'review', 0.6),
      mk(4, 'review', 'review', 0.1),
      mkTask(5, { kind: 'mock', est_min: 180, items: 75, priority: 5, bucket: undefined }),
    ];
    // room = 0.3 * 100 * (1 + k) ; tiny capacity forces shedding
    const r = reconcileBacklog(base({ backlog, capacities: caps(2, 100), daysLeft: 20 }));
    const order = r.shed.map((t) => t.id);
    expect(order[0]).toBe('t4');
    expect(order.indexOf('t3')).toBeLessThan(order.indexOf('t2') === -1 ? 99 : order.indexOf('t2'));
    expect(r.shed.some((t) => t.kind === 'mock')).toBe(false);
    expect(r.carry.some((t) => t.kind === 'mock')).toBe(true);
    expect(r.message).toMatch(/Dropped \d+ tasks?/);
    expect(r.message).toMatch(/about \d+(\.\d)? marks/);
    expect(r.costMarks).toBeGreaterThan(0);
  });

  it('debt over 2 days of capacity is shed down to 2 days', () => {
    const backlog = Array.from({ length: 30 }, (_, i) => mkTask(i, { priority: i / 30, est_min: 30, bucket: i % 3 === 0 ? 'review' : 'weak' }));
    const r = reconcileBacklog(base({ backlog, capacities: caps(10, 180), daysLeft: 100 }));
    expect(mins(nonMock([...r.carry, ...Object.values(r.spread).flat()]))).toBeLessThanOrEqual(2 * 180 + 1e-9);
    expect(r.shed.length).toBeGreaterThan(0);
    expect(r.shed.length + r.carry.length + Object.values(r.spread).flat().length).toBe(30);
  });

  it('re-scores: topics that improved elsewhere shrink or dissolve', () => {
    const t = TOPICS[0]!;
    const mastery = (theta: number): MasteryDoc => ({ [t]: { θ: theta, rd: 0.3, n: 20, last: 0, S: 5, D: 5, due: 0, err_mix: {}, reps: 1, lapses: 0, st: 2 } });
    const task = mkTask(0, { m_at_plan: 0.3, items: 10, est_min: 30 });
    const same = reconcileBacklog(base({ backlog: [task], mastery: mastery(-0.85) }));
    expect(same.carry[0]!.items).toBe(10);
    const shrunk = reconcileBacklog(base({ backlog: [task], mastery: mastery(-0.55), capacities: caps(10, 600) }));
    const got = [...shrunk.carry, ...Object.values(shrunk.spread).flat()][0]!;
    expect(got.items).toBeLessThan(10);
    expect(got.est_min).toBeLessThan(30);
    const gone = reconcileBacklog(base({ backlog: [task], mastery: mastery(1.5) }));
    expect(gone.dissolved).toHaveLength(1);
    expect(gone.carry).toEqual([]);
    expect(gone.message).toContain('no longer needed');
    expect(gone.costMarks).toBe(0);
  });

  it('absent 3+ days: fresh plan + mini diagnostic, old tasks replaced, mocks kept', () => {
    const backlog = [mkTask(0), mkTask(1), mkTask(2, { kind: 'mock', est_min: 180, items: 75 })];
    const r = reconcileBacklog(base({ backlog, lastActive: '2026-02-27' }));
    expect(r.freshPlanNeeded).toBe(true);
    expect(r.miniDiagnostic).toBe(true);
    expect(r.carry.map((t) => t.kind)).toEqual(['mock']);
    expect(r.shed).toHaveLength(2);
    expect(r.message).toContain('away 3 days');
    const recent = reconcileBacklog(base({ backlog, lastActive: '2026-03-01' }));
    expect(recent.freshPlanNeeded).toBe(false);
  });

  it('keeps one mock at most', () => {
    const m = (i: number) => mkTask(i, { kind: 'mock', est_min: 180, items: 75 });
    const r = reconcileBacklog(base({ backlog: [m(0), m(1), m(2)] }));
    expect(r.carry).toHaveLength(1);
    expect(r.dissolved).toHaveLength(2);
  });

  it('no spare days: everything beyond today is shed, still never piles', () => {
    const backlog = Array.from({ length: 6 }, (_, i) => mkTask(i, { est_min: 30 }));
    const r = reconcileBacklog(base({ backlog, capacities: { [TODAY]: 100 } }));
    expect(mins(r.carry)).toBeLessThanOrEqual(30);
    expect(r.spread).toEqual({});
    expect(r.carry.length + r.shed.length).toBe(6);
  });

  it('cost estimate falls back without topicMeta', () => {
    const { topicMeta: _omit, ...rest } = base({ backlog: [mkTask(0)], capacities: { [TODAY]: 10 } });
    void _omit;
    const r = reconcileBacklog(rest);
    expect(r.shed).toHaveLength(1);
    expect(r.costMarks).toBeGreaterThanOrEqual(0);
  });
});

describe('backlog never piles (invariants over random inputs)', () => {
  it('carry <= 30% today, each spread day <= 30%, total <= 2 days; every task is accounted for', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry32(seed);
      const n = Math.floor(rng() * 40);
      const cap = 60 + Math.floor(rng() * 300);
      const backlog = Array.from({ length: n }, (_, i) => {
        const bucket = (['new', 'weak', 'review', 'mixed'] as const)[Math.floor(rng() * 4)]!;
        const items = 3 + Math.floor(rng() * 20);
        return mkTask(i, { bucket, kind: bucket === 'review' ? 'review' : 'practice', items, est_min: items * 3, priority: rng() });
      });
      const c: Record<string, number> = { [TODAY]: cap };
      for (let d = 1; d <= 9; d++) if (rng() > 0.2) c[addDays(TODAY, d)] = Math.floor(cap * (0.3 + rng()));
      const r = reconcileBacklog(base({ backlog, capacities: c, daysLeft: 1 + Math.floor(rng() * 150) }));
      expect(mins(r.carry)).toBeLessThanOrEqual(0.3 * cap + 1e-9);
      let all = mins(r.carry);
      for (const [d, ts] of Object.entries(r.spread)) {
        expect(c[d]).toBeDefined();
        expect(mins(ts)).toBeLessThanOrEqual(0.3 * (c[d] as number) + 1e-9);
        all += mins(ts);
      }
      const maxCap = Math.max(...Object.values(c));
      expect(all).toBeLessThanOrEqual(2 * maxCap + 1e-9);
      expect(r.carry.length + Object.values(r.spread).flat().length + r.shed.length + r.dissolved.length).toBe(n);
    }
  });

  it('a student who misses a lot every day never builds a backlog beyond 2 days of capacity', () => {
    let backlog: Task[] = [];
    let id = 0;
    for (let day = 0; day < 40; day++) {
      const today = addDays(TODAY, day);
      const c: Record<string, number> = { [today]: 180 };
      for (let d = 1; d <= 7; d++) c[addDays(today, d)] = 180;
      // 3 new missed tasks every day
      for (let i = 0; i < 3; i++) backlog.push(mkTask(id++, { est_min: 40, items: 13 }));
      const r = reconcileBacklog(base({ backlog, today, capacities: c, daysLeft: 100 - day }));
      const kept = [...r.carry, ...Object.values(r.spread).flat()];
      expect(mins(kept)).toBeLessThanOrEqual(2 * 180 + 1e-9);
      // the student completes nothing: everything kept stays in the backlog
      backlog = kept;
    }
    expect(backlog.length).toBeLessThanOrEqual(12);
  });
});
