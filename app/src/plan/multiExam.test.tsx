import { render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStore, createMemoryLocalDb, type LocalDb } from '../store';
import { Harness, testEnv } from './harness.test-util';
import { getPlanFor, legacyOwnerOf, parsePlanKey, planKey, readPaceFor, withPaceFor } from './keys';
import { DayPage, PlanPage } from './PlanScreens';
import type { StoredPlan } from './engine';

const TODAY = '2026-11-08';
const MIN = { '0': 120, '1': 120, '2': 120, '3': 120, '4': 120, '5': 120, '6': 120 };

describe('plan and pace keys', () => {
  it('plan ids are `${exam}~${date}` and parse back', () => {
    expect(planKey('IAT', '2027-01-05')).toBe('IAT~2027-01-05');
    expect(parsePlanKey('IAT~2027-01-05')).toEqual({ exam: 'IAT', date: '2027-01-05' });
    expect(parsePlanKey('2027-01-05')).toBeNull();
  });
  it('getPlanFor reads the keyed doc first, then the legacy date doc for the legacy owner only', async () => {
    const store = new LocalStore(createMemoryLocalDb());
    await store.putPlan('2026-11-07', { date: '2026-11-07', tasks: [] , tag: 'legacy' } as never);
    expect((await getPlanFor(store, 'JEE_MAIN', '2026-11-07', true))?.tag).toBe('legacy');
    expect(await getPlanFor(store, 'IAT', '2026-11-07', false)).toBeNull();
    await store.putPlan('JEE_MAIN~2026-11-07', { date: '2026-11-07', tasks: [], tag: 'keyed' } as never);
    expect((await getPlanFor(store, 'JEE_MAIN', '2026-11-07', true))?.tag).toBe('keyed');
  });
  it('pace: the old flat doc is the legacy owner\'s entry; the first write moves it under byExam', () => {
    const flat = { snapshotDate: '2026-11-07', dropped: ['PHY.LOM'], fu: 1.1 };
    expect(readPaceFor(flat, 'JEE_MAIN', 'JEE_MAIN')).toEqual(flat);
    expect(readPaceFor(flat, 'IAT', 'JEE_MAIN')).toBeNull();
    expect(readPaceFor(null, 'IAT', 'JEE_MAIN')).toBeNull();
    const w = withPaceFor(flat, 'IAT', { snapshotDate: TODAY }, 'JEE_MAIN');
    expect(w).toEqual({ byExam: { JEE_MAIN: flat, IAT: { snapshotDate: TODAY } }, legacyExam: 'JEE_MAIN' });
    expect(readPaceFor(w, 'JEE_MAIN', 'IAT')).toEqual(flat);
    expect(legacyOwnerOf(w, 'IAT')).toBe('JEE_MAIN'); // the stamp beats the guess
    expect(withPaceFor(w, 'IAT', { snapshotDate: '2026-11-09' }, 'IAT').byExam).toMatchObject({ JEE_MAIN: flat, IAT: { snapshotDate: '2026-11-09' } });
  });
});

async function seed(db: LocalDb, over: Record<string, unknown>) {
  const s = new LocalStore(db);
  await s.saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1, ambition: 'competitive', offDay: null, onboarded: true, minutesPerWeekday: MIN, chaptersDone: [], ...over });
  return s;
}
const page = (db: LocalDb) => (
  <Harness localDb={db} env={testEnv()} path="/plan">
    <Routes>
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/plan/:date" element={<DayPage />} />
    </Routes>
  </Harness>
);

describe('plans follow the active exam', () => {
  beforeEach(() => localStorage.clear());
  it('each exam writes its own keyed plan and pace entry; switching never overwrites the other', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db, {
      profiles: [{ exam: 'JEE_MAIN', kind: 'custom', date: '2027-02-16' }, { exam: 'GATE_DA', kind: 'custom', date: '2027-02-06' }],
      activeExam: 'JEE_MAIN', exam: 'JEE_MAIN.0', examDate: '2027-02-16',
    });
    const a = render(page(db));
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    const jeePlan = (await store.getPlan(`JEE_MAIN~${TODAY}`)) as unknown as StoredPlan;
    expect(jeePlan.tasks.length).toBeGreaterThan(0);
    expect(await store.getPlan(`GATE_DA~${TODAY}`)).toBeNull();
    a.unmount();
    await store.saveProfile({ activeExam: 'GATE_DA', exam: 'GATE_DA.0', examDate: '2027-02-06' });
    render(page(db));
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(await store.getPlan(`GATE_DA~${TODAY}`)).not.toBeNull();
    expect(((await store.getPlan(`JEE_MAIN~${TODAY}`)) as unknown as StoredPlan).tasks).toEqual(jeePlan.tasks);
    const pace = (await store.getState('pace')) as { byExam: Record<string, unknown> };
    expect(Object.keys(pace.byExam).sort()).toEqual(['GATE_DA', 'JEE_MAIN']);
  });
  it('a legacy account keeps its date-keyed plan: reading falls back to it, writing moves to the keyed id', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db, { exam: 'JEE_MAIN.0', examDate: '2027-02-16' });
    await store.putPlan('2026-11-07', { date: '2026-11-07', tasks: [{ id: 'x', kind: 'practice', chapter: 'PHY.LOM', topic: 'PHY.LOM', items: 5, est_min: 10, status: 'done' }] } as never);
    render(page(db));
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(await store.getPlan(`JEE_MAIN~${TODAY}`)).not.toBeNull();
    expect(await store.getPlan(TODAY)).toBeNull();
  });
  it('a keyed past day is shown by /plan/:date', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db, { exam: 'JEE_MAIN.0', examDate: '2027-02-16' });
    await store.putPlan('JEE_MAIN~2026-11-07', { date: '2026-11-07', tasks: [{ id: 'k1', kind: 'practice', chapter: 'PHY.LOM', topic: 'PHY.LOM', items: 5, est_min: 10, status: 'done' }] } as never);
    render(<Harness localDb={db} env={testEnv()} path="/plan/2026-11-07"><Routes><Route path="/plan/:date" element={<DayPage />} /></Routes></Harness>);
    expect(await screen.findByRole('heading', { name: /7 Nov 2026/ })).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
  it('an interview track without a date skips the phase planner: steady practice, nothing written for the plan', async () => {
    const db = createMemoryLocalDb();
    const store = await seed(db, { profiles: [{ exam: 'DSA_INTERVIEW', kind: 'none', date: null }], activeExam: 'DSA_INTERVIEW', exam: 'DSA_INTERVIEW.0', examDate: null });
    render(page(db));
    expect(await screen.findByRole('heading', { name: /Steady practice for DSA Interview/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start today's session/ })).toHaveAttribute('href', '/practice/today');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Today' })).toBeNull());
    expect(await store.getPlan(`DSA_INTERVIEW~${TODAY}`)).toBeNull();
    expect(await store.getState('pace')).toBeNull();
  });
});
