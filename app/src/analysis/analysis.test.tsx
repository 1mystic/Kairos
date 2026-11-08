import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth/AuthProvider';
import type { Taxonomy } from '../practice/taxonomy';
import { StoreProvider, createMemoryLocalDb } from '../store';
import { MASTERY, buildMock, mkSession, typicalMock } from './__fixtures__';
import { AnalysisView } from './views/pages';
import { MockReport } from './views/MockReport';
import { analysisRoutes, MockReport as ExportedReport } from './index';

const tax = JSON.parse(readFileSync(join(__dirname, '../../public/bank/v1/taxonomy.json'), 'utf8')) as Taxonomy;
const auth = { user: null, profile: null, loading: false } as unknown as AuthContextValue;
afterEach(cleanup);

const wrap = (ui: React.ReactNode) => render(
  <AuthContext.Provider value={auth}><StoreProvider localDb={createMemoryLocalDb()}><MemoryRouter>{ui}</MemoryRouter></StoreProvider></AuthContext.Provider>,
);

describe('exports', () => {
  it('routes and MockReport are exported', () => {
    expect(analysisRoutes.map((r) => r.path)).toEqual(['/analysis', '/analysis/mock/:mockId']);
    expect(ExportedReport).toBe(MockReport);
  });
});

describe('MockReport', () => {
  const { mock, questions } = typicalMock();
  const prev = buildMock([{ qid: 'p1', subject: 'PHY', chapter: 'PHY.ROT', p: 0.5, verdict: 'correct', spans: [[0, 3]], saveMin: 3 }], { id: 'm_0', submittedAt: 1_600_000_000_000 }).mock;
  const mount = (m = mock, extra = {}) => wrap(<MockReport mock={m} questions={questions} taxonomy={tax} mastery={MASTERY} history={[prev]} {...extra} />);

  it('renders all 8 parts in order with the hand-checked story', async () => {
    mount();
    const parts = await screen.findAllByRole('region', { name: /^Part \d:/ });
    expect(parts.map((p) => p.getAttribute('aria-label'))).toEqual([
      'Part 1: Score and trend', 'Part 2: Where the marks went', 'Part 3: Attempts and accuracy', 'Part 4: Where the 3 hours went',
      'Part 5: Stamina over the paper', 'Part 6: Chapters by weight and mastery', 'Part 7: Against the top 10%', 'Part 8: What to fix first',
    ]);
    expect(screen.getByText(/You left 41 marks on the table: 12 from concept gaps, 8 from silly mistakes, 5 from negative marking/)).toBeInTheDocument();
    expect(screen.getByText(/Potential score 26/)).toBeInTheDocument();
    expect(within(parts[0]!).getAllByText('Available with all-India mocks')).toHaveLength(2);
    expect(within(parts[6]!).getByText(/Benchmarks arrive with all-India mocks/)).toBeInTheDocument();
    expect(within(parts[7]!).getAllByRole('listitem')[0]).toHaveTextContent('Re-read the question before locking in (silly mistakes cost 8)');
  });

  it('every chart is an image with a summary and a hidden data table', () => {
    mount();
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThanOrEqual(6);
    for (const i of imgs) expect(i.getAttribute('aria-label')!.length).toBeGreaterThan(10);
    expect(document.querySelectorAll('table.sr-only').length).toBeGreaterThanOrEqual(imgs.length);
  });

  it('opens the questions behind a waterfall bar', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: /Silly mistakes/ }));
    const panel = screen.getByRole('region', { name: 'Silly mistakes questions' });
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows the trend against the previous mock', () => {
    mount();
    expect(screen.getByText(/on your previous mock/)).toBeInTheDocument();
  });

  it('says so when it is the first graded mock', () => {
    mount(mock, { history: [] });
    expect(screen.getByText(/first graded mock/)).toBeInTheDocument();
  });

  it('shows a calm pending state for an ungraded paper', () => {
    const pending = { ...mock, analysis: { ...(mock.analysis as object), pending: true }, score: null };
    mount(pending as typeof mock);
    expect(screen.getByRole('heading', { name: 'Your report is waiting for marking' })).toBeInTheDocument();
  });

  it('shows the benchmark comparison only when data exists', () => {
    mount(mock, { benchmarks: { paper_x: { marks: 30, max: 48 } } });
    expect(screen.getByText(/The top 10% scored 30 of 48/)).toBeInTheDocument();
    expect(screen.queryByText(/Benchmarks arrive/)).toBeNull();
  });
});

describe('AnalysisView', () => {
  const NOW = 1_700_000_000_000;
  const empty = { loading: false, sessions: [], mocks: [], mastery: null, taxonomy: tax, exam: undefined };
  const view = (data: Parameters<typeof AnalysisView>[0]['data'], tab: 'mastery' | 'mocks' | 'mistakes') =>
    wrap(<AnalysisView data={data} tab={tab} onTab={() => {}} now={NOW} />);

  it('has the three tabs', () => {
    view(empty, 'mastery');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Mastery', 'Mocks', 'Mistakes']);
  });
  it('empty states carry one CTA each', () => {
    view(empty, 'mastery');
    expect(screen.getByRole('link', { name: 'Practise a chapter' })).toHaveAttribute('href', '/practice');
    cleanup();
    view(empty, 'mocks');
    expect(screen.getByRole('link', { name: 'Take the sample mock' })).toHaveAttribute('href', '/mocks');
    cleanup();
    view(empty, 'mistakes');
    expect(screen.getByRole('link', { name: 'Practise a chapter' })).toBeInTheDocument();
  });
  it('shows skeletons while loading', () => {
    view({ ...empty, loading: true }, 'mastery');
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });
  it('mastery tab: subjects, heatmap with an honest unknown, and priority focus', async () => {
    view({ ...empty, mastery: MASTERY, sessions: [mkSession('s1', NOW - 86_400_000, { 'PHY.ROT': { n: 10, correct: 5, wrong: 5, skipped: 0, timeMs: 600_000 } }, { concept_gap: 2 })] }, 'mastery');
    expect(screen.getAllByRole('heading', { name: 'Physics' })).toHaveLength(2); // subject card + heatmap group
    const grid = screen.getByRole('group', { name: 'Chapter heatmap' });
    const rot = within(grid).getByRole('button', { name: /Rotational Motion|Rotation/i });
    expect(rot).toHaveTextContent('Focus');
    expect(within(grid).queryAllByText('Not enough data')).toHaveLength(0); // collapsed by default
    await userEvent.click(screen.getByRole('button', { name: /chapters with not enough data/ }));
    expect(within(grid).getAllByText('Not enough data').length).toBeGreaterThan(0);
    expect(screen.queryByText(/: weak/i)).toBeNull();
    await userEvent.click(rot);
    expect(screen.getByRole('region', { name: /details/ })).toBeInTheDocument();
  });
  it('mocks tab lists attempts linking to the report', () => {
    const { mock } = typicalMock();
    view({ ...empty, mocks: [mock] }, 'mocks');
    expect(screen.getByRole('link', { name: 'Open the full report' })).toHaveAttribute('href', '/analysis/mock/m_1');
  });
  it('mistakes tab ranks labels from mastery and deep-links to practice', () => {
    view({ ...empty, mastery: MASTERY }, 'mistakes');
    expect(screen.getByRole('heading', { name: 'Concept gap' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Practise these in/ })[0]).toHaveAttribute('href', '/practice/JEE_MAIN/PHY.ROT');
  });
});

describe('design rules', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  it('no border, shadow, ring, outline or gradient utilities in analysis sources', () => {
    const bad = walk(__dirname).filter((f) => /\.tsx?$/.test(f) && !/\.test\.|__fixtures__/.test(f))
      .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?<![\w-])(border|shadow|ring|outline|divide)(-[\w/]+)?(?=[\s'"`])|gradient/g)].map((m) => `${f}: ${m[0]}`));
    expect(bad).toEqual([]);
  });
});
