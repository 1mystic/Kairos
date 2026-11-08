/** Time map of the paper (part 4): minutes per subject per bucket, marks per bucket, time vs median per question. */
import type { MockDoc } from '../../store';
import { lastSaveTimes, rowsOf, timelineOf, visitSpans, type QMap } from './common';

export const BUCKET_MS = 10 * 60_000;

export interface TimeBucket {
  fromMin: number;
  toMin: number;
  bySubject: Record<string, number>;
  totalMs: number;
  /** net marks of answers last saved in this bucket */
  marks: number;
}
export interface QuestionTime {
  qid: string;
  subject: string;
  timeMs: number;
  medianMs: number | null;
  /** timeMs / medianMs */
  ratio: number | null;
}
export interface TimeMap {
  bucketMs: number;
  subjects: string[];
  buckets: TimeBucket[];
  totalMs: number;
  perQuestion: QuestionTime[];
  /** questions that took more than 1.5x their median, longest first */
  slowest: QuestionTime[];
}

export function timeMap(mock: MockDoc, questions?: QMap, bucketMs = BUCKET_MS): TimeMap | null {
  const mr = rowsOf(mock, questions);
  if (!mr) return null;
  const { analysis, rows } = mr;
  const events = timelineOf(mock);
  const subj = new Map(rows.map((r) => [r.qid, r.subject]));
  const subjects = [...new Set(rows.map((r) => r.subject))];
  const horizon = Math.max(analysis.durationMs, analysis.usedMs, 1);
  const n = Math.ceil(horizon / bucketMs);
  const buckets: TimeBucket[] = Array.from({ length: n }, (_, i) => ({
    fromMin: (i * bucketMs) / 60_000,
    toMin: Math.min((i + 1) * bucketMs, horizon) / 60_000,
    bySubject: Object.fromEntries(subjects.map((s) => [s, 0])),
    totalMs: 0,
    marks: 0,
  }));
  let totalMs = 0;
  for (const sp of visitSpans(events, analysis.usedMs)) {
    const s = subj.get(sp.q);
    if (!s) continue;
    for (let i = Math.floor(sp.from / bucketMs); i < n && i * bucketMs < sp.to; i++) {
      const d = Math.min(sp.to, (i + 1) * bucketMs) - Math.max(sp.from, i * bucketMs);
      if (d <= 0) continue;
      buckets[i]!.bySubject[s]! += d;
      buckets[i]!.totalMs += d;
      totalMs += d;
    }
  }
  const saves = lastSaveTimes(events);
  for (const r of rows) {
    const t = saves.get(r.qid);
    if (t === undefined) continue;
    const i = Math.min(n - 1, Math.floor(t / bucketMs));
    buckets[i]!.marks += r.marks;
  }
  const perQuestion: QuestionTime[] = rows.map((r) => ({
    qid: r.qid, subject: r.subject, timeMs: r.timeMs, medianMs: r.medianMs, ratio: r.medianMs ? r.timeMs / r.medianMs : null,
  }));
  const slowest = perQuestion.filter((q) => q.ratio !== null && q.ratio > 1.5).sort((a, b) => b.ratio! - a.ratio!).slice(0, 5);
  return { bucketMs, subjects, buckets, totalMs, perQuestion, slowest };
}
