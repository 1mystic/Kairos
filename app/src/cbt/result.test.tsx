import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { MockDoc } from '../store';

const doc = {
  id: 'm1', paperId: 'p', submittedAt: 1, score: { marks: 20, max: 300 }, responses: [{ qid: 'a', answer: null }, { qid: 'b', answer: { keys: ['A'] } }],
  analysis: { v: 1, pending: false, title: 'Sample', usedMs: 1000, durationMs: 2000, submitReason: 'manual', subjectScores: {}, sectionScores: {}, maxBySubject: {}, maxBySection: {}, counts: { answered: 1, answered_marked: 0, correct: 0, wrong: 1, blank: 1, partial: 0 }, lostUnsaved: 2, focusLog: [],
    questions: [{ qid: 'a', subject: 'PHY', sectionId: 'A', type: 'SCQ', status: 'x', verdict: 'blank', marks: 0, timeMs: 1000 }, { qid: 'b', subject: 'PHY', sectionId: 'A', type: 'SCQ', status: 'x', verdict: 'wrong', marks: -1, timeMs: 2000 }] },
} as unknown as MockDoc;

vi.mock('../store', async (orig) => ({ ...(await orig<typeof import('../store')>()), useStore: () => ({ listMocks: async () => [doc] }) }));
vi.mock('../analysis', () => ({ MockReport: () => <div data-testid="mock-report" /> }));
vi.mock('./loader', () => ({ useExamData: () => ({ data: null, loading: false, error: null }) }));

import { ResultPage } from './ResultPage';

const mount = () => render(<MemoryRouter initialEntries={['/exam/p/result/m1']}><Routes><Route path="/exam/:paperId/result/:mockId" element={<ResultPage />} /></Routes></MemoryRouter>);

describe('result page', () => {
  it('puts the score, lost-answers nudge and primary actions before everything else', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    mount();
    expect(await screen.findByTestId('score')).toHaveTextContent('20 / 300');
    expect(screen.getByTestId('lost-unsaved')).toBeInTheDocument();
    const bar = screen.getByTestId('result-actions');
    for (const n of ['View full report', 'Review answers']) expect(bar).toHaveTextContent(n);
    expect(screen.getByRole('link', { name: 'Retake' })).toHaveAttribute('href', '/exam/p');
    expect(screen.getByRole('link', { name: 'All mocks' })).toHaveAttribute('href', '/mocks');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    vi.unstubAllGlobals();
  });

  it('Full report tab mounts the analysis report', async () => {
    mount();
    await screen.findByTestId('score');
    expect(screen.queryByTestId('mock-report')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View full report' }));
    await waitFor(() => expect(screen.getByTestId('mock-report')).toBeInTheDocument());
  });

  it('answers tab lists row cards with filters', async () => {
    mount();
    await screen.findByTestId('score');
    fireEvent.click(screen.getByRole('button', { name: 'Review answers' }));
    expect(screen.getAllByTestId('review-item')).toHaveLength(2);
    fireEvent.click(screen.getByRole('tab', { name: /^Wrong/ }));
    expect(screen.getAllByTestId('review-item')).toHaveLength(1);
  });
});
