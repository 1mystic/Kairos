/** Study policies compared by the harness. All receive the same daily minutes. */
import { masteryProb } from '../measure/elo';
import type { MasteryDoc } from '../measure/mastery';
import { addDays } from '../plan/calendar';
import { reconcileBacklog } from '../plan/backlog';
import { planDay, type PlannerConfig } from '../plan/planner';
import type { RecallModel } from '../measure/learned';
import { DEFAULT_PHASES, type PhaseDef } from '../plan/phases';
import type { ScheduleDay } from '../plan/schedule';
import type { Task } from '../plan/types';
import type { Rng } from './rng';
import type { SimWorld } from './world';

export interface SimTask {
  topic: string;
  items: number;
  /** target success probability for item selection (default 0.65) */
  targetP?: number;
  /** planner task kept for backlog bookkeeping */
  source?: Task;
}

export interface PolicyContext {
  day: number;
  date: string;
  schedule: readonly ScheduleDay[];
  sched: ScheduleDay;
  /** minutes available for practice today (after any mock) */
  budgetMin: number;
  fu: number;
  mastery: MasteryDoc;
  world: SimWorld;
  rng: Rng;
  seed: number;
  examId: string;
  phases?: readonly PhaseDef[];
}

export interface PolicyInstance {
  plan(ctx: PolicyContext): SimTask[];
  /** Called with the tasks the student did not finish (remaining items). */
  missed(ctx: PolicyContext, undone: SimTask[]): void;
  /** Items practised, for "seen recently". */
  noteSeen?(day: number, topic: string, items: number): void;
}

export interface Policy {
  name: string;
  /** model the harness uses to pick items at the task's target P (default 'elo') */
  recall?: RecallModel;
  start(world: SimWorld, schedule: readonly ScheduleDay[]): PolicyInstance;
}

const noMissed = (): void => undefined;

/** Same minutes, random topics in chunks of 8 items. */
export const randomPolicy: Policy = {
  name: 'random',
  start: () => ({
    plan(ctx) {
      const topics = ctx.world.topics;
      const acc = new Map<string, number>();
      let left = ctx.budgetMin;
      for (let guard = 0; guard < 500 && left > 0; guard++) {
        const t = topics[Math.floor(ctx.rng() * topics.length)]!;
        const items = Math.min(8, Math.floor(left / t.tMinPerItem));
        if (items < 1) break;
        acc.set(t.id, (acc.get(t.id) ?? 0) + items);
        left -= items * t.tMinPerItem;
      }
      return [...acc].map(([topic, items]) => ({ topic, items }));
    },
    missed: noMissed,
  }),
};

/** Syllabus order: each topic gets an equal share of the whole runway's items, then on to the next. */
export const chapterOrderPolicy: Policy = {
  name: 'chapter_order',
  start: (world, schedule) => {
    const totalMin = schedule.reduce((a, d) => a + d.capacityMin * 0.9, 0);
    const avgT = world.topics.reduce((a, t) => a + t.tMinPerItem, 0) / world.topics.length;
    const quota = Math.max(3, Math.ceil(totalMin / avgT / world.topics.length));
    let idx = 0;
    let done = 0;
    return {
      plan(ctx) {
        const out: SimTask[] = [];
        let left = ctx.budgetMin;
        for (let guard = 0; guard < 500 && left > 0; guard++) {
          const t = ctx.world.topics[idx % ctx.world.topics.length]!;
          const items = Math.min(quota - done, Math.floor(left / t.tMinPerItem));
          if (items < 1) break;
          out.push({ topic: t.id, items });
          left -= items * t.tMinPerItem;
          done += items;
          if (done >= quota) {
            idx++;
            done = 0;
          }
        }
        return out;
      },
      missed: noMissed,
    };
  },
};

/** Fill the budget with chunks of `chunk` items over topics in the given order (wrapping), starting at `from`. */
function fillInOrder(ctx: PolicyContext, order: readonly string[], from: number, chunk: number, targetP?: number): { tasks: SimTask[]; next: number } {
  const acc = new Map<string, number>();
  let left = ctx.budgetMin;
  let i = from;
  for (let guard = 0; guard < 1000 && left > 0 && order.length > 0; guard++) {
    const t = ctx.world.byId[order[i % order.length] as string]!;
    const items = Math.min(chunk, Math.floor(left / t.tMinPerItem));
    if (items < 1) break;
    acc.set(t.id, (acc.get(t.id) ?? 0) + items);
    left -= items * t.tMinPerItem;
    i++;
  }
  return { tasks: [...acc].map(([topic, items]) => ({ topic, items, ...(targetP !== undefined ? { targetP } : {}) })), next: i % Math.max(1, order.length) };
}

/** Fixed schedule: every topic in syllabus order, 6 items each, cycling; item difficulty as the default (P~0.65). */
export const fixedRoundRobinPolicy: Policy = {
  name: 'fixed_round_robin',
  start: (world) => {
    const order = [...world.topics].sort((a, b) => a.order - b.order).map((t) => t.id);
    let next = 0;
    return {
      plan(ctx) {
        const r = fillInOrder(ctx, order, next, 6);
        next = r.next;
        return r.tasks;
      },
      missed: noMissed,
    };
  },
};

/** Difficulty targeting only: random topics (as `random`) but every item is chosen at an estimated P~0.5. */
export const difficultyOnlyPolicy: Policy = {
  name: 'difficulty_only',
  start: () => ({
    plan(ctx) {
      return randomPolicy.start(ctx.world, ctx.schedule).plan(ctx).map((t) => ({ ...t, targetP: 0.5 }));
    },
    missed: noMissed,
  }),
};

/** Weakest first: topics ranked by estimated mastery (unseen = theta 0), lowest first, 8 items each. */
export const weakestFirstPolicy: Policy = {
  name: 'weakest_first',
  start: () => ({
    plan(ctx) {
      const m = (id: string): number => {
        const t = ctx.mastery[id];
        return masteryProb(t && t.n > 0 ? t.θ : 0);
      };
      const order = [...ctx.world.topics].sort((a, b) => m(a.id) - m(b.id) || a.order - b.order).map((t) => t.id);
      return fillInOrder(ctx, order, 0, 8).tasks;
    },
    missed: noMissed,
  }),
};

/** The product planner: planDay driven by estimated mastery, with backlog reconciliation. */
export function plannerPolicy(overrides: { name?: string; config?: Partial<PlannerConfig>; recall?: RecallModel } = {}): Policy {
  return {
    name: overrides.name ?? 'planner',
    ...(overrides.recall ? { recall: overrides.recall } : {}),
    start: () => {
      let pending: Task[] = [];
      let scheduled: Record<string, Task[]> = {};
      const seenLog: Array<{ day: number; topic: string; items: number }> = [];
      let prevLoad: number | undefined;
      return {
        plan(ctx) {
          const sched = ctx.sched;
          const all = [...pending, ...Object.values(scheduled).flat()];
          scheduled = {};
          pending = [];
          const capacities: Record<string, number> = { [ctx.date]: ctx.budgetMin };
          for (let i = 1; i <= 7; i++) {
            const d = addDays(ctx.date, i);
            const sd = ctx.schedule.find((x) => x.date === d);
            if (sd && sd.kind !== 'off') capacities[d] = Math.floor(sd.capacityMin * ctx.fu);
          }
          const rec = reconcileBacklog({ backlog: all, mastery: ctx.mastery, today: ctx.date, daysLeft: sched.daysLeft, capacities, topicMeta: ctx.world.meta });
          scheduled = rec.spread;
          const recent = new Map<string, number>();
          for (const e of seenLog) if (ctx.day - e.day <= 21) recent.set(e.topic, (recent.get(e.topic) ?? 0) + e.items);
          const phase = (ctx.phases ?? DEFAULT_PHASES).find((p) => p.id === sched.phase) ?? DEFAULT_PHASES[0]!;
          const plan = planDay({
            date: ctx.date,
            examId: ctx.examId,
            schedule: ctx.schedule,
            phase,
            mastery: ctx.mastery,
            topicMeta: ctx.world.meta,
            fu: ctx.fu,
            backlog: rec.carry,
            seenRecently: Object.fromEntries(recent),
            seed: ctx.seed,
            ...(overrides.config ? { config: overrides.config } : {}),
            ...(prevLoad !== undefined ? { prevLoadMin: prevLoad } : {}),
          });
          if (plan.loadMin !== null) prevLoad = plan.loadMin;
          const out: SimTask[] = [];
          for (const t of plan.tasks) {
            if (t.kind === 'mock' || t.topic === 'mock_analysis' || t.items <= 0) continue;
            out.push({ topic: t.topic, items: t.items, ...(t.target_p !== undefined ? { targetP: t.target_p } : {}), source: t });
          }
          return out;
        },
        missed(ctx, undone) {
          for (const u of undone) {
            if (!u.source || u.items <= 0) continue;
            const per = u.source.est_min / Math.max(1, u.source.items);
            pending.push({ ...u.source, items: u.items, est_min: Math.round(per * u.items * 10) / 10, carried_from: u.source.carried_from ?? ctx.date });
          }
        },
        noteSeen(day, topic, items) {
          seenLog.push({ day, topic, items });
        },
      };
    },
  };
}
