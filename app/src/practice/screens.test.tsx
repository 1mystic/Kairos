import { readFileSync } from 'node:fs';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Manifest } from '@kairos/core';
import { PickerView } from './Picker';
import { SessionRunner } from './SessionRunner';
import { SummaryView } from './Summary';
import { commitSession } from './finish';
import { createMemoryBuffer } from './buffer';
import { fakeStore, mkQ } from './fixtures.test-util';
import { practiceRoutes } from './routes';
import type { Taxonomy } from './taxonomy';

const manifest = JSON.parse(readFileSync('public/bank/v1/manifest.json', 'utf8')) as Manifest;
const tax = JSON.parse(readFileSync('public/bank/v1/taxonomy.json', 'utf8')) as Taxonomy;

describe('picker', () => {
  beforeEach(() => vi.clearAllMocks());
  it('lists subjects and chapters with counts from the real manifest', async () => {
    render(<MemoryRouter><PickerView tax={tax} manifest={manifest} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Physics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mathematics' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Botany' })).toBeNull(); // not a JEE subject
    expect(screen.getAllByText('2 questions').length).toBeGreaterThan(0); // PHY.CUR
    expect(screen.getAllByText('No questions yet').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('tab', { name: 'NEET UG' }));
    expect(screen.getByRole('heading', { name: 'Botany' })).toBeInTheDocument();
  });
  it('filters by search and links with the chosen options', async () => {
    render(<MemoryRouter><PickerView tax={tax} manifest={manifest} /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Search chapters'), 'gravitation');
    const link = screen.getByRole('link', { name: /Gravitation/ });
    await userEvent.click(screen.getByRole('button', { name: '20' }));
    await userEvent.click(screen.getByRole('button', { name: 'Timed' }));
    expect(link.getAttribute('href')).toBe('/practice/JEE_MAIN/PHY.GRAV?size=20&mode=timed');
  });
  it('shows confidence words, never "weak" for a wide estimate', () => {
    const mastery = {
      'PHY.GRAV': { theta: -2, rd: 0.9, n: 1, label: 'not_enough_data' as const },
      'PHY.LOM': { theta: -1, rd: 0.4, n: 6, label: 'rough' as const },
    };
    render(<MemoryRouter><PickerView tax={tax} manifest={manifest} mastery={mastery} /></MemoryRouter>);
    expect(screen.getByText('Not enough data')).toBeInTheDocument();
    expect(screen.getByText(/Rough: needs work/)).toBeInTheDocument();
    expect(screen.queryByText(/: weak/i)).toBeNull();
  });
});

describe('routes', () => {
  it('exports the three practice routes', () => {
    expect(practiceRoutes.map((r) => r.path)).toEqual(['/practice', '/practice/summary/:sessionId', '/practice/:exam/:chapter']);
  });
});

describe('session runner', () => {
  const qs = [mkQ('q1'), mkQ('q2', { type: 'NVQ', options: undefined, answer: { value: 3 }, tax: { subject: 'PHY', chapter: 'PHY.KIN1D', topics: [] } })];
  const base = { id: 's1', startedAt: 0, exam: 'JEE_MAIN', chapter: 'mixed', chapters: ['PHY.LOM', 'PHY.KIN1D'], mode: 'relaxed' as const, size: 2, seed: 1 };

  it('check -> feedback -> reasons -> finish once; commit writes once each', async () => {
    const buffer = createMemoryBuffer();
    const { store, calls } = fakeStore();
    const onFinish = vi.fn(async (r) => {
      await commitSession(store, { ...base, endedAt: 9 }, { events: r.events, questions: qs, reasons: r.reasons });
    });
    const user = userEvent.setup();
    render(<SessionRunner questions={qs} base={base} buffer={buffer} onFinish={onFinish} />);
    await user.keyboard('1'); // option A (wrong)
    await user.keyboard('{Enter}');
    expect(await screen.findByText(/Not quite. The answer is B/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guessed' }));
    expect(buffer.value!.reasons.q1).toBe('guessed');
    await user.keyboard('{Enter}'); // next
    await user.type(screen.getByLabelText('Your answer'), '3');
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Correct.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(calls).toEqual({ addSession: 1, putState: 1 });
    const actions = onFinish.mock.calls[0]![0].events.map((e: { a: string }) => e.a);
    expect(actions).toEqual(['visit', 'select', 'save', 'submit', 'visit', 'select', 'save', 'submit']);
  });

  it('buffers progress and resumes at the same question with its answer', async () => {
    const buffer = createMemoryBuffer();
    const user = userEvent.setup();
    const { unmount } = render(<SessionRunner questions={qs} base={base} buffer={buffer} onFinish={vi.fn()} />);
    await user.keyboard('2');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    unmount();
    const saved = (await buffer.load())!;
    expect(saved.index).toBe(1);
    expect(saved.checked).toEqual(['q1']);
    render(<SessionRunner questions={qs} base={base} initial={saved} buffer={buffer} onFinish={vi.fn()} />);
    expect(screen.getByLabelText('Your answer')).toBeInTheDocument();
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
  });

  it('pausing hides the question and is unavailable when timed', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SessionRunner questions={qs} base={base} buffer={createMemoryBuffer()} onFinish={vi.fn()} />);
    await user.click(screen.getAllByRole('button', { name: 'Pause' })[0]!);
    expect(screen.getByText('Paused')).toBeInTheDocument();
    unmount();
    render(<SessionRunner questions={qs} base={{ ...base, mode: 'timed' }} buffer={createMemoryBuffer()} onFinish={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
  });
});

describe('summary', () => {
  it('shows per-question rows, labels and review mode', async () => {
    const qs = [mkQ('q1'), mkQ('q2')];
    const events = [
      { t: 0, q: 'q1', a: 'visit', ctx: 'practice' }, { t: 1000, q: 'q1', a: 'save', v: 'A', ctx: 'practice' }, { t: 1000, q: 'q1', a: 'submit', ctx: 'practice' },
      { t: 1000, q: 'q2', a: 'visit', ctx: 'practice' }, { t: 90_000, q: 'q2', a: 'save', v: 'B', ctx: 'practice' }, { t: 90_000, q: 'q2', a: 'submit', ctx: 'practice' },
    ];
    const { store, sessions } = fakeStore();
    await commitSession(store, { id: 's', startedAt: 0, endedAt: 1, exam: 'JEE_MAIN', chapter: 'PHY.LOM', chapters: ['PHY.LOM'], mode: 'relaxed' }, { events: events as never, questions: qs, reasons: {} });
    render(<MemoryRouter><SummaryView session={sessions[0]!} questions={qs} /></MemoryRouter>);
    expect(screen.getByText('Careless guess')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practise this chapter again' })).toHaveAttribute('href', '/practice/JEE_MAIN/PHY.LOM');
    await userEvent.click(screen.getByRole('button', { name: /Review mistakes/ }));
    expect(screen.getByText('solution q1')).toBeInTheDocument();
    expect(within(document.body).queryByText('solution q2')).toBeNull();
  });
});
