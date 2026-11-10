import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStore, createMemoryLocalDb } from '../store';
import { Harness, testEnv } from '../plan/harness.test-util';
import { useTodayPlan } from '../plan/usePlan';
import { CALENDAR } from '../onboarding/calendarData';
import { AnnouncementBanner, DISMISS_KEY } from './AnnouncementBanner';
import { CONFIG_CACHE_KEY, CONFIG_TTL_MS, setConfigEnv, useExamCalendar, useRoadmapDefaults } from './index';
import { parseAnnouncement, parseRemoteCalendar } from './parse';

const memStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), raw: m };
};
const entry = (over: Record<string, unknown> = {}) => ({ id: 'JEE_MAIN_2027_S1', exam: 'JEE_MAIN', session: 1, date: '2027-01-22', window: null, status: 'official', source: 'https://example.org', ...over });
const calDoc = (over: Record<string, unknown> = {}) => ({ v: 1, entries: [entry(over)] });

function Probe() {
  const { calendar, source } = useExamCalendar();
  const e = calendar.find((x) => x.id === 'JEE_MAIN_2027_S1');
  return <p>{source}:{e?.date ?? 'none'}</p>;
}

let clock = 1_000_000;
beforeEach(() => {
  clock = 1_000_000;
  localStorage.clear();
});
afterEach(() => setConfigEnv());

describe('remote config cache', () => {
  it('reads each doc once per TTL, then again after it expires', async () => {
    const storage = memStorage();
    const fetchDoc = vi.fn(async () => calDoc());
    setConfigEnv({ fetchDoc, storage, now: () => clock });
    const a = render(<Probe />);
    await waitFor(() => expect(screen.getByText('remote:2027-01-22')).toBeInTheDocument());
    a.unmount();
    render(<Probe />);
    expect(screen.getByText('remote:2027-01-22')).toBeInTheDocument();
    expect(fetchDoc).toHaveBeenCalledTimes(1);
    expect(storage.raw.has(CONFIG_CACHE_KEY)).toBe(true);
    clock += CONFIG_TTL_MS + 1;
    render(<Probe />);
    await waitFor(() => expect(fetchDoc).toHaveBeenCalledTimes(2));
  });

  it('serves stale cache immediately while revalidating', async () => {
    const storage = memStorage();
    storage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ exam_calendar: { at: clock - CONFIG_TTL_MS - 1, data: calDoc({ date: '2027-01-21' }) } }));
    setConfigEnv({ fetchDoc: async () => calDoc({ date: '2027-01-23' }), storage, now: () => clock });
    render(<Probe />);
    expect(screen.getByText('remote:2027-01-21')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('remote:2027-01-23')).toBeInTheDocument());
  });

  it('falls back to the bundled calendar offline and when the doc is invalid', async () => {
    setConfigEnv({ fetchDoc: async () => { throw new Error('offline'); }, storage: memStorage(), now: () => clock });
    const a = render(<Probe />);
    await waitFor(() => expect(screen.getByText(/^bundled:/)).toBeInTheDocument());
    a.unmount();
    setConfigEnv({ fetchDoc: async () => ({ v: 1, entries: [{ id: 'x', exam: 'JEE_MAIN', session: 1, date: 'not-a-date', status: 'official' }] }), storage: memStorage(), now: () => clock });
    render(<Probe />);
    await waitFor(() => expect(screen.getByText(/^bundled:/)).toBeInTheDocument());
    expect(parseRemoteCalendar({ entries: [] }, CALENDAR)).toBeNull();
  });

  it('merges remote entries over the bundled ones (remote wins, bundled fills gaps)', () => {
    const merged = parseRemoteCalendar(calDoc(), CALENDAR)!;
    expect(merged.find((e) => e.id === 'JEE_MAIN_2027_S1')?.date).toBe('2027-01-22');
    expect(merged.some((e) => e.exam === 'NEET_UG')).toBe(true);
  });

  it('roadmap defaults are clamped and validated', async () => {
    setConfigEnv({ fetchDoc: async () => ({ v: 1, taperDays: 99, sprintDays: 1, workDaysPerBuffer: 7, mockMinCapacityMin: 210, phases: {} }), storage: memStorage(), now: () => clock });
    function R() {
      const { defaults } = useRoadmapDefaults();
      return <p>{defaults ? `${defaults.taperDays}/${defaults.sprintDays}` : 'none'}</p>;
    }
    render(<R />);
    await waitFor(() => expect(screen.getByText('7/5')).toBeInTheDocument());
  });
});

describe('announcement banner', () => {
  const doc = (over: Record<string, unknown> = {}) => ({ active: true, title: 'Exam date out', body: 'JEE Main session 1 is on 22 Jan.', link: null, tone: 'info', expiresAt: null, updatedAt: 5, ...over });
  const mount = (d: Record<string, unknown> | null) => {
    setConfigEnv({ fetchDoc: async () => d, storage: memStorage(), now: () => clock });
    return render(<AnnouncementBanner now={clock} />);
  };

  it('shows when active, dismisses per updatedAt, and returns for a newer version', async () => {
    const u = mount(doc());
    expect(await screen.findByText('Exam date out')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Exam date out')).toBeNull();
    expect(localStorage.getItem(DISMISS_KEY)).toBe('5');
    u.unmount();
    mount(doc());
    await waitFor(() => expect(screen.queryByText('Exam date out')).toBeNull());
    setConfigEnv();
    const v = mount(doc({ updatedAt: 6 }));
    expect(await screen.findByText('Exam date out')).toBeInTheDocument();
    v.unmount();
  });

  it('hides inactive and expired announcements; important uses an alert role', async () => {
    const a = mount(doc({ active: false }));
    await act(async () => {});
    expect(screen.queryByText('Exam date out')).toBeNull();
    a.unmount();
    const b = mount(doc({ expiresAt: clock - 1 }));
    await act(async () => {});
    expect(screen.queryByText('Exam date out')).toBeNull();
    b.unmount();
    mount(doc({ tone: 'important', expiresAt: clock + 1000 }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Exam date out');
    expect(parseAnnouncement({ title: 1 })).toBeNull();
  });
});

describe('calendar change reaches the plan', () => {
  function Notice() {
    const t = useTodayPlan();
    return <p>{t.state.kind === 'ready' ? `notice:${t.state.view.reanchor ?? 'none'}:${t.state.view.profile.exams[0]?.date}` : t.state.kind}</p>;
  }
  async function run(exam: string, examDate: string) {
    const db = createMemoryLocalDb();
    await new LocalStore(db).saveProfile({
      kind: 'guest', displayName: 'G', createdAt: 1, exam, examDate, ambition: 'competitive', offDay: null, onboarded: true,
      minutesPerWeekday: { '0': 120, '1': 120, '2': 120, '3': 120, '4': 120, '5': 120, '6': 120 }, chaptersDone: [],
    });
    setConfigEnv({ fetchDoc: async (id) => (id === 'exam_calendar' ? calDoc({ date: '2027-01-28' }) : null), storage: memStorage(), now: () => clock });
    // env without its own calendar: the hook must use the remote one
    const env = testEnv();
    delete env.calendar;
    render(<Harness localDb={db} env={env} path="/"><Routes><Route path="/" element={<Notice />} /></Routes></Harness>);
  }

  it('a user following session 1 is re-anchored with the notice', async () => {
    await run('JEE_MAIN.1', '2027-01-22');
    await waitFor(() => expect(screen.getByText(/^notice:.*2027-01-28$/)).toBeInTheDocument());
    expect(screen.getByText(/notice:Exam date changed|notice:JEE Main now has/)).toBeInTheDocument();
  });

  it('a user with their own date keeps it', async () => {
    await run('JEE_MAIN.0', '2027-01-22');
    await waitFor(() => expect(screen.getByText('notice:none:2027-01-22')).toBeInTheDocument());
  });
});
