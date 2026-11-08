import type { Question } from '../question';

export function mcq(id: string, over: Partial<Question> = {}): Question {
  return {
    id,
    type: 'MCQ',
    stem: 's',
    options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
    answer: { keys: ['A'] },
    tax: { subject: 'physics', chapter: 'kinematics', topics: ['projectile'] },
    difficulty: { p_correct: 0.5, median_time_s: 60 },
    ...over,
  } as Question;
}
