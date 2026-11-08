import { parseBlueprint, type Blueprint } from '../blueprint';
import type { Question } from '../question';
import { mulberry32 } from './rng';

export const SUBJECTS = ['PHY', 'CHE', 'MAT'];
export const CHAPTERS = 10;

export function jeeBlueprint(): Blueprint {
  const mk = (code: string) => ({
    code,
    sections: [
      { id: 'A', type: 'SCQ', count: 20, marks: { correct: 4, wrong: -1, blank: 0 } },
      { id: 'B', type: 'NVQ', count: 5, marks: { correct: 4, wrong: -1, blank: 0 } },
    ],
  });
  return parseBlueprint({
    id: 'jee_syn',
    exam: 'JEE',
    mode: 'CBT',
    duration_min: 180,
    ui_skin: 'x',
    subjects: SUBJECTS.map(mk),
    difficulty_target: { p_correct_hist: [0.12, 0.18, 0.25, 0.25, 0.2] },
    time_slots: ['09:00'],
  });
}

/** 600 questions: 3 subjects x 10 chapters x (15 SCQ + 5 NVQ). Some share simhash / concepts. */
export function syntheticBank(seed = 1): Question[] {
  const rng = mulberry32(seed);
  const out: Question[] = [];
  let n = 0;
  for (const subj of SUBJECTS) {
    for (let c = 0; c < CHAPTERS; c++) {
      for (let i = 0; i < 20; i++) {
        const scq = i < 15;
        const p = 0.1 + rng() * 0.8;
        const id = `${subj}-${c}-${i}`;
        const ch = `${subj}-ch${c}`;
        out.push({
          id,
          type: scq ? 'SCQ' : 'NVQ',
          stem: `q ${id}`,
          options: scq ? ['A', 'B', 'C', 'D'].map((k) => ({ key: k, text: k })) : undefined,
          answer: scq ? { keys: ['A'] } : { value: i },
          solution: 'sol',
          tax: {
            subject: subj,
            chapter: ch,
            topics: [`${ch}-t${i % 3}`],
            concepts: [`${ch}-k${i % 12}`],
          },
          difficulty: {
            p_correct: p,
            b: -Math.log(p / (1 - p)),
            median_time_s: 60 + Math.floor(rng() * 90),
          },
          fingerprint: n % 10 === 9 ? { simhash: `dup${Math.floor(n / 10)}` } : { simhash: `h${n}` },
        } as Question);
        n++;
      }
    }
  }
  // dedupe clusters: every 10th question shares the simhash of the previous question
  for (let k = 9; k < out.length; k += 10) out[k]!.fingerprint = { simhash: out[k - 1]!.fingerprint!.simhash };
  return out;
}

export function syntheticWeights(): Record<string, number> {
  const w: Record<string, number> = {};
  for (const s of SUBJECTS) for (let c = 0; c < CHAPTERS; c++) w[`${s}-ch${c}`] = (c + 1) / 55;
  return w;
}
