/** 5.11 validation harness: synthetic students, policy comparison on predicted exam-day score gain. */
import { logit } from './util';
import { applySession, emptyMastery, type MasteryDoc } from '../measure/mastery';
import { cardFromParts, retrievability } from '../measure/fsrs';
import { predictRecall } from '../measure/learned';
import { sigmoid } from '../measure/elo';
import type { Attempt } from '../measure/labels';
import { updateFu } from '../plan/pace';
import { addDays } from '../plan/calendar';
import { buildSchedule, type ScheduleDay } from '../plan/schedule';
import type { Question } from '../question';
import { chapterOrderPolicy, difficultyOnlyPolicy, fixedRoundRobinPolicy, plannerPolicy, randomPolicy, weakestFirstPolicy, type Policy, type PolicyContext, type SimTask } from './policies';
import { hashSeed, mulberry32, normal } from './rng';
import { simulateStudent, type SimStudent } from './student';
import { expectedScore, makeWorld, type SimTopic, type SimWorld } from './world';

export interface SimConfig {
  students: number;
  /** index of the first student (lets callers run batches and concatenate) */
  firstStudent?: number;
  days: number;
  seed?: number;
  policies?: readonly Policy[];
  world?: SimWorld;
  /** minutes on weekdays / Saturdays; Sunday is the off-day */
  weekdayMin?: number;
  saturdayMin?: number;
  examId?: string;
  startDate?: string;
  /** Receives every answered item (the anonymous attempt table + learner-state snapshot), for model training. */
  onAttempt?: (row: SimAttemptRow) => void;
}

/** One answered item: docs/03 attempt table columns + sim-only columns (sid, policy, pre-session snapshot). */
export interface SimAttemptRow {
  sid: number;
  policy: string;
  day_idx: number;
  topic: string;
  qid: string;
  difficulty_b: number;
  correct: 0 | 1;
  time_ms: number;
  hint_used: 0 | 1;
  prior_n_topic: number;
  days_since_last_topic: number;
  elo_theta: number;
  elo_rd: number;
  elo_n: number;
  fsrs_r: number;
  fsrs_s: number;
  fsrs_d: number;
  err_rate: number;
  k_in_session: number;
  /** true P(correct) of the synthetic student (never a model input; for diagnostics only) */
  p_true: number;
}

export const SIM_ATTEMPT_COLUMNS = [
  'sid', 'policy', 'day_idx', 'topic', 'qid', 'difficulty_b', 'correct', 'time_ms', 'hint_used', 'prior_n_topic', 'days_since_last_topic',
  'elo_theta', 'elo_rd', 'elo_n', 'fsrs_r', 'fsrs_s', 'fsrs_d', 'err_rate', 'k_in_session', 'p_true',
] as const;

export interface StudentRun {
  /** predicted exam-day score gain (true ability, blueprint paper) */
  gain: number;
  start: number;
  end: number;
  /** exam-weighted mean memory retention at exam day over practised topics */
  retention: number;
  /** practice minutes on items with true P > 0.9 or < 0.2 (mocks excluded) */
  wastedMin: number;
  /** mean over days of (expected score - start): area under the score curve per day */
  aumc: number;
  /** practice minutes actually done (mocks excluded) */
  practiceMin: number;
}

export const METRICS = ['gain', 'retention', 'wastedMin', 'aumc', 'practiceMin'] as const;
export type MetricName = (typeof METRICS)[number];

export interface SimResult {
  policies: string[];
  /** per policy, gain per student (index-aligned across policies = paired) */
  gains: Record<string, number[]>;
  /** per policy, per metric, value per student (index-aligned) */
  metrics: Record<string, Record<MetricName, number[]>>;
}

const DAY_MS = 86_400_000;
const MOCK_MIN = 210;
const MOCK_ITEMS = 60;

function pickItem(topic: SimTopic, bTarget: number, rng: () => number): number {
  const bank = topic.bank;
  let lo = 0;
  let hi = bank.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((bank[mid] as number) < bTarget) lo = mid + 1;
    else hi = mid;
  }
  const j = Math.max(0, Math.min(bank.length - 1, lo + Math.floor(rng() * 5) - 2));
  return j;
}

/** Item whose model-predicted P is closest to the target (ties and near-ties jittered like pickItem). */
function pickItemByModel(topic: SimTopic, targetP: number, p: (b: number) => number, rng: () => number): number {
  let best = 0;
  let bestD = Infinity;
  topic.bank.forEach((b, j) => {
    const d = Math.abs(p(b) - targetP) + rng() * 0.03;
    if (d < bestD) {
      bestD = d;
      best = j;
    }
  });
  return best;
}

export function simulatePolicy(
  policy: Policy,
  studentIdx: number,
  cfg: Required<Pick<SimConfig, 'days' | 'seed' | 'examId'>> & { world: SimWorld; schedule: ScheduleDay[]; startDate: string; onAttempt?: SimConfig['onAttempt'] },
): StudentRun {
  const { world, schedule, startDate } = cfg;
  // student parameters depend on (seed, student) only: identical across policies (paired design)
  const prng = mulberry32(hashSeed(cfg.seed, 'student', studentIdx));
  const ability = Object.fromEntries(world.subjects.map((s) => [s, -0.3 + 0.6 * normal(prng)]));
  const trueTheta: Record<string, number> = {};
  for (const t of world.topics) trueTheta[t.id] = (ability[t.subject] as number) - 0.4 + 0.7 * normal(prng);
  const learningRate = 0.015 + 0.02 * prng();
  const forgetting = 7 + 10 * prng();
  const completion = Array.from({ length: cfg.days }, () => Math.max(0.5, Math.min(1, 0.88 + 0.1 * normal(prng))));
  const student: SimStudent = simulateStudent({ trueTheta, learningRate, forgetting, seed: hashSeed(cfg.seed, 'answers', studentIdx, policy.name) });
  const start = expectedScore(world, (id) => student.thetaAt(id, 0));

  const rng = mulberry32(hashSeed(cfg.seed, 'policy', studentIdx, policy.name));
  const inst = policy.start(world, schedule);
  let mastery: MasteryDoc = emptyMastery();
  let ewma: number | null = null;
  let fu = 1;
  const epoch = Date.parse(`${startDate}T09:00:00Z`);

  const attempts: Attempt[] = [];
  const used = new Map<string, Question>();
  let wastedMin = 0;
  let practiceMin = 0;
  let aumcSum = 0;
  const priorN = new Map<string, number>();
  const lastDay = new Map<string, number>();
  const kToday = new Map<string, number>();
  /** topics practised today; `lastDay` is updated at day end so days_since_last_topic matches the pre-session mastery doc */
  const touchedToday = new Set<string>();
  const emit = cfg.onAttempt;
  const run = (day: number, topic: SimTopic, items: number, targetP: number | null, isMock = false): void => {
    const est = mastery[topic.id];
    const thetaEst = est && est.n > 0 ? est.θ : 0;
    const bs: number[] = [];
    const qs: Question[] = [];
    const k0 = kToday.get(topic.id) ?? 0;
    for (let i = 0; i < items; i++) {
      const j =
        targetP === null
          ? Math.floor(rng() * topic.bank.length)
          : policy.recall === 'learned'
            ? pickItemByModel(topic, targetP, (b) => predictRecall(est, b, epoch + day * DAY_MS, { model: 'learned', kInSession: k0 + i }), rng)
            : pickItem(topic, thetaEst - logit(targetP), rng);
      bs.push(topic.bank[j] as number);
      qs.push(topic.questions[j] as Question);
    }
    const out = student.practice(topic.id, day, bs);
    let snap: Omit<SimAttemptRow, 'day_idx' | 'topic' | 'qid' | 'difficulty_b' | 'correct' | 'time_ms' | 'hint_used' | 'prior_n_topic' | 'days_since_last_topic' | 'k_in_session' | 'p_true'> | undefined;
    if (emit) {
      const t = mastery[topic.id];
      const now = epoch + day * DAY_MS;
      const seen = t !== undefined && t.n > 0;
      const err = t ? Object.values(t.err_mix).reduce<number>((a, b) => a + (b ?? 0), 0) : 0;
      snap = {
        sid: studentIdx,
        policy: policy.name,
        elo_theta: t?.θ ?? 0,
        elo_rd: t?.rd ?? 1,
        elo_n: t?.n ?? 0,
        fsrs_r: seen ? retrievability(cardFromParts(t), now) : 1,
        fsrs_s: seen ? t.S : 0,
        fsrs_d: seen ? t.D : 0,
        err_rate: seen ? Math.min(1, err / t.n) : 0,
      };
    }
    out.forEach((o, i) => {
      const q = qs[i] as Question;
      used.set(q.id, q);
      if (!isMock) {
        practiceMin += topic.tMinPerItem;
        if (o.p > 0.9 || o.p < 0.2) wastedMin += topic.tMinPerItem;
      }
      const timeMs = 60_000 * (o.correct ? 0.6 + 0.8 * rng() : 0.3 + 1.9 * rng());
      if (emit && snap) {
        const pn = priorN.get(topic.id) ?? 0;
        const last = lastDay.get(topic.id);
        const k = kToday.get(topic.id) ?? 0;
        emit({
          ...snap,
          day_idx: day,
          topic: topic.id,
          qid: q.id,
          difficulty_b: Math.round(o.b * 1000) / 1000,
          correct: o.correct ? 1 : 0,
          time_ms: Math.round(timeMs),
          hint_used: 0,
          prior_n_topic: pn,
          days_since_last_topic: last === undefined ? -1 : day - last,
          k_in_session: k,
          p_true: o.p,
        });
        priorN.set(topic.id, pn + 1);
      }
      kToday.set(topic.id, (kToday.get(topic.id) ?? 0) + 1);
      attempts.push({
        q: q.id,
        r: o.correct ? 1 : 0,
        b: o.b,
        correct: o.correct,
        timeMs,
        medianTimeMs: 60_000,
        pCorrect: sigmoid(-o.b),
        changedCorrectToWrong: false,
        skipped: false,
      });
    });
    if (items > 0) touchedToday.add(topic.id);
    inst.noteSeen?.(day, topic.id, items);
  };

  for (let day = 0; day < cfg.days; day++) {
    if (day > 0) aumcSum += expectedScore(world, (id) => student.thetaAt(id, day)) - start;
    const sched = schedule[day] as ScheduleDay;
    kToday.clear();
    if (sched.kind === 'off' || sched.capacityMin <= 0) continue;
    const date = addDays(startDate, day);
    const cap = sched.capacityMin;
    const wanted = Math.floor(cap * fu);
    const mockDay = (sched.kind === 'mock' || sched.kind === 'sprint_mock') && cap >= MOCK_MIN;
    const budgetMin = mockDay ? Math.max(0, wanted - MOCK_MIN) : wanted;
    const ctx: PolicyContext = { day, date, schedule, sched, budgetMin, fu, mastery, world, rng, seed: cfg.seed, examId: cfg.examId };
    const tasks: SimTask[] = inst.plan(ctx);
    const planned = tasks.reduce((a, t) => a + t.items * (world.byId[t.topic] as SimTopic).tMinPerItem, 0) + (mockDay ? MOCK_MIN : 0);
    let doneLeft = completion[day]! * planned - (mockDay ? MOCK_MIN : 0);
    attempts.length = 0;
    used.clear();
    if (mockDay) {
      // identical mock for every policy: blueprint-weighted topics, unadaptive difficulty
      const cum: number[] = [];
      world.topics.reduce((a, t, i) => (cum[i] = a + t.weight), 0);
      const byTopic = new Map<string, number>();
      for (let i = 0; i < MOCK_ITEMS; i++) {
        const u = rng() * (cum[cum.length - 1] as number);
        const idx = cum.findIndex((c) => c >= u);
        const id = world.topics[Math.max(0, idx)]!.id;
        byTopic.set(id, (byTopic.get(id) ?? 0) + 1);
      }
      for (const [id, n] of byTopic) run(day, world.byId[id] as SimTopic, n, null, true);
    }
    const undone: SimTask[] = [];
    let doneMin = mockDay ? MOCK_MIN : 0;
    for (const t of tasks) {
      const topic = world.byId[t.topic] as SimTopic;
      const items = Math.max(0, Math.min(t.items, Math.floor(doneLeft / topic.tMinPerItem)));
      if (items > 0) run(day, topic, items, t.targetP ?? 0.65);
      doneLeft -= items * topic.tMinPerItem;
      doneMin += items * topic.tMinPerItem;
      if (items < t.items) undone.push({ ...t, items: t.items - items });
    }
    inst.missed(ctx, undone);
    if (attempts.length > 0) mastery = applySession(mastery, attempts, [...used.values()], epoch + day * DAY_MS);
    for (const id of touchedToday) lastDay.set(id, day);
    touchedToday.clear();
    ({ ewma, fu } = updateFu(ewma, doneMin, planned));
  }
  const end = expectedScore(world, (id) => student.thetaAt(id, cfg.days));
  aumcSum += end - start;
  let rw = 0;
  let rs = 0;
  for (const t of world.topics) {
    if (student.exposures(t.id) === 0) continue;
    rw += t.weight;
    rs += t.weight * student.retentionAt(t.id, cfg.days);
  }
  return { gain: end - start, start, end, retention: rw > 0 ? rs / rw : 0, wastedMin, aumc: aumcSum / Math.max(1, cfg.days), practiceMin };
}

/** Every policy the study compares (baselines + the product planner). */
export function allPolicies(): Policy[] {
  return [randomPolicy, fixedRoundRobinPolicy, difficultyOnlyPolicy, weakestFirstPolicy, chapterOrderPolicy, plannerPolicy()];
}

/** Run every policy over the same synthetic students. */
export function runSim(config: SimConfig): SimResult {
  const seed = config.seed ?? 1;
  const world = config.world ?? makeWorld();
  const startDate = config.startDate ?? '2026-01-05';
  const wk = config.weekdayMin ?? 180;
  const sat = config.saturdayMin ?? 240;
  const schedule = buildSchedule({
    today: startDate,
    examDate: addDays(startDate, config.days),
    minutesPerWeekday: { 0: 0, 1: wk, 2: wk, 3: wk, 4: wk, 5: wk, 6: sat },
    offDay: 0,
  });
  const policies = config.policies ?? [plannerPolicy(), randomPolicy, chapterOrderPolicy];
  const gains: Record<string, number[]> = {};
  const metrics: Record<string, Record<MetricName, number[]>> = {};
  for (const p of policies) {
    gains[p.name] = [];
    metrics[p.name] = Object.fromEntries(METRICS.map((m) => [m, [] as number[]])) as Record<MetricName, number[]>;
  }
  const base = { days: config.days, seed, examId: config.examId ?? 'jee', world, schedule, startDate, ...(config.onAttempt ? { onAttempt: config.onAttempt } : {}) };
  const first = config.firstStudent ?? 0;
  for (let i = first; i < first + config.students; i++) {
    for (const p of policies) {
      const r = simulatePolicy(p, i, base);
      (gains[p.name] as number[]).push(r.gain);
      const pm = metrics[p.name] as Record<MetricName, number[]>;
      for (const m of METRICS) pm[m].push(r[m]);
    }
  }
  return { policies: policies.map((p) => p.name), gains, metrics };
}

/** Concatenate results of batches run with different `firstStudent`. */
export function mergeResults(parts: readonly SimResult[]): SimResult {
  const policies = parts[0]?.policies ?? [];
  const gains: Record<string, number[]> = {};
  const metrics: Record<string, Record<MetricName, number[]>> = {};
  for (const p of policies) {
    gains[p] = parts.flatMap((r) => r.gains[p] as number[]);
    metrics[p] = Object.fromEntries(METRICS.map((m) => [m, parts.flatMap((r) => r.metrics?.[p]?.[m] ?? [])])) as Record<MetricName, number[]>;
  }
  return { policies, gains, metrics };
}

export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function normalCdf(z: number): number {
  // Abramowitz-Stegun 7.1.26 on erf
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

export interface PairedDiff {
  mean: number;
  se: number;
  ci95: [number, number];
  /** one-sided p-value for H1: a > b (normal approximation of the paired t-test) */
  p: number;
}

export function pairedDiff(a: readonly number[], b: readonly number[]): PairedDiff {
  const d = a.map((x, i) => x - (b[i] as number));
  const m = mean(d);
  const v = d.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, d.length - 1);
  const se = Math.sqrt(v / Math.max(1, d.length));
  const z = se > 0 ? m / se : m > 0 ? Infinity : 0;
  return { mean: m, se, ci95: [m - 1.96 * se, m + 1.96 * se], p: 1 - normalCdf(z) };
}

export interface Comparison {
  plannerGain: number;
  randomGain: number;
  chapterOrderGain: number;
  /** worse (larger) of the two one-sided paired p-values */
  pValuePaired: number;
  vsRandom: PairedDiff;
  vsChapterOrder: PairedDiff;
  /** planner > random and planner > chapterOrder, both with the 95% CI above 0 */
  passes: boolean;
  students: number;
}

export function summarize(res: SimResult): Comparison {
  const g = (name: string): number[] => res.gains[name] as number[];
  const vsRandom = pairedDiff(g('planner'), g('random'));
  const vsChapterOrder = pairedDiff(g('planner'), g('chapter_order'));
  return {
    plannerGain: mean(g('planner')),
    randomGain: mean(g('random')),
    chapterOrderGain: mean(g('chapter_order')),
    pValuePaired: Math.max(vsRandom.p, vsChapterOrder.p),
    vsRandom,
    vsChapterOrder,
    passes: vsRandom.ci95[0] > 0 && vsChapterOrder.ci95[0] > 0,
    students: g('planner').length,
  };
}

/** Gate for planner changes: planner must beat random and chapter-order practice on exam-day score gain. */
export function compareToBaselines(config: SimConfig): Comparison {
  return summarize(runSim({ ...config, policies: [plannerPolicy(), randomPolicy, chapterOrderPolicy] }));
}
