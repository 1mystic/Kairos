import { describe, expect, it } from 'vitest';
import type { DayPlan, Task } from '@kairos/core';
import { cardModel, planReason, TODAY_ROUTE, type CardInput } from './todayModel';
import type { Suggestion } from './suggestSession';

const task = (id: string, chapter: string, items: number, over: Partial<Task> = {}): Task => ({
  id, kind: 'practice', topic: chapter, chapter, subject: 'PHY', items, est_min: items * 2, priority: 1, status: 'todo', ...over,
});
const dayPlan = (tasks: Task[], dayKind: DayPlan['dayKind'] = 'work'): DayPlan => ({ date: '2026-11-09', phase: 'build', dayKind, daysLeft: 60, capacityMin: 120, budgetMin: 100, plannedMin: 100, loadMin: 100, tasks, triaged: [], warnings: [] });
const names = { A: 'Kinematics', B: 'Optics', C: 'Waves', D: 'Heat', E: 'Atoms' };
const input = (over: Partial<CardInput> = {}): CardInput => ({
  loading: false, planKind: 'ready', plan: dayPlan([]), names, mockLink: null, daysLeft: 60, examLabel: 'JEE Main', status: 'on_track',
  buffered: null, suggestion: null, hasExam: true, ...over,
});
const suggestion: Suggestion = {
  tasks: [], questions: 20, estMin: 40, source: 'mastery', explain: [], summary: 'Suggested from your practice so far: 3 weak chapters, 1 review',
  focus: [{ chapter: 'A', name: 'Kinematics', reason: 'Weak' }],
};

describe('card model', () => {
  it('plan ready: headline, reason, chips, CTA to /practice/today, exam chips', () => {
    const plan = dayPlan([
      task('1', 'A', 10, { bucket: 'weak' }),
      task('2', 'B', 12, { bucket: 'weak', priority: 2 }),
      task('3', 'C', 14, { kind: 'fsrs_due' }),
      task('4', 'D', 10),
      task('5', 'E', 10, { kind: 'diagnostic' }),
      task('6', '', 0, { kind: 'mock', status: 'done' }),
    ]);
    const m = cardModel(input({ plan }));
    expect(m.variant).toBe('session');
    expect(m.headline).toBe('46 questions · about 1h 32m');
    expect(m.reason).toBe('Built from your plan: 2 weak topics, 1 review, 1 mixed set');
    expect(m.chips).toEqual([
      { label: 'Optics', reason: 'Weak' },
      { label: 'Kinematics', reason: 'Weak' },
      { label: 'Heat', reason: 'Mixed' },
      { label: 'Waves', reason: 'Review due' },
    ]);
    expect(m.primary).toEqual({ label: "Start today's session", to: TODAY_ROUTE });
    expect(m.planLink).toBe(true);
    expect(m.exam).toEqual({ label: 'JEE Main', daysLeft: 60, status: 'on_track' });
  });

  it('shows at most 6 focus chips and counts the rest', () => {
    const plan = dayPlan(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((c, i) => task(String(i), c, 5)));
    const m = cardModel(input({ plan }));
    expect(m.chips).toHaveLength(6);
    expect(m.moreTopics).toBe(2);
    expect(m.stats?.questions).toBe(40);
  });

  it('mock day: the mock is primary, practice is the secondary action', () => {
    const plan = dayPlan([task('m', '', 0, { kind: 'mock' }), task('1', 'A', 10)]);
    const m = cardModel(input({ plan, mockLink: '/exam/sample_jee_mini_v1' }));
    expect(m.variant).toBe('mock');
    expect(m.headline).toBe('Mock test today: JEE Main paper');
    expect(m.primary.to).toBe('/exam/sample_jee_mini_v1');
    expect(m.secondary).toEqual({ label: "Do today's practice first", to: TODAY_ROUTE });
  });

  it('mock day without other tasks has no secondary action', () => {
    const m = cardModel(input({ plan: dayPlan([task('m', '', 0, { kind: 'mock' })]), mockLink: '/mocks/new' }));
    expect(m.secondary).toBeNull();
    expect(m.primary.to).toBe('/mocks/new');
  });

  it('light day: review only on a buffer day', () => {
    const plan = dayPlan([task('1', 'A', 15, { kind: 'light_review' })], 'buffer');
    const m = cardModel(input({ plan }));
    expect(m.variant).toBe('light');
    expect(m.headline).toBe('Light day: 15 questions of review');
  });

  it('rest day: calm copy and "Practise anyway"', () => {
    const m = cardModel(input({ plan: dayPlan([], 'off'), status: 'ahead' }));
    expect(m.variant).toBe('rest');
    expect(m.headline).toBe("Rest day: you're ahead of plan");
    expect(m.primary).toEqual({ label: 'Practise anyway', to: `${TODAY_ROUTE}?more=1` });
  });

  it('plan complete: success chip, full progress, "Practise more"', () => {
    const plan = dayPlan([task('1', 'A', 10, { status: 'done' }), task('2', 'B', 8, { status: 'done' })]);
    const m = cardModel(input({ plan }));
    expect(m.variant).toBe('done');
    expect(m.doneChip).toBe(true);
    expect(m.progress).toEqual({ done: 18, total: 18 });
    expect(m.primary.label).toBe('Practise more');
  });

  it('part done, nothing buffered: progress shows, CTA still starts the rest', () => {
    const plan = dayPlan([task('1', 'A', 10, { status: 'done' }), task('2', 'B', 8)]);
    const m = cardModel(input({ plan }));
    expect(m.variant).toBe('session');
    expect(m.progress).toEqual({ done: 10, total: 18 });
    expect(m.headline).toMatch(/^8 questions/);
  });

  it('unfinished buffered session: "Continue" with its own progress', () => {
    const plan = dayPlan([task('1', 'A', 10)]);
    const m = cardModel(input({ plan, buffered: { done: 12, total: 46 } }));
    expect(m.variant).toBe('continue');
    expect(m.primary).toEqual({ label: 'Continue', to: TODAY_ROUTE });
    expect(m.progress).toEqual({ done: 12, total: 46 });
  });

  it('plan failed but exam known: auto-suggestion from mastery', () => {
    const m = cardModel(input({ planKind: 'error', plan: null, suggestion }));
    expect(m.variant).toBe('suggest');
    expect(m.headline).toBe('20 questions · about 40 min');
    expect(m.reason).toBe(suggestion.summary);
    expect(m.chips).toEqual([{ label: 'Kinematics', reason: 'Weak' }]);
    expect(m.planLink).toBe(false);
  });

  it('no exam chosen: pick-your-exam CTA and Quick start to /practice', () => {
    const m = cardModel(input({ planKind: 'none', plan: null, hasExam: false, daysLeft: null, examLabel: null, status: null }));
    expect(m.variant).toBe('no_exam');
    expect(m.headline).toBe('Pick your exam to get a personal plan');
    expect(m.primary).toEqual({ label: 'Pick your exam', to: '/onboarding' });
    expect(m.secondary).toEqual({ label: 'Quick start', to: '/practice' });
    expect(m.exam).toBeNull();
  });

  it('loading: skeleton variant', () => {
    expect(cardModel(input({ loading: true })).variant).toBe('loading');
    expect(cardModel(input({ planKind: 'loading', plan: null })).variant).toBe('loading');
  });

  it('error without a suggestion: calm message, Try again, plain /practice link', () => {
    const m = cardModel(input({ planKind: 'error', plan: null, errorMessage: 'boom' }));
    expect(m.variant).toBe('error');
    expect(m.primary).toEqual({ label: 'Try again', action: 'retry' });
    expect(m.secondary).toEqual({ label: 'Practise on your own', to: '/practice' });
    expect(m.reason).not.toContain('boom');
  });

  it('planReason names warm-up, weak, review and mixed groups', () => {
    expect(planReason([task('1', 'A', 5, { warmup: true }), task('2', 'B', 5)])).toBe('Built from your plan: 1 warm-up, 1 mixed set');
  });
});
