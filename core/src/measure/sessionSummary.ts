/** Summary stored in sessions/{sid} next to the events. */
import type { KairosEvent } from '../cbt/palette';
import type { Question } from '../question';
import {
  attemptsFromEvents,
  behaviourLabels,
  type AttemptsOptions,
  type BehaviourLabel,
  type LabelOptions,
} from './labels';

export interface ChapterSummary {
  n: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeMs: number;
}

export interface SessionSummary {
  n: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  totalTimeMs: number;
  avgTimeMs: number;
  byChapter: Record<string, ChapterSummary>;
  labels: Partial<Record<BehaviourLabel, number>>;
}

export type SummaryCtx = AttemptsOptions & LabelOptions;

export function summarizeSession(
  events: KairosEvent[],
  questions: Question[],
  ctx: SummaryCtx = {},
): SessionSummary {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const attempts = attemptsFromEvents(events, questions, ctx);
  const s: SessionSummary = {
    n: attempts.length,
    correct: 0,
    wrong: 0,
    skipped: 0,
    accuracy: 0,
    totalTimeMs: 0,
    avgTimeMs: 0,
    byChapter: {},
    labels: {},
  };
  for (const a of attempts) {
    const q = byId.get(a.q)!;
    const ch = (s.byChapter[q.tax?.chapter ?? 'unknown'] ??= {
      n: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      timeMs: 0,
    });
    ch.n++;
    ch.timeMs += a.timeMs;
    s.totalTimeMs += a.timeMs;
    if (a.skipped) {
      s.skipped++;
      ch.skipped++;
    } else if (a.correct) {
      s.correct++;
      ch.correct++;
    } else {
      s.wrong++;
      ch.wrong++;
    }
    for (const l of behaviourLabels(a, ctx)) s.labels[l] = (s.labels[l] ?? 0) + 1;
  }
  s.accuracy = s.n ? s.correct / s.n : 0;
  s.avgTimeMs = s.n ? s.totalTimeMs / s.n : 0;
  return s;
}
