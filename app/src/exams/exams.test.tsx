import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStore, createMemoryLocalDb } from '../store';
import { fakeFs } from '../store/testUtils';
import { Harness } from '../plan/harness.test-util';
import { ExamSwitcher } from './ExamSwitcher';
import { ManageExamsPage } from './ManageExams';
import { examRoutes } from './routes';

const TODAY = '2026-11-08';
const jee = { exam: 'JEE_MAIN', kind: 'calendar', session: 1, date: '2027-01-22' };
const iat = { exam: 'IAT', kind: 'custom', date: '2027-06-01' };
const dsa = { exam: 'DSA_INTERVIEW', kind: 'none', date: null };

async function seedGuest(fields: Record<string, unknown>) {
  const db = createMemoryLocalDb();
  const store = new LocalStore(db);
  await store.saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1, onboarded: true, ...fields });
  return { db, store };
}

describe('exam switcher states', () => {
  beforeEach(() => localStorage.clear());
  it('renders nothing before the student has an exam', async () => {
    const db = createMemoryLocalDb();
    render(<Harness localDb={db}><ExamSwitcher /></Harness>);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId('exam-switcher')).toBeNull();
  });
  it('one profile: a plain chip linking to /exams, no menu', async () => {
    const { db } = await seedGuest({ exam: 'JEE_MAIN.1', examDate: '2027-01-22' });
    render(<Harness localDb={db}><ExamSwitcher /></Harness>);
    const chip = await screen.findByRole('link', { name: /Preparing for JEE Main/ });
    expect(chip).toHaveAttribute('href', '/exams');
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('several profiles: a menu with days to go, no date, Manage exams and Add an exam', async () => {
    const { db } = await seedGuest({ profiles: [jee, dsa], activeExam: 'JEE_MAIN', exam: 'JEE_MAIN.1', examDate: '2027-01-22' });
    render(<Harness localDb={db}><ExamSwitcher /></Harness>);
    const trigger = await screen.findByRole('button', { name: /Preparing for JEE Main/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Your exams' });
    const radios = within(menu).getAllByRole('menuitemradio');
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    expect(within(menu).getByText('No date yet')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Manage exams' })).toHaveAttribute('href', '/exams');
    expect(within(menu).getByRole('menuitem', { name: 'Add an exam' })).toHaveAttribute('href', '/onboarding?add=1');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });
  it('guest: switching updates the active exam and the packed fields in the local profile', async () => {
    const { db, store } = await seedGuest({ profiles: [jee, iat], activeExam: 'JEE_MAIN', exam: 'JEE_MAIN.1', examDate: '2027-01-22' });
    render(<Harness localDb={db}><ExamSwitcher /></Harness>);
    await userEvent.click(await screen.findByRole('button', { name: /Preparing for JEE Main/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /IAT/ }));
    await waitFor(async () => expect(await store.getProfile()).toMatchObject({ activeExam: 'IAT', exam: 'IAT.0', examDate: '2027-06-01' }));
    expect(await screen.findByRole('button', { name: /Preparing for IAT/ })).toBeInTheDocument(); // no reload
  });
  it('signed in: a switch is exactly ONE profile write', async () => {
    const f = fakeFs({ 'users/u1': { displayName: 'A', onboarded: true, profiles: [jee, iat], activeExam: 'JEE_MAIN', exam: 'JEE_MAIN.1', examDate: '2027-01-22' } });
    let updates = 0;
    const adapter = { ...f.adapter, updateProfile: async (p: string, x: Record<string, unknown>) => { updates++; return f.adapter.updateProfile(p, x); } };
    render(<Harness uid="u1" fsAdapter={adapter}><ExamSwitcher /></Harness>);
    await userEvent.click(await screen.findByRole('button', { name: /Preparing for JEE Main/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /IAT/ }));
    await waitFor(() => expect(updates).toBe(1));
    expect(f.docs.get('users/u1')).toMatchObject({ activeExam: 'IAT', exam: 'IAT.0', examDate: '2027-06-01' });
    expect(Object.keys(f.docs.get('users/u1')!).sort()).toEqual(['activeExam', 'displayName', 'exam', 'examDate', 'onboarded', 'profiles']);
  });
  it('a legacy account (only the packed exam) shows its derived profiles without writing anything', async () => {
    const f = fakeFs({ 'users/u1': { displayName: 'A', onboarded: true, exam: 'JEE_MAIN.2+NEET_UG.1@2027-05-03', examDate: '2027-04-04' } });
    let updates = 0;
    const adapter = { ...f.adapter, updateProfile: async (p: string, x: Record<string, unknown>) => { updates++; return f.adapter.updateProfile(p, x); } };
    render(<Harness uid="u1" fsAdapter={adapter}><ExamSwitcher /></Harness>);
    await userEvent.click(await screen.findByRole('button', { name: /Preparing for JEE Main/ }));
    expect(within(screen.getByRole('menu')).getAllByRole('menuitemradio')).toHaveLength(2);
    expect(updates).toBe(0);
  });
});

describe('manage exams page', () => {
  beforeEach(() => localStorage.clear());
  const page = (db: ReturnType<typeof createMemoryLocalDb>) => (
    <Harness localDb={db} path="/exams"><Routes><Route path="/exams" element={<ManageExamsPage today={TODAY} />} /></Routes></Harness>
  );
  it('is mounted at /exams', () => {
    expect(examRoutes.map((r) => r.path)).toEqual(['/exams']);
  });
  it('lists each profile with status and date source; the last one cannot be removed', async () => {
    const { db } = await seedGuest({ exam: 'IAT.0', examDate: '2027-06-01' });
    render(page(db));
    const card = await screen.findByRole('article', { name: 'IAT' });
    expect(within(card).getByText('Active')).toBeInTheDocument();
    expect(within(card).getByText(/Your own date/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Remove' })).toBeDisabled();
    expect(within(card).queryByRole('button', { name: 'Make active' })).toBeNull();
  });
  it('Make active switches in one write; Remove asks first and keeps the others', async () => {
    const { db, store } = await seedGuest({ profiles: [jee, iat, dsa], activeExam: 'JEE_MAIN', exam: 'JEE_MAIN.1', examDate: '2027-01-22' });
    render(page(db));
    const iatCard = await screen.findByRole('article', { name: 'IAT' });
    await userEvent.click(within(iatCard).getByRole('button', { name: 'Make active' }));
    await waitFor(async () => expect(await store.getProfile()).toMatchObject({ activeExam: 'IAT', exam: 'IAT.0' }));
    const dsaCard = await screen.findByRole('article', { name: 'DSA Interview' });
    expect(within(dsaCard).getByText('No date')).toBeInTheDocument();
    await userEvent.click(within(dsaCard).getByRole('button', { name: 'Remove' }));
    const dlg = await screen.findByRole('dialog', { name: /Remove DSA Interview/ });
    await userEvent.click(within(dlg).getByRole('button', { name: 'Keep it' }));
    expect((await store.getProfile() as unknown as { profiles: unknown[] }).profiles).toHaveLength(3);
    await userEvent.click(within(await screen.findByRole('article', { name: 'DSA Interview' })).getByRole('button', { name: 'Remove' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^Remove DSA Interview/ }));
    await waitFor(async () => expect((await store.getProfile() as unknown as { profiles: Array<{ exam: string }> }).profiles.map((p) => p.exam)).toEqual(['JEE_MAIN', 'IAT']));
  });
  it('Change date opens the sitting block and saves a new own date', async () => {
    const { db, store } = await seedGuest({ profiles: [iat, dsa], activeExam: 'IAT', exam: 'IAT.0', examDate: '2027-06-01' });
    render(page(db));
    const card = await screen.findByRole('article', { name: 'IAT' });
    await userEvent.click(within(card).getByRole('button', { name: 'Change date or sitting' }));
    const dlg = await screen.findByRole('dialog');
    const input = within(dlg).getByLabelText('Exam date');
    await userEvent.clear(input);
    await userEvent.type(input, '2027-07-15');
    await userEvent.click(within(dlg).getByRole('button', { name: 'Save' }));
    await waitFor(async () => expect(await store.getProfile()).toMatchObject({ examDate: '2027-07-15' }));
  });
  it('Add an exam lists only exams that are not chosen yet', async () => {
    const { db } = await seedGuest({ profiles: [jee, iat], activeExam: 'JEE_MAIN', exam: 'JEE_MAIN.1', examDate: '2027-01-22' });
    render(page(db));
    await userEvent.click(await screen.findByRole('button', { name: 'Add an exam' }));
    const dlg = await screen.findByRole('dialog', { name: 'Add an exam' });
    expect(within(dlg).queryByRole('checkbox', { name: /^JEE Main/ })).toBeNull();
    expect(within(dlg).queryByRole('checkbox', { name: /^IAT/ })).toBeNull();
    expect(within(dlg).getByRole('checkbox', { name: /^NEET UG/ })).toBeInTheDocument();
    expect(within(dlg).getByRole('checkbox', { name: /DSA Interview/ })).toBeInTheDocument();
  });
});
