/**
 * Synthetic student with a known true ability per topic.
 *  - answers an item of difficulty b correctly with P = sigmoid(theta_true - b)
 *  - learns: each practised item moves theta toward a ceiling, most when P ~ 0.5 (desirable difficulty); saturating
 *  - forgets: theta decays toward the starting floor as exp(-dt / S); spaced practice (low recall at review time)
 *    grows the stability S more than massed practice (FSRS-like)
 */
import { sigmoid } from '../measure/elo';
import { mulberry32, type Rng } from './rng';

export interface SimStudentParams {
  trueTheta: Record<string, number>;
  /** per-item learning rate toward the ceiling, ~0.02 */
  learningRate: number;
  /** initial memory stability in days, ~12 */
  forgetting: number;
  seed: number;
  /** ceiling above the starting ability (logits) */
  headroom?: number;
}

interface TopicState {
  floor: number;
  learned: number;
  S: number;
  last: number;
  cap: number;
  n: number;
}

export interface Outcome {
  b: number;
  p: number;
  correct: boolean;
}

export interface SimStudent {
  thetaAt(topic: string, day: number): number;
  /** Practise items of the given difficulties in one session on `day`; learning happens item by item. */
  practice(topic: string, day: number, bs: readonly number[]): Outcome[];
  exposures(topic: string): number;
}

const MAX_STABILITY = 400;

export function simulateStudent(params: SimStudentParams): SimStudent {
  const rng: Rng = mulberry32(params.seed);
  const head = params.headroom ?? 3;
  const st: Record<string, TopicState> = {};
  for (const [id, th] of Object.entries(params.trueTheta)) {
    st[id] = { floor: th, learned: th, S: params.forgetting, last: 0, cap: th + head, n: 0 };
  }
  const state = (id: string): TopicState => {
    const s = st[id];
    if (!s) throw new Error(`unknown topic ${id}`);
    return s;
  };
  const retention = (s: TopicState, day: number): number => (s.n === 0 ? 1 : Math.exp(-Math.max(0, day - s.last) / s.S));
  const thetaAt = (id: string, day: number): number => {
    const s = state(id);
    return s.floor + (s.learned - s.floor) * retention(s, day);
  };
  return {
    thetaAt,
    exposures: (id) => state(id).n,
    practice(id, day, bs) {
      const s = state(id);
      const r0 = retention(s, day);
      let th = thetaAt(id, day);
      const out: Outcome[] = [];
      for (const b of bs) {
        const p = sigmoid(th - b);
        out.push({ b, p, correct: rng() < p });
        th += params.learningRate * Math.max(0, s.cap - th) * (0.2 + 4 * p * (1 - p));
      }
      if (bs.length > 0) {
        s.S = s.n === 0 ? s.S : Math.min(MAX_STABILITY, s.S * (1.15 + 1.4 * (1 - r0)));
        s.learned = th;
        s.last = day;
        s.n += bs.length;
      }
      return out;
    },
  };
}
