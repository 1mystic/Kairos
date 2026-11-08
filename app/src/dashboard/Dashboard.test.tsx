import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth/AuthProvider';
import { LocalStore, StoreProvider, createMemoryLocalDb } from '../store';
import { Dashboard } from './Dashboard';
import { defaultLayout, LAYOUT_KEY } from './layout';
import { selectRangeData, selectReadiness } from './data';
import { selectPlan } from './plan';
import { makeSampleBundle } from './sample';
import { WIDGET_COMPONENTS, type WidgetCtx } from './widgets';
import { WIDGET_IDS, defaultOptions, metaOf } from './registry';

const auth = { user: null, profile: null, loading: false } as unknown as AuthContextValue;
const NOW = new Date(2026, 10, 8, 15, 0).getTime();
const now = () => NOW;

async function mount(seed?: (s: LocalStore) => Promise<void>) {
  const db = createMemoryLocalDb();
  if (seed) await seed(new LocalStore(db));
  return render(
    <AuthContext.Provider value={auth}>
      <StoreProvider localDb={db}><MemoryRouter><Dashboard now={now} /></MemoryRouter></StoreProvider>
    </AuthContext.Provider>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('empty (new user)', () => {
  it('shows friendly empty states with one CTA each, and no fake numbers', async () => {
    await mount();
    const plan = await screen.findByRole('region', { name: 'Plan and pace' });
    expect(within(plan).getByText('Set your exam date to get a plan')).toBeInTheDocument();
    expect(within(plan).getByRole('link', { name: 'Set exam date' })).toHaveAttribute('href', '/onboarding');
    const ready = screen.getByRole('region', { name: 'Readiness' });
    expect(within(ready).getByRole('link', { name: 'Start practising' })).toHaveAttribute('href', '/practice');
    expect(within(screen.getByRole('region', { name: 'Top chapters' })).getByRole('link', { name: 'Open practice' })).toHaveAttribute('href', '/practice');
    expect(within(screen.getByRole('region', { name: 'Activity' })).getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Try this' })).toHaveTextContent('Start small');
    expect(screen.queryByText('Sample data.')).not.toBeInTheDocument();
  });
});

describe('real data', () => {
  it('renders totals from the store for the daily range', async () => {
    await mount(async (s) => {
      await s.addSession({ id: 's1', startedAt: new Date(2026, 10, 8, 10).getTime(), exam: 'JEE_MAIN', chapter: 'PHY.ROT', summary: { n: 20, correct: 15, wrong: 5, skipped: 0, totalTimeMs: 1_200_000, byChapter: { 'PHY.ROT': { n: 20, correct: 15, wrong: 5, skipped: 0, timeMs: 1_200_000 } }, labels: { silly_mistake: 5 } } });
    });
    const stats = await screen.findByRole('region', { name: 'Stats' });
    await waitFor(() => expect(within(stats).getByText('20')).toBeInTheDocument());
    expect(within(stats).getByText('75%')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Top chapters' })).getByRole('link', { name: /15\/20 correct/ })).toHaveAttribute('href', '/practice/JEE_MAIN/PHY.ROT');
    expect(screen.getByRole('region', { name: 'Try this' })).toHaveTextContent('Slow the first read');
  });
});

describe('sample data toggle', () => {
  it('swaps in sample data with a banner, and back', async () => {
    const u = userEvent.setup();
    await mount();
    await screen.findByRole('region', { name: 'Plan and pace' });
    await u.click(screen.getByRole('switch', { name: /preview with sample data/i }));
    expect(screen.getByText('Sample data.')).toBeInTheDocument();
    const plan = screen.getByRole('region', { name: 'Plan and pace' });
    expect(within(plan).getByText('97')).toBeInTheDocument();
    expect(within(plan).getByText('On track', { selector: '.chip' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Top chapters' })).getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /by day/i })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Turn off' }));
    expect(screen.queryByText('Sample data.')).not.toBeInTheDocument();
  });
});

describe('range control', () => {
  it('is a radio group; arrows change range; prev/next move the window; Today resets', async () => {
    const u = userEvent.setup();
    await mount();
    const g = await screen.findByRole('radiogroup', { name: 'Date range' });
    expect(within(g).getByRole('radio', { name: 'Daily' })).toBeChecked();
    expect(screen.getByText('Sun 8 Nov 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.getByText('Sat 7 Nov 2026')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('Sun 8 Nov 2026')).toBeInTheDocument();
    within(g).getByRole('radio', { name: 'Daily' }).focus();
    await u.keyboard('{ArrowRight}');
    expect(within(g).getByRole('radio', { name: 'Week' })).toBeChecked();
    expect(screen.getByText('2 Nov to 8 Nov 2026')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LAYOUT_KEY)!).range).toBe('week');
  });
});

describe('customise', () => {
  async function open() {
    const u = userEvent.setup();
    await mount();
    await screen.findByRole('region', { name: 'Plan and pace' });
    await u.click(screen.getByRole('button', { name: /customise/i }));
    return { u, dlg: screen.getByRole('dialog', { name: 'Customise dashboard' }) };
  }
  it('hides a widget with its switch and persists it', async () => {
    const { u, dlg } = await open();
    await u.click(within(dlg).getByRole('switch', { name: 'Show Trend' }));
    expect(screen.queryByRole('region', { name: 'Trend' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LAYOUT_KEY)!).widgets.find((w: { id: string }) => w.id === 'trend').visible).toBe(false);
  });
  it('reorders with up/down buttons and announces it', async () => {
    const { u, dlg } = await open();
    await u.click(within(dlg).getByRole('button', { name: 'Move Readiness up' }));
    expect(within(dlg).getByRole('status')).toHaveTextContent('Moved Readiness to position 1 of 10');
    const stored = JSON.parse(localStorage.getItem(LAYOUT_KEY)!);
    expect(stored.widgets[0].id).toBe('readiness');
    expect(within(dlg).getByRole('button', { name: 'Move Readiness up' })).toBeDisabled();
  });
  it('changes size and a per-widget option', async () => {
    const { u, dlg } = await open();
    await u.click(within(dlg).getByRole('radio', { name: 'Small Top chapters' }));
    expect(document.querySelector('[data-widget=chapters]')).toHaveAttribute('data-size', 's');
    await u.selectOptions(within(dlg).getByLabelText('Default metric'), 'minutes');
    expect(JSON.parse(localStorage.getItem(LAYOUT_KEY)!).widgets.find((w: { id: string }) => w.id === 'trend').options.metric).toBe('minutes');
  });
  it('limits stat tiles to four', async () => {
    const { u, dlg } = await open();
    const mocks = within(dlg).getByRole('checkbox', { name: 'Mocks taken' });
    expect(mocks).toBeDisabled();
    await u.click(within(dlg).getByRole('checkbox', { name: 'Study time' }));
    expect(mocks).toBeEnabled();
  });
  it('presets and reset', async () => {
    const { u, dlg } = await open();
    await u.click(within(dlg).getByRole('button', { name: 'Minimal' }));
    expect(screen.queryByRole('region', { name: 'Trend' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Readiness' })).toBeInTheDocument();
    await u.click(within(dlg).getByRole('button', { name: 'Reset to default' }));
    expect(screen.getByRole('region', { name: 'Trend' })).toBeInTheDocument();
    expect(within(dlg).getByRole('status')).toHaveTextContent('reset');
  });
  it('Esc closes and restores focus; Tab is trapped', async () => {
    const { u, dlg } = await open();
    expect(dlg.contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 80; i++) await u.tab();
    expect(dlg.contains(document.activeElement)).toBe(true);
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /customise/i })).toHaveFocus();
  });
  it('card menu hides a card and sets size', async () => {
    const u = userEvent.setup();
    await mount();
    const tip = await screen.findByRole('region', { name: 'Try this' });
    await u.click(within(tip).getByRole('button', { name: 'Try this options' }));
    await u.click(screen.getByRole('menuitemradio', { name: /Medium/ }));
    expect(document.querySelector('[data-widget=tip]')).toHaveAttribute('data-size', 'm');
    await u.click(within(screen.getByRole('region', { name: 'Try this' })).getByRole('button', { name: 'Try this options' }));
    await u.click(screen.getByRole('menuitem', { name: 'Hide card' }));
    expect(screen.queryByRole('region', { name: 'Try this' })).not.toBeInTheDocument();
  });
  it('restores a saved layout and ignores unknown ids', async () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ v: 1, range: 'month', widgets: [{ id: 'ghost', visible: true, size: 'm', options: {} }, { id: 'tip', visible: true, size: 's', options: {} }] }));
    await mount();
    expect(await screen.findByRole('radio', { name: 'Month' })).toBeChecked();
    expect(screen.queryByText('ghost')).not.toBeInTheDocument();
  });
});

describe('every widget renders with sample data (all sizes)', () => {
  const today = '2026-11-08';
  const bundle = makeSampleBundle(today);
  const range = { kind: 'week' as const, end: today };
  const ctx: WidgetCtx = {
    range, today, bundle, data: selectRangeData(bundle.sessions, bundle.mocks, bundle.mastery, range, { today, names: bundle.names, uploads: bundle.uploads }),
    readiness: selectReadiness(bundle.mastery), plan: selectPlan(bundle.profile, bundle.paceLog, today, { workRemainingMin: bundle.workRemainingMin }),
  };
  for (const id of WIDGET_IDS) {
    for (const size of metaOf(id)!.sizes) {
      it(`${id} (${size})`, () => {
        const W = WIDGET_COMPONENTS[id];
        const { container } = render(<MemoryRouter><W size={size} options={defaultOptions(metaOf(id)!)} ctx={ctx} /></MemoryRouter>);
        expect(container.textContent?.length).toBeGreaterThan(10);
        cleanup();
      });
    }
  }
  it('sample plan has a pace result; readiness band option renders', () => {
    expect(ctx.plan?.pace).not.toBeNull();
    const W = WIDGET_COMPONENTS.readiness;
    render(<W size="m" options={{ view: 'band' }} ctx={ctx} />);
    expect(screen.getByRole('img', { name: /Predicted score 148 to 196 out of 300/ })).toBeInTheDocument();
  });
  it('default layout covers the catalogue', () => expect(defaultLayout().widgets).toHaveLength(WIDGET_IDS.length));
});

describe('flat style', () => {
  it('has no border / shadow / ring utilities or hex colours in dashboard sources', () => {
    const files = readdirSync(__dirname, { recursive: true, withFileTypes: false }).map(String).filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes('.test.') && !f.startsWith('_harness'));
    for (const f of files) {
      const src = readFileSync(join(__dirname, f), 'utf8');
      expect(src, f).not.toMatch(/(?<![\w-])(border|shadow|ring|divide)(-[\w/]+)*(?=[\s'"`])/);
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
      expect(src, f).not.toMatch(/gradient\(/);
    }
  });
});
