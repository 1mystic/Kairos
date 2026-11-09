import { useMemo, useState } from 'react';
import { HBars } from '../../analysis/charts/HBars';
import { Banner, Button, Card, CardGrid, EmptyState, Section, Skeleton, Stat } from '../../components/ui';
import { AlertIcon, InfoIcon } from '../../components/icons';
import { useCachedQuery } from '../cache';
import { useAdminData } from '../data';
import { summarizeUsers, type UserRow } from '../users';

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : 'n/a');

/** Counts by default. Only initials, join date and exam can be listed, and only on request. Never email or date of birth. */
export function UsersTab() {
  const data = useAdminData();
  const q = useCachedQuery<UserRow[]>('users:200', () => data.getUsers(200), false);
  const [recent, setRecent] = useState(false);
  const s = useMemo(() => (q.data ? summarizeUsers(q.data, Date.now()) : null), [q.data]);
  const maxWeek = Math.max(1, ...(s?.signupsPerWeek.map((w) => w.count) ?? [1]));

  return (
    <div className="stack gap-section">
      <Section title="Users" aside={<Button variant="secondary" size="sm" loading={q.loading} onClick={s ? q.reload : q.run}>{s ? 'Refresh' : 'Load user counts'}</Button>}>
        <Banner icon={<InfoIcon className="shrink-0 text-primary" />}>
          Admins cannot see any student's attempts, sessions or mocks. That data is private to each student and is used only for their own learning, and many students are under 18. Totals here come from profiles only.
        </Banner>
        <p className="text-small text-slate">Loading counts reads the 200 newest profiles: this uses up to 200 reads.{q.fromCache && s ? ' Showing this session\'s cached read (0 new reads).' : ''}</p>
        {q.error && <Banner tone="accent" role="alert" icon={<AlertIcon className="shrink-0" />}>We could not read the profiles: {q.error}</Banner>}
        {q.loading && !s && <Skeleton className="h-s8 w-full" />}
        {!s && !q.loading && <EmptyState title="No counts loaded yet">Press "Load user counts" when you want a snapshot.</EmptyState>}
      </Section>
      {s && (
        <>
          <CardGrid cols={4}>
            <Card><Stat label="Profiles" value={`${s.capped ? '≥ ' : ''}${s.total}`} hint={s.capped ? 'newest 200 only' : undefined} /></Card>
            <Card><Stat label="Onboarded" value={pct(s.onboarded, s.total)} hint={`${s.onboarded} students`} /></Card>
            <Card><Stat label="Under 18" value={s.minors} hint={`${s.consentPending} consent pending`} /></Card>
            <Card><Stat label="Follow the calendar" value={s.followsCalendar} hint={`${s.customDate} chose their own date`} /></Card>
          </CardGrid>
          <CardGrid cols={2}>
            <Card>
              <div className="stack gap-base">
                <h3 className="text-h3">Exam</h3>
                <HBars
                  caption="Students by primary exam"
                  summary={`Students by primary exam: ${s.exams.map((e) => `${e.label} ${e.count}`).join(', ') || 'none'}.`}
                  rows={[...s.exams.map((e) => ({ key: e.key, label: e.label, value: e.count / Math.max(1, s.total), text: String(e.count) })), ...(s.noExam ? [{ key: 'none', label: 'Not set yet', value: s.noExam / Math.max(1, s.total), text: String(s.noExam), tone: 'slate' as const }] : [])]}
                />
              </div>
            </Card>
            <Card>
              <div className="stack gap-base">
                <h3 className="text-h3">Sign-ups per week</h3>
                <HBars
                  caption="Sign-ups per week"
                  summary={`Sign-ups per week, newest last: ${s.signupsPerWeek.map((w) => w.count).join(', ')}.`}
                  rows={s.signupsPerWeek.map((w) => ({ key: w.label, label: w.label, value: w.count / maxWeek, text: String(w.count) }))}
                />
              </div>
            </Card>
          </CardGrid>
          <Section title="Support">
            {!recent ? (
              <div><Button variant="secondary" onClick={() => setRecent(true)}>Show recent sign-ups</Button></div>
            ) : (
              <Card>
                <ul className="stack gap-tight" aria-label="Recent sign-ups">
                  {s.recent.map((r) => (
                    <li key={r.id} className="row-between">
                      <span className="font-semibold">{r.initials}</span>
                      <span className="text-small text-slate tabular">{r.created ? new Date(r.created).toLocaleDateString('en-IN') : 'unknown date'} · {r.exam}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
