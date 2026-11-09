/**
 * Plan engine glue: turns the student's profile, mastery and history into inputs for core `planHorizon` / pace,
 * and decides what is written (and when). Pure functions plus `commitDay` (store writes only). No React.
 *
 * Write budget (CLAUDE.md: <= ~8 writes/user/day): pace_log + state/pace once per day (the 04:00 snapshot), the plan doc
 * only when it changed (replan-driven writes capped at PLAN_WRITE_CAP per day), ticks debounced by the hook.
 */
import {
  DEFAULT_GAIN,
  behindOptions,
  buildSchedule,
  type ScheduleConfig,
  chapterRemainingMin,
  computePace,
  DEFAULT_PHASES,
  type PhaseId,
  countByKind,
  masteryBySubject,
  masteryProb,
  nearestExam,
  planDay,
  planHorizon,
  reconcileBacklog,
  scheduleFrom,
  updateFu,
  daysLeft as daysBetween,
  addDays,
  type Ambition,
  type BacklogResult,
  type BehindOptions,
  type ChapterWork,
  type DayPlan,
  type MasteryDoc,
  type PaceResult,
  type ScheduleDay,
  type Task,
  type WorkChapter,
} from '@kairos/core';
import type { ExamSel } from '../onboarding/profileModel';
import { topicMeta as taxTopicMeta, type Taxonomy } from '../practice/taxonomy';
import type { PaceLogDoc, PlanDoc, SessionDoc, UserStore } from '../store/types';
import { PAPER_MARKS, PRIOR_DONE, PRIOR_NEW, buildSyllabus, chapterMasteryDoc, type Syllabus } from './syllabus';

export const PLAN_WRITE_CAP = 2;
export const SEEN_DAYS = 21;
export const BACKLOG_WINDOW_DAYS = 14;
export const DAY_MS = 86_400_000;

export interface PlanSetup {
  exams: readonly ExamSel[];
  ambition: Ambition;
  minutesPerWeekday: Record<number, number>;
  offDay: number | null;
  chaptersDone: readonly string[];
}

/** state/pace. Everything the engine needs to carry between days; extra keys round-trip untouched. */
export interface PaceState {
  snapshotDate?: string;
  /** raw done/planned EWMA (null until the first planned day finished) */
  ewma?: number | null;
  fu?: number;
  W?: number;
  A?: number;
  rho?: number;
  status?: string;
  buffersLeft?: number;
  /** chapters the student chose to park (behind choice B) */
  dropped?: string[];
  /** chapters brought back from automatic triage */
  unskipped?: string[];
  /** the exam date the plan was last anchored to (to notice an official change) */
  anchor?: { date: string; status: string };
  [k: string]: unknown;
}

export const readPaceState = (raw: Record<string, unknown> | null | undefined): PaceState => ({ ...(raw ?? {}) }) as PaceState;

/** A stored plan doc: DayPlan plus backlog bookkeeping that lets tomorrow pick up what was not carried. */
export interface StoredPlan extends DayPlan {
  /** backlog tasks planned for later dates by reconcileBacklog, re-reconciled next open */
  spread?: Record<string, Task[]>;
  backlogNote?: string;
  shedCount?: number;
  costMarks?: number;
}

/* ------------------------------------------------------------------ small pure helpers */

export const jsonClean = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** JSON with sorted keys, for "did the plan change?" comparisons (Firestore does not keep key order). */
export function stableStringify(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stableStringify).join(',')}]`;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

const finite = (x: number): number => (Number.isFinite(x) ? x : 99);
const r1 = (x: number): number => Math.round(x * 10) / 10;

export function dayOfInstant(ms: number): string {
  const d = new Date(ms - 4 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const doneMinutes = (tasks: readonly Task[]): number => r1(tasks.filter((t) => t.status === 'done').reduce((a, t) => a + t.est_min, 0));
export const plannedMinutes = (tasks: readonly Task[]): number => r1(tasks.reduce((a, t) => a + t.est_min, 0));

/* ------------------------------------------------------------------ f_u */

/** f_u history from pace_log docs (oldest first). Used when state/pace has no EWMA yet. */
export function fuFromPaceLog(logs: ReadonlyArray<{ date: string; planned?: number; done?: number }>): { ewma: number | null; fu: number } {
  let ewma: number | null = null;
  for (const l of [...logs].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if ((l.planned ?? 0) > 0) ewma = updateFu(ewma, l.done ?? 0, l.planned ?? 0).ewma;
  }
  return { ewma, fu: ewma === null ? 1 : updateFu(ewma, 0, 0).fu };
}

/** Fold yesterday's done/planned into f_u. Day one (no history) is neutral: f_u = 1. */
export function advanceFu(prevEwma: number | null | undefined, yesterday: { planned: number; done: number } | null): { ewma: number | null; fu: number } {
  const prev = prevEwma ?? null;
  if (!yesterday || yesterday.planned <= 0) return { ewma: prev, fu: prev === null ? 1 : updateFu(prev, 0, 0).fu };
  const r = updateFu(prev, yesterday.done, yesterday.planned);
  return { ewma: r.ewma, fu: r.fu };
}

/* ------------------------------------------------------------------ context */

export interface ContextInput {
  setup: PlanSetup;
  tax: Taxonomy;
  today: string;
  mastery: MasteryDoc | null;
  sessions: readonly SessionDoc[];
  /** plan docs of the last days (any order); only those before `today` feed the backlog */
  recentPlans: ReadonlyArray<PlanDoc & { date: string }>;
  pace: PaceState;
  fu: number;
  /** chapters that have practice questions; the plan only schedules those when given (pace still counts all chapters) */
  available?: ReadonlySet<string>;
  /** the student's / admin's roadmap (src/roadmap); core defaults when omitted */
  scheduleConfig?: ScheduleConfig;
}

export interface PlanContext {
  today: string;
  exam: ExamSel;
  others: ExamSel[];
  /** lower-case id the planner uses for subject balance ("jee_main", "neet_ug", "iat") */
  examId: string;
  daysLeft: number;
  schedule: ScheduleDay[];
  fromToday: ScheduleDay[];
  syllabus: Syllabus;
  /** chapters of the syllabus not parked by the student (counted in pace) */
  liveChapters: string[];
  /** chapters the planner may schedule (live, minus automatically triaged ones is the planner's job) */
  planChapters: string[];
  masteryDoc: MasteryDoc;
  fu: number;
  ambition: Ambition;
  seenRecently: Record<string, number>;
  backlog: Task[];
  backlogResult: BacklogResult | null;
  prevLoadMin: number | undefined;
  lastActive: string | undefined;
  unskipped: string[];
  dropped: string[];
  chaptersDone: readonly string[];
  paperMarks: number;
}

export type ExamPhaseState = { kind: 'none' } | { kind: 'passed'; exam: ExamSel } | { kind: 'ok'; exam: ExamSel };

/** Whether there is an upcoming exam to plan for. */
export function examState(setup: Pick<PlanSetup, 'exams'>, today: string): ExamPhaseState {
  if (setup.exams.length === 0) return { kind: 'none' };
  const next = nearestExam(setup.exams, today);
  if (next && daysBetween(next.date, today) >= 1) return { kind: 'ok', exam: next };
  const last = [...setup.exams].sort((a, b) => (a.date < b.date ? 1 : -1))[0]!;
  return { kind: 'passed', exam: last };
}

/** Chapter -> questions seen in the last 21 days (mixed sessions split their questions evenly). */
export function seenRecentlyFrom(sessions: readonly SessionDoc[], now: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    if (s.startedAt < now - SEEN_DAYS * DAY_MS) continue;
    const chapters = Array.isArray(s.chapters) ? (s.chapters as string[]) : typeof s.chapter === 'string' ? [s.chapter] : [];
    const n = Array.isArray(s.qids) ? s.qids.length : 0;
    if (chapters.length === 0 || n === 0) continue;
    for (const c of chapters) out[c] = (out[c] ?? 0) + n / chapters.length;
  }
  return out;
}

/** Latest past plan's open tasks plus anything it had spread to later days: yesterday's unfinished work. */
export function backlogFromPlans(plans: ReadonlyArray<PlanDoc & { date: string }>, today: string): { tasks: Task[]; from: string | null } {
  const past = plans
    .filter((p) => p.date < today && daysBetween(today, p.date) <= BACKLOG_WINDOW_DAYS)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = past[0] as (PlanDoc & { date: string; spread?: Record<string, Task[]> }) | undefined;
  if (!last) return { tasks: [], from: null };
  const open = ((last.tasks ?? []) as Task[]).filter((t) => t.status === 'todo' && t.items > 0 && t.topic !== 'mock_analysis' && t.kind !== 'diagnostic');
  const spread = Object.values(last.spread ?? {}).flat();
  return { tasks: [...open.map((t) => ({ ...t, carried_from: t.carried_from ?? last.date })), ...spread], from: last.date };
}

export function lastActiveDate(sessions: readonly SessionDoc[], plans: ReadonlyArray<PlanDoc & { date: string }>): string | undefined {
  const dates: string[] = [];
  for (const s of sessions) dates.push(dayOfInstant(s.endedAt ?? s.startedAt));
  for (const p of plans) if (((p.tasks ?? []) as Task[]).some((t) => t.status === 'done')) dates.push(p.date);
  return dates.sort().pop();
}

export function buildPlanContext(input: ContextInput, nowMs?: number): PlanContext | null {
  const st = examState(input.setup, input.today);
  if (st.kind !== 'ok') return null;
  const exam = st.exam;
  const others = input.setup.exams.filter((e) => e !== exam);
  const exams = [exam, ...others].map((e) => e.exam);
  const syllabus = buildSyllabus(input.tax, exams);
  const dropped = input.pace.dropped ?? [];
  const unskipped = input.pace.unskipped ?? [];
  const liveChapters = syllabus.chapters.filter((c) => !dropped.includes(c));
  let planChapters = liveChapters;
  if (input.available && input.available.size > 0) {
    const avail = liveChapters.filter((c) => input.available!.has(c));
    if (avail.length > 0) planChapters = avail;
  }
  const schedule = buildSchedule({ today: input.today, examDate: exam.date, minutesPerWeekday: input.setup.minutesPerWeekday, offDay: input.setup.offDay, ...(input.scheduleConfig ? { config: input.scheduleConfig } : {}) });
  const fromToday = scheduleFrom(schedule, input.today);
  const masteryDoc = chapterMasteryDoc(input.mastery, input.tax);
  const now = nowMs ?? Date.parse(`${input.today}T12:00:00`);
  const seenRecently = seenRecentlyFrom(input.sessions, now);
  const daysLeft = daysBetween(exam.date, input.today);

  const prevPlans = input.recentPlans.filter((p) => p.date < input.today).sort((a, b) => (a.date < b.date ? 1 : -1));
  const prevLoad = prevPlans.find((p) => typeof (p as { loadMin?: unknown }).loadMin === 'number' && daysBetween(input.today, p.date) <= 3);
  const prevLoadMin = prevLoad ? ((prevLoad as unknown as { loadMin: number }).loadMin) : undefined;

  const { tasks: backlogTasks } = backlogFromPlans(input.recentPlans, input.today);
  const lastActive = lastActiveDate(input.sessions, input.recentPlans);
  let backlog: Task[] = [];
  let backlogResult: BacklogResult | null = null;
  if (backlogTasks.length > 0) {
    const capacities: Record<string, number> = {};
    for (let i = 0; i <= 7; i++) {
      const d = fromToday[i];
      if (d) capacities[d.date] = d.kind === 'work' ? Math.floor(d.capacityMin * Math.min(1, input.fu)) : 0;
    }
    backlogResult = reconcileBacklog({
      backlog: backlogTasks,
      mastery: masteryDoc,
      today: input.today,
      daysLeft,
      capacities,
      topicMeta: syllabus.meta,
      ...(lastActive ? { lastActive } : {}),
      paperMarks: PAPER_MARKS[exam.exam] ?? 300,
    });
    backlog = backlogResult.carry;
  }

  return {
    today: input.today,
    exam,
    others,
    examId: exam.exam.toLowerCase(),
    daysLeft,
    schedule,
    fromToday,
    syllabus,
    liveChapters,
    planChapters,
    masteryDoc,
    fu: input.fu,
    ambition: input.setup.ambition,
    seenRecently,
    backlog,
    backlogResult,
    prevLoadMin,
    lastActive,
    unskipped: [...unskipped],
    dropped: [...dropped],
    chaptersDone: input.setup.chaptersDone,
    paperMarks: PAPER_MARKS[exam.exam] ?? 300,
  };
}

/* ------------------------------------------------------------------ pace */

export function chapterMasteryValue(ctx: Pick<PlanContext, 'masteryDoc' | 'chaptersDone'>, id: string): number {
  const m = ctx.masteryDoc[id];
  if (m && m.n > 0) return masteryProb(m.θ);
  return ctx.chaptersDone.includes(id) ? PRIOR_DONE : PRIOR_NEW;
}

export interface PaceBundle {
  pace: PaceResult;
  behind: BehindOptions | null;
  chapters: ChapterWork[];
  bufferDaysLeft: number;
  /** dates of the buffer days that will be spent catching up (slightly behind / behind) */
  bufferDates: string[];
}

/** W from chapter mastery and ambition; A from the remaining schedule x f_u; buffers left from the schedule. */
export function computeTodayPace(ctx: PlanContext): PaceBundle {
  const n = Math.max(1, ctx.liveChapters.length);
  const work: WorkChapter[] = ctx.liveChapters.map((id) => ({
    id,
    weight: 1,
    mastery: chapterMasteryValue(ctx, id),
    itemMin: ctx.syllabus.meta[id]?.tMinPerItem ?? 3,
  }));
  const chapters: ChapterWork[] = work.map((c) => {
    const remainingMin = chapterRemainingMin(c, ctx.ambition);
    const items = remainingMin / (c.itemMin ?? 3);
    return { id: c.id, weight: c.weight, remainingMin, marksCost: r1(items * DEFAULT_GAIN * ctx.paperMarks * (1 / n)) };
  });
  const W = chapters.reduce((a, c) => a + c.remainingMin, 0);
  const bufferDaysLeft = ctx.fromToday.filter((d) => d.kind === 'buffer').length;
  const input = { workRemainingMin: W, scheduleFromToday: ctx.fromToday, fu: ctx.fu, bufferDaysLeft };
  const pace = computePace(input);
  const behind = behindOptions({ ...input, chapters });
  const bufferDates = ctx.fromToday.filter((d) => d.kind === 'buffer').slice(0, pace.bufferToSpend).map((d) => d.date);
  return { pace, behind, chapters, bufferDaysLeft, bufferDates };
}

/* ------------------------------------------------------------------ plan */

export interface TodayResult {
  plan: StoredPlan;
  horizon: DayPlan[];
}

/** Questions answered today per chapter -> tick tasks that were fully practised. Pure. */
export function autoMarkDone(tasks: readonly Task[], sessions: readonly SessionDoc[], today: string): Task[] {
  const answered: Record<string, number> = {};
  for (const s of sessions) {
    if (dayOfInstant(s.startedAt) !== today) continue;
    const chapters = Array.isArray(s.chapters) ? (s.chapters as string[]) : typeof s.chapter === 'string' ? [s.chapter] : [];
    const n = Array.isArray(s.qids) ? s.qids.length : 0;
    for (const c of chapters) answered[c] = (answered[c] ?? 0) + n / Math.max(1, chapters.length);
  }
  return tasks.map((t) => {
    if (t.status !== 'todo' || !['practice', 'review', 'fsrs_due', 'light_review'].includes(t.kind) || t.items <= 0) return t;
    const have = answered[t.chapter] ?? 0;
    if (have + 1e-9 < t.items) return t;
    answered[t.chapter] = have - t.items;
    return { ...t, status: 'done' as const };
  });
}

/** Keep what the student already did today (done/skipped tasks); fill the rest from the fresh plan. */
export function mergeWithStored(next: DayPlan, stored: DayPlan | null): DayPlan {
  const kept = (stored?.tasks ?? []).filter((t) => t.status !== 'todo');
  if (kept.length === 0) return next;
  const keys = new Set(kept.map((t) => `${t.kind}|${t.topic}`));
  let n = Math.max(0, ...kept.map((t) => Number(t.id.split('#')[1]) || 0));
  const fresh = next.tasks.filter((t) => !keys.has(`${t.kind}|${t.topic}`)).map((t) => ({ ...t, id: `${next.date}#${++n}` }));
  const tasks = [...kept, ...fresh];
  return { ...next, tasks, plannedMin: plannedMinutes(tasks) };
}

/** Today's committed plan (with merge/auto-tick) and the 7-day preview. Never exceeds the day's stated capacity. */
export function todayPlan(ctx: PlanContext, opts: { stored?: StoredPlan | null; sessions?: readonly SessionDoc[]; seed?: string } = {}): TodayResult {
  const stored = opts.stored ?? null;
  const base = {
    date: ctx.today,
    examId: ctx.examId,
    schedule: ctx.schedule,
    mastery: ctx.masteryDoc,
    topicMeta: ctx.syllabus.meta,
    fu: ctx.fu,
    backlog: ctx.backlog,
    seenRecently: ctx.seenRecently,
    examsTopics: ctx.planChapters,
    seed: opts.seed ?? ctx.examId,
    unskipped: ctx.unskipped,
    ...(ctx.prevLoadMin !== undefined ? { prevLoadMin: ctx.prevLoadMin } : {}),
    ...(ctx.backlogResult?.miniDiagnostic ? { miniDiagnostic: true } : {}),
  };
  const horizon = planHorizon(base, 7);
  let day = horizon[0]!;
  // today's done work is kept; the rest of the budget is what remains of the stated capacity
  const doneTasks = (stored?.tasks ?? []).filter((t) => t.status !== 'todo');
  if (doneTasks.length > 0) {
    const left = Math.max(0, day.capacityMin - plannedMinutes(doneTasks));
    day = left > 0 ? planDay({ ...base, phase: phaseOf(ctx), capacityMin: left }) : { ...day, tasks: [], plannedMin: 0, loadMin: null };
    day = mergeWithStored(day, stored);
    day = { ...day, capacityMin: horizon[0]!.capacityMin };
  }
  let tasks = day.tasks;
  if (opts.sessions) tasks = autoMarkDone(tasks, opts.sessions, ctx.today);
  const plan: StoredPlan = { ...day, tasks, plannedMin: plannedMinutes(tasks) };
  const br = ctx.backlogResult;
  if (br) {
    if (Object.keys(br.spread).length > 0) plan.spread = br.spread;
    plan.backlogNote = br.message;
    plan.shedCount = br.shed.length;
    plan.costMarks = br.costMarks;
  }
  horizon[0] = plan;
  return { plan: jsonClean(plan), horizon };
}

function phaseOf(ctx: PlanContext) {
  const day = ctx.schedule.find((d) => d.date === ctx.today);
  return phasesById(day?.phase ?? 'build');
}

function phasesById(id: PhaseId) {
  return DEFAULT_PHASES.find((p) => p.id === id) ?? DEFAULT_PHASES[0]!;
}

/* ------------------------------------------------------------------ views */

export interface Yesterday {
  planned: number;
  done: number;
}

export function yesterdayStats(plans: ReadonlyArray<PlanDoc & { date: string }>, today: string): Yesterday | null {
  const y = plans.find((p) => p.date === addDays(today, -1));
  if (!y || !Array.isArray(y.tasks)) return null;
  const tasks = y.tasks as Task[];
  return { planned: plannedMinutes(tasks), done: doneMinutes(tasks) };
}

export function nextMock(ctx: Pick<PlanContext, 'fromToday'>, from?: string): ScheduleDay | null {
  return ctx.fromToday.find((d) => (d.kind === 'mock' || d.kind === 'sprint_mock') && (!from || d.date >= from)) ?? null;
}

export interface ParkedItem {
  chapter: string;
  name: string;
  /** automatic = planner triage (bring back via unskipped); chosen = the student parked it (remove from dropped) */
  source: 'automatic' | 'chosen';
  marksCost: number;
  reason?: string;
}

export function parkedItems(ctx: PlanContext, plan: DayPlan, pace: PaceBundle): ParkedItem[] {
  const cost = new Map(pace.chapters.map((c) => [c.id, c.marksCost]));
  const out: ParkedItem[] = plan.triaged.map((t) => ({ chapter: t.chapter, name: ctx.syllabus.names[t.chapter] ?? t.chapter, source: 'automatic', marksCost: cost.get(t.chapter) ?? 0, reason: t.reason }));
  for (const c of ctx.dropped) {
    const n = Math.max(1, ctx.syllabus.chapters.length);
    const m = chapterMasteryValue(ctx, c);
    const remaining = chapterRemainingMin({ id: c, weight: 1, mastery: m }, ctx.ambition);
    out.push({ chapter: c, name: ctx.syllabus.names[c] ?? c, source: 'chosen', marksCost: r1((remaining / 3) * DEFAULT_GAIN * ctx.paperMarks * (1 / n)) });
  }
  return out;
}

/* ------------------------------------------------------------------ daily snapshot + commit */

export function buildSnapshot(args: {
  ctx: PlanContext;
  bundle: PaceBundle;
  tax: Taxonomy;
  mastery: MasteryDoc | null;
  yesterday: Yesterday | null;
  fuState: { ewma: number | null; fu: number };
  prev: PaceState;
}): { log: PaceLogDoc; state: PaceState } {
  const { ctx, bundle, yesterday } = args;
  const bySubject = args.mastery ? masteryBySubject(args.mastery, taxTopicMeta(args.tax)) : {};
  const subj = Object.fromEntries(Object.entries(bySubject).map(([k, a]) => [k, { p: Math.round(masteryProb(a.theta) * 1000) / 1000, n: a.n }]));
  const rho = finite(bundle.pace.rho);
  const log: PaceLogDoc = {
    date: ctx.today,
    planned: yesterday?.planned ?? 0,
    done: yesterday?.done ?? 0,
    rho: Math.round(rho * 1000) / 1000,
    status: bundle.pace.status,
    W: Math.round(bundle.pace.W),
    A: Math.round(bundle.pace.A),
    fu: Math.round(args.fuState.fu * 1000) / 1000,
    buffersLeft: bundle.bufferDaysLeft,
    daysLeft: ctx.daysLeft,
    masteryBySubject: subj,
    predicted: null,
  };
  const state: PaceState = {
    ...args.prev,
    snapshotDate: ctx.today,
    ewma: args.fuState.ewma,
    fu: log.fu as number,
    W: log.W as number,
    A: log.A as number,
    rho: log.rho as number,
    status: bundle.pace.status,
    buffersLeft: bundle.bufferDaysLeft,
    anchor: { date: ctx.exam.date, status: ctx.exam.session === 0 ? 'custom' : (args.prev.anchor?.status ?? 'expected') },
  };
  return { log, state };
}

export const snapshotDue = (pace: PaceState, today: string): boolean => pace.snapshotDate !== today;

export interface CommitArgs {
  store: UserStore;
  today: string;
  plan: StoredPlan;
  /** plan doc as last read/written (null when none exists yet) */
  stored: StoredPlan | null;
  /** replan-driven plan writes already made today (ticks are not counted) */
  planWritesToday: number;
  snapshot: { log: PaceLogDoc; state: PaceState } | null;
}
export interface CommitResult {
  planWritten: boolean;
  snapshotWritten: boolean;
  writes: number;
}

/** One snapshot per day; the plan doc only when it changed and the replan-write cap allows it. */
export async function commitDay(a: CommitArgs): Promise<CommitResult> {
  let writes = 0;
  let planWritten = false;
  let snapshotWritten = false;
  const changed = !a.stored || stableStringify(a.stored) !== stableStringify(a.plan);
  if (changed && (!a.stored || a.planWritesToday < PLAN_WRITE_CAP)) {
    await a.store.putPlan(a.today, jsonClean(a.plan) as unknown as PlanDoc);
    planWritten = true;
    writes++;
  }
  if (a.snapshot) {
    await a.store.putPaceLog(a.today, jsonClean(a.snapshot.log));
    await a.store.putState('pace', jsonClean(a.snapshot.state) as Record<string, unknown>);
    snapshotWritten = true;
    writes += 2;
  }
  return { planWritten, snapshotWritten, writes };
}

/* ------------------------------------------------------------------ links */

/** Practice difficulty bands from the task's target success probability. */
export function bandsFor(targetP: number | undefined): string {
  if (targetP === undefined) return 'E,M,H';
  if (targetP >= 0.8) return 'E';
  if (targetP >= 0.72) return 'E,M';
  if (targetP >= 0.62) return 'M';
  return 'M,H';
}

export const DEFAULT_MOCK_PAPER = 'sample_jee_mini_v1';

export function taskLink(t: Task, examOf: Record<string, string>, fallbackExam: string, paperId: string = DEFAULT_MOCK_PAPER): string | null {
  if (t.kind === 'mock') return `/exam/${paperId}`;
  if (t.topic === 'mock_analysis') return '/mocks';
  if (t.kind === 'diagnostic' || !t.chapter || t.items <= 0) return t.kind === 'diagnostic' ? '/practice' : null;
  const exam = examOf[t.chapter] ?? fallbackExam;
  return `/practice/${exam}/${t.chapter}?size=${Math.max(1, t.items)}&bands=${bandsFor(t.target_p)}&mode=relaxed`;
}

export { countByKind };
