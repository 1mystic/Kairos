import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreStore, LocalStore, createMemoryLocalDb } from '../store';
import { fakeFs } from '../store/testUtils';
import { Harness, TAX } from '../plan/harness.test-util';
import { OnboardingPage } from './Onboarding';
import { buildPreview } from './preview';
import { dateError, emptyDraft, examErrors, examsOk, sameEveryDay, weekendsHeavier } from './draft';
import { decodeExams, encodeExams, parseProfile, saveOnboardingFields, toFields } from './profileModel';

const TODAY = '2026-11-08';

describe('profile model', () => {
  it('packs exams into the cloud-allowed fields (<= 40 chars) and back', () => {
    const e = encodeExams([{ exam: 'NEET_UG', session: 1, date: '2027-05-03' }, { exam: 'JEE_MAIN', session: 2, date: '2027-04-04' }]);
    expect(e).toEqual({ exam: 'JEE_MAIN.2+NEET_UG.1@2027-05-03', examDate: '2027-04-04' });
    expect(e.exam.length).toBeLessThanOrEqual(40);
    expect(decodeExams(e.exam, e.examDate)).toEqual([{ exam: 'JEE_MAIN', session: 2, date: '2027-04-04' }, { exam: 'NEET_UG', session: 1, date: '2027-05-03' }]);
    expect(decodeExams('IAT', null)).toEqual([]);
  });
  it('parses defaults and ignores junk', () => {
    const p = parseProfile({ kind: 'guest', displayName: 'G', createdAt: 1, ambition: 'top', minutesPerWeekday: { '1': 90 }, offDay: null } as never);
    expect(p.ambition).toBe('top');
    expect(p.minutesPerWeekday[1]).toBe(90);
    expect(p.minutesPerWeekday[2]).toBe(120);
    expect(p.offDay).toBeNull();
    expect(parseProfile(null).onboarded).toBe(false);
  });
  it('guest save merges into the local profile in one write; cloud is one profile update with allowed fields only', async () => {
    const local = new LocalStore(createMemoryLocalDb());
    await saveOnboardingFields(local, toFields({ exams: [{ exam: 'IAT', session: 0, date: '2027-06-01' }], onboarded: true }));
    expect(await local.getProfile()).toMatchObject({ kind: 'guest', exam: 'IAT.0', examDate: '2027-06-01', onboarded: true });
    await saveOnboardingFields(local, toFields({ ambition: 'top' }));
    expect(await local.getProfile()).toMatchObject({ kind: 'guest', exam: 'IAT.0', ambition: 'top' });

    const f = fakeFs({ 'users/u1': { displayName: 'A' } });
    let updates = 0;
    const adapter = { ...f.adapter, updateProfile: async (p: string, x: Record<string, unknown>) => { updates++; return f.adapter.updateProfile(p, x); } };
    const cloud = new FirestoreStore('u1', adapter);
    await saveOnboardingFields(cloud, toFields({ exams: [{ exam: 'JEE_MAIN', session: 1, date: '2027-01-22' }], ambition: 'comfortable', minutesPerWeekday: { 0: 0, 1: 60 }, offDay: 0, chaptersDone: ['PHY.LOM'], onboarded: true }));
    expect(updates).toBe(1);
    const doc = f.docs.get('users/u1')!;
    expect(Object.keys(doc).sort()).toEqual(['ambition', 'chaptersDone', 'displayName', 'exam', 'examDate', 'minutesPerWeekday', 'offDay', 'onboarded']);
  });
});

describe('draft validation and presets', () => {
  it('validates dates', () => {
    expect(dateError('', TODAY)).toMatch(/Pick a date/);
    expect(dateError('2026-11-08', TODAY)).toMatch(/past/);
    expect(dateError('2031-01-01', TODAY)).toMatch(/three years/);
    expect(dateError('2027-02-30', TODAY)).toMatch(/valid/);
    expect(dateError('2027-02-14', TODAY)).toBeUndefined();
    const d = emptyDraft();
    expect(examsOk(d, TODAY)).toBe(false); // at least one exam is required
    d.picks = [{ exam: 'JEE_MAIN', sel: 0, date: '' }];
    expect(examErrors(d, TODAY).JEE_MAIN).toBeTruthy();
    d.picks = [{ exam: 'JEE_MAIN', sel: 0, date: '2027-02-14' }, { exam: 'DSA_INTERVIEW', sel: 0, date: '', none: true }];
    expect(examErrors(d, TODAY)).toEqual({}); // "No date yet" never has a date error
    expect(examsOk(d, TODAY)).toBe(true);
  });
  it('presets', () => {
    const m = { 0: 0, 1: 100, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30 };
    expect(Object.values(sameEveryDay(m, 0))).toEqual([0, 100, 100, 100, 100, 100, 100]);
    const h = weekendsHeavier(m, null);
    expect(h[6]).toBe(150);
    expect(h[2]).toBe(100);
  });
});

describe('plan preview', () => {
  const setup = (date: string, min = 120) => ({ exams: [{ exam: 'JEE_MAIN', session: 0, date }], ambition: 'competitive' as const, minutesPerWeekday: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, min])), offDay: null, chaptersDone: [] as string[] });
  it('fixed inputs: 100 days to go', () => {
    const p = buildPreview({ setup: setup('2027-02-16'), tax: TAX, today: TODAY })!;
    expect(p.daysLeft).toBe(100);
    expect(p.phases.map((x) => x.id)).toEqual(['strengthen', 'consolidate', 'exam_mode', 'final_sprint', 'taper']);
    expect(p.phases.reduce((a, x) => a + x.days, 0)).toBe(100);
    expect(p.phases.find((x) => x.id === 'taper')?.days).toBe(2);
    expect(p.counts.taper).toBe(2);
    expect(p.counts.work + p.counts.mock + p.counts.buffer + p.counts.taper + p.counts.sprint + p.counts.off).toBe(100);
    expect(p.counts.sprint).toBe(13);
    expect(p.counts.buffer).toBeGreaterThanOrEqual(8);
    expect(p.warning).toMatch(/^Only 100 days left: we start in Strengthen/);
    expect(p.weeklyMin).toBe(840);
  });
  it('a short runway starts in a late phase and warns in plain words', () => {
    const p = buildPreview({ setup: setup('2026-12-18'), tax: TAX, today: TODAY })!;
    expect(p.daysLeft).toBe(40);
    expect(p.startPhase).toBe('Consolidate');
    expect(p.warning).toContain('Only 40 days left: we start in Consolidate.');
    expect(buildPreview({ setup: setup('2027-04-01'), tax: TAX, today: TODAY })!.warning).toBeNull();
  });
  it('offers behind options with consent when time is too short', () => {
    const p = buildPreview({ setup: setup('2026-12-18', 20), tax: TAX, today: TODAY })!;
    expect(p.bundle.pace.status).toBe('behind');
    expect(p.bundle.behind?.requiresConsent).toBe(true);
    expect(buildPreview({ setup: { ...setup('2026-12-18'), exams: [] }, tax: TAX, today: TODAY })).toBeNull();
  });
});

async function fillDate(date: string) {
  const jee = screen.getByRole('checkbox', { name: /^JEE Main/ }) as HTMLInputElement;
  if (!jee.checked) await userEvent.click(jee);
  await userEvent.click(screen.getByRole('radio', { name: /My own date/ }));
  const input = screen.getByLabelText('Exam date') as HTMLInputElement;
  await userEvent.clear(input);
  await userEvent.type(input, date);
}
const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }));

describe('onboarding screen', () => {
  beforeEach(() => localStorage.clear());
  it('step 1: needs a valid date, shows live days to go, shows calendar status', async () => {
    render(<Harness><OnboardingPage taxonomy={TAX} today={TODAY} onDone={() => {}} /></Harness>);
    await screen.findByText(/Set up your plan/);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled(); // no exam chosen yet
    await userEvent.click(screen.getByRole('checkbox', { name: /^JEE Main/ }));
    expect(screen.getAllByText('Expected').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await fillDate('2027-02-16');
    expect(await screen.findByText(/days to go/)).toHaveTextContent('100 days to go');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    await userEvent.clear(screen.getByLabelText('Exam date'));
    await userEvent.type(screen.getByLabelText('Exam date'), '2026-11-01');
    expect(screen.getByRole('alert')).toHaveTextContent(/past/);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  it('guest: walks 5 steps, saves one local profile, nudges, and calls done', async () => {
    const db = createMemoryLocalDb();
    const done = vi.fn();
    render(<Harness localDb={db}><OnboardingPage taxonomy={TAX} today={TODAY} onDone={done} /></Harness>);
    await screen.findByText(/Set up your plan/);
    await fillDate('2027-02-16');
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Same every day' }));
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Select all in Physics' }));
    await next();
    await userEvent.click(screen.getByRole('radio', { name: /Comfortable/ }));
    await next();
    expect(await screen.findByRole('heading', { name: 'Here is your plan' })).toBeInTheDocument();
    expect(screen.getByText(/Only 100 days left/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start my plan' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const p = (await new LocalStore(db).getProfile()) as unknown as Record<string, unknown>;
    expect(p).toMatchObject({ exam: 'JEE_MAIN.0', examDate: '2027-02-16', ambition: 'comfortable', onboarded: true, offDay: 0 });
    expect((p.chaptersDone as string[]).length).toBeGreaterThan(5);
    expect((p.minutesPerWeekday as Record<string, number>)['0']).toBe(0);
    expect(localStorage.getItem('kairos-onboarding-draft')).toBeNull();
  });
  it('signed in: one Firestore profile update', async () => {
    const f = fakeFs({ 'users/u1': { displayName: 'Asha', onboarded: false } });
    let updates = 0;
    const fsAdapter = { ...f.adapter, updateProfile: async (p: string, x: Record<string, unknown>) => { updates++; return f.adapter.updateProfile(p, x); } };
    const done = vi.fn();
    render(<Harness uid="u1" fsAdapter={fsAdapter}><OnboardingPage taxonomy={TAX} today={TODAY} onDone={done} /></Harness>);
    await screen.findByText(/Set up your plan/);
    await fillDate('2027-02-16');
    for (let i = 0; i < 4; i++) await next();
    await userEvent.click(await screen.findByRole('button', { name: 'Start my plan' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(updates).toBe(1);
    expect(f.docs.get('users/u1')).toMatchObject({ exam: 'JEE_MAIN.0', examDate: '2027-02-16', onboarded: true });
  });
  it('behind: shows two choices and never applies one by itself', async () => {
    const db = createMemoryLocalDb();
    const store = new LocalStore(db);
    const done = vi.fn();
    render(<Harness localDb={db}><OnboardingPage taxonomy={TAX} today={TODAY} onDone={done} /></Harness>);
    await screen.findByText(/Set up your plan/);
    await fillDate('2026-12-18');
    await next();
    for (const r of screen.getAllByRole('slider')) if (!(r as HTMLInputElement).disabled) { /* keep defaults */ }
    await userEvent.selectOptions(screen.getByLabelText('Weekly off-day'), 'none');
    for (let i = 0; i < 3; i++) await next();
    const group = await screen.findByRole('group', { name: /Two ways to fix it/ });
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    expect(within(group).getByText(/Nothing changes unless you pick one/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start my plan' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const p = (await store.getProfile()) as { minutesPerWeekday: Record<string, number> };
    expect(p.minutesPerWeekday['1']).toBe(120);
    expect(await store.getState('pace')).toBeNull();
  });
  it('edit mode is prefilled and says Update my plan', async () => {
    const db = createMemoryLocalDb();
    const store = new LocalStore(db);
    await store.saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1, exam: 'IAT.0', examDate: '2027-06-01', ambition: 'top', onboarded: true });
    render(<Harness localDb={db}><OnboardingPage taxonomy={TAX} today={TODAY} onDone={() => {}} /></Harness>);
    await screen.findByText(/Your plan setup/);
    expect(screen.getByLabelText('Exam date')).toHaveValue('2027-06-01');
    for (let i = 0; i < 4; i++) await next();
    expect(await screen.findByRole('button', { name: 'Update my plan' })).toBeInTheDocument();
  });
});
