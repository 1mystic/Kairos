import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commitSession } from './finish';
import { fakeStore, mkQ } from './fixtures.test-util';
import { SummaryView } from './Summary';

const events = [
  { t: 0, q: 'q1', a: 'visit', ctx: 'practice' }, { t: 1000, q: 'q1', a: 'save', v: 'A', ctx: 'practice' }, { t: 1000, q: 'q1', a: 'submit', ctx: 'practice' },
  { t: 1000, q: 'q2', a: 'visit', ctx: 'practice' }, { t: 90_000, q: 'q2', a: 'save', v: 'B', ctx: 'practice' }, { t: 90_000, q: 'q2', a: 'submit', ctx: 'practice' },
  { t: 90_000, q: 'q3', a: 'visit', ctx: 'practice' }, { t: 91_000, q: 'q3', a: 'leave', ctx: 'practice' },
];

async function mount() {
  const qs = [mkQ('q1'), mkQ('q2'), mkQ('q3')];
  const { store, sessions } = fakeStore();
  await commitSession(store, { id: 's', startedAt: 0, endedAt: 1, exam: 'JEE_MAIN', chapter: 'PHY.LOM', chapters: ['PHY.LOM'], mode: 'relaxed' }, { events: events as never, questions: qs, reasons: {} });
  return render(<MemoryRouter><SummaryView session={sessions[0]!} questions={qs} /></MemoryRouter>);
}

afterEach(() => vi.unstubAllGlobals());

describe('practice summary', () => {
  it('is one column: score head, then the actions bar, then the log', async () => {
    await mount();
    const head = screen.getByTestId('summary-head');
    const bar = screen.getByTestId('summary-actions');
    const log = screen.getByRole('list', { name: 'Questions' });
    expect(head.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.compareDocumentPosition(log) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(head).getByText('Score')).toBeInTheDocument();
    expect(within(head).getByText('Accuracy')).toBeInTheDocument();
    for (const n of ['Practise this chapter again', 'Back to chapters', 'Take a mock']) expect(within(bar).getByRole('link', { name: n })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /Review mistakes/ })).toBeInTheDocument();
    expect(screen.getAllByTestId('log-row')).toHaveLength(3);
  });

  it('filters the log', async () => {
    await mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /^Wrong/ }));
    expect(screen.getAllByTestId('log-row')).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: /^Skipped/ }));
    expect(screen.getAllByTestId('log-row')).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: /^Flagged/ }));
    expect(screen.getByText('Nothing here. Try another filter.')).toBeInTheDocument();
  });

  it('review mistakes opens review and Back to summary returns', async () => {
    await mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Review mistakes/ }));
    expect(screen.getByRole('heading', { name: 'Review mistakes' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Back to summary' })[0]!);
    expect(screen.getByTestId('summary-head')).toBeInTheDocument();
  });

  it('scrolls to top and focuses the heading on arrival', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    await mount();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Session summary' }));
  });

  it('shows a mini header with score and Review once the head scrolls out of view', async () => {
    let cb: IntersectionObserverCallback = () => {};
    class IO {
      constructor(c: IntersectionObserverCallback) { cb = c; }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', IO);
    await mount();
    expect(screen.queryByTestId('summary-mini')).toBeNull();
    act(() => cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    const mini = screen.getByTestId('summary-mini');
    expect(within(mini).getByRole('button', { name: /Review/ })).toBeInTheDocument();
    expect(within(mini).getByRole('button', { name: 'Summary ↑' })).toBeInTheDocument();
    expect(screen.getByTestId('summary-actions')).toHaveAttribute('data-stuck', 'true');
    act(() => cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.queryByTestId('summary-mini')).toBeNull();
  });

  it('new files use no borders or shadows', () => {
    for (const f of ['summary.css', 'Summary.tsx']) {
      const src = readFileSync(join(__dirname, f), 'utf8');
      expect(src.replaceAll('border-radius', '')).not.toMatch(/(?:^|[\s'"`:])(?:border|shadow|drop-shadow|ring|outline|divide)(?:-[\w/]+)*[\s'"`;]/m);
    }
  });
});
