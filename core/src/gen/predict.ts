import { flattenSlots, type Blueprint } from '../blueprint';
import type { Question } from '../question';
import { roundMarks } from '../scoring';
import { generatePaper } from './select';
import { mulberry32, subSeed } from './rng';
import { scoreInterval, type ScoreInterval } from './interval';

export interface ScoreBand {
  p25: number;
  p50: number;
  p75: number;
  mean: number;
  /** calibrated interval (Phase F), only when `interval` is requested */
  interval?: ScoreInterval;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/**
 * Predicted score band (5.10). For each of `sims` sampled blueprint papers (seeded, no history),
 * P(correct) = 1/(1+exp(-(theta - b))) with theta = theta(topics[0] ?? chapter ?? subject).
 * Negative marking: the student attempts a question iff P > (blank - wrong)/(correct - wrong)
 * (the break-even guess threshold; 0.2 for +4/-1/0), otherwise leaves it blank for `blank` marks.
 * Each attempted question is then realised as a Bernoulli(P) draw, so the band reflects both paper
 * and luck variance. Fully deterministic given `seed`.
 */
export function predictScore(opts: {
  blueprint: Blueprint;
  bank: Question[];
  theta: (topicOrChapter: string) => number;
  weights: Record<string, number>;
  sims?: number;
  seed: number;
  /**
   * Calibrated 80% interval (docs/17 Phase F): seenFrac = share of the paper's topics the student has practised;
   * model = which recall model produced theta. Uses the analytic expected marks / Bernoulli sd averaged over the
   * sampled papers, then the conformal table. Off by default: the p25-p75 band is unchanged.
   */
  interval?: { seenFrac: number; model?: 'elo' | 'learned' };
}): ScoreBand {
  const sims = opts.sims ?? 500;
  const slots = flattenSlots(opts.blueprint);
  const scores: number[] = [];
  let muSum = 0;
  let sdSum = 0;
  for (let s = 0; s < sims; s++) {
    const sd = subSeed(opts.seed, s);
    const paper = generatePaper({
      blueprint: opts.blueprint,
      bank: opts.bank,
      weights: opts.weights,
      seed: sd,
      now: 0,
      options: { annealSwaps: 0, maxRedraws: 0, shuffleWithinSection: false },
    });
    const rng = mulberry32(sd ^ 0x5bd1e995);
    const byId = new Map(opts.bank.map((q) => [q.id, q]));
    let total = 0;
    let mu = 0;
    let v = 0;
    paper.slots.forEach(({ qid }, i) => {
      const q = byId.get(qid)!;
      const m = slots[i]!.marks;
      const b = q.difficulty?.b ?? (q.difficulty?.p_correct !== undefined
        ? -Math.log(Math.min(0.99, Math.max(0.01, q.difficulty.p_correct)) / (1 - Math.min(0.99, Math.max(0.01, q.difficulty.p_correct))))
        : 0);
      const th = opts.theta(q.tax?.topics?.[0] ?? q.tax?.chapter ?? q.tax?.subject ?? '');
      const p = 1 / (1 + Math.exp(-(th - b)));
      const threshold = (m.blank - m.wrong) / (m.correct - m.wrong);
      total += p > threshold ? (rng() < p ? m.correct : m.wrong) : m.blank;
      if (p > threshold) {
        mu += m.correct * p + m.wrong * (1 - p);
        v += (m.correct - m.wrong) ** 2 * p * (1 - p);
      } else mu += m.blank;
    });
    muSum += mu;
    sdSum += Math.sqrt(v);
    scores.push(roundMarks(total));
  }
  scores.sort((a, b) => a - b);
  return {
    p25: quantile(scores, 0.25),
    p50: quantile(scores, 0.5),
    p75: quantile(scores, 0.75),
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    ...(opts.interval ? { interval: scoreInterval(muSum / sims, sdSum / sims, opts.interval.seenFrac, opts.interval.model ?? 'elo') } : {}),
  };
}
