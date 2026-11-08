/** Attempt x accuracy quadrant (part 3). */
import type { MockDoc } from '../../store';
import { attemptedRow, rowsOf, subjectName, type QMap, type Row } from './common';

export const ATTEMPT_CUTOFF = 0.6;
export const ACCURACY_CUTOFF = 0.6;
/** below this many questions a cell is too small to read much into */
export const MIN_CELL_N = 3;

export type QuadrantId = 'steady' | 'careless' | 'cautious' | 'untouched';

export const QUADRANTS: Record<QuadrantId, { label: string; advice: string }> = {
  steady: { label: 'Attempting a lot, getting it right', advice: 'This is working. Keep the pace and look for the few slips that are left.' },
  careless: { label: 'Attempting a lot, accuracy low', advice: 'You are reaching many questions but losing marks on them. Slow down on the first read and skip when you are unsure.' },
  cautious: { label: 'Attempting little, accuracy high', advice: 'What you attempt, you get right. You can afford to try more of the questions you skipped.' },
  untouched: { label: 'Attempting little, accuracy low', advice: 'Start with the basics here, then build speed. This is the best place to spend study time.' },
};

export interface QuadrantCell {
  key: string;
  label: string;
  n: number;
  attempted: number;
  correct: number;
  /** attempted / n, 0..1 */
  attemptRate: number;
  /** correct / attempted, null when nothing was attempted */
  accuracy: number | null;
  quadrant: QuadrantId;
  advice: string;
  /** fewer than MIN_CELL_N questions */
  thin: boolean;
}

export function quadrantOf(attemptRate: number, accuracy: number | null): QuadrantId {
  const hiAttempt = attemptRate >= ATTEMPT_CUTOFF;
  const hiAcc = accuracy !== null && accuracy >= ACCURACY_CUTOFF;
  return hiAttempt ? (hiAcc ? 'steady' : 'careless') : hiAcc ? 'cautious' : 'untouched';
}

function cell(key: string, label: string, rows: Row[]): QuadrantCell {
  const attempted = rows.filter(attemptedRow).length;
  const correct = rows.filter((r) => r.verdict === 'correct').length;
  const attemptRate = rows.length ? attempted / rows.length : 0;
  const accuracy = attempted ? correct / attempted : null;
  const quadrant = quadrantOf(attemptRate, accuracy);
  const thin = rows.length < MIN_CELL_N;
  return {
    key, label, n: rows.length, attempted, correct, attemptRate, accuracy, quadrant,
    advice: thin ? 'Too few questions here to say much. Look at the subject as a whole.' : QUADRANTS[quadrant].advice,
    thin,
  };
}

/** Per subject always; per chapter when the paper's questions (with taxonomy) are supplied. Null while ungraded. */
export function attemptAccuracyQuadrant(
  mock: MockDoc,
  questions?: QMap,
  chapterName?: (id: string) => string,
): { subjects: QuadrantCell[]; chapters: QuadrantCell[] } | null {
  const mr = rowsOf(mock, questions);
  if (!mr || !mr.graded) return null;
  const by = <K extends 'subject' | 'chapter'>(k: K) => {
    const m = new Map<string, Row[]>();
    for (const r of mr.rows) {
      const key = r[k];
      if (key) (m.get(key) ?? m.set(key, []).get(key)!).push(r);
    }
    return m;
  };
  const subjects = [...by('subject')].map(([k, rows]) => cell(k, subjectName(k), rows));
  const chapters = [...by('chapter')].map(([k, rows]) => cell(k, chapterName?.(k) ?? k, rows));
  return { subjects, chapters };
}
