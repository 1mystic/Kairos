import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStore, createMemoryLocalDb } from '../store';
import { Harness, TAX } from '../plan/harness.test-util';
import { OnboardingPage } from './Onboarding';
import { draftFromProfile, readDraft, toProfiles } from './draft';
import { togglePick } from './ExamChooser';
import { parseProfile, toFields } from './profileModel';

const TODAY = '2026-11-08';
const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }));

describe('profile model with exam profiles', () => {
  it('legacy packed strings give the active exam as the plan input and all exams as profiles', () => {
    const p = parseProfile({ kind: 'guest', displayName: 'G', createdAt: 1, exam: 'JEE_MAIN.2+NEET_UG.1@2027-05-03', examDate: '2027-04-04' });
    expect(p.examId).toBe('JEE_MAIN');
    expect(p.profiles.map((x) => x.exam)).toEqual(['JEE_MAIN', 'NEET_UG']);
    expect(p.exams).toEqual([{ exam: 'JEE_MAIN', session: 2, date: '2027-04-04' }]);
  });
  it('profiles win over the packed fields; a dateless interview profile has no plan input', () => {
    const p = parseProfile({
      kind: 'guest', displayName: 'G', createdAt: 1, exam: 'JEE_MAIN.1', examDate: '2027-01-22',
      profiles: [{ exam: 'JEE_MAIN', kind: 'calendar', session: 1, date: '2027-01-22' }, { exam: 'DSA_INTERVIEW', kind: 'none', date: null }],
      activeExam: 'DSA_INTERVIEW',
    });
    expect(p.examId).toBe('DSA_INTERVIEW');
    expect(p.exams).toEqual([]);
    expect(p.profiles).toHaveLength(2);
  });
  it('toFields with profiles writes profiles + activeExam + the packed fields of the active exam', () => {
    const f = toFields({ profiles: [{ exam: 'DSA_INTERVIEW', kind: 'none', date: null }, { exam: 'IAT', kind: 'custom', date: '2027-06-01' }], examId: 'IAT' });
    expect(f).toMatchObject({ activeExam: 'IAT', exam: 'IAT.0', examDate: '2027-06-01' });
    expect(f.profiles).toHaveLength(2);
  });
});

describe('draft helpers', () => {
  it('toggling adds a pick with its default sitting and removes it again; interview tracks start on "No date yet"', () => {
    let picks = togglePick([], 'JEE_MAIN', []);
    picks = togglePick(picks, 'SYS_DESIGN', []);
    expect(picks.map((p) => p.exam)).toEqual(['JEE_MAIN', 'SYS_DESIGN']);
    expect(picks[1]!.none).toBe(true);
    expect(togglePick(picks, 'JEE_MAIN', []).map((p) => p.exam)).toEqual(['SYS_DESIGN']);
  });
  it('toProfiles maps sittings to kinds; draftFromProfile puts the active exam first', () => {
    const d = { ...readDraft(null), picks: [{ exam: 'JEE_MAIN', sel: 1, date: '2027-01-22' }, { exam: 'IAT', sel: 0, date: '2027-06-01' }, { exam: 'DSA_INTERVIEW', sel: 0, date: '', none: true }] };
    expect(toProfiles(d)).toEqual([
      { exam: 'JEE_MAIN', kind: 'calendar', session: 1, date: '2027-01-22' },
      { exam: 'IAT', kind: 'custom', date: '2027-06-01' },
      { exam: 'DSA_INTERVIEW', kind: 'none', date: null },
    ]);
    const back = draftFromProfile(parseProfile({ kind: 'guest', displayName: 'G', createdAt: 1, profiles: toProfiles(d), activeExam: 'IAT' }));
    expect(back.picks.map((p) => p.exam)).toEqual(['IAT', 'JEE_MAIN', 'DSA_INTERVIEW']);
  });
  it('reads older drafts that had first/second', () => {
    const d = readDraft({ first: { exam: 'JEE_MAIN', sel: 1, date: '2027-01-22' }, second: { exam: 'NEET_UG', sel: 1, date: '2027-05-03' }, ambition: 'top' });
    expect(d.picks.map((p) => p.exam)).toEqual(['JEE_MAIN', 'NEET_UG']);
    expect(d.ambition).toBe('top');
  });
});

describe('onboarding step 1: choose your exams', () => {
  beforeEach(() => localStorage.clear());
  it('groups the cards, uses checkbox semantics, needs at least one, and shows a block per picked exam', async () => {
    render(<Harness><OnboardingPage taxonomy={TAX} today={TODAY} onDone={() => {}} /></Harness>);
    await screen.findByText(/Set up your plan/);
    expect(screen.getByRole('group', { name: 'Entrance exams' })).toBeInTheDocument();
    const interview = screen.getByRole('group', { name: 'Interview prep' });
    expect(within(interview).getAllByRole('checkbox').map((c) => c.getAttribute('type'))).toEqual(['checkbox', 'checkbox', 'checkbox']);
    expect(within(interview).getByRole('checkbox', { name: /DSA Interview/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /DSA Interview/ }));
    // an interview track with no date is complete by itself
    expect(screen.getByRole('radio', { name: /No date yet/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    await userEvent.click(screen.getByRole('radio', { name: /I have a date/ }));
    expect(screen.getByLabelText('Target date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /DSA Interview/ }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  it('two exams save as ONE guest profile write with profiles, activeExam and packed fields of the first', async () => {
    const db = createMemoryLocalDb();
    const done = vi.fn();
    render(<Harness localDb={db}><OnboardingPage taxonomy={TAX} today={TODAY} onDone={done} /></Harness>);
    await screen.findByText(/Set up your plan/);
    await userEvent.click(screen.getByRole('checkbox', { name: /^IAT/ }));
    await userEvent.click(screen.getByRole('radio', { name: /My own date/ }));
    await userEvent.type(screen.getByLabelText('Exam date'), '2027-06-01');
    await userEvent.click(screen.getByRole('checkbox', { name: /^System Design/ }));
    await next();
    await next();
    await next();
    await next();
    await userEvent.click(await screen.findByRole('button', { name: 'Start my plan' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const p = (await new LocalStore(db).getProfile()) as unknown as Record<string, unknown>;
    expect(p).toMatchObject({ exam: 'IAT.0', examDate: '2027-06-01', activeExam: 'IAT', onboarded: true });
    expect((p.profiles as Array<{ exam: string; kind: string }>).map((x) => `${x.exam}:${x.kind}`)).toEqual(['IAT:custom', 'SYS_DESIGN:none']);
  });
  it('plan step: a "Plan for" switcher toggles between the picked exams; a no-date exam shows the steady-practice card', async () => {
    render(<Harness><OnboardingPage taxonomy={TAX} today={TODAY} onDone={() => {}} /></Harness>);
    await screen.findByText(/Set up your plan/);
    await userEvent.click(screen.getByRole('checkbox', { name: /^IAT/ }));
    await userEvent.click(screen.getByRole('radio', { name: /My own date/ }));
    await userEvent.type(screen.getByLabelText('Exam date'), '2027-06-01');
    await userEvent.click(screen.getByRole('checkbox', { name: /DSA Interview/ }));
    for (let i = 0; i < 4; i++) await next();
    expect(await screen.findByRole('heading', { name: 'Here is your plan' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'DSA Interview' }));
    expect(await screen.findByRole('heading', { name: /Steady practice for DSA Interview/ })).toBeInTheDocument();
  });
  it('edit mode is prefilled from the legacy packed fields', async () => {
    const db = createMemoryLocalDb();
    await new LocalStore(db).saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1, exam: 'JEE_MAIN.0+NEET_UG.0@2027-05-03', examDate: '2027-04-04', onboarded: true });
    render(<Harness localDb={db}><OnboardingPage taxonomy={TAX} today={TODAY} onDone={() => {}} /></Harness>);
    await screen.findByText(/Your plan setup/);
    expect(screen.getByRole('checkbox', { name: /^JEE Main/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^NEET UG/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^IAT/ })).not.toBeChecked();
  });
});
