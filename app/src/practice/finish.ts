import {
  applySession,
  attemptsFromEvents,
  behaviourLabels,
  emptyMastery,
  evaluateDetailed,
  guardSize,
  summarizeSession,
  type Attempt,
  type BehaviourLabel,
  type KairosEvent,
  type MasteryDoc,
  type Question,
  type Response,
  type SessionSummary,
} from '@kairos/core';
import type { SessionDoc, UserStore } from '../store';
import { isSelfCheck } from './queue';

// ---------------------------------------------------------------- reasons

export const REASON_CHIPS = [
  { id: 'silly', label: 'Silly mistake', behaviour: 'silly_mistake' },
  { id: 'concept', label: "Didn't know the concept", behaviour: 'concept_gap' },
  { id: 'guessed', label: 'Guessed', behaviour: 'guess_careless' },
  { id: 'time', label: 'Ran out of time', behaviour: 'time_sink' },
  { id: 'misread', label: 'Misread', behaviour: 'silly_mistake' },
] as const;
export type ReasonId = (typeof REASON_CHIPS)[number]['id'];

/** Chip id -> core behaviour label (Misread and Silly mistake share a label; the raw chip is kept in the session doc). */
export function reasonLabel(id: string): BehaviourLabel | undefined {
  return REASON_CHIPS.find((c) => c.id === id)?.behaviour;
}

export function reasonsToLabels(reasons: Record<string, string>): Record<string, BehaviourLabel> {
  const out: Record<string, BehaviourLabel> = {};
  for (const [q, id] of Object.entries(reasons)) {
    const l = reasonLabel(id);
    if (l) out[q] = l;
  }
  return out;
}

/** Plain-words label shown on the summary. */
export const LABEL_WORDS: Record<BehaviourLabel, string> = {
  guess_careless: 'Careless guess',
  concept_gap: 'Concept gap',
  fluency: 'Needs speed practice',
  overthinking: 'Changed a right answer',
  silly_mistake: 'Silly mistake',
  strategy: 'Skipped an easy one',
  time_sink: 'Took too long',
};

// ---------------------------------------------------------------- answers

/** The string stored in event `v`: option keys joined by commas, or the typed number. */
export function responseToValue(r: Response): string {
  return 'keys' in r ? [...r.keys].sort().join(',') : String(r.value).trim();
}

export function valueToResponse(q: Question, v: string): Response {
  return q.answer && 'keys' in q.answer ? { keys: v === '' ? [] : v.split(',') } : { value: v };
}

export type Check = { verdict: 'correct' | 'wrong' | 'blank' | 'partial' };

/** Check one response with core scoring (numeric tolerance, INT exact, MSQ set match). */
export function checkAnswer(q: Question, r: Response | null): Check['verdict'] {
  return evaluateDetailed(q, r).verdict;
}

export function correctAnswerText(q: Question): string {
  const a = q.answer;
  if (!a) return '';
  if ('keys' in a) return a.keys.join(', ');
  if ('value' in a) return `${a.value}${a.tol ? ` (within ${a.tol})` : ''}`;
  return `${a.range[0]} to ${a.range[1]}`;
}

// ---------------------------------------------------------------- finishing

export interface FinishInput {
  events: KairosEvent[];
  questions: Question[];
  /** raw chip ids by question id */
  reasons: Record<string, string>;
  /** existing state/mastery doc, if any */
  mastery: MasteryDoc | null | undefined;
  now: number;
}
export interface SelfCheckTally {
  /** questions the student self-graded */
  n: number;
  right: number;
}
export interface FinishResult {
  summary: SessionSummary;
  /** self-checked questions: logged in events, never scored or fed into mastery */
  selfChecked: SelfCheckTally;
  attempts: Attempt[];
  mastery: MasteryDoc;
}

export const SELF_RIGHT = 'self:right';
export const SELF_WRONG = 'self:wrong';

/** Splits out self-check questions (no answer key) and their events. */
export function splitSelfCheck(events: KairosEvent[], questions: Question[]) {
  const selfIds = new Set(questions.filter(isSelfCheck).map((q) => q.id));
  return {
    selfIds,
    scored: questions.filter((q) => !selfIds.has(q.id)),
    scoredEvents: events.filter((e) => !selfIds.has(e.q)),
    selfEvents: events.filter((e) => selfIds.has(e.q)),
  };
}

export function tallySelfCheck(selfEvents: KairosEvent[]): SelfCheckTally {
  const last = new Map<string, string>();
  for (const e of [...selfEvents].sort((a, b) => a.t - b.t)) if (e.a === 'save') last.set(e.q, e.v ?? '');
  const graded = [...last.values()].filter((v) => v === SELF_RIGHT || v === SELF_WRONG);
  return { n: graded.length, right: graded.filter((v) => v === SELF_RIGHT).length };
}

/**
 * Pure: summary + updated mastery doc (size-guarded). No I/O.
 * Self-check questions are removed before scoring, so they never reach summary, attempts or mastery.
 */
export function finishSession(input: FinishInput): FinishResult {
  const labels = reasonsToLabels(input.reasons);
  const { scored, scoredEvents, selfEvents } = splitSelfCheck(input.events, input.questions);
  const summary = summarizeSession(scoredEvents, scored, { reasons: labels });
  const attempts = attemptsFromEvents(scoredEvents, scored, { reasons: labels });
  const prev = input.mastery ?? emptyMastery();
  const next = guardSize(applySession(prev, attempts, scored, input.now));
  return { summary, selfChecked: tallySelfCheck(selfEvents), attempts, mastery: next };
}

/** A question from the student's own uploads. */
export const isMine = (q: Pick<Question, 'id'> & { source?: { kind?: string } }): boolean =>
  q.source?.kind === 'user' || q.id.startsWith('u_');

export interface SessionMeta {
  id: string;
  startedAt: number;
  endedAt: number;
  exam: string;
  chapter: string;
  chapters: string[];
  mode: 'timed' | 'relaxed';
  sourceIds?: string[];
  /** which of the session's questions came from the student's own bank */
  my?: 'only' | '1';
  selfCheck?: boolean;
}

/**
 * The two writes of a practice session, in order: one `addSession`, then one `putState('mastery')`.
 * A mastery failure never loses the session (it is already stored); the error is returned.
 */
export async function commitSession(
  store: UserStore,
  meta: SessionMeta,
  data: { events: KairosEvent[]; questions: Question[]; reasons: Record<string, string> },
): Promise<{ result: FinishResult; masteryError?: unknown }> {
  const existing = (await store.getState('mastery').catch(() => null)) as MasteryDoc | null;
  const result = finishSession({ ...data, mastery: existing, now: meta.endedAt });
  const doc: SessionDoc = {
    ...meta,
    ctx: 'practice',
    summary: {
      ...result.summary,
      selfChecked: result.selfChecked.n,
      selfRight: result.selfChecked.right,
      fromMine: data.questions.filter((q) => isMine(q)).length,
    },
    events: data.events,
    qids: data.questions.map((q) => q.id),
    reasons: data.reasons,
  };
  await store.addSession(doc);
  try {
    await store.putState('mastery', result.mastery);
    return { result };
  } catch (e) {
    return { result, masteryError: e };
  }
}

// ---------------------------------------------------------------- review rows

export interface ReviewRow {
  q: Question;
  attempt: Attempt;
  /** the answer the student gave ('' when skipped) */
  given: string;
  outcome: 'correct' | 'wrong' | 'skipped';
  labels: BehaviourLabel[];
}

/** Per-question rows for the summary page, rebuilt from the stored events (self-checked ones excluded). */
export function buildReview(
  events: KairosEvent[],
  questions: Question[],
  reasons: Record<string, string>,
): ReviewRow[] {
  const { scored, scoredEvents } = splitSelfCheck(events, questions);
  events = scoredEvents;
  questions = scored;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const labels = reasonsToLabels(reasons);
  const finals = new Map<string, string>();
  for (const e of [...events].sort((a, b) => a.t - b.t)) {
    if (e.a === 'save') finals.set(e.q, e.v ?? '');
    else if (e.a === 'clear') finals.delete(e.q);
  }
  return attemptsFromEvents(events, questions, { reasons: labels }).map((attempt) => ({
    q: byId.get(attempt.q)!,
    attempt,
    given: finals.get(attempt.q) ?? '',
    outcome: attempt.skipped ? 'skipped' : attempt.correct ? 'correct' : 'wrong',
    labels: behaviourLabels(attempt),
  }));
}

/** One calm sentence for the top of the summary. */
export function takeaway(s: SessionSummary): string {
  if (s.n === 0) return 'Nothing answered this time. Whenever you are ready, we will pick it up.';
  const top = Object.entries(s.labels).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  if (s.accuracy >= 0.8) return 'Solid session. Keep this chapter warm and move on to something newer.';
  if (top) {
    const l = top[0] as BehaviourLabel;
    if (l === 'concept_gap') return 'A few ideas need another look. Review the mistakes, then try again tomorrow.';
    if (l === 'guess_careless') return 'Several quick guesses. Slowing down on the first read will pay off.';
    if (l === 'silly_mistake') return 'Mostly small slips, not gaps. A quick re-read before checking helps.';
    if (l === 'fluency') return 'You know these. More reps will make them faster.';
    if (l === 'time_sink') return 'Some questions took very long. Try moving on sooner and coming back.';
  }
  return 'Good effort. Reviewing the mistakes now is the quickest way to make them stick.';
}
