/** Small deterministic synthetic taxonomy + question bank + blueprint for the validation harness. */
import { sigmoid } from '../measure/elo';
import type { Question } from '../question';
import type { PlannerTopicMeta } from '../plan/planner';
import { mulberry32, normal } from './rng';

export interface SimTopic {
  id: string;
  chapter: string;
  subject: string;
  /** relative blueprint weight (sums to 1 over the world) */
  weight: number;
  tMinPerItem: number;
  /** syllabus order, 0-based */
  order: number;
  /** item difficulties b, ascending */
  bank: number[];
  questions: Question[];
}

export interface SimWorld {
  topics: SimTopic[];
  byId: Record<string, SimTopic>;
  meta: Record<string, PlannerTopicMeta>;
  subjects: string[];
  /** questions on the blueprint-like paper */
  paperQuestions: number;
}

export interface WorldOptions {
  seed?: number;
  subjects?: readonly string[];
  chaptersPerSubject?: number;
  topicsPerChapter?: number;
  bankSize?: number;
  paperQuestions?: number;
}

export function makeWorld(opts: WorldOptions = {}): SimWorld {
  const rng = mulberry32(opts.seed ?? 7);
  const subjects = opts.subjects ?? ['physics', 'chemistry', 'mathematics'];
  const nCh = opts.chaptersPerSubject ?? 8;
  const nTop = opts.topicsPerChapter ?? 4;
  const bankSize = opts.bankSize ?? 24;
  const topics: SimTopic[] = [];
  let order = 0;
  for (const subject of subjects) {
    for (let c = 0; c < nCh; c++) {
      const chapter = `${subject.slice(0, 3)}${c + 1}`;
      const chW = Math.exp(0.7 * normal(rng));
      for (let t = 0; t < nTop; t++) {
        const id = `${chapter}.t${t + 1}`;
        const bank = Array.from({ length: bankSize }, () => 0.3 + normal(rng) * 0.9).sort((a, b) => a - b);
        const questions = bank.map(
          (b, i) =>
            ({
              id: `${id}:${i}`,
              type: 'SCQ',
              stem: 's',
              options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
              answer: { keys: ['A'] },
              tax: { subject, chapter, topics: [id] },
              difficulty: { p_correct: sigmoid(-b), median_time_s: 60 },
            }) as Question,
        );
        topics.push({
          id,
          chapter,
          subject,
          weight: chW * Math.exp(0.4 * normal(rng)),
          tMinPerItem: 2.5 + rng() * 1.5,
          order: order++,
          bank,
          questions,
        });
      }
    }
  }
  const total = topics.reduce((a, t) => a + t.weight, 0);
  for (const t of topics) t.weight /= total;
  return {
    topics,
    byId: Object.fromEntries(topics.map((t) => [t.id, t])),
    meta: Object.fromEntries(topics.map((t) => [t.id, { chapter: t.chapter, subject: t.subject, weight: t.weight, tMinPerItem: t.tMinPerItem }])),
    subjects: [...subjects],
    paperQuestions: opts.paperQuestions ?? 90,
  };
}

/** Expected marks (+4 / -1 MCQ) on the blueprint paper given a per-topic true ability. */
export function expectedScore(world: SimWorld, thetaOf: (topicId: string) => number): number {
  let s = 0;
  for (const t of world.topics) {
    const th = thetaOf(t.id);
    let p = 0;
    for (const b of t.bank) p += sigmoid(th - b);
    p /= t.bank.length;
    s += world.paperQuestions * t.weight * (5 * p - 1);
  }
  return s;
}
