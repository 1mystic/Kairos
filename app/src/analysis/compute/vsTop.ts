/** Comparison with the top 10% (part 7). Only with real benchmark data; there is none yet, so this returns null. */
import { readAnalysis } from '../../cbt/model';
import type { MockDoc } from '../../store';

export interface TopBenchmark {
  /** top-10% score of the paper and its maximum */
  marks: number;
  max: number;
  bySubject?: Record<string, number>;
  /** typical time per subject for the top 10%, ms */
  timeBySubjectMs?: Record<string, number>;
}
/** paperId -> benchmark. Comes from a static file published with all-India mocks (not present yet). */
export type Benchmarks = Record<string, TopBenchmark>;

export interface VsTop {
  top: TopBenchmark;
  marksGap: number;
  subjectGaps: { subject: string; you: number; top: number; gap: number }[];
}

export function vsTop(mock: MockDoc, benchmarks?: Benchmarks | null): VsTop | null {
  const top = benchmarks?.[mock.paperId];
  const a = readAnalysis(mock);
  if (!top || !a || a.pending) return null;
  const score = (mock.score as { marks?: number } | null)?.marks;
  if (typeof score !== 'number') return null;
  const subjectGaps = Object.entries(top.bySubject ?? {})
    .filter(([s]) => a.subjectScores[s])
    .map(([subject, t]) => ({ subject, you: a.subjectScores[subject]!.marks, top: t, gap: t - a.subjectScores[subject]!.marks }));
  return { top, marksGap: top.marks - score, subjectGaps };
}
