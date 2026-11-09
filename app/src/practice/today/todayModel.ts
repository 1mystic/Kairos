import type { DayPlan, PaceStatus, Task } from '@kairos/core';
import { fmtMin, groupOf } from '../../plan/format';
import { isSessionTask, orderTasks, reasonOf, type ReasonLabel } from './buildTodayQueue';
import type { Suggestion } from './suggestSession';

/**
 * What the Home card shows, as plain data (the component only renders it).
 * One function maps every situation (plan, no plan, no exam, done, continue, loading, error) to a model.
 */

export const TODAY_ROUTE = '/practice/today';

export type CardVariant = 'loading' | 'error' | 'no_exam' | 'session' | 'light' | 'mock' | 'rest' | 'done' | 'continue' | 'suggest';

export interface Cta {
  label: string;
  /** a route; omitted for an in-page action (retry) */
  to?: string;
  action?: 'retry';
}

export interface CardChip {
  label: string;
  reason: ReasonLabel;
}

export interface CardModel {
  variant: CardVariant;
  headline: string;
  reason: string;
  chips: CardChip[];
  progress: { done: number; total: number } | null;
  /** "Today's session done" success chip */
  doneChip: boolean;
  primary: Cta;
  secondary: Cta | null;
  /** extra quiet link: "See full plan" */
  planLink: boolean;
  exam: { label: string; daysLeft: number; status: PaceStatus | null } | null;
}

export interface CardInput {
  loading: boolean;
  /** plan hook state kind */
  planKind: 'loading' | 'none' | 'passed' | 'ready' | 'error';
  plan: DayPlan | null;
  names: Readonly<Record<string, string>>;
  /** link of today's mock (from taskLink), when the plan has one */
  mockLink: string | null;
  daysLeft: number | null;
  examLabel: string | null;
  status: PaceStatus | null;
  /** an unfinished buffered Today session */
  buffered: { done: number; total: number } | null;
  /** auto-suggestion used when the plan is unavailable but the exam is known */
  suggestion: Suggestion | null;
  hasExam: boolean;
  errorMessage?: string;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const MAX_CHIPS = 4;

function examOf(i: CardInput): CardModel['exam'] {
  return i.daysLeft !== null && i.examLabel ? { label: i.examLabel, daysLeft: i.daysLeft, status: i.status } : null;
}

const base = (i: CardInput, over: Partial<CardModel> & Pick<CardModel, 'variant' | 'headline' | 'primary'>): CardModel => ({
  reason: '',
  chips: [],
  progress: null,
  doneChip: false,
  secondary: null,
  planLink: i.planKind === 'ready',
  exam: examOf(i),
  ...over,
});

/** "Built from your plan: 2 weak topics, 1 review, 1 mixed set" */
export function planReason(todo: readonly Task[]): string {
  const g = { warmup: 0, weak: 0, review: 0, practice: 0 };
  for (const t of todo) {
    const id = groupOf(t);
    if (id === 'warmup' || id === 'weak' || id === 'review' || id === 'practice') g[id]++;
  }
  const parts = [
    g.warmup ? `${g.warmup} warm-up` : '',
    g.weak ? plural(g.weak, 'weak topic') : '',
    g.review ? `${g.review} review` : '',
    g.practice ? `${g.practice} mixed set${g.practice === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.length ? `Built from your plan: ${parts.join(', ')}` : 'Built from your plan';
}

const chipsOf = (tasks: readonly Task[], names: Readonly<Record<string, string>>): CardChip[] =>
  orderTasks(tasks).slice(0, MAX_CHIPS).map((t) => ({ label: names[t.chapter] ?? t.chapter, reason: reasonOf(t) }));

export function cardModel(i: CardInput): CardModel {
  if (i.loading || i.planKind === 'loading') {
    return base(i, { variant: 'loading', headline: '', primary: { label: "Start today's session", to: TODAY_ROUTE } });
  }
  if (i.planKind === 'none' || i.planKind === 'passed') {
    return base(i, {
      variant: 'no_exam',
      headline: i.planKind === 'passed' ? 'Set your next exam date' : 'Pick your exam to get a personal plan',
      reason: 'Tell us your exam and date, and Kairos builds each day\'s practice for you.',
      primary: { label: 'Pick your exam', to: '/onboarding' },
      secondary: { label: 'Quick start', to: '/practice' },
      planLink: false,
    });
  }
  if (i.planKind === 'error') {
    const s = i.suggestion;
    if (i.hasExam && s && s.questions > 0) {
      return base(i, {
        variant: i.buffered ? 'continue' : 'suggest',
        headline: i.buffered ? `Continue: ${i.buffered.done} of ${i.buffered.total} questions done` : `${s.questions} questions · about ${fmtMin(s.estMin)}`,
        reason: s.summary,
        chips: s.focus.slice(0, MAX_CHIPS).map((f) => ({ label: f.name, reason: f.reason })),
        progress: i.buffered,
        primary: { label: i.buffered ? 'Continue' : "Start today's session", to: TODAY_ROUTE },
        planLink: false,
      });
    }
    return base(i, {
      variant: 'error',
      headline: "We could not build today's session",
      reason: i.errorMessage ? 'Check your connection and try again.' : 'Something went wrong. Try again, or practise a chapter of your choice.',
      primary: { label: 'Try again', action: 'retry' },
      secondary: { label: 'Practise on your own', to: '/practice' },
      planLink: false,
    });
  }

  // plan ready
  const tasks = i.plan?.tasks ?? [];
  const practice = tasks.filter((t) => isSessionTask(t) && t.status !== 'skipped');
  const todo = practice.filter((t) => t.status === 'todo');
  const totalQ = practice.reduce((a, t) => a + t.items, 0);
  const doneQ = practice.filter((t) => t.status === 'done').reduce((a, t) => a + t.items, 0);
  const mock = tasks.find((t) => t.kind === 'mock' && t.status === 'todo');
  const dayKind = i.plan?.dayKind;
  const progress = doneQ > 0 ? { done: doneQ, total: totalQ } : null;

  if (mock) {
    return base(i, {
      variant: 'mock',
      headline: `Mock test today: ${i.examLabel ?? 'full'} paper`,
      reason: todo.length > 0 ? 'Do the mock in one sitting. Today\'s practice can wait until after, or come first.' : 'Do it in one sitting, with the timer on.',
      primary: { label: 'Start the mock', to: i.mockLink ?? '/mocks/new' },
      secondary: todo.length > 0 ? { label: "Do today's practice first", to: TODAY_ROUTE } : null,
    });
  }
  if (i.buffered) {
    return base(i, {
      variant: 'continue',
      headline: `Continue: ${i.buffered.done} of ${i.buffered.total} questions done`,
      reason: todo.length > 0 ? planReason(todo) : 'Pick up where you left off.',
      chips: chipsOf(todo, i.names),
      progress: i.buffered,
      primary: { label: 'Continue', to: TODAY_ROUTE },
    });
  }
  if (todo.length === 0) {
    if (practice.length > 0) {
      return base(i, {
        variant: 'done',
        headline: 'All done for today',
        reason: `You finished ${plural(totalQ, 'question')}. A little more practice is always welcome, but today's plan is complete.`,
        progress: { done: totalQ, total: totalQ },
        doneChip: true,
        primary: { label: 'Practise more', to: `${TODAY_ROUTE}?more=1` },
      });
    }
    const ahead = i.status === 'ahead' || i.status === 'on_track';
    return base(i, {
      variant: 'rest',
      headline: ahead ? (i.status === 'ahead' ? "Rest day: you're ahead of plan" : "Rest day: you're on track") : 'Nothing planned today',
      reason: dayKind === 'buffer' ? 'A buffer day keeps the plan flexible. Enjoy it, or use it.' : 'Rest is part of the plan. You can still practise if you feel like it.',
      primary: { label: 'Practise anyway', to: `${TODAY_ROUTE}?more=1` },
    });
  }
  const q = todo.reduce((a, t) => a + t.items, 0);
  const min = todo.reduce((a, t) => a + t.est_min, 0);
  const lightOnly = todo.every((t) => t.kind === 'light_review' || t.kind === 'review' || t.kind === 'fsrs_due') && (dayKind === 'buffer' || dayKind === 'off' || dayKind === 'taper');
  return base(i, {
    variant: lightOnly ? 'light' : 'session',
    headline: lightOnly ? `Light day: ${plural(q, 'question')} of review` : `${plural(q, 'question')} · about ${fmtMin(min)}`,
    reason: planReason(todo),
    chips: chipsOf(todo, i.names),
    progress,
    primary: { label: "Start today's session", to: TODAY_ROUTE },
  });
}
