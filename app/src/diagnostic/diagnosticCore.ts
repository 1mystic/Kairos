import {
  DIAG_ITEMS_PER_CHAPTER,
  DIAG_TIME_BUDGET_S,
  applySession,
  attemptsFromEvents,
  diagnosticSummary,
  emptyMastery,
  guardSize,
  nextDiagnosticItem,
  summarizeSession,
  type Answered,
  type ChapterTheta,
  type DiagnosticNext,
  type KairosEvent,
  type MasteryDoc,
  type Question,
} from '@kairos/core';
import { checkAnswer, valueToResponse } from '../practice/finish';
import type { SessionDoc, UserStore } from '../store';

export { DIAG_ITEMS_PER_CHAPTER, DIAG_TIME_BUDGET_S };

/** One question shown in the diagnostic. `skipped` answers carry no evidence about ability. */
export interface DiagAnswer {
  qid: string;
  /** option keys joined by commas, or the typed number ('' when skipped) */
  value: string;
  correct: boolean;
  skipped: boolean;
}

/** Everything needed to resume after a refresh (IndexedDB `kairos-diagnostic`). */
export interface DiagBuffered {
  id: string;
  startedAt: number;
  exam: string;
  chapters: string[];
  answered: DiagAnswer[];
  events: KairosEvent[];
  /** time with a question open and not paused, ms */
  activeMs: number;
  updatedAt: number;
}

export function gradeOne(q: Question, value: string): boolean {
  if (value === '') return false;
  try {
    return checkAnswer(q, valueToResponse(q, value)) === 'correct';
  } catch {
    return false;
  }
}

/** Ability per chapter from the evidence so far (skips excluded). */
export function thetaSoFar(chapters: string[], bank: Question[], answered: DiagAnswer[]): Record<string, ChapterTheta & { n: number }> {
  return diagnosticSummary({
    studiedChapters: chapters,
    bank,
    answered: answered.filter((a) => !a.skipped).map(({ qid, correct }) => ({ qid, correct })),
  });
}

export interface NextInput {
  chapters: string[];
  bank: Question[];
  answered: DiagAnswer[];
  activeMs: number;
  timeBudgetS?: number;
  perChapter?: number;
}

/**
 * Next item via core `nextDiagnosticItem` (max 1PL information, fewest-answered chapter first).
 * Skipped questions count towards coverage (so the loop always ends) but not towards theta.
 * Also stops when the real time spent reaches the budget, not only core's median-time estimate.
 */
export function nextItem(inp: NextInput): DiagnosticNext {
  const budget = inp.timeBudgetS ?? DIAG_TIME_BUDGET_S;
  if (inp.activeMs >= budget * 1000) return { done: true, reason: 'time' };
  const answered: Answered[] = inp.answered.map(({ qid, correct }) => ({ qid, correct }));
  return nextDiagnosticItem({
    studiedChapters: inp.chapters,
    bank: inp.bank,
    answered,
    theta: thetaSoFar(inp.chapters, inp.bank, inp.answered),
    timeBudgetS: budget,
    perChapter: inp.perChapter ?? DIAG_ITEMS_PER_CHAPTER,
  });
}

/** Chapters with at least one question the diagnostic can use (answer key present, not quarantined). */
export function usableChapters(bank: Question[], chapters: string[]): string[] {
  const has = new Set(bank.filter((q) => !!q.answer && q.status !== 'quarantined').map((q) => q.tax?.chapter));
  return chapters.filter((c) => has.has(c));
}

export interface ChapterResult {
  chapter: string;
  theta: number;
  rd: number;
  /** questions that counted (skips excluded) */
  n: number;
  skipped: number;
  correct: number;
  /** a diagnostic never reaches 'confident': 2 questions per chapter is a rough read */
  confidence: 'rough' | 'none';
}

export interface DiagnosticResult {
  chapters: ChapterResult[];
  answered: number;
  skipped: number;
  correct: number;
  activeMs: number;
  /** highest theta first, only chapters with evidence */
  strongest: ChapterResult[];
  /** lowest theta first, only chapters with evidence; disjoint from `strongest` */
  needsAttention: ChapterResult[];
}

export function buildResult(chapters: string[], bank: Question[], answered: DiagAnswer[], activeMs: number): DiagnosticResult {
  const theta = thetaSoFar(chapters, bank, answered);
  const byId = new Map(bank.map((q) => [q.id, q]));
  const rows: ChapterResult[] = chapters.map((c) => {
    const mine = answered.filter((a) => byId.get(a.qid)?.tax?.chapter === c);
    const t = theta[c]!;
    return {
      chapter: c,
      theta: t.θ,
      rd: t.rd,
      n: t.n,
      skipped: mine.filter((a) => a.skipped).length,
      correct: mine.filter((a) => a.correct && !a.skipped).length,
      confidence: t.n > 0 ? 'rough' : 'none',
    };
  });
  const evidence = rows.filter((r) => r.n > 0);
  const byTheta = [...evidence].sort((a, b) => b.theta - a.theta);
  const k = Math.min(3, Math.floor(byTheta.length / 2));
  const strongest = byTheta.slice(0, k).filter((r) => r.theta > 0 || k < 3);
  const attention = [...byTheta].reverse().slice(0, k).filter((r) => !strongest.includes(r));
  return {
    chapters: rows,
    answered: answered.length,
    skipped: answered.filter((a) => a.skipped).length,
    correct: answered.filter((a) => a.correct && !a.skipped).length,
    activeMs,
    strongest,
    needsAttention: attention,
  };
}

export interface FinishDiagInput {
  events: KairosEvent[];
  /** the questions that were shown */
  questions: Question[];
  mastery: MasteryDoc | null | undefined;
  now: number;
}

/**
 * Seeds mastery through the same path as practice: `attemptsFromEvents` then core `applySession`
 * (elo + FSRS + err_mix per topic), so diagnostic data is indistinguishable from a first practice
 * session and every later module reads one consistent doc. Skipped questions are omitted from elo
 * by `applySession` itself. The doc is not overwritten: an existing mastery doc is updated in place.
 */
export function finishDiagnostic(input: FinishDiagInput) {
  const attempts = attemptsFromEvents(input.events, input.questions);
  const summary = summarizeSession(input.events, input.questions);
  const mastery = guardSize(applySession(input.mastery ?? emptyMastery(), attempts, input.questions, input.now));
  return { summary, attempts, mastery };
}

export interface DiagMeta {
  id: string;
  startedAt: number;
  endedAt: number;
  exam: string;
  chapters: string[];
}

/**
 * The only two writes of a diagnostic, in order: one `addSession` (ctx 'diagnostic') and one
 * `putState('mastery')`. A mastery failure never loses the session; the error is returned.
 *
 * Event ctx: core's `EventCtx` has no 'diagnostic', so events keep ctx 'practice' (same event types
 * as practice); the session doc's `ctx: 'diagnostic'` is what marks the session.
 */
export async function commitDiagnostic(
  store: UserStore,
  meta: DiagMeta,
  data: { events: KairosEvent[]; questions: Question[] },
): Promise<{ mastery: MasteryDoc; masteryError?: unknown }> {
  const existing = (await store.getState('mastery').catch(() => null)) as MasteryDoc | null;
  const r = finishDiagnostic({ ...data, mastery: existing, now: meta.endedAt });
  const doc: SessionDoc = {
    ...meta,
    ctx: 'diagnostic',
    mode: 'relaxed',
    chapter: 'mixed',
    summary: { ...r.summary },
    events: data.events,
    qids: data.questions.map((q) => q.id),
  };
  await store.addSession(doc);
  try {
    await store.putState('mastery', r.mastery);
    return { mastery: r.mastery };
  } catch (e) {
    return { mastery: r.mastery, masteryError: e };
  }
}

export const newDiagId = (): string => `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Minutes shown on the intro: 2 items per chapter at about 90 s, capped at the 40 minute budget. */
export function estimateMinutes(chapterCount: number): number {
  return Math.max(2, Math.min(Math.round(DIAG_TIME_BUDGET_S / 60), Math.round((chapterCount * DIAG_ITEMS_PER_CHAPTER * 90) / 60)));
}
