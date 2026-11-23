import { pCorrect, predictRecall, type MasteryDoc, type Question, type RecallModel, type Task, type TopicMastery } from '@kairos/core';
import { recallModel } from '../../lib/flags';
import { hashSeed, mulberry32, seededShuffle } from '../rng';
import { bandOf, bOf, isSelfCheck, RECENCY_DAYS, TARGET_P, type Band } from '../queue';

/**
 * Today's session queue. Pure: no React, no I/O.
 * The plan decides WHAT to practise (tasks: chapter + how many questions + target success rate);
 * this file picks WHICH questions, from shards the caller already loaded.
 */

const DAY_MS = 86_400_000;
export const DEFAULT_TIME_S = 120;
/** Task kinds that make up the practice session. Mocks and diagnostics are separate screens. */
export const SESSION_KINDS: ReadonlyArray<Task['kind']> = ['practice', 'review', 'fsrs_due', 'light_review'];

export const isSessionTask = (t: Task): boolean => SESSION_KINDS.includes(t.kind) && t.items > 0 && !!t.chapter;

export type ReasonLabel = 'Warm-up' | 'Weak' | 'Mixed' | 'Review due' | 'Light review' | 'Carried over';

/** Why the planner put this task in today's list, in the student's words. */
export function reasonOf(t: Task): ReasonLabel {
  if (t.warmup) return 'Warm-up';
  if (t.carried_from) return 'Carried over';
  if (t.kind === 'light_review') return 'Light review';
  if (t.kind === 'fsrs_due' || t.kind === 'review' || t.bucket === 'review') return 'Review due';
  if (t.bucket === 'weak') return 'Weak';
  return 'Mixed';
}

function rankOf(t: Task): number {
  if (t.warmup) return 0;
  if (t.bucket === 'weak') return 1;
  if (t.kind === 'light_review') return 4;
  if (t.kind === 'fsrs_due' || t.kind === 'review' || t.bucket === 'review') return 3;
  return 2;
}

/** Planner order: warm-up, hardest weak, mixed, review, light review last; higher priority first inside a group. */
export function orderTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => rankOf(a) - rankOf(b) || b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export interface BuildInput {
  tasks: readonly Task[];
  /** shards already loaded, keyed by chapter id */
  questionsByChapter: Readonly<Record<string, readonly Question[]>>;
  /** question id -> last time it was seen (epoch ms) */
  seen: Readonly<Record<string, number>>;
  mastery: MasteryDoc | null | undefined;
  now: number;
  seed: number;
  /** hard cap on questions (defaults to the plan's total items) */
  maxQuestions?: number;
  maxMinutes?: number;
  /** chapter id -> readable name, for the explanations */
  names?: Readonly<Record<string, string>>;
  /** the student's own uploaded questions are left out unless they asked for them */
  includeMine?: boolean;
  /** recall model used to pick questions near the target success rate; defaults to the app flag (Elo when off) */
  recallModel?: RecallModel;
}

export interface TodaySection {
  task: Task;
  qids: string[];
  reason: ReasonLabel;
}

export interface TodayQueue {
  queue: Question[];
  sections: TodaySection[];
  estMin: number;
  explain: string[];
}

const isMineQ = (q: Question): boolean => (q as { source?: { kind?: string } }).source?.kind === 'user' || q.id.startsWith('u_');
const timeS = (q: Question): number => q.difficulty?.median_time_s ?? DEFAULT_TIME_S;
const topicOf = (q: Question): string => q.tax?.topics?.[0] ?? q.tax?.chapter ?? '';
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Mean theta of the topics the pool touches (the task's own topic first); undefined when there is no data. */
function thetaOf(task: Task, pool: readonly Question[], mastery: MasteryDoc | null | undefined): number | undefined {
  if (!mastery) return undefined;
  const own = mastery[task.topic];
  if (own && own.n > 0) return own.θ;
  const ts: number[] = [];
  for (const q of pool) {
    const m = mastery[topicOf(q)];
    if (m && m.n > 0) ts.push(m.θ);
  }
  return ts.length ? ts.reduce((a, b) => a + b, 0) / ts.length : undefined;
}

/** The topic mastery the learned model reads: the task's own topic first, else the first topic in the pool with data. */
function topicMasteryOf(task: Task, pool: readonly Question[], mastery: MasteryDoc | null | undefined): TopicMastery | undefined {
  if (!mastery) return undefined;
  const own = mastery[task.topic];
  if (own && own.n > 0) return own;
  for (const q of pool) {
    const m = mastery[topicOf(q)];
    if (m && m.n > 0) return m;
  }
  return undefined;
}

/** Learned-model inputs for pickNear; absent means the Elo path (pCorrect on theta). */
interface Recall {
  model: RecallModel;
  tm: TopicMastery | undefined;
  now: number;
}

/** n questions: nearest to the target success rate when theta is known, else an easy -> medium -> hard spread. Seeded. */
function pickNear(pool: readonly Question[], n: number, rng: () => number, theta: number | undefined, targetP: number, recall?: Recall): Question[] {
  if (n <= 0 || pool.length === 0) return [];
  const shuffled = seededShuffle(pool, rng);
  if (theta !== undefined) {
    return shuffled
      .map((q, i) => {
        const p = recall && recall.model === 'learned' ? predictRecall(recall.tm, bOf(q), recall.now, { model: 'learned', kInSession: i }) : pCorrect(theta, bOf(q));
        return { q, s: Math.abs(p - targetP) + rng() * 0.08 };
      })
      .sort((a, b) => a.s - b.s)
      .slice(0, n)
      .map((x) => x.q);
  }
  const groups: Record<Band, Question[]> = { E: [], M: [], H: [] };
  for (const q of shuffled) groups[bandOf(q)].push(q);
  const third = Math.ceil(n / 3);
  const share: Record<Band, number> = { E: third, M: third, H: Math.max(0, n - 2 * third) };
  const out: Question[] = [];
  for (const b of ['E', 'M', 'H'] as Band[]) out.push(...groups[b].splice(0, share[b]));
  const rest = (['M', 'E', 'H'] as Band[]).flatMap((b) => groups[b]);
  while (out.length < n && rest.length) out.push(rest.shift()!);
  return out;
}

const BAND_RANK: Record<Band, number> = { E: 0, M: 1, H: 2 };
/** Easy to hard inside a section; the seeded order is kept inside each band. */
const byBand = (qs: Question[]): Question[] => [...qs].sort((a, b) => BAND_RANK[bandOf(a)] - BAND_RANK[bandOf(b)]);

/** Topics and concepts that a due review should be re-tested on: the due topic plus whatever the student saw before in it. */
function twinKeys(task: Task, pool: readonly Question[], seen: Readonly<Record<string, number>>): Set<string> {
  const keys = new Set<string>([task.topic]);
  for (const q of pool) {
    if (seen[q.id] === undefined) continue;
    if (!(q.tax?.topics ?? []).includes(task.topic) && topicOf(q) !== task.topic) continue;
    for (const k of [...(q.tax?.topics ?? []), ...(q.tax?.concepts ?? [])]) keys.add(k);
  }
  return keys;
}
const isTwin = (q: Question, keys: Set<string>): boolean => [...(q.tax?.topics ?? []), ...(q.tax?.concepts ?? [])].some((k) => keys.has(k));

const REASON_WORDS: Record<ReasonLabel, string> = {
  'Warm-up': 'an easy start to get going',
  Weak: 'a topic that needs work',
  Mixed: 'mixed practice',
  'Review due': 'due for review',
  'Light review': 'a light review',
  'Carried over': 'carried over from an earlier day',
};

export function buildTodayQueue(input: BuildInput): TodayQueue {
  const { questionsByChapter, seen, mastery, now } = input;
  const names = input.names ?? {};
  const nameOf = (c: string) => names[c] ?? c;
  const tasks = orderTasks(input.tasks.filter((t) => isSessionTask(t) && t.status === 'todo'));
  const planTotal = tasks.reduce((a, t) => a + t.items, 0);
  let remaining = Math.max(0, Math.min(input.maxQuestions ?? planTotal, planTotal));
  const cutoff = now - RECENCY_DAYS * DAY_MS;
  const isSeen = (q: Question) => (seen[q.id] ?? 0) >= cutoff && seen[q.id] !== undefined;

  const used = new Set<string>();
  const sections: TodaySection[] = [];
  const bySection: Question[][] = [];
  const explain: string[] = [];
  const notes: string[] = [];

  for (const task of tasks) {
    const name = nameOf(task.chapter);
    if (remaining <= 0) break;
    const all = questionsByChapter[task.chapter] ?? [];
    const pool = all.filter((q) => !used.has(q.id) && !isSelfCheck(q) && (input.includeMine || !isMineQ(q)));
    if (all.length === 0 || pool.length === 0) {
      notes.push(`${name} has no questions available yet, so it was skipped.`);
      continue;
    }
    const n = Math.min(task.items, remaining);
    const rng = mulberry32(hashSeed(`${input.seed}:${task.id}:${task.chapter}`));
    const theta = thetaOf(task, pool, mastery);
    const targetP = task.target_p ?? TARGET_P;
    const recall: Recall = { model: input.recallModel ?? recallModel(), tm: topicMasteryOf(task, pool, mastery), now };
    const fresh = pool.filter((q) => !isSeen(q));
    const stale = pool.filter((q) => isSeen(q)).sort((a, b) => (seen[a.id] ?? 0) - (seen[b.id] ?? 0));

    let chosen: Question[];
    let twinCount = 0;
    if (task.kind === 'fsrs_due') {
      const keys = twinKeys(task, all, seen);
      const twins = pickNear(fresh.filter((q) => isTwin(q, keys)), n, rng, theta, targetP, recall);
      twinCount = twins.length;
      const ids = new Set(twins.map((q) => q.id));
      chosen = [...twins, ...pickNear(fresh.filter((q) => !ids.has(q.id)), n - twins.length, rng, theta, targetP, recall)];
    } else chosen = pickNear(fresh, n, rng, theta, targetP, recall);

    let repeats = 0;
    if (chosen.length < n && stale.length > 0) {
      const extra = stale.slice(0, n - chosen.length);
      chosen = [...chosen, ...extra];
      repeats = extra.length;
    }
    if (chosen.length === 0) {
      notes.push(`${name} has no questions available yet, so it was skipped.`);
      continue;
    }
    chosen = byBand(chosen);
    for (const q of chosen) used.add(q.id);
    remaining -= chosen.length;

    const reason = reasonOf(task);
    sections.push({ task, qids: chosen.map((q) => q.id), reason });
    bySection.push(chosen);

    const how =
      theta !== undefined
        ? `picked near your level (about ${Math.round(targetP * 100)}% chance of getting each right)`
        : 'a spread from easy to hard, since we do not know your level here yet';
    let line = `${name}: ${plural(chosen.length, 'question')}, ${REASON_WORDS[reason]}; ${how}.`;
    if (twinCount > 0) line += ` ${plural(twinCount, 'question')} test the same idea as before, with different wording or numbers.`;
    explain.push(line);
    if (repeats > 0) notes.push(`${name}: only ${plural(chosen.length - repeats, 'new question')} left, so ${repeats} repeat from the last ${RECENCY_DAYS} days.`);
    else if (chosen.length < n) notes.push(`${name}: only ${plural(chosen.length, 'question')} available, ${n - chosen.length} fewer than planned.`);
  }

  // time cap: drop from the end (light review goes first)
  if (input.maxMinutes !== undefined) {
    const cap = input.maxMinutes * 60;
    let total = bySection.flat().reduce((a, q) => a + timeS(q), 0);
    let trimmed = 0;
    for (let i = bySection.length - 1; i >= 0 && total > cap; i--) {
      const sec = bySection[i]!;
      while (sec.length > 0 && total > cap) {
        total -= timeS(sec.pop()!);
        trimmed++;
      }
    }
    if (trimmed > 0) notes.push(`Trimmed ${plural(trimmed, 'question')} to fit ${input.maxMinutes} minutes.`);
    for (let i = bySection.length - 1; i >= 0; i--) {
      if (bySection[i]!.length === 0) {
        bySection.splice(i, 1);
        sections.splice(i, 1);
        explain.splice(i, 1);
      } else sections[i]!.qids = bySection[i]!.map((q) => q.id);
    }
  }

  const queue = bySection.flat();
  const estMin = Math.ceil(queue.reduce((a, q) => a + timeS(q), 0) / 60);
  const head = queue.length === 0 ? 'No questions could be built for today.' : `${plural(queue.length, 'question')} across ${plural(sections.length, 'topic')}, about ${estMin} min.`;
  return { queue, sections, estMin, explain: [head, ...explain, ...notes] };
}

/**
 * Plan tasks that this session fully covered (same counting as the planner's own auto-tick: questions per chapter
 * against task.items). The caller ticks only the ones still `todo`.
 */
export function completedTaskIds(tasks: readonly Task[], questions: readonly Question[]): string[] {
  const have: Record<string, number> = {};
  for (const q of questions) {
    const c = q.tax?.chapter;
    if (c) have[c] = (have[c] ?? 0) + 1;
  }
  const out: string[] = [];
  for (const t of orderTasks(tasks)) {
    if (!isSessionTask(t) || t.status !== 'todo') continue;
    const n = have[t.chapter] ?? 0;
    if (n >= t.items) {
      have[t.chapter] = n - t.items;
      out.push(t.id);
    }
  }
  return out;
}

/** question id -> most recent start time of a session that contained it (practice sessions store qids; else visit events). */
export function seenMap(sessions: readonly { startedAt: number; qids?: unknown; events?: unknown[] }[]): Record<string, number> {
  const out: Record<string, number> = {};
  const mark = (id: string, t: number) => {
    if ((out[id] ?? 0) < t) out[id] = t;
  };
  for (const s of sessions) {
    if (Array.isArray(s.qids)) for (const id of s.qids) mark(String(id), s.startedAt);
    else for (const e of (s.events ?? []) as { q?: string; a?: string }[]) if (e.a === 'visit' && e.q) mark(e.q, s.startedAt);
  }
  return out;
}
