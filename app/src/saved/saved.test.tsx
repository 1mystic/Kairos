import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiNote } from '../store/types';
import { mkQ } from '../practice/fixtures.test-util';
import { filterNotes, notePreview, noteTitle } from './model';

let notes: AiNote[] = [];
const store = {
  listAiNotes: vi.fn(async () => [...notes]),
  getAiNote: vi.fn(async (id: string) => notes.find((n) => n.qid === id) ?? null),
  putAiNote: vi.fn(async () => undefined),
  deleteAiNote: vi.fn(async (id: string) => { notes = notes.filter((n) => n.qid !== id); }),
};
vi.mock('../store', async (orig) => ({ ...(await orig<typeof import('../store')>()), useStore: () => store }));
vi.mock('../bank/client', () => ({
  getLatestVersion: vi.fn(async () => 1),
  getShard: vi.fn(async () => [mkQ('q_1', { stem: 'The original stem of one', solution: 'Official solution text' })]),
}));
vi.mock('../practice/taxonomy', async (orig) => ({
  ...(await orig<typeof import('../practice/taxonomy')>()),
  loadTaxonomy: vi.fn(async () => ({ subjects: [{ id: 'PHY', name: 'Physics', chapters: [{ id: 'PHY.LOM', name: 'Laws of Motion', topics: [] }] }] })),
}));

import { SavedPage } from './SavedPage';

const N = (over: Partial<AiNote> & { qid: string }): AiNote => ({ text: 'An explanation', provider: 'claude', updatedAt: 1_700_000_000_000, ...over });
const mount = () => render(<MemoryRouter><SavedPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  notes = [
    N({ qid: 'q_1', text: 'Use Newton second law', updatedAt: 3000, exam: 'JEE_MAIN', chapter: 'PHY.LOM', stem: 'A block slides down an incline' }),
    N({ qid: 'q_2', text: 'Cells divide by mitosis', updatedAt: 2000, exam: 'NEET_UG', chapter: 'BIO.CELL', stem: 'Which phase of mitosis' }),
    N({ qid: 'q_3', text: 'No reference here', updatedAt: 1000 }),
  ];
});

describe('SavedPage', () => {
  it('lists every note newest first, with exam chip, chapter name, stem or fallback title', async () => {
    mount();
    const cards = await screen.findAllByTestId('saved-note');
    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText('JEE Main')).toBeInTheDocument();
    expect(within(cards[0]!).getByText('Laws of Motion')).toBeInTheDocument();
    expect(within(cards[0]!).getByText('A block slides down an incline')).toBeInTheDocument();
    expect(within(cards[0]!).getByText(/From Claude/)).toBeInTheDocument();
    expect(within(cards[0]!).getByTestId('saved-preview')).toHaveTextContent('Use Newton second law');
    expect(within(cards[2]!).getByText('Question q_3')).toBeInTheDocument();
    expect(within(cards[0]!).getByRole('link', { name: 'Practise this chapter' })).toHaveAttribute('href', '/practice/JEE_MAIN/PHY.LOM');
    expect(within(cards[2]!).queryByRole('link', { name: 'Practise this chapter' })).toBeNull();
  });

  it('filters by search text and sorts oldest first', async () => {
    mount();
    await screen.findAllByTestId('saved-note');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search saved answers' }), 'mitosis');
    expect(screen.getAllByTestId('saved-note')).toHaveLength(1);
    expect(screen.getByText('Which phase of mitosis')).toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.click(screen.getByRole('tab', { name: 'Oldest' }));
    expect(screen.getAllByTestId('saved-note').map((c) => c.getAttribute('aria-label'))).toEqual(['Question q_3', 'Which phase of mitosis', 'A block slides down an incline']);
  });

  it('shows a no-match state with a way to clear the filters', async () => {
    mount();
    await screen.findAllByTestId('saved-note');
    await userEvent.type(screen.getByRole('searchbox'), 'zzzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByTestId('saved-note')).toHaveLength(3);
  });

  it('expands to the full note plus the original question and official solution', async () => {
    mount();
    const first = (await screen.findAllByTestId('saved-note'))[0]!;
    await userEvent.click(within(first).getByRole('button', { name: 'Show answer' }));
    expect(await within(first).findByText('The original stem of one')).toBeInTheDocument();
    expect(within(first).getByText('Official solution text')).toBeInTheDocument();
    expect(within(first).getByText('Use Newton second law')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Hide answer' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows only the note when the question reference is missing', async () => {
    mount();
    const cards = await screen.findAllByTestId('saved-note');
    await userEvent.click(within(cards[2]!).getByRole('button', { name: 'Show answer' }));
    expect(within(cards[2]!).getByText('No reference here')).toBeInTheDocument();
    expect(within(cards[2]!).queryByText(/official solution/)).toBeNull();
  });

  it('deletes after confirming, with one store call', async () => {
    mount();
    const first = (await screen.findAllByTestId('saved-note'))[0]!;
    await userEvent.click(within(first).getByRole('button', { name: 'Delete' }));
    expect(store.deleteAiNote).not.toHaveBeenCalled();
    await userEvent.click(within(first).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(store.deleteAiNote).toHaveBeenCalledWith('q_1'));
    expect(store.deleteAiNote).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getAllByTestId('saved-note')).toHaveLength(2));
  });

  it('explains how to save answers when there are none', async () => {
    notes = [];
    mount();
    expect(await screen.findByText('No saved AI answers yet')).toBeInTheDocument();
    expect(screen.getByText(/tap Ask AI/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start practising' })).toHaveAttribute('href', '/practice');
  });

  it('shows an error state with retry when loading fails', async () => {
    store.listAiNotes.mockRejectedValueOnce(new Error('offline'));
    mount();
    expect(await screen.findByText('Could not load your saved answers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByTestId('saved-note')).toHaveLength(3);
  });
});

describe('saved model', () => {
  it('filterNotes matches chapter names and filters by exam without mutating the input', () => {
    const input = [N({ qid: 'q_a', exam: 'JEE_MAIN', chapter: 'PHY.LOM' }), N({ qid: 'q_b', exam: 'NEET_UG', chapter: 'BIO.CELL', updatedAt: 5 })];
    const copy = [...input];
    expect(filterNotes(input, { query: 'laws of motion', exam: '', sort: 'newest', chapterNames: { 'PHY.LOM': 'Laws of Motion' } }).map((n) => n.qid)).toEqual(['q_a']);
    expect(filterNotes(input, { query: '', exam: 'NEET_UG', sort: 'newest' }).map((n) => n.qid)).toEqual(['q_b']);
    expect(input).toEqual(copy);
  });
  it('notePreview drops fenced code and clips; noteTitle falls back to the qid', () => {
    expect(notePreview('Intro\n```mermaid\ngraph TD\n A-->B\n```\nOutro')).toBe('Intro [code] Outro');
    expect(notePreview('x'.repeat(400)).endsWith('...')).toBe(true);
    expect(noteTitle({ qid: 'q_9' })).toBe('Question q_9');
  });
});
