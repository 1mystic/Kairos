import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, beforeEach } from 'vitest';
import type { ExamCalendar } from '@kairos/core';
import { LocalStore, createMemoryLocalDb, type LocalDb } from '../store';
import { Harness, TAX, testEnv } from './harness.test-util';
import { PacePanel, PlanPage, DayPage, TodayCard } from './PlanScreens';
import { buildPlanContext, computeTodayPace, todayPlan, type StoredPlan } from './engine';
import type { PlanView, TodayPlan } from './usePlan';
import { STATUS_WORDS, groupTasks } from './format';

const TODAY = '2026-11-08';

async function seed(db: LocalDb, over: Record<string, unknown> = {}) {
  const s = new LocalStore(db);
  await s.saveProfile({
    kind: 'guest', displayName: 'G', createdAt: 1, exam: 'JEE_MAIN.0', examDate: '2027-02-16', ambition: 'competitive', offDay: null, onboarded: true,
    minutesPerWeekday: { '0': 120, '1': 120, '2': 120, '3': 120, '4': 120, '5': 120, '6': 120 }, chaptersDone: [], ...over,
  });
  return s;
}
const page = (db: LocalDb, env = testEnv()) => (
  <Harness localDb={db} env={env} path="/plan">
    <Routes>
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/plan/:date" element={<DayPage />} />
    </Routes>
  </Harness>
);

function mkView(minutes: number, done: string[] = []): PlanView {
  const setup = { exams: [{ exam: 'JEE_MAIN', session: 0, date: '2027-02-16' }], ambition: 'competitive' as const, minutesPerWeekday: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, minutes])), offDay: null, chaptersDone: done };
  const ctx = buildPlanContext({ setup, tax: TAX, today: TODAY, mastery: null, sessions: [], recentPlans: [], pace: {}, fu: 1 })!;
  const r = todayPlan(ctx);
  return { today: TODAY, ctx, plan: r.plan, horizon: r.horizon, bundle: computeTodayPace(ctx), yesterday: { planned: 50, done: 41 }, nextMock: ctx.fromToday.find((d) => d.kind === 'mock') ?? null, parked: [], profile: { exams: setup.exams, profiles: [{ exam: 'JEE_MAIN', kind: 'custom', date: '2027-02-16' }], examId: 'JEE_MAIN', ambition: 'competitive', minutesPerWeekday: setup.minutesPerWeekday, offDay: null, chaptersDone: [], lang: 'en', onboarded: true }, reanchor: null, tax: TAX };
}

describe('today card for each pace status', () => {
  const cases = [
    ['ahead', 480, 'all'],
    ['behind', 15, 'none'],
  ] as const;
  it.each(cases)('%s', (status, minutes, done) => {
    const v = mkView(minutes, done === 'all' ? [...new Set(TAX.subjects.flatMap((s) => s.chapters.map((c) => c.id)))] : []);
    expect(v.bundle.pace.status).toBe(status);
    render(<Harness><TodayCard view={v} /></Harness>);
    expect(screen.getByText(STATUS_WORDS[status].label, { selector: '.chip' })).toBeInTheDocument();
    expect(screen.getByText(/to JEE Main/)).toBeInTheDocument();
    expect(screen.getByText(/buffer days? left/)).toBeInTheDocument();
    expect(screen.getByText(/41 min of 50 min done/)).toBeInTheDocument();
    expect(screen.getByText(/Your score band appears after your first mock/)).toBeInTheDocument();
  });
  const t = (over: Partial<TodayPlan> = {}): TodayPlan => ({ raiseAmbition: async () => {}, addMinutesPerDay: async () => {}, parkChapters: async () => {}, ...over }) as unknown as TodayPlan;
  const withStatus = (v: PlanView, status: PlanView['bundle']['pace']['status']): PlanView => ({ ...v, bundle: { ...v.bundle, pace: { ...v.bundle.pace, status } } });
  it('pace panel copy per status: ahead offers, on track is quiet, slightly behind names buffer days, behind gives two choices', () => {
    const base = mkView(120);
    const r = (s: PlanView['bundle']['pace']['status'], b: Partial<PlanView['bundle']> = {}) => {
      const v = withStatus(base, s);
      return render(<Harness><PacePanel t={t()} view={{ ...v, bundle: { ...v.bundle, ...b } }} /></Harness>);
    };
    let u = r('ahead');
    expect(screen.getByText(/Nothing changes unless you say so/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aim a little higher' })).toBeInTheDocument();
    u.unmount();
    u = r('on_track');
    expect(screen.getByText(/On track\. Keep today/)).toBeInTheDocument();
    u.unmount();
    u = r('slightly_behind', { bufferDates: ['2026-12-05', '2026-12-12'], bufferDaysLeft: 5 });
    expect(screen.getByText(/2 buffer days \(Sat 5 Dec, Sat 12 Dec\).*3 left after that/)).toBeInTheDocument();
    u.unmount();
    const b = mkView(15).bundle;
    render(<Harness><PacePanel t={t()} view={{ ...base, bundle: b }} /></Harness>);
    expect(screen.getByText(/Add \d+ min a day/)).toBeInTheDocument();
    expect(screen.getByText(/Park \d+ lower-weight chapter/)).toBeInTheDocument();
    expect(screen.getByText(/nothing changes until you choose/)).toBeInTheDocument();
  });
  it('groups tasks warm-up, hardest, practice, review', () => {
    const v = mkView(240);
    const ids = groupTasks(v.plan.tasks).map((g) => g.id);
    const order = ['mock', 'check', 'warmup', 'weak', 'practice', 'review'];
    expect(ids).toEqual(order.filter((o) => ids.includes(o as never)));
  });
});

describe('plan page', () => {
  beforeEach(() => localStorage.clear());
  it('empty state without an exam date points to onboarding', async () => {
    const db = createMemoryLocalDb();
    await new LocalStore(db).saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1 });
    render(page(db));
    expect(await screen.findByText('When is your exam?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set your exam date' })).toHaveAttribute('href', '/onboarding');
  });
  it('shows the passed state when the date is behind us', async () => {
    const db = createMemoryLocalDb();
    await seed(db, { examDate: '2026-11-01' });
    render(page(db));
    expect(await screen.findByText('That exam date has passed')).toBeInTheDocument();
  });
  it('first open (guest): renders the Today card and writes plan + snapshot once; reopening writes nothing more', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db);
    const env = testEnv();
    const first = render(page(db, env));
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "Today's tasks" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Start/ })[0]!.getAttribute('href')).toMatch(/^\/practice\/JEE_MAIN\/[A-Z]+\.[A-Z0-9]+\?size=\d+&bands=/);
    const plan = (await store.getPlan(`JEE_MAIN~${TODAY}`)) as unknown as StoredPlan;
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(await store.getPlan(TODAY)).toBeNull(); // new writes are keyed by exam
    expect(await store.listPaceLog()).toHaveLength(1);
    expect(((await store.getState('pace')) as { byExam: Record<string, { snapshotDate?: string }> }).byExam.JEE_MAIN?.snapshotDate).toBe(TODAY);
    first.unmount();
    let puts = 0;
    const orig = store.db.put.bind(store.db);
    store.db.put = async (...a: Parameters<typeof orig>) => { puts++; return orig(...a); };
    render(page(db, env));
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(puts).toBe(0);
  });
  it('ticking a task persists to plans/{date} (debounced; flushed when the page hides)', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db);
    render(page(db));
    const boxes = await screen.findAllByRole('checkbox');
    const before = (await store.getPlan(`JEE_MAIN~${TODAY}`)) as unknown as StoredPlan;
    expect(before.tasks.every((t) => t.status === 'todo')).toBe(true);
    await userEvent.click(boxes[0]!);
    expect(boxes[0]).toHaveAttribute('aria-checked', 'true');
    expect(((await store.getPlan(`JEE_MAIN~${TODAY}`)) as unknown as StoredPlan).tasks.every((t) => t.status === 'todo')).toBe(true);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(async () => expect(((await store.getPlan(`JEE_MAIN~${TODAY}`)) as unknown as StoredPlan).tasks.filter((t) => t.status === 'done')).toHaveLength(1));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(screen.getByText(/1\/\d+ done/)).toBeInTheDocument();
  });
  it('/plan/:date shows a stored past day read-only', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db);
    const v = mkView(120);
    const t = { ...v.plan.tasks[0]!, status: 'done' as const };
    await store.putPlan('2026-11-07', { ...v.plan, date: '2026-11-07', tasks: [t] } as never);
    render(<Harness localDb={db} env={testEnv()} path="/plan/2026-11-07"><Routes><Route path="/plan/:date" element={<DayPage />} /></Routes></Harness>);
    expect(await screen.findByRole('heading', { name: /7 Nov 2026/ })).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to today' })).toBeInTheDocument();
  });
  it('backlog notice appears for yesterday\'s open work', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db);
    const y = mkView(120).plan.tasks.filter((t) => t.items > 0).slice(0, 2).map((t) => ({ ...t, id: `2026-11-07#${t.id}` }));
    await store.putPlan('2026-11-07', { date: '2026-11-07', tasks: y } as never);
    render(page(db));
    await screen.findByRole('heading', { name: 'Today' });
    expect(await screen.findByText(/carried to today|Dropped|spread over/)).toBeInTheDocument();
  });
});

describe('roll-forward and re-anchor', () => {
  const cal: ExamCalendar = [
    { id: 'J1', exam: 'JEE_MAIN', session: 1, date: null, window: { start: '2026-10-20', end: '2026-10-30' }, status: 'official' },
    { id: 'J2', exam: 'JEE_MAIN', session: 2, date: '2027-04-04', status: 'expected' },
  ];
  it('asks about Session 2 once Session 1 has passed, and rolls the profile forward on accept', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db, { exam: 'JEE_MAIN.1', examDate: '2026-10-25' });
    render(page(db, testEnv({ calendar: cal })));
    const dlg = await screen.findByRole('dialog', { name: 'JEE Main Session 1 has passed' });
    expect(within(dlg).getByText(/Aim for Session 2\?/)).toBeInTheDocument();
    expect(within(dlg).getByText(/progress carries over/)).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: /Yes, aim for Session 2/ }));
    await waitFor(async () => expect(await store.getProfile()).toMatchObject({ exam: 'JEE_MAIN.2', examDate: '2027-04-04' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
  });
  it('"Not now" closes the modal without changing anything', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db, { exam: 'JEE_MAIN.1', examDate: '2026-10-25' });
    render(page(db, testEnv({ calendar: cal })));
    const dlg = await screen.findByRole('dialog');
    await userEvent.click(within(dlg).getAllByRole('button', { name: /Not now/ })[0]!);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await store.getProfile()).toMatchObject({ exam: 'JEE_MAIN.1', examDate: '2026-10-25' });
  });
  it('re-anchors to an official date with a one-line notice, once', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db, { exam: 'JEE_MAIN.2', examDate: '2027-04-01' });
    const env = testEnv({ calendar: cal });
    const a = render(page(db, env));
    expect(await screen.findByText(/JEE Main now has a expected date: 4 Apr 2027|Exam date changed|your plan was re-anchored/i)).toBeInTheDocument();
    expect(await store.getProfile()).toMatchObject({ examDate: '2027-04-04' });
    expect(((await store.getState('pace')) as { byExam: Record<string, { anchor?: unknown }> }).byExam.JEE_MAIN?.anchor).toMatchObject({ date: '2027-04-04' });
    a.unmount();
    render(page(db, env));
    await screen.findByRole('heading', { name: 'Today' });
    expect(screen.queryByText(/re-anchored/)).toBeNull();
  });
});
