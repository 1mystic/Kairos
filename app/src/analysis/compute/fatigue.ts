/** Fatigue curve (part 5): accuracy and pace over the paper, rolling windows. */
import type { MockDoc } from '../../store';
import { attemptedRow, lastSaveTimes, rowsOf, timelineOf, type QMap } from './common';

export const WINDOW_MS = 30 * 60_000;
export const STEP_MS = 10 * 60_000;
/** windows and halves with fewer answers than this are not read */
export const MIN_ANSWERS = 3;
/** change (in accuracy points) that counts as a real move */
export const MOVE_POINTS = 8;

export interface FatiguePoint {
  fromMin: number;
  toMin: number;
  centreMin: number;
  answers: number;
  /** 0..1, null when fewer than MIN_ANSWERS */
  accuracy: number | null;
  /** answers per hour */
  perHour: number;
}
export interface Fatigue {
  points: FatiguePoint[];
  /** accuracy change per hour (0..1 units) from a straight-line fit, null with < 3 readable windows */
  slopePerHour: number | null;
  earlier: { answers: number; accuracy: number | null };
  last: { answers: number; accuracy: number | null; spanMin: number };
  /** percentage points the last stretch is below (+) or above (-) the earlier part; null when unreadable */
  dropPoints: number | null;
  trend: 'dropped' | 'steady' | 'improved' | 'unknown';
  text: string;
}

interface Ans { t: number; correct: boolean }

const acc = (xs: Ans[]): number | null => (xs.length >= MIN_ANSWERS ? xs.filter((x) => x.correct).length / xs.length : null);

export function fatigueCurve(mock: MockDoc, questions?: QMap): Fatigue | null {
  const mr = rowsOf(mock, questions);
  if (!mr || !mr.graded) return null;
  const saves = lastSaveTimes(timelineOf(mock));
  const answers: Ans[] = [];
  for (const r of mr.rows) {
    const t = saves.get(r.qid);
    if (t !== undefined && attemptedRow(r)) answers.push({ t, correct: r.verdict === 'correct' });
  }
  const usedMs = Math.max(mr.analysis.usedMs, 1);
  const points: FatiguePoint[] = [];
  for (let s = 0; s < usedMs; s += STEP_MS) {
    const e = Math.min(s + WINDOW_MS, usedMs);
    const inWin = answers.filter((a) => a.t >= s && (a.t < e || (e === usedMs && a.t <= e)));
    points.push({
      fromMin: s / 60_000, toMin: e / 60_000, centreMin: (s + e) / 2 / 60_000,
      answers: inWin.length, accuracy: acc(inWin), perHour: inWin.length / ((e - s) / 3_600_000),
    });
    if (e >= usedMs) break;
  }
  const readable = points.filter((p) => p.accuracy !== null);
  let slopePerHour: number | null = null;
  if (readable.length >= 3) {
    const xs = readable.map((p) => p.centreMin / 60);
    const ys = readable.map((p) => p.accuracy!);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    slopePerHour = den > 0 ? xs.reduce((a, x, i) => a + (x - mx) * (ys[i]! - my), 0) / den : 0;
  }
  const spanMs = Math.min(60 * 60_000, usedMs / 3);
  const cut = usedMs - spanMs;
  const lastA = answers.filter((a) => a.t >= cut);
  const early = answers.filter((a) => a.t < cut);
  const la = acc(lastA);
  const ea = acc(early);
  const dropPoints = la !== null && ea !== null ? Math.round((ea - la) * 100) : null;
  const trend: Fatigue['trend'] = dropPoints === null ? 'unknown' : dropPoints >= MOVE_POINTS ? 'dropped' : dropPoints <= -MOVE_POINTS ? 'improved' : 'steady';
  const lastLabel = spanMs >= 59 * 60_000 ? 'the last hour' : `the last ${Math.round(spanMs / 60_000)} minutes`;
  const text =
    trend === 'dropped' ? `Accuracy dropped ${dropPoints} points in ${lastLabel}.`
    : trend === 'improved' ? `Accuracy rose ${-dropPoints!} points in ${lastLabel}. You got better as you settled in.`
    : trend === 'steady' ? `Accuracy held steady through the paper (within ${MOVE_POINTS} points).`
    : 'Not enough answered questions in both halves to read a trend yet.';
  return {
    points, slopePerHour,
    earlier: { answers: early.length, accuracy: ea },
    last: { answers: lastA.length, accuracy: la, spanMin: Math.round(spanMs / 60_000) },
    dropPoints, trend, text,
  };
}
