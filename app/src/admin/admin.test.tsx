import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth/AuthProvider';
import { AdminDataContext, type AdminData } from './data';
import { AdminPage, BECOME_ADMIN } from './AdminPage';
import { resetAdminCache } from './useIsAdmin';
import { clearAdminCache } from './cache';
import { buildCalendarDoc, diffEntries, entryErrors, listErrors, normalizeEntries, type CalEntry } from './calendarEdit';
import { accuracy, buildInsights, fillDays, rangeBounds, totals } from './insights';
import { stampDoc } from './publish';
import { initials, summarizeUsers } from './users';
import { ExamDates } from './tabs/ExamDates';
import { UsersTab } from './tabs/UsersTab';
import { AnnouncementTab, buildAnnouncementDoc } from './tabs/Announcement';
import { Overview } from './tabs/Overview';

const fakeData = (over: Partial<AdminData> = {}): AdminData => ({
  isAdmin: async () => false,
  getStats: async () => [],
  getUsers: async () => [],
  getConfig: async () => null,
  publishConfig: async () => {},
  bankInfo: async () => ({ version: 3, files: 10, totals: {} }),
  ...over,
});
const auth = (uid: string | null) => ({ user: uid ? { uid } : null, profile: null, loading: false }) as unknown as AuthContextValue;
const wrap = (data: AdminData, uid: string | null, ui: JSX.Element) => (
  <AuthContext.Provider value={auth(uid)}><AdminDataContext.Provider value={data}><MemoryRouter>{ui}</MemoryRouter></AdminDataContext.Provider></AuthContext.Provider>
);

beforeEach(() => {
  resetAdminCache();
  clearAdminCache();
});

describe('admin gate', () => {
  it('guests see a calm page and no UID', async () => {
    const isAdmin = vi.fn(async () => true);
    render(wrap(fakeData({ isAdmin }), null, <AdminPage />));
    expect(await screen.findByText('This area is for Kairos admins')).toBeInTheDocument();
    expect(screen.queryByTestId('uid')).toBeNull();
    expect(isAdmin).not.toHaveBeenCalled();
  });

  it('signed-in non-admins see their UID, the exact instructions and a copy button', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(wrap(fakeData(), 'uid-123', <AdminPage />));
    expect(await screen.findByTestId('uid')).toHaveTextContent('uid-123');
    expect(screen.getByText(BECOME_ADMIN)).toBeInTheDocument();
    expect(BECOME_ADMIN).toContain('Document ID = (your UID above)');
    expect(screen.getByRole('link', { name: /Firebase console/ })).toHaveAttribute('href', 'https://console.firebase.google.com/project/kairos-76a0d/firestore');
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('uid-123');
  });

  it('errors count as not admin; the check runs once per session', async () => {
    const isAdmin = vi.fn(async () => { throw new Error('denied'); });
    const a = render(wrap(fakeData({ isAdmin }), 'u9', <AdminPage />));
    expect(await screen.findByTestId('uid')).toBeInTheDocument();
    a.unmount();
    render(wrap(fakeData({ isAdmin }), 'u9', <AdminPage />));
    expect(await screen.findByTestId('uid')).toBeInTheDocument();
    expect(isAdmin).toHaveBeenCalledTimes(1);
  });

  it('admins get the console with the six sections', async () => {
    render(wrap(fakeData({ isAdmin: async () => true }), 'boss', <AdminPage />));
    expect(await screen.findByRole('heading', { name: 'Admin console' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Admin sections' });
    for (const l of ['Overview', 'Exam dates', 'Announcement', 'Roadmap defaults', 'Users', 'System']) expect(within(nav).getByRole('button', { name: l })).toBeInTheDocument();
  });
});

describe('insights', () => {
  const day = (i: number, over: Record<string, number> = {}) => ({ day: `2026-10-${String(i).padStart(2, '0')}`, data: { sessions: 10, questions: 100, correct: 60, active: 8, ...over } });
  it('fills missing days with zeros and totals', () => {
    const rows = fillDays([{ day: '2026-11-08', data: { sessions: 3, questions: 20, correct: 10 } }], '2026-11-08', 3);
    expect(rows.map((r) => r.day)).toEqual(['2026-11-06', '2026-11-07', '2026-11-08']);
    const t = totals(rows);
    expect(t.sessions).toBe(3);
    expect(accuracy(t)).toBe(0.5);
    expect(accuracy(totals([]))).toBeNull();
    expect(rangeBounds('2026-11-08', 7)).toEqual(['2026-11-02', '2026-11-08']);
  });
  it('says accuracy fell and NEET grew, with minimum samples', () => {
    const prev = Array.from({ length: 7 }, (_, i) => day(i + 1, { sessions_NEET_UG: 5, correct: 66 }));
    const cur = Array.from({ length: 7 }, (_, i) => day(i + 8, { sessions_NEET_UG: 6, correct: 60 }));
    const out = buildInsights(fillDays([...prev, ...cur], '2026-10-14', 14));
    expect(out).toContain('Accuracy fell 6 points this week.');
    expect(out).toContain('NEET sessions grew 20% this week.');
  });
  it('stays quiet on thin data', () => {
    expect(buildInsights(fillDays([day(1, { questions: 5, correct: 1, active: 0 })], '2026-10-14', 14))[0]).toMatch(/Not enough data/);
  });
});

describe('exam calendar editing', () => {
  const e = (over: Partial<CalEntry> = {}): CalEntry => ({ id: 'JEE_MAIN_2027_S1', exam: 'JEE_MAIN', session: 1, date: '2027-01-22', window: null, status: 'official', source: null, last_checked: null, ...over });
  it('validates ranges, dates, windows, unique ids and the 40 cap', () => {
    expect(entryErrors([e()])[0]).toEqual([]);
    expect(entryErrors([e({ session: 5 })])[0]![0]).toMatch(/1 to 4/);
    expect(entryErrors([e({ date: '2027-02-30' })])[0]![0]).toMatch(/valid day/);
    expect(entryErrors([e({ window: { start: '2027-02-02', end: '2027-02-01' } })])[0]![0]).toMatch(/ends before/);
    expect(entryErrors([e({ date: null })])[0]![0]).toMatch(/official/);
    expect(entryErrors([e(), e()])[1]![0]).toMatch(/used by another/);
    expect(listErrors(Array.from({ length: 41 }, (_, i) => e({ id: `X_${i}` })))).toContain('At most 40 entries.');
  });
  it('diffs against the published doc', () => {
    const pub = [e({ date: '2027-01-22' }), e({ id: 'OLD', session: 2, date: '2027-04-01' })];
    const draft = [e({ date: '2027-01-24' }), e({ id: 'NEW', exam: 'NEET_UG', date: '2027-05-03' })];
    const d = diffEntries(pub, draft);
    expect(d.map((x) => x.kind).sort()).toEqual(['added', 'changed', 'removed']);
    expect(d.find((x) => x.kind === 'changed')!.text).toMatch(/2027-01-22 to 2027-01-24/);
  });
  it('builds the contract document without server fields, then stampDoc adds them', () => {
    const doc = buildCalendarDoc([e({ source: '  https://nta.example ', note: '' })]);
    expect(Object.keys(doc).sort()).toEqual(['entries', 'v']);
    expect(Object.keys(doc.entries[0]!).sort()).toEqual(['date', 'exam', 'id', 'last_checked', 'session', 'source', 'status', 'window']);
    expect(doc.entries[0]!.source).toBe('https://nta.example');
    const TS = Symbol('ts');
    expect(stampDoc(doc, 'admin1', TS)).toEqual({ v: 1, entries: doc.entries, updatedAt: TS, updatedBy: 'admin1' });
    expect(normalizeEntries([{ id: 'a', exam: 'NOPE' }, { id: 'b', exam: 'IAT', session: 1, status: 'expected', _note: 'x' }])).toHaveLength(1);
  });
  it('the editor publishes once after confirmation, with the change list and warning', async () => {
    const publishConfig = vi.fn(async () => {});
    const data = fakeData({ publishConfig, getConfig: async () => ({ v: 1, entries: [e({ date: '2027-01-22' })], updatedAt: 1, updatedBy: 'abcdefghij' }) });
    render(wrap(data, 'admin1', <ExamDates uid="admin1" year={2027} />));
    const date = await screen.findByLabelText('Date');
    expect(screen.getByText(/Last published/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await userEvent.clear(date);
    await userEvent.type(date, '2027-01-24');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/2027-01-22 to 2027-01-24/)).toBeInTheDocument();
    expect(within(dlg).getByText("This updates every user's plan on their next open.")).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole('button', { name: 'Publish to all users' }));
    await waitFor(() => expect(publishConfig).toHaveBeenCalledTimes(1));
    const [id, payload, uid] = publishConfig.mock.calls[0] as unknown as [string, { v: number; entries: CalEntry[] }, string];
    expect(id).toBe('exam_calendar');
    expect(uid).toBe('admin1');
    expect(payload.v).toBe(1);
    expect(payload.entries[0]!.date).toBe('2027-01-24');
  });
});

describe('announcement tab', () => {
  it('builds the contract document and publishes clear as active:false', async () => {
    expect(buildAnnouncementDoc({ active: true, title: ' Hi ', body: 'b', link: '', tone: 'important', expiry: '' })).toEqual({ active: true, title: 'Hi', body: 'b', link: null, tone: 'important', expiresAt: null });
    const publishConfig = vi.fn(async () => {});
    render(wrap(fakeData({ publishConfig, getConfig: async () => ({ active: true, title: 'Live', body: 'x', link: null, tone: 'info', expiresAt: null }) }), 'a1', <AnnouncementTab uid="a1" />));
    await userEvent.click(await screen.findByRole('button', { name: 'Clear announcement' }));
    await waitFor(() => expect(publishConfig).toHaveBeenCalledTimes(1));
    expect(publishConfig.mock.calls[0]![0]).toBe('announcement');
    expect(publishConfig.mock.calls[0]![1]).toMatchObject({ active: false, title: 'Live' });
  });
});

describe('users tab privacy', () => {
  const rows = [
    { id: 'u1', data: { displayName: 'Asha Rao', email: 'asha@example.com', dob: '2009-03-04', isMinor: true, consent: { status: 'pending' }, exam: 'JEE_MAIN.1', examDate: '2027-01-22', onboarded: true, createdAt: Date.now() - 86_400_000 } },
    { id: 'u2', data: { displayName: 'Vik', email: 'vik@example.com', dob: '2001-01-01', isMinor: false, consent: { status: 'not_required' }, exam: 'NEET_UG.0', examDate: '2027-05-03', onboarded: false, createdAt: Date.now() } },
  ];
  it('summarises counts', () => {
    const s = summarizeUsers(rows, Date.now());
    expect(s).toMatchObject({ total: 2, onboarded: 1, minors: 1, consentPending: 1, followsCalendar: 1, customDate: 1 });
    expect(s.sessionFollowers['JEE_MAIN.1']).toBe(1);
    expect(s.recent[0]).toEqual({ id: 'u1', initials: 'AR', created: expect.any(Number), exam: 'JEE Main' });
    expect(initials('')).toBe('?');
  });
  it('never renders email or date of birth, even after showing recent sign-ups', async () => {
    const getUsers = vi.fn(async () => rows);
    const { container } = render(wrap(fakeData({ getUsers }), 'a1', <UsersTab />));
    expect(screen.getByText(/cannot see any student's attempts/)).toBeInTheDocument();
    expect(screen.getByText(/up to 200 reads/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load user counts' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Show recent sign-ups' }));
    expect(screen.getByText('AR')).toBeInTheDocument();
    expect(getUsers).toHaveBeenCalledWith(200);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/@example\.com|2009-03-04|Asha/);
  });
});

describe('overview', () => {
  it('reads the range once and serves a second mount from the cache', async () => {
    const getStats = vi.fn(async () => [{ day: '2026-11-08', data: { sessions: 4, questions: 40, correct: 30, active: 3, signups: 1 } }]);
    const a = render(wrap(fakeData({ getStats }), 'a1', <Overview today="2026-11-08" />));
    expect(await screen.findByText('Overall accuracy')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('75%')).toBeInTheDocument());
    expect(screen.getByText(/Guests are not counted/)).toBeInTheDocument();
    a.unmount();
    render(wrap(fakeData({ getStats }), 'a1', <Overview today="2026-11-08" />));
    await screen.findByText('75%');
    expect(getStats).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(getStats).toHaveBeenCalledTimes(2));
  });
  it('the 7 day view still reads 14 days so week-over-week insights compare real data', async () => {
    const getStats = vi.fn(async () => []);
    render(wrap(fakeData({ getStats }), 'a1', <Overview today="2026-11-08" />));
    await waitFor(() => expect(getStats).toHaveBeenCalledWith('2026-10-10', '2026-11-08'));
    await userEvent.click(screen.getByRole('tab', { name: '7 days' }));
    await waitFor(() => expect(getStats).toHaveBeenCalledWith('2026-10-26', '2026-11-08'));
  });
});
