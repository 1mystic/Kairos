import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { parseBlueprint, type MasteryDoc } from '@kairos/core';
import { createMemoryGeneratedStore, paperCode, paperIdForSeed } from './generatedStore';
import { NewMockView, type MockDeps } from './NewMockScreen';
import { buildHistory, capacityShortfalls, miniBlueprint, planWeak, prepareBank, summarizeBlueprint } from './mockPlan';
import { storeWith, synthBank, synthTaxonomy } from './testkit.test-util';

const CH = ['A', 'B', 'C', 'D'].map((x) => ({ id: `PHY.${x}`, subject: 'PHY' }));
const bp = parseBlueprint({
  id: 'bp_small',
  exam: 'JEE_MAIN',
  mode: 'CBT',
  duration_min: 60,
  ui_skin: 'x',
  subjects: [{ code: 'PHY', sections: [{ id: 'A', type: 'SCQ', count: 15, marks: { correct: 4, wrong: -1, blank: 0 } }] }],
  time_slots: ['09:00'],
});
const bigBank = synthBank(CH, 6); // 24 SCQ
const thinBank = synthBank(CH, 1); // 4 SCQ: a section of 8 cannot be filled

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

async function setup(bank = bigBank, mastery: MasteryDoc | null = null, preload = false) {
  const generated = createMemoryGeneratedStore();
  if (preload) await generated.put({ paperId: 'gen_00a4', seed: 0xa4, exam: 'JEE_MAIN', blueprintId: 'bp_small', title: 't', paper: [], answers: {}, createdAt: 5 });
  const deps: MockDeps = {
    loadTaxonomy: async () => synthTaxonomy(CH),
    loadBank: async (_e, p) => {
      p(1, 1);
      return { version: 1, questions: bank };
    },
    loadBlueprints: async () => ({ version: 1, blueprints: [bp] }),
    generated,
    now: () => 1_700_000_000_000,
    random: () => 0.5,
  };
  const { store } = storeWith({ exam: 'JEE_MAIN' }, { getState: async () => mastery as never });
  render(
    <MemoryRouter initialEntries={['/mocks/new']}>
      <Routes>
        <Route path="/mocks/new" element={<NewMockView store={store} deps={deps} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return { generated };
}

describe('mock generator UI', () => {
  it('previews structure from the blueprint, generates, saves locally and opens the exam runner', async () => {
    const { generated } = await setup();
    expect(await screen.findByText('15 questions')).toBeInTheDocument();
    expect(screen.getByText(/Section A: 15 single correct, \+4 \/ -1/)).toBeInTheDocument();
    expect(screen.getByText(/Paper number/)).toBeInTheDocument();
    const code = paperCode(Math.floor(0.5 * 0xfffe) + 1);
    expect(screen.getByText(`#${code}`)).toBeInTheDocument();
    const gen = await screen.findByRole('button', { name: 'Generate' });
    await waitFor(() => expect(gen).toBeEnabled());
    await userEvent.click(gen);
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/exam\/gen_/));
    const [rec] = await generated.list();
    expect(rec!.paperId).toBe(paperIdForSeed(Math.floor(0.5 * 0xfffe) + 1));
    expect(rec!.paper).toHaveLength(15);
    expect(Object.keys(rec!.answers)).toHaveLength(15);
    expect(JSON.stringify(rec!.paper)).not.toContain('"answer"'); // paper is answer-free
    expect(rec!.blueprint?.id).toBe('bp_small');
  });

  it('thin bank: calm explanation and a working mini fallback', async () => {
    const { generated } = await setup(thinBank);
    expect(await screen.findByText(/This bank has few questions for/)).toBeInTheDocument();
    expect(screen.getByText(/section A \(4 of 15\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Make a mini paper' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/exam\/gen_/));
    const [rec] = await generated.list();
    expect(rec!.mini).toBe(true);
    expect(rec!.paper.length).toBeGreaterThanOrEqual(1);
    expect(rec!.blueprint!.duration_min).toBeLessThan(60);
  });

  it('lists previous generated papers with re-take links', async () => {
    await setup(bigBank, null, true);
    expect(await screen.findByText('Paper #00A4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Re-take' })).toHaveAttribute('href', '/exam/gen_00a4');
  });
});

describe('mock planning helpers', () => {
  it('summarises and shrinks blueprints without hard-coded counts', () => {
    expect(summarizeBlueprint(bp)).toMatchObject({ total: 15, marks: 60, durationMin: 60 });
    const mini = miniBlueprint(bp, bigBank);
    expect(summarizeBlueprint(mini).total).toBe(3);
    expect(capacityShortfalls(bp, thinBank)).toEqual([{ subject: 'PHY', section: 'A', type: 'SCQ', need: 15, have: 4 }]);
  });
  it('maps IAT-style subject aliases onto the blueprint', () => {
    const b = synthBank([{ id: 'BOT.X', subject: 'BOT' }], 2);
    const iat = parseBlueprint({ ...bp, subjects: [{ code: 'BIO', sections: bp.subjects[0]!.sections }] });
    const { prepared, restore } = prepareBank(b, iat, { BIO: ['BOT', 'ZOO'] });
    expect(prepared[0]!.tax!.subject).toBe('BIO');
    expect(restore(b[0]!.id).tax!.subject).toBe('BOT');
  });
  it('weak plan: measured low-theta chapters, unseen as fallback, honest thresholds', () => {
    const tax = synthTaxonomy(CH);
    const doc = {
      'PHY.A': { θ: -1, rd: 0.8, n: 6, last: 1, S: 1, D: 1, due: 1, err_mix: {}, reps: 1, lapses: 0, st: 1 },
      'PHY.B': { θ: -1, rd: 0.9, n: 1, last: 1, S: 1, D: 1, due: 1, err_mix: {}, reps: 1, lapses: 0, st: 1 },
    } as MasteryDoc;
    const w = planWeak(doc, tax, bigBank);
    expect(w.chapters[0]).toBe('PHY.A'); // adequate n and low theta
    expect(w.chapters).not.toContain('PHY.B'); // n too small to call weak
    expect(w.unseen).toEqual(['PHY.C', 'PHY.D']);
    expect(Object.keys(w.weakTopics)).toContain('PHY.A');
  });
  it('history: seen from sessions and mocks', () => {
    const h = buildHistory([{ id: 's', startedAt: 10, qids: ['x', 'y'] }], [{ id: 'm', paperId: 'p', submittedAt: 20, analysis: { questions: [{ qid: 'y' }] } }]);
    expect(h.seen).toEqual({ x: 10, y: 20 });
    expect(h.exposure).toEqual({ y: 1 });
  });
});
