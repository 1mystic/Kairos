/** 5.6 backlog: carry, spread, shed, never pile. Pure. */
import { masteryProb } from '../measure/elo';
import type { MasteryDoc } from '../measure/mastery';
import { addDays, dayNumber } from './calendar';
import { DEFAULT_GAIN } from './pace';
import type { PlannerTopicMeta } from './planner';
import type { Task } from './types';

export interface BacklogInput {
  backlog: readonly Task[];
  mastery: MasteryDoc;
  today: string;
  /** Days until the exam (N in docs/05 5.6). */
  daysLeft: number;
  /** Spare capacity (minutes) per upcoming date; today's entry is today's budget. */
  capacities: Record<string, number>;
  topicMeta?: Record<string, PlannerTopicMeta>;
  /** Last day the student was active; absent >= 3 days triggers a fresh plan + mini diagnostic. */
  lastActive?: string;
  /** Marks on the paper, for the cost estimate (default 300). */
  paperMarks?: number;
  carryCap?: number;
}

export interface BacklogResult {
  carry: Task[];
  spread: Record<string, Task[]>;
  shed: Task[];
  /** Tasks that dissolved because the topic improved elsewhere (no marks cost). */
  dissolved: Task[];
  costMarks: number;
  message: string;
  freshPlanNeeded: boolean;
  miniDiagnostic: boolean;
}

export const BACKLOG_CARRY_CAP = 0.3;
export const BACKLOG_MAX_SPREAD_DAYS = 7;
/** Debt over this many days of capacity gets shed. */
export const BACKLOG_DEBT_DAYS = 2;
export const ABSENT_DAYS = 3;

const r1 = (x: number): number => Math.round(x * 10) / 10;

function shedRank(t: Task): number {
  if (t.kind === 'review' || t.kind === 'light_review' || t.kind === 'fsrs_due' || t.bucket === 'review') return 0;
  if (t.bucket === 'new') return 1;
  if (t.bucket === 'mixed') return 2;
  return 3;
}

/** Shrink / dissolve tasks whose topic was practised elsewhere since they were planned. */
function rescore(t: Task, mastery: MasteryDoc): { task: Task | null } {
  if (t.kind === 'mock' || t.m_at_plan === undefined || t.items <= 0) return { task: t };
  const m = mastery[t.topic];
  if (!m || m.n === 0) return { task: t };
  const gain = masteryProb(m.θ) - t.m_at_plan;
  if (gain <= 0.03) return { task: t };
  const keep = Math.max(0, 1 - gain / 0.2);
  const items = Math.floor(t.items * keep);
  if (items < 2) return { task: null };
  return { task: { ...t, items, est_min: r1((t.est_min / t.items) * items), priority: t.priority * keep } };
}

export function reconcileBacklog(input: BacklogInput): BacklogResult {
  const { today, mastery } = input;
  const carryCap = input.carryCap ?? BACKLOG_CARRY_CAP;
  const absent = input.lastActive !== undefined ? dayNumber(today) - dayNumber(input.lastActive) : 0;
  const fresh = absent >= ABSENT_DAYS;

  const dissolved: Task[] = [];
  let live: Task[] = [];
  for (const t of input.backlog) {
    const r = rescore(t, mastery);
    if (r.task) live.push(r.task);
    else dissolved.push(t);
  }

  // one mock at most is kept; mocks are never shed.
  const mocks = live.filter((t) => t.kind === 'mock');
  const keepMock = mocks.length > 0 ? [mocks[mocks.length - 1] as Task] : [];
  for (const m of mocks.slice(0, -1)) dissolved.push(m);
  live = live.filter((t) => t.kind !== 'mock');

  const shed: Task[] = [];
  const todayBudget = input.capacities[today] ?? 0;
  const dates = Object.keys(input.capacities)
    .filter((d) => dayNumber(d) > dayNumber(today) && (input.capacities[d] ?? 0) > 0)
    .sort();
  const k = Math.min(dates.length, Math.max(1, Math.min(BACKLOG_MAX_SPREAD_DAYS, Math.floor(input.daysLeft / 10))));
  const spreadDates = dates.slice(0, k);

  if (fresh) {
    shed.push(...live);
    live = [];
  }

  // rooms: carry today, then spread days (each at most carryCap of that day's capacity)
  const todayRoom = carryCap * todayBudget;
  const rooms = new Map<string, number>(spreadDates.map((d) => [d, carryCap * (input.capacities[d] as number)]));
  const roomTotal = todayRoom + [...rooms.values()].reduce((a, b) => a + b, 0);
  const debtLimit = Math.min(BACKLOG_DEBT_DAYS * Math.max(todayBudget, ...spreadDates.map((d) => input.capacities[d] as number), 0), roomTotal);

  // shed order: low-pi review -> low-weight new -> extra mixed -> (last resort) lowest-priority weak practice
  const minutes = (ts: Task[]): number => ts.reduce((a, t) => a + t.est_min, 0);
  const order = [...live].sort((a, b) => shedRank(a) - shedRank(b) || a.priority - b.priority || (a.id < b.id ? -1 : 1));
  const shedIds = new Set<string>();
  let debt = minutes(live);
  for (const t of order) {
    if (debt <= debtLimit + 1e-9) break;
    shedIds.add(t.id + '|' + t.topic);
    debt -= t.est_min;
  }
  const kept = live.filter((t) => !shedIds.has(t.id + '|' + t.topic));
  for (const t of order) if (shedIds.has(t.id + '|' + t.topic)) shed.push(t);

  // carry today (by priority), spread the rest over the next k days proportional to spare capacity
  const byPrio = [...kept].sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1));
  const carry: Task[] = [];
  let carried = 0;
  const rest: Task[] = [];
  for (const t of byPrio) {
    if (carried + t.est_min <= todayRoom + 1e-9) {
      carry.push({ ...t, carried_from: t.carried_from ?? today });
      carried += t.est_min;
    } else rest.push(t);
  }
  const spread: Record<string, Task[]> = {};
  const left = new Map(rooms);
  const spreadPlaced = new Map<string, number>();
  for (const t of rest) {
    // most spare room first = proportional to capacity
    let best: string | null = null;
    let bestRoom = -1;
    for (const d of spreadDates) {
      const r = left.get(d) as number;
      if (r + 1e-9 >= t.est_min && r > bestRoom) {
        best = d;
        bestRoom = r;
      }
    }
    if (best === null) {
      shed.push(t);
      continue;
    }
    left.set(best, bestRoom - t.est_min);
    (spread[best] ??= []).push({ ...t, carried_from: t.carried_from ?? today });
    spreadPlaced.set(best, (spreadPlaced.get(best) ?? 0) + 1);
  }
  const mockCarry = keepMock.map((t) => ({ ...t, carried_from: t.carried_from ?? today }));

  const meta = input.topicMeta ?? {};
  const totalW = Object.values(meta).reduce((a, m) => a + m.weight, 0);
  const nTopics = Math.max(1, Object.keys(meta).length);
  const paper = input.paperMarks ?? 300;
  const costMarks = r1(
    shed.reduce((a, t) => {
      const share = totalW > 0 ? (meta[t.topic]?.weight ?? totalW / nTopics) / totalW : 1 / nTopics;
      return a + t.items * DEFAULT_GAIN * paper * share;
    }, 0),
  );

  const nSpread = Object.values(spread).reduce((a, l) => a + l.length, 0);
  const parts: string[] = [];
  if (fresh) parts.push(`You have been away ${absent} days, so the old backlog is replaced by a fresh plan starting with a short check-in quiz.`);
  if (shed.length > 0) {
    const names = [...new Set(shed.map((t) => t.topic))].slice(0, 4).join(', ');
    parts.push(`Dropped ${shed.length} task${shed.length === 1 ? '' : 's'} (${r1(minutes(shed))} min: ${names}). Estimated cost about ${costMarks} marks.`);
  }
  if (carry.length + mockCarry.length > 0) parts.push(`${carry.length + mockCarry.length} carried to today.`);
  if (nSpread > 0) parts.push(`${nSpread} spread over the next ${Object.keys(spread).length} day${Object.keys(spread).length === 1 ? '' : 's'}.`);
  if (dissolved.length > 0) parts.push(`${dissolved.length} no longer needed because you improved those topics.`);
  if (parts.length === 0) parts.push('Nothing is backed up.');

  return {
    carry: [...mockCarry, ...carry],
    spread,
    shed,
    dissolved,
    costMarks,
    message: parts.join(' '),
    freshPlanNeeded: fresh,
    miniDiagnostic: fresh,
  };
}

/** Add `days` to a date; helper for callers building the capacities map. */
export function upcomingDates(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i + 1));
}
