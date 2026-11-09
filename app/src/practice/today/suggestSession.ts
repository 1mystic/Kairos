import { masteryByChapter, type MasteryDoc, type Task, type TopicMeta } from '@kairos/core';
import { mulberry32, seededShuffle } from '../rng';
import { reasonOf, type ReasonLabel } from './buildTodayQueue';

/** A chapter of the exam that has questions, with the topic ids the mastery doc may be keyed by. */
export interface ChapterInfo {
  id: string;
  name: string;
  subject: string;
  /** number of questions in the shard */
  count: number;
  topics: string[];
}

export interface SuggestInput {
  exam: string;
  mastery: MasteryDoc | null | undefined;
  /** chapters the student marked as already studied in onboarding */
  chaptersDone: readonly string[];
  chapters: readonly ChapterInfo[];
  /** chapter id -> questions seen in the last 3 weeks; chapters that are used up are put last */
  seen?: Readonly<Record<string, number>>;
  now: number;
  seed: number;
  /** total questions (default 20) */
  size?: number;
}

export interface FocusItem {
  chapter: string;
  name: string;
  reason: ReasonLabel;
}

export interface Suggestion {
  tasks: Task[];
  focus: FocusItem[];
  questions: number;
  estMin: number;
  /** one line for the card: "Suggested from your practice so far: 3 weak chapters, 1 review" */
  summary: string;
  source: 'mastery' | 'done' | 'first' | 'none';
  explain: string[];
}

export const DEFAULT_SUGGEST_SIZE = 20;
const SLOTS = 4;
const MIN_PER_Q = 2;

/**
 * Session for a student with no plan today (plan failed to load, or "practise more"): the 3 weakest chapters we know enough about
 * plus 1 chapter that is due for review; if there is not enough data, chapters the student said they finished, then the exam's first chapters.
 */
export function suggestSession(input: SuggestInput): Suggestion {
  const { mastery, now } = input;
  const size = Math.max(1, input.size ?? DEFAULT_SUGGEST_SIZE);
  const live = input.chapters.filter((c) => c.count > 0);
  const byId = new Map(live.map((c) => [c.id, c]));
  const used = new Set<string>();
  const picks: Array<{ c: ChapterInfo; bucket: 'weak' | 'review' | 'mixed'; topic: string; why: string }> = [];
  const explain: string[] = [];
  const rng = mulberry32(input.seed);
  const exhausted = (c: ChapterInfo) => (input.seen?.[c.id] ?? 0) >= c.count;

  let source: Suggestion['source'] = 'none';
  if (mastery) {
    const meta: Record<string, TopicMeta> = {};
    for (const c of live) {
      meta[c.id] = { chapter: c.id, subject: c.subject };
      for (const t of c.topics) meta[t] = { chapter: c.id, subject: c.subject };
    }
    const agg = masteryByChapter(mastery, meta);
    // weakest first, only where the estimate is not wide; equal values are ordered by the seed
    const weak = seededShuffle(live, rng)
      .filter((c) => agg[c.id] && agg[c.id]!.label !== 'not_enough_data')
      .sort((a, b) => agg[a.id]!.theta - agg[b.id]!.theta || Number(exhausted(a)) - Number(exhausted(b)))
      .slice(0, 3);
    for (const c of weak) {
      picks.push({ c, bucket: 'weak', topic: c.id, why: 'one of your weakest chapters so far' });
      used.add(c.id);
    }
    // the chapter with the oldest overdue topic
    let due: { c: ChapterInfo; topic: string; at: number } | null = null;
    for (const [topic, m] of Object.entries(mastery)) {
      const ch = meta[topic]?.chapter;
      const c = ch ? byId.get(ch) : undefined;
      if (!c || used.has(c.id) || m.n <= 0 || m.due > now) continue;
      if (!due || m.due < due.at) due = { c, topic, at: m.due };
    }
    if (due) {
      picks.push({ c: due.c, bucket: 'review', topic: due.topic, why: 'due for review' });
      used.add(due.c.id);
    }
    if (picks.length > 0) source = 'mastery';
  }

  if (picks.length < SLOTS) {
    const done = input.chaptersDone.map((id) => byId.get(id)).filter((c): c is ChapterInfo => !!c && !used.has(c.id));
    const fill = (list: ChapterInfo[], why: string) => {
      for (const c of [...list.filter((x) => !exhausted(x)), ...list.filter(exhausted)]) {
        if (picks.length >= SLOTS || used.has(c.id)) continue;
        picks.push({ c, bucket: 'mixed', topic: c.id, why });
        used.add(c.id);
      }
    };
    const before = picks.length;
    fill(done, 'a chapter you marked as done');
    if (picks.length > before && source === 'none') source = 'done';
    if (picks.length === 0) {
      fill(live, 'an early chapter of the exam');
      if (picks.length > 0) source = 'first';
    }
  }

  if (picks.length === 0) return { tasks: [], focus: [], questions: 0, estMin: 0, summary: 'No questions are available yet.', source: 'none', explain: ['No chapters with questions were found for this exam.'] };

  const base = Math.floor(size / picks.length);
  const extra = size - base * picks.length;
  const tasks: Task[] = picks.map((p, i) => {
    const items = Math.min(p.c.count, Math.max(1, base + (i < extra ? 1 : 0)));
    return {
      id: `sg#${i + 1}`,
      kind: p.bucket === 'review' ? 'fsrs_due' : 'practice',
      topic: p.topic,
      chapter: p.c.id,
      subject: p.c.subject,
      items,
      est_min: items * MIN_PER_Q,
      priority: picks.length - i,
      status: 'todo',
      bucket: p.bucket,
      target_p: p.bucket === 'review' ? 0.75 : 0.65,
    };
  });
  const focus = tasks.map((t, i) => ({ chapter: t.chapter, name: picks[i]!.c.name, reason: reasonOf(t) }));
  const questions = tasks.reduce((a, t) => a + t.items, 0);
  const nWeak = picks.filter((p) => p.bucket === 'weak').length;
  const nDue = picks.filter((p) => p.bucket === 'review').length;
  const nMixed = picks.filter((p) => p.bucket === 'mixed').length;
  const parts = [
    nWeak ? `${nWeak} weak chapter${nWeak === 1 ? '' : 's'}` : '',
    nDue ? `${nDue} review` : '',
    nMixed ? `${nMixed} mixed chapter${nMixed === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  const lead = source === 'mastery' ? 'Suggested from your practice so far' : source === 'done' ? 'Starting with chapters you marked as done' : 'A first mixed set for your exam';
  for (const p of picks) explain.push(`${p.c.name}: ${p.why}.`);
  return { tasks, focus, questions, estMin: questions * MIN_PER_Q, summary: `${lead}: ${parts.join(', ')}`, source, explain };
}
