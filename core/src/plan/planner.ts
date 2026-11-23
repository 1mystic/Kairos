/**
 * 5.5 planner. `planDay` builds one day; `planHorizon` plans a rolling 7 days (the app commits today and
 * replans on every open). Pure and deterministic for a given seed.
 *
 * Hard guarantees (property-tested):
 *  - sum(est_min) <= capacityMin, always (stated capacity is never exceeded; asking is the app's job).
 *  - off days produce no tasks (a final-sprint day on the off-day is flagged `sprintOverride`).
 *  - buffer days: light_review only, <= 60% of budget.
 *  - taper: only topics with mistakes (err_mix > 0), practice only, no new topics.
 *  - load change between consecutive work days is within +/-15% (limitLoadChange; reference floored at LOAD_RULE_FLOOR_MIN). Exempt: buffer, mock and taper days
 *    (they deliberately differ), and the very first planned day.
 */
import { gumbel, hashSeed, mulberry32, type Rng } from '../sim/rng';
import { masteryProb } from '../measure/elo';
import { cardFromParts, isDue, retrievability } from '../measure/fsrs';
import type { MasteryDoc } from '../measure/mastery';
import { predictRecall, type RecallModel } from '../measure/learned';
import { addDays, dayNumber } from './calendar';
import { limitLoadChange, FU_MAX } from './pace';
import { DEFAULT_PHASES, type PhaseDef, type PhaseId } from './phases';
import type { ScheduleDay } from './schedule';
import type { Bucket, Task } from './types';

export interface PlannerTopicMeta {
  chapter: string;
  subject: string;
  /** Exam weight of the topic (relative; normalised by the planner). */
  weight: number;
  /** Minutes per item. */
  tMinPerItem: number;
}

export interface PriorityWeights {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
  epsilon: number;
  zeta: number;
  /** softmax temperature for topic sampling */
  tau: number;
}

/** docs/05 5.5: the phase sets the priority weights. Early phases explore (gamma, higher tau); late phases chase retention and own mistakes. */
export const PRIORITY_WEIGHTS: Record<PhaseId, PriorityWeights> = {
  build: { alpha: 1.0, beta: 0.2, gamma: 0.5, delta: 0.2, epsilon: 0.3, zeta: 0.4, tau: 0.3 },
  strengthen: { alpha: 1.1, beta: 0.5, gamma: 0.3, delta: 0.4, epsilon: 0.4, zeta: 0.4, tau: 0.25 },
  consolidate: { alpha: 1.0, beta: 0.7, gamma: 0.2, delta: 0.5, epsilon: 0.5, zeta: 0.3, tau: 0.25 },
  exam_mode: { alpha: 0.9, beta: 0.9, gamma: 0.15, delta: 0.6, epsilon: 0.6, zeta: 0.3, tau: 0.2 },
  final_sprint: { alpha: 0.8, beta: 1.1, gamma: 0.1, delta: 0.7, epsilon: 0.7, zeta: 0.2, tau: 0.2 },
  taper: { alpha: 0, beta: 0, gamma: 0, delta: 1.0, epsilon: 0.5, zeta: 0, tau: 0.2 },
};

export interface PlannerConfig {
  fsrsCap: number;
  carryCap: number;
  bufferCap: number;
  taperShare: number;
  maxPerSubject: number;
  maxItemsPerTask: number;
  minItemsPerTask: number;
  fsrsItems: number;
  lightItems: number;
  mockMin: number;
  mockAnalysisMin: number;
  mockItems: number;
  triageFromDays: number;
  /** triage candidates: weight at or under this quantile of topic weights */
  triageWeightQuantile: number;
  /** triage candidates: mastery under this */
  triageMastery: number;
  /** never triage more than this share of topics */
  triageMaxShare: number;
  /** a topic is weak under this mastery */
  weakMastery: number;
  /** per-bucket priority bonus for retention need in the review bucket */
  reviewBoost: number;
  /**
   * Coverage pressure: items needed to get a first exposure to every unseen topic. When the phase's `new` share
   * would not cover the syllabus before new work stops (exam mode), `new` is raised (up to coverageMaxShare).
   * 0 disables.
   */
  coverageItems: number;
  coverageMaxShare: number;
  weights?: Record<PhaseId, PriorityWeights>;
  phases?: readonly PhaseDef[];
  /** How mastery m_T = P(correct on a medium item) is estimated: 'elo' (default) or the learned recall model. */
  recallModel?: RecallModel;
  /**
   * Topic priority. 'heuristic' (default): docs/05 5.5 pi_T. 'uncertainty' (docs/17 Phase E): exam weight gates every
   * value term, pi_T = w_T x (alpha (1-m) + gamma EIG + beta (1-R)) + delta e + epsilon fix - zeta s, where EIG is the
   * expected information gain about theta of one item at the practice target P under the Elo posterior (rd).
   * Only *which* topics get the minutes changes; caps, load rule and buffers are untouched.
   */
  priorityMode?: 'heuristic' | 'uncertainty';
  /** Ablation switches for the 'uncertainty' mode (all default true). */
  signals?: Partial<Record<UncertaintySignal, boolean>>;
}

export type UncertaintySignal = 'examWeight' | 'weakness' | 'infoGain' | 'forgetting';

/** Normalised expected information gain of one item at success probability p for a Gaussian ability posterior with sd rd. */
export function expectedInfoGain(rd: number, p: number): number {
  const fisher = p * (1 - p);
  return Math.log1p(rd * rd * fisher) / Math.log1p(0.25 * ELO_RD_MAX * ELO_RD_MAX);
}
const ELO_RD_MAX = 1;

export const DEFAULT_PLANNER_CONFIG: PlannerConfig = {
  fsrsCap: 0.25,
  carryCap: 0.3,
  bufferCap: 0.6,
  taperShare: 0.7,
  maxPerSubject: 3,
  maxItemsPerTask: 30,
  minItemsPerTask: 3,
  fsrsItems: 4,
  lightItems: 5,
  mockMin: 210,
  mockAnalysisMin: 30,
  mockItems: 75,
  triageFromDays: 45,
  triageWeightQuantile: 0.3,
  triageMastery: 0.3,
  triageMaxShare: 0.2,
  weakMastery: 0.6,
  reviewBoost: 1.0,
  coverageItems: 8,
  coverageMaxShare: 0.6,
};

export interface PlanInput {
  date: string;
  examId: string;
  schedule: readonly ScheduleDay[];
  phase: PhaseDef;
  mastery: MasteryDoc;
  topicMeta: Record<string, PlannerTopicMeta>;
  /** completion factor f_u (clamped to 0..1.1) */
  fu: number;
  backlog?: readonly Task[];
  /** Items seen in the last 21 days per topic (s_T = min(1, n/20)). */
  seenRecently?: Record<string, number>;
  /** Topics in this exam's syllabus. Default: all of topicMeta. */
  examsTopics?: readonly string[];
  /** Stated minutes for the day. Default: the schedule day's capacity. */
  capacityMin?: number;
  seed: number | string;
  config?: Partial<PlannerConfig>;
  /** The exam's paper length in minutes (blueprint duration_min). Mock tasks and the capacity a mock needs follow it (+ analysis). Default: the JEE shape, 180 min. */
  mockMinutes?: number;
  /** The exam's paper question count (blueprint totalQuestions). Default 75 (JEE). */
  mockQuestions?: number;
  /** Load (minutes) of the previous comparable work day, for the +/-15% rule. */
  prevLoadMin?: number;
  /** Topics the student has asked to bring back from triage. */
  unskipped?: readonly string[];
  fixList?: readonly string[];
  /** Add a mini-diagnostic task (after >= 3 absent days). */
  miniDiagnostic?: boolean;
}

export interface TriagedTopic {
  topic: string;
  chapter: string;
  reason: string;
}

export interface DayPlan {
  date: string;
  phase: PhaseId;
  dayKind: ScheduleDay['kind'];
  daysLeft: number;
  capacityMin: number;
  /** minutes the plan may use (capacity x f_u, load-limited) */
  budgetMin: number;
  plannedMin: number;
  /** minutes counted for the +/-15% rule; null when the day is exempt (buffer / mock / taper / off) */
  loadMin: number | null;
  tasks: Task[];
  triaged: TriagedTopic[];
  warnings: string[];
  sprintOverride?: true;
}

const BASE_SHARES: Record<string, Record<string, number>> = {
  neet: { biology: 0.5, physics: 0.25, chemistry: 0.25 },
  jee: { physics: 1 / 3, chemistry: 1 / 3, mathematics: 1 / 3 },
  iat: { physics: 0.25, chemistry: 0.25, mathematics: 0.25, biology: 0.25 },
};
const SUBJECT_ALIAS: Record<string, string> = { maths: 'mathematics', math: 'mathematics', bio: 'biology', chem: 'chemistry', phy: 'physics' };
export const SUBJECT_TOLERANCE = 0.1;
/** The +/-15% rule is measured against at least this many minutes (below it a ramp would take weeks). */
export const LOAD_RULE_FLOOR_MIN = 60;

const normSubject = (s: string): string => {
  const l = s.toLowerCase();
  return SUBJECT_ALIAS[l] ?? l;
};

/**
 * Target share of study minutes per subject. NEET biology ~ 50%, JEE ~ 1/3 each, IAT equal; shifted toward
 * weaker subjects (`weakness` per subject, higher = weaker) by at most +/-10 points. Returns shares summing to 1.
 */
export function subjectBalance(examId: string, subjects?: readonly string[], weakness?: Record<string, number>): Record<string, number> {
  const id = examId.toLowerCase();
  const table = id.includes('neet') ? BASE_SHARES.neet! : id.includes('jee') ? BASE_SHARES.jee! : id.includes('iat') ? BASE_SHARES.iat! : undefined;
  const list = subjects ?? (table ? Object.keys(table) : []);
  if (list.length === 0) return {};
  const raw = list.map((s) => table?.[normSubject(s)] ?? 1 / list.length);
  const tot = raw.reduce((a, b) => a + b, 0);
  const base = raw.map((x) => x / tot);
  const w = list.map((s) => weakness?.[s] ?? 0);
  const mean = w.reduce((a, b) => a + b, 0) / list.length;
  const delta = w.map((x) => Math.max(-SUBJECT_TOLERANCE, Math.min(SUBJECT_TOLERANCE, 0.4 * (x - mean))));
  for (let it = 0; it < 20; it++) {
    const resid = delta.reduce((a, b) => a + b, 0);
    if (Math.abs(resid) < 1e-12) break;
    const room = delta.map((d, i) => {
      const lo = Math.max(-SUBJECT_TOLERANCE, -(base[i] as number));
      return resid > 0 ? d - lo : SUBJECT_TOLERANCE - d;
    });
    const sumRoom = room.reduce((a, b) => a + b, 0);
    if (sumRoom <= 1e-12) break;
    for (let i = 0; i < delta.length; i++) delta[i] = (delta[i] as number) - (resid * (room[i] as number)) / sumRoom;
  }
  const out: Record<string, number> = {};
  list.forEach((s, i) => (out[s] = Math.max(0, (base[i] as number) + (delta[i] as number))));
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(out)) out[k] = (out[k] as number) / sum;
  return out;
}

interface Stat {
  id: string;
  meta: PlannerTopicMeta;
  n: number;
  m: number;
  R: number;
  e: number;
  errTotal: number;
  wn: number;
  pi: number;
  due: boolean;
}

const r1 = (x: number): number => Math.round(x * 10) / 10;
/** typical practice target used to value information gain */
const PRACTICE_P = 0.65;
const dayMs = (date: string): number => dayNumber(date) * 86_400_000 + 43_200_000;

function targetP(phase: PhaseDef, bucket: Bucket): number {
  const t = phase.targetP;
  if (t === 'exam' || t === null) return 0.55;
  return bucket === 'new' ? t[1] : bucket === 'weak' ? t[0] : (t[0] + t[1]) / 2;
}

function findDay(input: PlanInput): ScheduleDay {
  const d = input.schedule.find((x) => x.date === input.date);
  if (d) return d;
  return { date: input.date, daysLeft: 0, kind: 'work', phase: input.phase.id, capacityMin: input.capacityMin ?? 0 };
}

function computeStats(input: PlanInput, daysLeft: number, weights: PriorityWeights, cfg: PlannerConfig): Stat[] {
  const scope = input.examsTopics ?? Object.keys(input.topicMeta);
  const ids = scope.filter((id) => input.topicMeta[id]).sort();
  const maxW = Math.max(1e-9, ...ids.map((id) => (input.topicMeta[id] as PlannerTopicMeta).weight));
  const now = dayMs(input.date);
  const fix = new Set(input.fixList ?? []);
  return ids.map((id) => {
    const meta = input.topicMeta[id] as PlannerTopicMeta;
    const t = input.mastery[id];
    const n = t?.n ?? 0;
    const m = t && n > 0 ? (cfg.recallModel === 'learned' ? predictRecall(t, 0, now, { model: 'learned' }) : masteryProb(t.θ)) : 0.5;
    let R = 1;
    let due = false;
    if (t && n > 0) {
      const card = cardFromParts(t);
      R = retrievability(card, now);
      due = R < 0.95 && isDue(card, now, daysLeft);
    }
    const errTotal = t ? Object.values(t.err_mix).reduce<number>((a, b) => a + (b ?? 0), 0) : 0;
    const e = n > 0 ? Math.min(1, errTotal / n) : 0;
    const isFix = fix.has(id) || (t?.err_mix.concept_gap ?? 0) + (t?.err_mix.silly_mistake ?? 0) >= 3;
    const rdn = t && n > 0 ? t.rd : 1;
    const s = Math.min(1, (input.seenRecently?.[id] ?? 0) / 20);
    const wn = meta.weight / maxW;
    let pi: number;
    if (cfg.priorityMode === 'uncertainty') {
      const on = (k: UncertaintySignal): number => (cfg.signals?.[k] === false ? 0 : 1);
      const w = on('examWeight') ? wn : 1;
      const eig = expectedInfoGain(rdn, PRACTICE_P);
      pi = w * (on('weakness') * weights.alpha * (1 - m) + on('infoGain') * weights.gamma * eig + on('forgetting') * weights.beta * (1 - R)) + weights.delta * e + weights.epsilon * (isFix ? 1 : 0) - weights.zeta * s;
    } else {
      pi = weights.alpha * wn * (1 - m) + weights.beta * (1 - R) + weights.gamma * rdn + weights.delta * e + weights.epsilon * (isFix ? 1 : 0) - weights.zeta * s;
    }
    return { id, meta, n, m, R, e, errTotal, wn, pi, due };
  });
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function triage(stats: Stat[], input: PlanInput, daysLeft: number, cfg: PlannerConfig): TriagedTopic[] {
  if (daysLeft > cfg.triageFromDays || daysLeft <= 2 || stats.length === 0) return [];
  const skip = new Set(input.unskipped ?? []);
  const sorted = [...stats].sort((a, b) => a.wn - b.wn || (a.id < b.id ? -1 : 1));
  const thr = sorted[Math.max(0, Math.floor(sorted.length * cfg.triageWeightQuantile) - 1)]!.wn;
  const totalW = stats.reduce((a, s) => a + s.meta.weight, 0) || 1;
  const cands = sorted.filter((s) => s.wn <= thr && (s.n > 0 ? s.m : 0) < cfg.triageMastery && !skip.has(s.id));
  const max = Math.floor(stats.length * cfg.triageMaxShare);
  return cands.slice(0, max).map((s) => ({
    topic: s.id,
    chapter: s.meta.chapter,
    reason:
      `Skipping ${s.id} for now: it is worth about ${pct(s.meta.weight / totalW)} of the paper and ` +
      `${s.n > 0 ? `your mastery is only ${pct(s.m)}` : 'you have not started it'}, with ${daysLeft} days left. ` +
      `Your time goes further on higher-weight topics. You can add it back any time.`,
  }));
}

function task(partial: Omit<Task, 'id' | 'status'>): Task {
  return { id: '', status: 'todo', ...partial };
}

function gumbelTopK(items: Stat[], k: number, tau: number, rng: Rng): Stat[] {
  const keyed = items.map((s) => ({ s, key: s.pi / tau + gumbel(rng) }));
  keyed.sort((a, b) => b.key - a.key || (a.s.id < b.s.id ? -1 : 1));
  return keyed.slice(0, k).map((x) => x.s);
}

function emptyPlan(input: PlanInput, day: ScheduleDay, cap: number, extra: Partial<DayPlan> = {}): DayPlan {
  return {
    date: input.date,
    phase: input.phase.id,
    dayKind: day.kind,
    daysLeft: day.daysLeft,
    capacityMin: cap,
    budgetMin: 0,
    plannedMin: 0,
    loadMin: null,
    tasks: [],
    triaged: [],
    warnings: [],
    ...extra,
  };
}

export function planDay(input: PlanInput): DayPlan {
  const cfg: PlannerConfig = { ...DEFAULT_PLANNER_CONFIG, ...input.config };
  if (input.mockMinutes !== undefined && input.mockMinutes > 0) cfg.mockMin = Math.round(input.mockMinutes) + cfg.mockAnalysisMin;
  if (input.mockQuestions !== undefined && input.mockQuestions > 0) cfg.mockItems = Math.round(input.mockQuestions);
  const day = findDay(input);
  const cap = Math.max(0, Math.floor(input.capacityMin ?? day.capacityMin));
  const warnings: string[] = day.warning ? [day.warning] : [];

  if (day.kind === 'off' || cap <= 0) {
    return emptyPlan(input, day, cap, { warnings: ['Rest day: nothing planned.'] });
  }

  const weights = (cfg.weights ?? PRIORITY_WEIGHTS)[input.phase.id];
  const stats = computeStats(input, day.daysLeft, weights, cfg);
  const triaged = triage(stats, input, day.daysLeft, cfg);
  const skipped = new Set(triaged.map((t) => t.topic));
  const live = stats.filter((s) => !skipped.has(s.id));
  const byId = new Map(stats.map((s) => [s.id, s]));
  const rng = mulberry32(hashSeed(input.seed, input.date));
  const fu = Math.max(0, Math.min(FU_MAX, input.fu));
  const wanted = Math.min(cap, Math.floor(cap * fu));

  const tasks: Task[] = [];
  const used = new Set<string>();
  const tmin = (id: string): number => (byId.get(id)?.meta.tMinPerItem ?? 3) || 3;
  const total = (): number => tasks.reduce((a, t) => a + t.est_min, 0);
  const mk = (s: Stat, kind: Task['kind'], items: number, bucket: Bucket | undefined, extra: Partial<Task> = {}): Task =>
    task({
      kind,
      topic: s.id,
      chapter: s.meta.chapter,
      subject: s.meta.subject,
      items,
      est_min: r1(items * s.meta.tMinPerItem),
      priority: Math.round(s.pi * 1000) / 1000,
      ...(bucket ? { bucket, target_p: targetP(input.phase, bucket) } : {}),
      m_at_plan: Math.round(s.m * 1000) / 1000,
      ...extra,
    });

  const finish = (budget: number, loadMin: number | null, extra: Partial<DayPlan> = {}): DayPlan => {
    // hard cap: never above stated capacity
    while (total() > cap + 1e-9 && tasks.length > 0) {
      const t = tasks[tasks.length - 1] as Task;
      if (t.kind === 'mock') break;
      tasks.pop();
    }
    const ordered = orderTasks(tasks);
    ordered.forEach((t, i) => (t.id = `${input.date}#${i + 1}`));
    const planned = Math.round(ordered.reduce((a, t) => a + t.est_min, 0) * 1e6) / 1e6;
    return {
      date: input.date,
      phase: input.phase.id,
      dayKind: day.kind,
      daysLeft: day.daysLeft,
      capacityMin: cap,
      budgetMin: Math.round(budget),
      plannedMin: planned,
      loadMin: loadMin === null ? null : planned,
      tasks: ordered,
      triaged,
      warnings,
      ...(day.offDayOverridden ? { sprintOverride: true as const } : {}),
      ...extra,
    };
  };

  // ---- buffer day: light review only
  if (day.kind === 'buffer') {
    const ceil = cfg.bufferCap * wanted;
    const pool = live.filter((s) => s.n > 0).sort((a, b) => a.R - b.R || (a.id < b.id ? -1 : 1));
    for (const s of pool) {
      const est = r1(cfg.lightItems * s.meta.tMinPerItem);
      if (total() + est > ceil + 1e-9) break;
      tasks.push(mk(s, 'light_review', cfg.lightItems, undefined, { target_p: 0.8 }));
    }
    warnings.push('Buffer day: light review only. Spare capacity is kept for catching up.');
    return finish(ceil, null);
  }

  // ---- taper: own mistakes only
  if (day.kind === 'taper') {
    const ceil = cfg.taperShare * wanted;
    const pool = live.filter((s) => s.errTotal > 0 && s.n > 0).sort((a, b) => b.pi - a.pi || (a.id < b.id ? -1 : 1));
    const per = Math.max(cfg.minItemsPerTask, Math.min(cfg.lightItems * 2, 8));
    for (const s of pool) {
      const est = r1(per * s.meta.tMinPerItem);
      if (total() + est > ceil + 1e-9) break;
      tasks.push(mk(s, 'practice', per, 'weak'));
    }
    warnings.push('Taper: only your own past mistakes, nothing new.');
    return finish(ceil, null);
  }

  // ---- mock (+ analysis)
  const isMockDay = (day.kind === 'mock' || day.kind === 'sprint_mock') && cap >= cfg.mockMin;
  const backlogMock = (input.backlog ?? []).find((t) => t.kind === 'mock');
  const carryMock = !isMockDay && backlogMock !== undefined && cap >= cfg.mockMin + 60;
  let mockDay = false;
  if (isMockDay || carryMock) {
    mockDay = true;
    const mockMin = cfg.mockMin - cfg.mockAnalysisMin;
    tasks.push(
      task({
        kind: 'mock',
        topic: 'mock',
        chapter: '',
        subject: '',
        items: cfg.mockItems,
        est_min: mockMin,
        priority: 10,
        target_p: 0.55,
        ...(carryMock && backlogMock?.carried_from ? { carried_from: backlogMock.carried_from } : carryMock ? { carried_from: input.date } : {}),
      }),
      task({ kind: 'review', topic: 'mock_analysis', chapter: '', subject: '', items: 0, est_min: cfg.mockAnalysisMin, priority: 9 }),
    );
  } else if (day.kind === 'sprint_mock' || day.kind === 'mock') {
    warnings.push(`A full mock needs ${cfg.mockMin} minutes and you have ${cap}: no mock today, regular practice instead.`);
  }

  // ---- budget with the +/-15% rule
  let ceil: number;
  let loadExempt = mockDay;
  if (mockDay) {
    ceil = Math.max(0, wanted - cfg.mockMin);
  } else {
    ceil = wanted;
    const prev = input.prevLoadMin;
    if (prev !== undefined && prev > 0 && prev < LOAD_RULE_FLOOR_MIN) {
      // a day this light is not a load worth protecting: allow ramping up to the floor's +15%
      ceil = Math.min(cap, limitLoadChange(LOAD_RULE_FLOOR_MIN, wanted));
    } else if (prev !== undefined && prev > 0) {
      const lower = prev * (1 - 0.15);
      const upper = prev * 1.15;
      let target = limitLoadChange(prev, wanted);
      const maxT = Math.max(...live.map((s) => s.meta.tMinPerItem), 3);
      // keep quantisation from pushing the realised load below the -15% floor
      if (target < upper && target - maxT < lower) target = Math.min(upper, lower + maxT, cap);
      ceil = Math.min(cap, target);
    }
    loadExempt = false;
  }
  if (loadExempt) warnings.push('Mock day: load differs from usual by design.');
  const budget = ceil;

  const spent = (): number => total() - tasks.filter((t) => t.kind === 'mock' || t.topic === 'mock_analysis').reduce((a, t) => a + t.est_min, 0);

  // ---- mini diagnostic
  if (input.miniDiagnostic) {
    const items = 12;
    const est = r1(Math.min(items * 3, cfg.fsrsCap * ceil));
    if (est > 0) tasks.push(task({ kind: 'diagnostic', topic: 'diagnostic', chapter: '', subject: '', items: Math.max(1, Math.floor(est / 3)), est_min: r1(Math.floor(est / 3) * 3), priority: 8 }));
  }

  // ---- fsrs_due (cap 25% of budget)
  const fsrsCap = cfg.fsrsCap * ceil;
  const due = live.filter((s) => s.due).sort((a, b) => a.R - b.R || (a.id < b.id ? -1 : 1));
  let fsrsMin = 0;
  for (const s of due) {
    const est = r1(cfg.fsrsItems * s.meta.tMinPerItem);
    if (fsrsMin + est > fsrsCap + 1e-9 || spent() + est > ceil + 1e-9) break;
    tasks.push(mk(s, 'fsrs_due', cfg.fsrsItems, undefined, { target_p: 0.85 }));
    used.add(s.id);
    fsrsMin += est;
  }

  // ---- carry-over (cap 30% of budget)
  const carryCap = cfg.carryCap * ceil;
  let carryMin = 0;
  const carryList = [...(input.backlog ?? [])].filter((t) => t.kind !== 'mock').sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1));
  for (const t of carryList) {
    const per = t.items > 0 ? t.est_min / t.items : 0;
    if (per <= 0) continue;
    const roomHere = Math.min(carryCap - carryMin, ceil - spent());
    const items = Math.min(t.items, Math.floor((roomHere + 1e-9) / per));
    if (items < Math.min(2, t.items)) continue;
    const est = r1(items * per);
    tasks.push({ ...t, items, est_min: est, status: 'todo', carried_from: t.carried_from ?? input.date });
    carryMin += est;
  }

  // ---- phase mix buckets
  const eligible = (b: Bucket, s: Stat): boolean =>
    !used.has(s.id) &&
    (b === 'new' ? s.n === 0 : b === 'weak' ? s.n > 0 && (s.m < cfg.weakMastery || s.e > 0.3) : s.n > 0);
  const mix = { ...input.phase.mix };
  if (mix.new > 0 && cfg.coverageItems > 0) {
    const unseen = live.filter((s) => s.n === 0);
    const needed = unseen.reduce((a, s) => a + cfg.coverageItems * s.meta.tMinPerItem, 0);
    const available = Math.max(1, day.daysLeft - 30) * cap * Math.min(1, fu) * 0.75;
    const share = Math.min(cfg.coverageMaxShare * 100, Math.max(mix.new, (100 * needed) / available));
    if (share > mix.new) {
      const others = mix.weak + mix.review + mix.mixed;
      const scale = others > 0 ? (100 - share) / others : 0;
      mix.weak *= scale;
      mix.review *= scale;
      mix.mixed *= scale;
      mix.new = share;
    }
  }
  const order: Bucket[] = ['weak', 'new', 'review', 'mixed'];
  const present = order.filter((b) => mix[b] > 0 && live.some((s) => eligible(b, s)));
  const mixTotal = present.reduce((a, b) => a + mix[b], 0);

  const weakness: Record<string, number> = {};
  {
    const acc: Record<string, { w: number; x: number }> = {};
    for (const s of live) {
      const a = (acc[s.meta.subject] ??= { w: 0, x: 0 });
      a.w += s.meta.weight;
      a.x += s.meta.weight * (1 - s.m);
    }
    for (const [k, v] of Object.entries(acc)) weakness[k] = v.w > 0 ? v.x / v.w : 0;
  }

  const pool = Math.max(0, ceil - spent());
  // minutes that did not fit a whole task of a bucket/subject slot roll forward to the next slot
  let slack = 0;
  const fill = (bucket: Bucket, minutes: number): void => {
    const elig = live.filter((s) => eligible(bucket, s));
    const bySubject = new Map<string, Stat[]>();
    for (const s of elig) (bySubject.get(s.meta.subject) ?? bySubject.set(s.meta.subject, []).get(s.meta.subject)!).push(s);
    const subjects = [...bySubject.keys()].sort();
    const shares = subjectBalance(input.examId, subjects, weakness);
    const kind = bucket === 'review' ? 'review' : 'practice';
    for (const subj of subjects) {
      const list = (bySubject.get(subj) as Stat[]).map((s) => (bucket === 'review' ? { ...s, pi: s.pi + cfg.reviewBoost * (1 - s.R) } : s));
      const subjMin = minutes * (shares[subj] ?? 0) + slack;
      slack = 0;
      const avg = list.reduce((a, s) => a + s.meta.tMinPerItem, 0) / list.length;
      const k = Math.max(1, Math.min(cfg.maxPerSubject, list.length, Math.floor(subjMin / (cfg.minItemsPerTask * avg))));
      const picked = gumbelTopK(list, k, weights.tau, rng);
      const top = Math.max(...picked.map((s) => s.pi));
      const w = picked.map((s) => Math.exp((s.pi - top) / weights.tau));
      const ws = w.reduce((a, b) => a + b, 0);
      picked.forEach((s, i) => {
        const mins = (subjMin * (w[i] as number)) / ws;
        const items = Math.min(cfg.maxItemsPerTask, Math.floor(mins / s.meta.tMinPerItem));
        const est = r1(items * s.meta.tMinPerItem);
        if (items < cfg.minItemsPerTask || spent() + est > ceil + 1e-9) {
          slack += mins;
          return;
        }
        tasks.push(mk(s, kind, items, bucket));
        used.add(s.id);
        slack += mins - est;
      });
    }
  };
  for (const b of order) {
    if (!present.includes(b)) continue;
    fill(b, (pool * mix[b]) / mixTotal);
  }

  // ---- top-up: add single items to practice/review tasks until the budget is used
  const growable = (): Task[] =>
    tasks
      .filter((t) => (t.kind === 'practice' || t.kind === 'review') && t.bucket !== undefined && t.carried_from === undefined && t.items > 0 && t.items < cfg.maxItemsPerTask)
      .sort((a, b) => b.priority - a.priority || (a.topic < b.topic ? -1 : 1));
  for (let guard = 0; guard < 2000; guard++) {
    const g = growable();
    let grew = false;
    for (const t of g) {
      const next = r1((t.items + 1) * tmin(t.topic));
      const delta = next - t.est_min;
      if (spent() + delta > ceil + 1e-9 || total() + delta > cap + 1e-9) continue;
      t.items += 1;
      t.est_min = next;
      grew = true;
    }
    if (!grew) break;
  }

  return finish(budget, mockDay ? null : spent());
}

/** warm-up -> hardest weak -> new -> mixed -> light review (fsrs_due / review last). Mock + analysis lead on mock days. */
function orderTasks(tasks: Task[]): Task[] {
  const warmCandidates = tasks.filter((t) => (t.kind === 'review' || t.kind === 'fsrs_due' || t.kind === 'practice') && t.bucket !== 'weak' && t.topic !== 'mock_analysis' && t.items > 0 && t.carried_from === undefined);
  if (tasks.length >= 3 && warmCandidates.length > 0) {
    const best = [...warmCandidates].sort((a, b) => (b.m_at_plan ?? 0) - (a.m_at_plan ?? 0) || (a.topic < b.topic ? -1 : 1))[0] as Task;
    if ((best.m_at_plan ?? 0) >= 0.5) best.warmup = true;
  }
  const rank = (t: Task): number => {
    if (t.kind === 'mock') return 0;
    if (t.topic === 'mock_analysis') return 1;
    if (t.kind === 'diagnostic') return 1.5;
    if (t.warmup) return 2;
    if (t.kind === 'fsrs_due' || t.kind === 'light_review') return 7;
    if (t.bucket === 'weak') return 3;
    if (t.bucket === 'new') return 4;
    if (t.bucket === 'review') return 6;
    return 5;
  };
  return [...tasks].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    if (rank(a) === 3) return (a.m_at_plan ?? 0) - (b.m_at_plan ?? 0) || (a.topic < b.topic ? -1 : 1);
    return b.priority - a.priority || (a.topic < b.topic ? -1 : 1);
  });
}

export interface HorizonInput extends Omit<PlanInput, 'phase'> {
  /** Phase lookup is per scheduled day (by the schedule's phase id). */
  phases?: readonly PhaseDef[];
}

/**
 * Rolling horizon: plan `days` days from `input.date`. Only today's plan should be committed; later days are
 * previews that change as mastery and backlog change. Load rule chains across the days; planned items count as
 * "seen recently" so topics rotate.
 */
export function planHorizon(input: HorizonInput, days = 7): DayPlan[] {
  const phases = input.phases ?? input.config?.phases ?? DEFAULT_PHASES;
  const out: DayPlan[] = [];
  let prev = input.prevLoadMin;
  const seen: Record<string, number> = { ...(input.seenRecently ?? {}) };
  for (let i = 0; i < days; i++) {
    const date = addDays(input.date, i);
    const day = input.schedule.find((d) => d.date === date);
    if (!day) break;
    const phase = phases.find((p) => p.id === day.phase) ?? DEFAULT_PHASES[0]!;
    const plan = planDay({
      ...input,
      date,
      phase,
      seenRecently: seen,
      ...(i === 0 ? {} : { backlog: [], miniDiagnostic: false }),
      ...(prev !== undefined ? { prevLoadMin: prev } : {}),
    });
    if (plan.loadMin !== null) prev = plan.loadMin;
    for (const t of plan.tasks) if (t.topic && t.items > 0) seen[t.topic] = (seen[t.topic] ?? 0) + t.items;
    out.push(plan);
  }
  return out;
}
