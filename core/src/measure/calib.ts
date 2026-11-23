/**
 * Calibrated item difficulty (docs/17 Phase D): `bank/v{N}/calib.json` = {qid: [b, a, n]} from the offline IRT job
 * (pipeline/ml/irt_job.py, pooled anonymous attempts). Items with at least `minN` attempts get the fitted b (and a);
 * the rest keep their prior. Everything downstream (paper generator, predicted score, labels, mastery) already reads
 * `difficulty.b`, so applying calibration is a pure bank transform.
 */
import type { Question } from '../question';

export interface CalibFile {
  version: number;
  model: string;
  items: Record<string, [number, number, number]>;
}

export const CALIB_MIN_N = 50;

/** Return the bank with calibrated difficulty on items with n >= minN (p_correct kept consistent with b). Pure. */
export function applyCalibration(bank: readonly Question[], calib: CalibFile | null | undefined, minN = CALIB_MIN_N): Question[] {
  if (!calib) return [...bank];
  return bank.map((q) => {
    const c = calib.items[q.id];
    if (!c || c[2] < minN || !Number.isFinite(c[0])) return q;
    const [b, a, n] = c;
    return { ...q, difficulty: { ...q.difficulty, b, a, n, p_correct: 1 / (1 + Math.exp(b)) } };
  });
}
