import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryLocalDb } from '../../store';
import { Harness } from '../../plan/harness.test-util';
import { cardModel, type CardInput, type CardModel } from './todayModel';
import { TodaySessionCard, TodaySessionCardView } from './TodaySessionCard';

const base: CardInput = {
  loading: false, planKind: 'ready', plan: null, names: {}, mockLink: null, daysLeft: 45, examLabel: 'JEE Main', status: 'ahead',
  buffered: null, suggestion: null, hasExam: true,
};
const view = (m: CardModel, onRetry = vi.fn()) => render(<MemoryRouter><TodaySessionCardView model={m} onRetry={onRetry} /></MemoryRouter>);
const readyModel = (over: Partial<CardModel> = {}): CardModel => ({
  variant: 'session', headline: '46 questions · about 55 min', reason: 'Built from your plan: 2 weak topics, 1 review, 1 mixed set',
  chips: [{ label: 'Optics', reason: 'Weak' }, { label: 'Waves', reason: 'Review due' }], progress: null, doneChip: false,
  primary: { label: "Start today's session", to: '/practice/today' }, secondary: null, planLink: true,
  exam: { label: 'JEE Main', daysLeft: 45, status: 'ahead' }, stats: { questions: 46, minutes: 55 }, moreTopics: 0, ...over,
});

describe('TodaySessionCardView', () => {
  it('plan ready: eyebrow, headline, reason, chips, CTA and plan link', () => {
    view(readyModel());
    expect(screen.getByText("Today's session")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '46 questions · about 55 min' })).toBeInTheDocument();
    expect(screen.getByText(/2 weak topics, 1 review, 1 mixed set/)).toBeInTheDocument();
    expect(screen.getByText('Optics')).toHaveAttribute('title', 'Optics');
    expect(screen.getByText('Weak')).toBeInTheDocument();
    expect(screen.getByText('Days to JEE Main')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Ahead')).toBeInTheDocument();
    expect(screen.getByText('Questions')).toBeInTheDocument();
    expect(screen.getByText('about 55 min')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Start today's session" })).toHaveAttribute('href', '/practice/today');
    expect(screen.getByRole('link', { name: 'See full plan' })).toHaveAttribute('href', '/plan');
  });

  it('more than 6 topics: a "+N more" cell links to the plan', () => {
    view(readyModel({ moreTopics: 3 }));
    expect(screen.getByRole('link', { name: '+3 more in your plan' })).toHaveAttribute('href', '/plan');
  });

  it('done: success chip, progress bar and "Practise more"', () => {
    view(readyModel({ variant: 'done', headline: 'All done for today', doneChip: true, chips: [], progress: { done: 18, total: 18 }, primary: { label: 'Practise more', to: '/practice/today?more=1' } }));
    expect(screen.getByText("Today's session done")).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: "Today's session progress" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practise more' })).toHaveAttribute('href', '/practice/today?more=1');
  });

  it('continue: progress text and Continue link', () => {
    view(readyModel({ variant: 'continue', headline: 'Continue: 12 of 46 questions done', progress: { done: 12, total: 46 }, primary: { label: 'Continue', to: '/practice/today' } }));
    expect(screen.getByText('12 of 46 questions done')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue' })).toBeInTheDocument();
  });

  it('mock day: mock first, practice second', () => {
    view(cardModel({ ...base, plan: { date: 'd', phase: 'build', dayKind: 'mock', daysLeft: 1, capacityMin: 1, budgetMin: 1, plannedMin: 1, loadMin: null, triaged: [], warnings: [], tasks: [
      { id: 'm', kind: 'mock', topic: 'mock', chapter: '', subject: '', items: 0, est_min: 180, priority: 10, status: 'todo' },
      { id: '1', kind: 'practice', topic: 'A', chapter: 'A', subject: 'PHY', items: 10, est_min: 20, priority: 1, status: 'todo' },
    ] }, mockLink: '/exam/sample_jee_mini_v1' }));
    expect(screen.getByRole('link', { name: 'Start the mock' })).toHaveAttribute('href', '/exam/sample_jee_mini_v1');
    expect(screen.getByRole('link', { name: "Do today's practice first" })).toHaveAttribute('href', '/practice/today');
  });

  it('loading renders a busy skeleton with no heading', () => {
    view({ ...readyModel(), variant: 'loading' });
    expect(screen.getByTestId('today-card-loading')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('error: Try again calls back and the plain practice link is there', async () => {
    const retry = vi.fn();
    view(cardModel({ ...base, planKind: 'error', errorMessage: 'x' }), retry);
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Practise on your own' })).toHaveAttribute('href', '/practice');
  });
});

describe('TodaySessionCard (guest, no exam chosen)', () => {
  it('asks for the exam and offers a quick start', async () => {
    render(<Harness localDb={createMemoryLocalDb()}><TodaySessionCard /></Harness>);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Pick your exam to get a personal plan' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Pick your exam' })).toHaveAttribute('href', '/onboarding');
    expect(screen.getByRole('link', { name: 'Quick start' })).toHaveAttribute('href', '/practice');
  });
});
