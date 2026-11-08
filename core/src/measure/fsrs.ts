/** 5.2 retention: ts-fsrs wrapper, one card per topic. Cards are plain JSON. */
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';
import type { Card, Grade } from 'ts-fsrs';

const DAY_MS = 86_400_000;

/** JSON-safe FSRS card: dates as epoch ms. */
export interface FsrsCardJson {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  /** ts-fsrs State enum (0 New, 1 Learning, 2 Review, 3 Relearning) */
  state: number;
  learning_steps: number;
  /** epoch ms, absent for a new card */
  last_review?: number;
}

export type FsrsRating = 'again' | 'hard' | 'good' | 'easy';

// short-term steps off: topics are scheduled in whole days; no fuzz so tests/sims are deterministic.
const engine = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));

export function toCard(j: FsrsCardJson): Card {
  const c: Card = {
    due: new Date(j.due),
    stability: j.stability,
    difficulty: j.difficulty,
    elapsed_days: j.elapsed_days,
    scheduled_days: j.scheduled_days,
    reps: j.reps,
    lapses: j.lapses,
    state: j.state as State,
    learning_steps: j.learning_steps,
  };
  if (j.last_review !== undefined) c.last_review = new Date(j.last_review);
  return c;
}

export function fromCard(c: Card): FsrsCardJson {
  const j: FsrsCardJson = {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    learning_steps: c.learning_steps,
  };
  if (c.last_review) j.last_review = c.last_review.getTime();
  return j;
}

export function newCard(now: number): FsrsCardJson {
  return fromCard(createEmptyCard(new Date(now)));
}

export interface OutcomeFact {
  correct: boolean;
  timeMs: number;
  medianTimeMs: number;
}

/** wrong -> Again, slow correct -> Hard, correct -> Good, fast correct -> Easy. */
export function ratingFromOutcome(o: OutcomeFact): FsrsRating {
  if (!o.correct) return 'again';
  if (o.medianTimeMs <= 0) return 'good';
  const ratio = o.timeMs / o.medianTimeMs;
  if (ratio > 1.5) return 'hard';
  if (ratio < 0.5) return 'easy';
  return 'good';
}

const GRADE: Record<FsrsRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export function reviewTopic(card: FsrsCardJson, rating: FsrsRating, now: number): FsrsCardJson {
  return fromCard(engine.next(toCard(card), new Date(now), GRADE[rating]).card);
}

/** Probability of recall in [0,1]. New cards have no memory: 0. */
export function retrievability(card: FsrsCardJson, now: number): number {
  if (card.state === State.New || card.last_review === undefined) return 0;
  return engine.get_retrievability(toCard(card), new Date(now), false);
}

export const DUE_THRESHOLD = 0.85;
export const DUE_THRESHOLD_NEAR_EXAM = 0.9;
export const NEAR_EXAM_DAYS = 60;

/** Due when R < 0.85, or R < 0.9 in the last 60 days. New cards are always due. */
export function isDue(card: FsrsCardJson, now: number, daysToExam?: number): boolean {
  const thr =
    daysToExam !== undefined && daysToExam <= NEAR_EXAM_DAYS
      ? DUE_THRESHOLD_NEAR_EXAM
      : DUE_THRESHOLD;
  if (card.state === State.New || card.last_review === undefined) return true;
  return retrievability(card, now) < thr;
}

/** Rebuild a card from the compact fields kept in state/mastery. */
export function cardFromParts(p: {
  S: number;
  D: number;
  due: number;
  last: number;
  reps: number;
  lapses: number;
  st: number;
}): FsrsCardJson {
  return {
    due: p.due,
    stability: p.S,
    difficulty: p.D,
    elapsed_days: 0,
    scheduled_days: Math.max(0, Math.round((p.due - p.last) / DAY_MS)),
    reps: p.reps,
    lapses: p.lapses,
    state: p.st,
    learning_steps: 0,
    last_review: p.last,
  };
}
