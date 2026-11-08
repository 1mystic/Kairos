import type { BehaviourLabel } from '@kairos/core';
import type { Totals } from './data';

/** One calm, specific suggestion from the behaviour labels. First matching rule wins. Never guilt. */
export interface Tip { id: string; title: string; body: string; cta: { label: string; to: string } }

interface Rule { id: string; label: BehaviourLabel; min: number; title: string; body: string; cta: Tip['cta'] }

/** `min`: the label must appear at least this many times AND on >= 15% of questions. */
export const TIP_RULES: readonly Rule[] = [
  { id: 'silly', label: 'silly_mistake', min: 3, title: 'Slow the first read', body: 'Several answers were small slips, not gaps. Try re-reading the question once before locking in.', cta: { label: 'Practise one chapter', to: '/practice' } },
  { id: 'time', label: 'time_sink', min: 2, title: 'Give each question a cap', body: 'A few questions took very long. Try a 2-minute cap: if it is not moving, flag it and come back.', cta: { label: 'Try a timed set', to: '/practice' } },
  { id: 'concept', label: 'concept_gap', min: 3, title: 'Revisit the idea first', body: 'A few answers pointed to a missing idea. Read the solution of one missed question, then try a fresh one on the same topic.', cta: { label: 'Open practice', to: '/practice' } },
  { id: 'guess', label: 'guess_careless', min: 3, title: 'Guess on purpose', body: 'Some quick guesses crept in. Narrow to two options first; a calm guess beats a rushed one.', cta: { label: 'Practise one chapter', to: '/practice' } },
  { id: 'fluency', label: 'fluency', min: 3, title: 'Build speed on what you know', body: 'You get these right, just slowly. A short, repeated set will make them quicker.', cta: { label: 'Open practice', to: '/practice' } },
  { id: 'overthink', label: 'overthinking', min: 2, title: 'Trust your first answer', body: 'A couple of right answers were changed to wrong ones. Change an answer only when you can say why.', cta: { label: 'Open practice', to: '/practice' } },
  { id: 'strategy', label: 'strategy', min: 2, title: 'Pick up the easy ones first', body: 'Some easier questions were skipped. In a mock, do a quick first pass for the ones you know.', cta: { label: 'Take the sample mock', to: '/exam/sample_jee_mini_v1' } },
];

export function pickTip(t: Pick<Totals, 'labels' | 'questions' | 'accuracy'>): Tip {
  if (t.questions === 0) {
    return { id: 'start', title: 'Start small', body: 'Ten questions in a chapter you like is a good first step. We learn what to suggest from there.', cta: { label: 'Open practice', to: '/practice' } };
  }
  const ranked = TIP_RULES.map((r) => ({ r, c: t.labels[r.label] ?? 0 }))
    .filter(({ r, c }) => c >= r.min && c / t.questions >= 0.15)
    .sort((a, b) => b.c - a.c);
  if (ranked[0]) return { id: ranked[0].r.id, title: ranked[0].r.title, body: ranked[0].r.body, cta: ranked[0].r.cta };
  if ((t.accuracy ?? 0) >= 80) return { id: 'strong', title: 'Keep it fresh', body: 'This is going well. Mix in a newer chapter so the strong ones stay warm.', cta: { label: 'Open practice', to: '/practice' } };
  return { id: 'steady', title: 'Short and regular wins', body: 'A short session most days beats a long one now and then. One small set today keeps the habit going.', cta: { label: 'Open practice', to: '/practice' } };
}
