import { describe, expect, it } from 'vitest';
import { cardFromParts, newCard } from '../measure/fsrs';
import type { MasteryDoc, TopicMastery } from '../measure/mastery';
import { mulberry32 } from '../sim/rng';
import { makeWorld } from '../sim/world';
import { addDays } from './calendar';
import { DEFAULT_PHASES, phaseFor, type PhaseDef } from './phases';
import { buildSchedule, type ScheduleDay } from './schedule';
import {
  DEFAULT_PLANNER_CONFIG,
  LOAD_RULE_FLOOR_MIN,
  PRIORITY_WEIGHTS,
  planDay,
  planHorizon,
  subjectBalance,
  type DayPlan,
  type PlanInput,
} from './planner';
import type { Task } from './types';

const world = makeWorld({ seed: 3 });
const TOPICS = world.topics.map((t) => t.id);
const DAY_MS = 86_400_000;
const TODAY = '2026-03-02';

function randomMastery(rng: () => number, date: string, opts: { share?: number; errors?: boolean } = {}): MasteryDoc {
  const doc: MasteryDoc = {};
  const now = Date.parse(`${date}T12:00:00Z`);
  for (const id of TOPICS) {
    if (rng() > (opts.share ?? 0.7)) continue;
    const last = now - Math.floor(rng() * 20) * DAY_MS;
    const card = { ...newCard(last), state: 2, stability: 2 + rng() * 20, difficulty: 5, last_review: last, reps: 3 };
    const t: TopicMastery = {
      θ: -1.5 + 3 * rng(),
      rd: 0.2 + 0.6 * rng(),
      n: 3 + Math.floor(rng() * 40),
      last,
      S: card.stability,
      D: card.difficulty,
      due: last + 5 * DAY_MS,
      err_mix: opts.errors !== false && rng() < 0.4 ? { concept_gap: Math.floor(rng() * 5), guess_careless: 1 } : {},
      reps: 3,
      lapses: 0,
      st: 2,
    };
    doc[id] = t;
  }
  return doc;
}

function sched(daysAhead: number, mins: Record<number, number> = {}, offDay: number | null = 0, today = TODAY): ScheduleDay[] {
  const m: Record<number, number> = {};
  for (let i = 0; i < 7; i++) m[i] = mins[i] ?? 180;
  return buildSchedule({ today, examDate: addDays(today, daysAhead), minutesPerWeekday: m, offDay });
}

function input(over: Partial<PlanInput> & { schedule: ScheduleDay[] }): PlanInput {
  const day = over.schedule.find((d) => d.date === (over.date ?? TODAY)) ?? over.schedule[0]!;
  return {
    date: day.date,
    examId: 'jee',
    phase: DEFAULT_PHASES.find((p) => p.id === day.phase) ?? DEFAULT_PHASES[0]!,
    mastery: randomMastery(mulberry32(1), day.date),
    topicMeta: world.meta,
    fu: 0.9,
    seed: 1,
    ...over,
  };
}

const total = (p: DayPlan): number => p.tasks.reduce((a, t) => a + t.est_min, 0);

describe('hard guarantees (property tests)', () => {
  it('never exceeds stated capacity, for any day kind, capacity, fu, mastery and seed', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const rng = mulberry32(seed);
      const left = 1 + Math.floor(rng() * 200);
      const caps: Record<number, number> = {};
      for (let i = 0; i < 7; i++) caps[i] = Math.floor(20 + rng() * 300);
      const s = sched(left, caps, rng() < 0.5 ? Math.floor(rng() * 7) : null);
      const mastery = randomMastery(rng, TODAY, { share: rng() });
      for (const day of s.slice(0, 14)) {
        const plan = planDay(input({ schedule: s, date: day.date, mastery, fu: 0.4 + rng() * 0.8, seed }));
        expect(total(plan)).toBeLessThanOrEqual(plan.capacityMin + 1e-9);
        expect(plan.plannedMin).toBeLessThanOrEqual(plan.capacityMin + 1e-9);
        for (const t of plan.tasks) {
          expect(t.status).toBe('todo');
          expect(t.est_min).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(t.items)).toBe(true);
        }
      }
    }
  });

  it('respects an explicit capacityMin that is lower than the schedule', () => {
    const s = sched(90);
    for (let seed = 1; seed <= 30; seed++) {
      const p = planDay(input({ schedule: s, capacityMin: 25 + seed, seed }));
      expect(total(p)).toBeLessThanOrEqual(25 + seed + 1e-9);
    }
  });

  it('off days produce no tasks; a sprint override on the off-day is planned and flagged', () => {
    const s = sched(40, {}, 3);
    const off = s.find((d) => d.kind === 'off')!;
    expect(planDay(input({ schedule: s, date: off.date })).tasks).toEqual([]);
    const sprint = sched(10, {}, 3);
    const over = sprint.find((d) => d.offDayOverridden)!;
    const p = planDay(input({ schedule: sprint, date: over.date }));
    expect(p.sprintOverride).toBe(true);
    expect(p.tasks.length).toBeGreaterThan(0);
    expect(p.warnings.join(' ')).toContain('off-day');
  });

  it('zero capacity -> empty plan', () => {
    const s = sched(60, { 1: 0 });
    const mon = s.find((d) => d.capacityMin === 0 && d.kind !== 'off');
    if (mon) expect(planDay(input({ schedule: s, date: mon.date })).tasks).toEqual([]);
    expect(planDay(input({ schedule: s, capacityMin: 0 })).tasks).toEqual([]);
  });

  it('buffer days: light_review only, at most 60% of budget', () => {
    let seen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = sched(100, { 1: 120 + seed, 3: 200 });
      for (const day of s.filter((d) => d.kind === 'buffer')) {
        const p = planDay(input({ schedule: s, date: day.date, seed, fu: 0.8 + (seed % 3) * 0.1 }));
        seen++;
        expect(p.tasks.length).toBeGreaterThan(0);
        expect(p.tasks.every((t) => t.kind === 'light_review')).toBe(true);
        expect(total(p)).toBeLessThanOrEqual(0.6 * Math.min(p.capacityMin, p.capacityMin * Math.min(1.1, 0.8 + (seed % 3) * 0.1)) + 1e-9);
        expect(p.loadMin).toBeNull();
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('taper: own mistakes only, practice only, never new topics', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = mulberry32(seed);
      const mastery = randomMastery(rng, '2026-05-01', { share: 0.5 });
      const s = sched(2, {}, null, '2026-05-01');
      for (const day of s.filter((d) => d.kind === 'taper')) {
        const p = planDay(input({ schedule: s, date: day.date, mastery, seed }));
        expect(p.tasks.length).toBeGreaterThan(0);
        for (const t of p.tasks) {
          const m = mastery[t.topic]!;
          expect(m).toBeDefined();
          expect(Object.values(m.err_mix).reduce<number>((a, b) => a + (b ?? 0), 0)).toBeGreaterThan(0);
          expect(t.kind).toBe('practice');
          expect(t.bucket).not.toBe('new');
        }
        expect(p.tasks.some((t) => t.kind === 'mock')).toBe(false);
      }
    }
  });

  it('taper with no mistakes plans nothing new', () => {
    const s = sched(2, {}, null);
    const p = planDay(input({ schedule: s, mastery: randomMastery(mulberry32(2), TODAY, { errors: false }) }));
    expect(p.tasks).toEqual([]);
  });

  it('load change between consecutive work days stays within +/-15% (buffer, mock, taper exempt)', () => {
    let pairs = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = mulberry32(seed + 500);
      const caps: Record<number, number> = {};
      for (let i = 0; i < 7; i++) caps[i] = Math.floor(90 + rng() * 150);
      const s = sched(60 + Math.floor(rng() * 80), caps, null);
      const fu = 0.6 + rng() * 0.5;
      const plans = planHorizon(input({ schedule: s, fu, seed, mastery: randomMastery(rng, TODAY) }), 14);
      let prev: number | null = null;
      let prevPlan: DayPlan | null = null;
      for (const p of plans) {
        if (p.loadMin === null) continue;
        if (prev !== null && prevPlan !== null) {
          pairs++;
          expect(p.loadMin).toBeLessThanOrEqual(Math.max(prev, LOAD_RULE_FLOOR_MIN) * 1.15 + 1e-9);
          const wanted = Math.min(p.capacityMin, Math.floor(p.capacityMin * Math.min(1.1, fu)));
          if (prev >= LOAD_RULE_FLOOR_MIN && wanted >= prev * 0.85 + 4) expect(p.loadMin).toBeGreaterThanOrEqual(prev * 0.85 - 1e-9);
        }
        prev = p.loadMin;
        prevPlan = p;
      }
    }
    expect(pairs).toBeGreaterThan(300);
  });

  it('is deterministic for the same seed, and varies across seeds', () => {
    const s = sched(90);
    const base = input({ schedule: s });
    expect(planDay({ ...base, seed: 9 })).toEqual(planDay({ ...base, seed: 9 }));
    expect(planHorizon({ ...base, seed: 9 })).toEqual(planHorizon({ ...base, seed: 9 }));
    const ids = (seed: number) => planDay({ ...base, seed }).tasks.map((t) => t.topic).join();
    expect(new Set([1, 2, 3, 4, 5, 6].map(ids)).size).toBeGreaterThan(1);
  });
});

describe('plan composition', () => {
  const s = sched(100, {}, null);

  it('task shape matches docs/03', () => {
    const p = planDay(input({ schedule: s }));
    expect(p.tasks.length).toBeGreaterThan(2);
    p.tasks.forEach((t, i) => {
      expect(Object.keys(t)).toEqual(expect.arrayContaining(['id', 'kind', 'topic', 'chapter', 'subject', 'items', 'est_min', 'priority', 'status']));
      expect(t.id).toBe(`${TODAY}#${i + 1}`);
      if (t.kind === 'practice' || t.kind === 'review') expect(t.target_p).toBeGreaterThan(0.4);
    });
  });

  it('fsrs_due is capped at 25% of the budget and carry-over at 30%', () => {
    const rng = mulberry32(5);
    const mastery = randomMastery(rng, TODAY, { share: 1 });
    for (const id of TOPICS) mastery[id] = { ...mastery[id]!, S: 1, last: Date.parse(`${TODAY}T12:00:00Z`) - 40 * DAY_MS };
    const backlog: Task[] = TOPICS.slice(0, 20).map((id, i) => ({
      id: `b${i}`, kind: 'practice', topic: id, chapter: world.meta[id]!.chapter, subject: world.meta[id]!.subject,
      items: 10, est_min: 33, priority: 1 - i / 100, status: 'todo', carried_from: '2026-02-28',
    }));
    const p = planDay(input({ schedule: s, mastery: { ...mastery }, backlog, fu: 1 }));
    const fsrs = p.tasks.filter((t) => t.kind === 'fsrs_due');
    const carried = p.tasks.filter((t) => t.carried_from !== undefined);
    expect(fsrs.length).toBeGreaterThan(0);
    expect(fsrs.reduce((a, t) => a + t.est_min, 0)).toBeLessThanOrEqual(0.25 * p.budgetMin + 1e-9);
    expect(carried.length).toBeGreaterThan(0);
    expect(carried.reduce((a, t) => a + t.est_min, 0)).toBeLessThanOrEqual(0.3 * p.budgetMin + 1e-9);
    expect(carried.every((t) => t.carried_from === '2026-02-28')).toBe(true);
  });

  it('at most 3 topics per subject per bucket', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const p = planDay(input({ schedule: s, seed }));
      const count: Record<string, number> = {};
      for (const t of p.tasks) if (t.bucket) count[`${t.bucket}|${t.subject}`] = (count[`${t.bucket}|${t.subject}`] ?? 0) + 1;
      for (const c of Object.values(count)) expect(c).toBeLessThanOrEqual(DEFAULT_PLANNER_CONFIG.maxPerSubject);
    }
  });

  it('orders warm-up first, then weak (hardest first), then new/mixed, then light review', () => {
    const p = planDay(input({ schedule: s, seed: 4 }));
    const rank = (t: Task): number => (t.warmup ? 0 : t.bucket === 'weak' ? 1 : t.bucket === 'new' ? 2 : t.bucket === 'mixed' ? 3 : 4);
    const ranks = p.tasks.filter((t) => t.kind !== 'diagnostic').map(rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(p.tasks[0]!.warmup).toBe(true);
    const weak = p.tasks.filter((t) => t.bucket === 'weak');
    const ms = weak.map((t) => t.m_at_plan!);
    expect(ms).toEqual([...ms].sort((a, b) => a - b));
    expect(p.tasks[p.tasks.length - 1]!.kind === 'fsrs_due' || p.tasks[p.tasks.length - 1]!.bucket === 'review').toBe(true);
  });

  it('cold start puts everything into new topics', () => {
    const p = planDay(input({ schedule: s, mastery: {} }));
    expect(p.tasks.length).toBeGreaterThan(3);
    expect(p.tasks.every((t) => t.bucket === 'new')).toBe(true);
  });

  it('phase transitions change the mix: Build has new work, Exam mode and sprint have none', () => {
    const rng = mulberry32(11);
    const mastery = randomMastery(rng, TODAY, { share: 0.6 });
    const newItems = (phaseId: PhaseDef['id']): number => {
      const phase = DEFAULT_PHASES.find((p) => p.id === phaseId)!;
      const days: Record<string, number> = { build: 150, strengthen: 90, consolidate: 40, exam_mode: 20, final_sprint: 8 };
      const sc = sched(days[phaseId]!, { 0: 200, 1: 200, 2: 200, 3: 200, 4: 200, 5: 200, 6: 200 }, null);
      const day = sc.find((d) => d.kind === 'work') ?? sc.find((d) => d.kind === 'sprint_mock')!;
      let n = 0;
      for (let seed = 1; seed <= 5; seed++) {
        const p = planDay(input({ schedule: sc, date: day.date, phase, mastery, seed, config: { coverageItems: 0 } }));
        n += p.tasks.filter((t) => t.bucket === 'new').reduce((a, t) => a + t.items, 0);
      }
      return n;
    };
    expect(newItems('build')).toBeGreaterThan(newItems('consolidate'));
    expect(newItems('exam_mode')).toBe(0);
    expect(newItems('final_sprint')).toBe(0);
    expect(phaseFor(100).id).toBe('strengthen');
    expect(Object.keys(PRIORITY_WEIGHTS).sort()).toEqual(DEFAULT_PHASES.map((p) => p.id).sort());
  });

  it('mock day: mock + analysis, budget reduced by 210, still within capacity', () => {
    const sc = sched(60, { 0: 300, 1: 300, 2: 300, 3: 300, 4: 300, 5: 300, 6: 300 }, null);
    const mock = sc.find((d) => d.kind === 'mock')!;
    const p = planDay(input({ schedule: sc, date: mock.date, fu: 1 }));
    expect(p.tasks[0]!.kind).toBe('mock');
    expect(p.tasks[1]!.topic).toBe('mock_analysis');
    expect(p.tasks[0]!.est_min + p.tasks[1]!.est_min).toBe(210);
    expect(p.loadMin).toBeNull();
    const rest = p.tasks.slice(2).reduce((a, t) => a + t.est_min, 0);
    expect(rest).toBeLessThanOrEqual(300 - 210 + 1e-9);
    expect(total(p)).toBeLessThanOrEqual(300);
    // low f_u: mock still fits capacity
    expect(total(planDay(input({ schedule: sc, date: mock.date, fu: 0.5 })))).toBeLessThanOrEqual(300);
  });

  it('mock shape follows the exam: mockMinutes/mockQuestions override the JEE defaults, which stay unchanged', () => {
    const sc = sched(60, { 0: 300, 1: 300, 2: 300, 3: 300, 4: 300, 5: 300, 6: 300 }, null);
    const mock = sc.find((d) => d.kind === 'mock')!;
    const jee = planDay(input({ schedule: sc, date: mock.date, fu: 1 }));
    expect(jee.tasks[0]).toMatchObject({ kind: 'mock', items: 75, est_min: 180 });
    const gate = planDay(input({ schedule: sc, date: mock.date, fu: 1, mockMinutes: 150, mockQuestions: 65 }));
    expect(gate.tasks[0]).toMatchObject({ kind: 'mock', items: 65, est_min: 150 });
    expect(gate.tasks[0]!.est_min + gate.tasks[1]!.est_min).toBe(180);
    expect(total(gate)).toBeLessThanOrEqual(300);
  });

  it('sprint day with under 210 minutes gets no mock and says so', () => {
    const sc = sched(8, { 0: 150, 1: 150, 2: 150, 3: 150, 4: 150, 5: 150, 6: 150 }, null);
    const p = planDay(input({ schedule: sc, date: sc.find((d) => d.kind === 'sprint_mock')!.date }));
    expect(p.tasks.some((t) => t.kind === 'mock')).toBe(false);
    expect(p.warnings.join(' ')).toContain('210');
  });

  it('a missed mock in the backlog is picked up on a day with enough free time', () => {
    const sc = sched(100, { 0: 300, 1: 300, 2: 300, 3: 300, 4: 300, 5: 300, 6: 300 }, null);
    const work = sc.find((d) => d.kind === 'work')!;
    const mockTask: Task = { id: 'm', kind: 'mock', topic: 'mock', chapter: '', subject: '', items: 75, est_min: 180, priority: 10, status: 'todo', carried_from: '2026-02-27' };
    const p = planDay(input({ schedule: sc, date: work.date, backlog: [mockTask] }));
    expect(p.tasks[0]!.kind).toBe('mock');
    expect(p.tasks[0]!.carried_from).toBe('2026-02-27');
    const small = planDay(input({ schedule: sc, date: work.date, capacityMin: 120, backlog: [mockTask] }));
    expect(small.tasks.some((t) => t.kind === 'mock')).toBe(false);
  });

  it('mini diagnostic is added after a long absence', () => {
    const p = planDay(input({ schedule: s, miniDiagnostic: true }));
    expect(p.tasks.some((t) => t.kind === 'diagnostic')).toBe(true);
    expect(total(p)).toBeLessThanOrEqual(p.capacityMin);
  });

  it('spreads minutes across subjects roughly per the exam balance (NEET biology heavy)', () => {
    const w2 = makeWorld({ seed: 4, subjects: ['physics', 'chemistry', 'biology'] });
    const sc = sched(120, { 0: 240, 1: 240, 2: 240, 3: 240, 4: 240, 5: 240, 6: 240 }, null);
    const p = planDay({ ...input({ schedule: sc, mastery: {} }), topicMeta: w2.meta, examId: 'neet', fu: 1 });
    const bio = p.tasks.filter((t) => t.subject === 'biology').reduce((a, t) => a + t.est_min, 0);
    expect(bio / total(p)).toBeGreaterThan(0.35);
    expect(bio / total(p)).toBeLessThan(0.65);
  });

  it('examsTopics restricts the syllabus; priority uses fixList and seenRecently', () => {
    const only = TOPICS.slice(0, 6);
    const p = planDay(input({ schedule: s, examsTopics: only, fixList: [only[0]!], seenRecently: { [only[1]!]: 30 } }));
    expect(p.tasks.every((t) => only.includes(t.topic))).toBe(true);
  });
});

describe('triage', () => {
  it('starts at 45 days: low weight + very low mastery topics are capped with a plain reason; un-skip works', () => {
    const sc = sched(40, {}, null);
    const mastery: MasteryDoc = {};
    const base = input({ schedule: sc, mastery });
    const p = planDay(base);
    expect(p.triaged.length).toBeGreaterThan(0);
    expect(p.triaged.length).toBeLessThanOrEqual(Math.floor(TOPICS.length * 0.2));
    const weights = TOPICS.map((t) => world.meta[t]!.weight).sort((a, b) => a - b);
    for (const t of p.triaged) {
      expect(world.meta[t.topic]!.weight).toBeLessThanOrEqual(weights[Math.floor(weights.length * 0.5)]!);
      expect(t.reason).toMatch(/^Skipping .*You can add it back any time\.$/);
    }
    expect(p.tasks.some((t) => p.triaged.some((x) => x.topic === t.topic))).toBe(false);
    const skipTopic = p.triaged[0]!.topic;
    const p2 = planDay({ ...base, unskipped: [skipTopic] });
    expect(p2.triaged.some((t) => t.topic === skipTopic)).toBe(false);
  });

  it('is off before 45 days and in the last 2 days; practised low-mastery topics are named with their mastery', () => {
    expect(planDay(input({ schedule: sched(100, {}, null) })).triaged).toEqual([]);
    const sc = sched(30, {}, null);
    const lowest = [...TOPICS].sort((a, b) => world.meta[a]!.weight - world.meta[b]!.weight)[0]!;
    const mastery = randomMastery(mulberry32(8), TODAY, { share: 1 });
    mastery[lowest] = { ...mastery[lowest]!, θ: -3 };
    const p = planDay(input({ schedule: sc, mastery }));
    const t = p.triaged.find((x) => x.topic === lowest);
    expect(t?.reason).toContain('mastery is only');
  });
});

describe('planHorizon', () => {
  it('plans 7 days, rotates topics via seenRecently, and stops at the end of the schedule', () => {
    const sc = sched(100);
    const plans = planHorizon(input({ schedule: sc }));
    expect(plans).toHaveLength(7);
    expect(plans.map((p) => p.date)).toEqual(Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)));
    expect(planHorizon(input({ schedule: sc }), 3)).toHaveLength(3);
    expect(planHorizon(input({ schedule: sched(3, {}, null) }), 7)).toHaveLength(3);
    const lastDay = addDays(TODAY, 2);
    expect(planHorizon(input({ schedule: sched(3, {}, null), date: lastDay }), 5)).toHaveLength(1);
  });

  it('backlog applies to today only', () => {
    const sc = sched(100, {}, null);
    const t: Task = { id: 'b', kind: 'practice', topic: TOPICS[0]!, chapter: 'c', subject: 'physics', items: 5, est_min: 15, priority: 1, status: 'todo', carried_from: '2026-02-28' };
    const plans = planHorizon(input({ schedule: sc, backlog: [t] }), 3);
    expect(plans[0]!.tasks.some((x) => x.carried_from)).toBe(true);
    expect(plans[1]!.tasks.some((x) => x.carried_from)).toBe(false);
  });
});

describe('subjectBalance', () => {
  it('NEET biology about half; JEE thirds; IAT quarters; unknown exam equal', () => {
    expect(subjectBalance('neet')['biology']).toBeCloseTo(0.5, 6);
    const j = subjectBalance('jee_main');
    for (const v of Object.values(j)) expect(v).toBeCloseTo(1 / 3, 6);
    expect(Object.keys(subjectBalance('iat'))).toHaveLength(4);
    const u = subjectBalance('other', ['a', 'b']);
    expect(u['a']).toBeCloseTo(0.5, 6);
    expect(subjectBalance('x', [])).toEqual({});
  });

  it('shifts toward weaker subjects by at most 10 points and always sums to 1', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = mulberry32(seed);
      const ex = ['neet', 'jee', 'iat'][seed % 3]!;
      const base = subjectBalance(ex);
      const w = Object.fromEntries(Object.keys(base).map((k) => [k, rng() * 3]));
      const out = subjectBalance(ex, Object.keys(base), w);
      expect(Object.values(out).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      for (const k of Object.keys(base)) {
        expect(Math.abs((out[k] as number) - (base[k] as number))).toBeLessThanOrEqual(0.1 + 1e-9);
        expect(out[k]).toBeGreaterThanOrEqual(0);
      }
    }
    const out = subjectBalance('jee', ['physics', 'chemistry', 'maths'], { physics: 0.9, chemistry: 0.1, maths: 0.1 });
    expect(out['physics']!).toBeGreaterThan(out['chemistry']!);
  });

  it('aliases and subsets renormalise', () => {
    const out = subjectBalance('neet', ['physics', 'biology']);
    expect(out['biology']! + out['physics']!).toBeCloseTo(1, 9);
    expect(out['biology']!).toBeGreaterThan(out['physics']!);
  });
});

describe('fsrs integration', () => {
  it('due topics become fsrs_due tasks', () => {
    const sc = sched(100, {}, null);
    const now = Date.parse(`${TODAY}T12:00:00Z`);
    const id = TOPICS[5]!;
    const card = cardFromParts({ S: 1, D: 5, due: now - 10 * DAY_MS, last: now - 30 * DAY_MS, reps: 3, lapses: 0, st: 2 });
    const mastery: MasteryDoc = {
      [id]: { θ: 0, rd: 0.3, n: 10, last: card.last_review!, S: 1, D: 5, due: card.due, err_mix: {}, reps: 3, lapses: 0, st: 2 },
    };
    const p = planDay(input({ schedule: sc, mastery }));
    expect(p.tasks.find((t) => t.kind === 'fsrs_due')?.topic).toBe(id);
  });
});
