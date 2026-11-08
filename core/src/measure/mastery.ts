/** state/mastery document: topicId -> {theta, rd, n, last, S, D, due, err_mix}. */
import type { Question } from '../question';
import {
  aggregate,
  newElo,
  updateElo,
  type Aggregate,
  type AggItem,
  type AggOptions,
  type EloOptions,
} from './elo';
import {
  cardFromParts,
  newCard,
  ratingFromOutcome,
  reviewTopic,
  type FsrsCardJson,
} from './fsrs';
import { behaviourLabels, type Attempt, type BehaviourLabel, type LabelOptions } from './labels';

export interface TopicMastery {
  /** ability theta */
  θ: number;
  rd: number;
  n: number;
  /** epoch ms of last session touching the topic */
  last: number;
  /** FSRS stability (days) */
  S: number;
  /** FSRS difficulty */
  D: number;
  /** epoch ms when next due */
  due: number;
  err_mix: Partial<Record<BehaviourLabel, number>>;
  /** compact FSRS extras needed to rebuild the card */
  reps: number;
  lapses: number;
  st: number;
}

export type MasteryDoc = Record<string, TopicMastery>;

export interface MasteryOptions {
  elo?: EloOptions;
  labels?: LabelOptions;
  /** max err_mix keys per topic */
  maxErrKeys?: number;
  /** soft cap on serialised size */
  maxBytes?: number;
}

export const MAX_MASTERY_BYTES = 60_000;
const DAY_MS = 86_400_000;

export function emptyMastery(): MasteryDoc {
  return {};
}

export function topicOf(q: Question): string | undefined {
  return q.tax?.topics?.[0] ?? q.tax?.chapter;
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

function cardOf(t: TopicMastery): FsrsCardJson {
  return cardFromParts(t);
}

/** Round to 3 decimals, cap err_mix keys, and prune stale low-n topics if over budget. */
export function guardSize(doc: MasteryDoc, opts: MasteryOptions = {}): MasteryDoc {
  const maxKeys = opts.maxErrKeys ?? 10;
  const out: MasteryDoc = {};
  for (const [id, t] of Object.entries(doc)) {
    const mix = Object.entries(t.err_mix)
      .filter(([, c]) => (c ?? 0) > 0)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, maxKeys);
    out[id] = {
      ...t,
      θ: r3(t.θ),
      rd: r3(t.rd),
      S: r3(t.S),
      D: r3(t.D),
      err_mix: Object.fromEntries(mix),
    };
  }
  const max = opts.maxBytes ?? MAX_MASTERY_BYTES;
  let size = JSON.stringify(out).length;
  if (size > max) {
    const ids = Object.keys(out).sort(
      (a, b) => out[a]!.n - out[b]!.n || out[a]!.last - out[b]!.last,
    );
    for (const id of ids) {
      if (size <= max) break;
      size -= JSON.stringify(out[id]).length + id.length + 4;
      delete out[id];
    }
  }
  return out;
}

/** Pure update across every topic a session touched: elo + FSRS + err_mix. */
export function applySession(
  mastery: MasteryDoc,
  attempts: Attempt[],
  questions: Question[],
  now: number,
  opts: MasteryOptions = {},
): MasteryDoc {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const q = byId.get(a.q);
    const topic = q && topicOf(q);
    if (!topic) continue;
    (groups.get(topic) ?? groups.set(topic, []).get(topic)!).push(a);
  }
  const next: MasteryDoc = { ...mastery };
  for (const [topic, list] of groups) {
    const prev = mastery[topic];
    let elo = prev ? { theta: prev.θ, rd: prev.rd, n: prev.n, last: prev.last } : newElo(opts.elo);
    const mix = { ...(prev?.err_mix ?? {}) };
    for (const a of list) {
      for (const l of behaviourLabels(a, opts.labels)) mix[l] = (mix[l] ?? 0) + 1;
      if (!a.skipped) elo = updateElo(elo, a.b, a.r, now, opts.elo);
    }
    const answered = list.filter((a) => !a.skipped);
    let card: FsrsCardJson = prev ? cardOf(prev) : newCard(now);
    let reps = prev?.reps ?? 0;
    if (answered.length > 0) {
      const meanR = answered.reduce((s, a) => s + a.r, 0) / answered.length;
      const rating = ratingFromOutcome({
        correct: meanR >= 0.5,
        timeMs: answered.reduce((s, a) => s + a.timeMs, 0) / answered.length,
        medianTimeMs: answered.reduce((s, a) => s + a.medianTimeMs, 0) / answered.length,
      });
      card = reviewTopic(card, rating, now);
      reps = card.reps;
    }
    next[topic] = {
      θ: elo.theta,
      rd: elo.rd,
      n: elo.n,
      last: answered.length > 0 ? now : (prev?.last ?? 0),
      S: card.stability,
      D: card.difficulty,
      due: card.due || now + DAY_MS,
      err_mix: mix,
      reps,
      lapses: card.lapses,
      st: card.state,
    };
  }
  return guardSize(next, opts);
}

export interface TopicMeta {
  chapter: string;
  subject: string;
  /** syllabus weight of the topic within its chapter (default 1) */
  weight?: number;
}

function items(doc: MasteryDoc, ids: string[]): AggItem[] {
  return ids.map((id) => ({ id, theta: doc[id]!.θ, rd: doc[id]!.rd, n: doc[id]!.n }));
}

/** chapter -> aggregate over its practised topics. */
export function masteryByChapter(
  doc: MasteryDoc,
  meta: Record<string, TopicMeta>,
  opts: AggOptions = {},
): Record<string, Aggregate> {
  const groups: Record<string, string[]> = {};
  for (const id of Object.keys(doc)) {
    const m = meta[id];
    if (m) (groups[m.chapter] ??= []).push(id);
  }
  const weights = Object.fromEntries(Object.entries(meta).map(([id, m]) => [id, m.weight ?? 1]));
  return Object.fromEntries(
    Object.entries(groups).map(([ch, ids]) => [ch, aggregate(items(doc, ids), weights, opts)]),
  );
}

/** subject -> aggregate over its chapters (chapter weights = summed topic weights). */
export function masteryBySubject(
  doc: MasteryDoc,
  meta: Record<string, TopicMeta>,
  opts: AggOptions = {},
): Record<string, Aggregate> {
  const chapters = masteryByChapter(doc, meta, opts);
  const chSubject: Record<string, string> = {};
  const chWeight: Record<string, number> = {};
  for (const id of Object.keys(doc)) {
    const m = meta[id];
    if (!m) continue;
    chSubject[m.chapter] = m.subject;
    chWeight[m.chapter] = (chWeight[m.chapter] ?? 0) + (m.weight ?? 1);
  }
  const groups: Record<string, AggItem[]> = {};
  for (const [ch, agg] of Object.entries(chapters)) {
    (groups[chSubject[ch]!] ??= []).push({ id: ch, theta: agg.theta, rd: agg.rd, n: agg.n });
  }
  return Object.fromEntries(
    Object.entries(groups).map(([s, its]) => [s, aggregate(its, chWeight, opts)]),
  );
}
