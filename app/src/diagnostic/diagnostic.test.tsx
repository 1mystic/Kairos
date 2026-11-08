import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryDiagBuffer } from './diagnosticBuffer';
import { buildResult, commitDiagnostic, estimateMinutes, nextItem, usableChapters } from './diagnosticCore';
import { DiagnosticView, type DiagDeps } from './DiagnosticScreen';
import { storeWith, synthBank, synthManifest, synthTaxonomy } from './testkit.test-util';
import type { DiagBuffered } from './diagnosticCore';

const CH = [
  { id: 'PHY.A', subject: 'PHY' },
  { id: 'PHY.B', subject: 'PHY' },
  { id: 'PHY.C', subject: 'PHY' },
];
const bank = synthBank(CH, 3);
const T0 = 1_700_000_000_000;

const mkDeps = (over: Partial<DiagDeps> = {}): DiagDeps => ({
  loadSetup: async () => ({ tax: synthTaxonomy(CH), manifest: synthManifest(bank) }),
  loadBank: async (_e, onProgress) => {
    onProgress(1, 1);
    return { questions: bank };
  },
  buffer: createMemoryDiagBuffer(),
  clock: () => T0,
  ...over,
});

const ui = (store: ReturnType<typeof storeWith>['store'], deps: DiagDeps) =>
  render(
    <MemoryRouter>
      <DiagnosticView store={store} deps={deps} />
    </MemoryRouter>,
  );

describe('diagnostic loop (core)', () => {
  it('stops at coverage: 2 per chapter, then done', () => {
    const answered = ['PHY.A.0', 'PHY.A.1', 'PHY.B.0', 'PHY.B.1'].map((qid) => ({ qid, value: 'B', correct: true, skipped: false }));
    expect(nextItem({ chapters: ['PHY.A', 'PHY.B'], bank, answered, activeMs: 0 })).toMatchObject({ done: true, reason: 'covered' });
    const mid = nextItem({ chapters: ['PHY.A', 'PHY.B'], bank, answered: answered.slice(0, 2), activeMs: 0 });
    expect(mid.done).toBe(false);
    if (!mid.done) expect(mid.chapter).toBe('PHY.B'); // fewest answered first
  });
  it('stops on the real time budget', () => {
    expect(nextItem({ chapters: ['PHY.A'], bank, answered: [], activeMs: 40 * 60_000 })).toMatchObject({ done: true, reason: 'time' });
  });
  it('skips count for coverage but give no estimate', () => {
    const a = [{ qid: 'PHY.A.0', value: '', correct: false, skipped: true }];
    const r = buildResult(['PHY.A'], bank, a, 1000);
    expect(r.chapters[0]).toMatchObject({ n: 0, skipped: 1, confidence: 'none' });
  });
  it('helpers', () => {
    expect(usableChapters(bank, ['PHY.A', 'NOPE'])).toEqual(['PHY.A']);
    expect(estimateMinutes(100)).toBe(40);
    expect(estimateMinutes(3)).toBe(9);
  });
  it('commit writes one session and one mastery doc', async () => {
    const { store, calls, sessions, states } = storeWith(null);
    const q = bank[0]!;
    const events = [
      { t: 0, q: q.id, a: 'visit' as const, ctx: 'practice' as const },
      { t: 1000, q: q.id, a: 'save' as const, v: 'B', ctx: 'practice' as const },
      { t: 1001, q: q.id, a: 'submit' as const, ctx: 'practice' as const },
    ];
    await commitDiagnostic(store, { id: 'd1', startedAt: 0, endedAt: 5, exam: 'JEE_MAIN', chapters: ['PHY.A'] }, { events, questions: [q] });
    expect(calls).toEqual({ addSession: 1, putState: 1 });
    expect(sessions[0]).toMatchObject({ ctx: 'diagnostic', qids: [q.id] });
    expect(Object.keys(states.mastery!)).toEqual(['PHY.A']);
  });
});

describe('diagnostic screen', () => {
  it('prefills chapters from the profile, runs to the end, writes exactly once', async () => {
    const { store, calls } = storeWith({ exam: 'JEE_MAIN', chaptersDone: ['PHY.A', 'PHY.B'] });
    const user = userEvent.setup();
    ui(store, mkDeps());
    expect(await screen.findByRole('checkbox', { name: /Chapter PHY.A/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Chapter PHY.C/ })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: /Start with 2 chapters/ }));
    for (let i = 1; i <= 4; i++) {
      await screen.findByText(new RegExp(`Question ${i} of about 4`));
      await user.keyboard('2');
      await user.keyboard('{Enter}');
    }
    expect(await screen.findByText('Your starting point is set')).toBeInTheDocument();
    expect(calls).toEqual({ addSession: 1, putState: 1 });
    expect(screen.getByText(/every read here is rough/)).toBeInTheDocument();
    expect(screen.queryByText(/\bweak\b/i)).toBeNull();
    expect(screen.getByRole('link', { name: 'Start practising' })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: 'Set exam date' })).toHaveAttribute('href', '/onboarding');
  });

  it('resumes after a refresh from the buffer', async () => {
    const saved: DiagBuffered = {
      id: 'd_old',
      startedAt: T0 - 1000,
      exam: 'JEE_MAIN',
      chapters: ['PHY.A', 'PHY.B'],
      answered: [{ qid: 'PHY.A.1', value: 'B', correct: true, skipped: false }],
      events: [
        { t: 0, q: 'PHY.A.1', a: 'visit', ctx: 'practice' },
        { t: 900, q: 'PHY.A.1', a: 'save', v: 'B', ctx: 'practice' },
        { t: 901, q: 'PHY.A.1', a: 'submit', ctx: 'practice' },
      ],
      activeMs: 900,
      updatedAt: T0 - 500,
    };
    const buffer = createMemoryDiagBuffer(saved);
    const { store, calls } = storeWith({ exam: 'JEE_MAIN' });
    const user = userEvent.setup();
    ui(store, mkDeps({ buffer }));
    await user.click(await screen.findByRole('button', { name: 'Resume' }));
    expect(await screen.findByText(/Question 2 of about 4/)).toBeInTheDocument();
    expect(calls).toEqual({ addSession: 0, putState: 0 }); // nothing written until the end
  });

  it('buffers after each answer', async () => {
    const buffer = createMemoryDiagBuffer();
    const { store } = storeWith({ exam: 'JEE_MAIN', chaptersDone: ['PHY.A'] });
    const user = userEvent.setup();
    ui(store, mkDeps({ buffer }));
    await user.click(await screen.findByRole('button', { name: /Start with 1 chapter/ }));
    await screen.findByText(/Question 1 of about 2/);
    await user.keyboard('1');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(buffer.value?.answered).toHaveLength(1));
  });

  it('guards an unusable selection with a calm message', async () => {
    const { store } = storeWith({ exam: 'JEE_MAIN', chaptersDone: ['PHY.A'] });
    const user = userEvent.setup();
    ui(store, mkDeps({ loadBank: vi.fn(async () => ({ questions: [] })) }));
    await user.click(await screen.findByRole('button', { name: /Start with 1 chapter/ }));
    expect(await screen.findByText(/has questions with answers yet/)).toBeInTheDocument();
  });
});
