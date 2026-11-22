import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiNotePanel } from './AiNotePanel';

let notes: Record<string, { qid: string; text: string; provider: string; updatedAt: number }> = {};
const store = {
  getAiNote: vi.fn(async (id: string) => notes[id] ?? null),
  putAiNote: vi.fn(async (id: string, v: { text: string; provider: string }) => { notes[id] = { qid: id, ...v, updatedAt: 1 }; }),
  deleteAiNote: vi.fn(async (id: string) => { delete notes[id]; }),
};
vi.mock('../store', async (orig) => ({ ...(await orig<typeof import('../store')>()), useStore: () => store }));

beforeEach(() => { notes = {}; vi.clearAllMocks(); localStorage.clear(); });

describe('AiNotePanel', () => {
  it('saves a pasted answer with one write, then shows it with its source', async () => {
    render(<AiNotePanel qid="q1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Paste AI answer' }));
    await userEvent.type(screen.getByLabelText('Paste the AI answer'), 'Use energy $E=mc^2$');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(store.putAiNote).toHaveBeenCalledTimes(1));
    expect(store.putAiNote).toHaveBeenCalledWith('q1', { text: 'Use energy $E=mc^2$', provider: 'chatgpt' });
    expect(await screen.findByText(/From ChatGPT/)).toBeInTheDocument();
    expect(screen.getByText(/not checked by Kairos/)).toBeInTheDocument();
  });

  it('does not render raw HTML from the note', async () => {
    notes.q1 = { qid: 'q1', text: '<img src=x onerror=alert(1)> hi', provider: 'claude', updatedAt: 1 };
    const { container } = render(<AiNotePanel qid="q1" />);
    await screen.findByText(/From Claude/);
    expect(container.querySelector('img')).toBeNull();
  });

  it('edits an existing note', async () => {
    notes.q1 = { qid: 'q1', text: 'old', provider: 'gemini', updatedAt: 1 };
    render(<AiNotePanel qid="q1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const box = screen.getByLabelText('Paste the AI answer');
    await userEvent.clear(box);
    await userEvent.type(box, 'new');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(store.putAiNote).toHaveBeenCalledWith('q1', { text: 'new', provider: 'gemini' }));
  });

  it('deletes only after confirming', async () => {
    notes.q1 = { qid: 'q1', text: 'keep', provider: 'gemini', updatedAt: 1 };
    render(<AiNotePanel qid="q1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(store.deleteAiNote).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(store.deleteAiNote).toHaveBeenCalledWith('q1'));
    expect(await screen.findByRole('button', { name: 'Paste AI answer' })).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    store.getAiNote.mockRejectedValueOnce(new Error('x'));
    render(<AiNotePanel qid="q1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load');
  });

  it('saves the question reference with the note (still one write), and keeps it on a later edit', async () => {
    const qref = { exam: 'JEE_MAIN', chapter: 'PHY.LOM', stem: 'A block slides.' };
    const { unmount } = render(<AiNotePanel qid="q1" qref={qref} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Paste AI answer' }));
    await userEvent.type(screen.getByLabelText('Paste the AI answer'), 'first');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(store.putAiNote).toHaveBeenCalledTimes(1));
    expect(store.putAiNote).toHaveBeenCalledWith('q1', { text: 'first', provider: 'chatgpt' }, qref);
    unmount();
    notes.q1 = { qid: 'q1', text: 'old', provider: 'gemini', updatedAt: 1, ...qref } as never;
    render(<AiNotePanel qid="q1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(store.putAiNote).toHaveBeenLastCalledWith('q1', { text: 'old', provider: 'gemini' }, qref));
  });
});

describe('AiNotePanel prompt guard', () => {
  it('blocks saving the prompt Kairos copied and shows a warning', async () => {
    render(<AiNotePanel qid="q1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Paste AI answer' }));
    expect(screen.getByText("Copy the AI's reply, then paste it here.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Paste the AI answer'), 'I am preparing for an Indian entrance exam and need help with this question.');
    expect(screen.getByRole('alert')).toHaveTextContent('looks like the prompt Kairos copied');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(store.putAiNote).not.toHaveBeenCalled();
  });
});
