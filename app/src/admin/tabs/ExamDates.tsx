import { useEffect, useMemo, useState } from 'react';
import { Banner, Button, Card, CardGrid, Chip, Field, Modal, Section, SelectField, Skeleton } from '../../components/ui';
import { AlertIcon } from '../../components/icons';
import { StatusBanner } from '../Status';
import bundled from '../../../../content/exam_calendar.json';
import { useCachedQuery } from '../cache';
import { buildCalendarDoc, diffEntries, entryErrors, EXAM_NAME, EXAMS, listErrors, MAX_ENTRIES, normalizeEntries, suggestId, type CalEntry, type CalExam } from '../calendarEdit';
import { useAdminData } from '../data';
import { summarizeUsers, type UserRow } from '../users';

const BUNDLED = normalizeEntries(bundled);
const when = (ms: unknown) => (typeof ms === 'number' ? new Date(ms).toLocaleString('en-IN') : 'unknown time');

/** Editable exam calendar. Publishing writes config/exam_calendar once; every user's plan follows on its next open. */
export function ExamDates({ uid, year }: { uid: string; year: number }) {
  const data = useAdminData();
  const [published, setPublished] = useState<CalEntry[] | null>(null);
  const [meta, setMeta] = useState<{ at?: unknown; by?: unknown } | null>(null);
  const [draft, setDraft] = useState<CalEntry[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const users = useCachedQuery<UserRow[]>('users:200', () => data.getUsers(200), false);

  useEffect(() => {
    let live = true;
    data.getConfig('exam_calendar').then(
      (raw) => {
        if (!live) return;
        const e = raw ? normalizeEntries(raw.entries) : [];
        setPublished(e);
        setMeta(raw ? { at: raw.updatedAt, by: raw.updatedBy } : null);
        setDraft(e.length ? e : BUNDLED);
      },
      () => {
        if (!live) return;
        setErr('We could not read the published calendar.');
        setPublished([]);
        setDraft(BUNDLED);
      },
    );
    return () => {
      live = false;
    };
  }, [data]);

  const errs = useMemo(() => entryErrors(draft), [draft]);
  const problems = useMemo(() => listErrors(draft), [draft]);
  const changes = useMemo(() => diffEntries(published ?? [], draft), [published, draft]);
  const followers = useMemo(() => (users.data ? summarizeUsers(users.data, Date.now()).sessionFollowers : null), [users.data]);

  if (published === null) return <Skeleton className="h-s8 w-full" />;
  const patch = (i: number, p: Partial<CalEntry>) => setDraft((d) => d.map((e, j) => (j === i ? { ...e, ...p } : e)));

  async function publish() {
    setBusy(true);
    setErr('');
    try {
      const doc = buildCalendarDoc(draft);
      await data.publishConfig('exam_calendar', doc, uid);
      setPublished(doc.entries);
      setMeta({ at: Date.now(), by: uid });
      setMsg('Published. Users get the new dates the next time they open Kairos.');
      setConfirm(false);
    } catch {
      setErr('Publishing failed. Check your connection and that you are signed in as an admin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack gap-section">
      <Section title="Exam dates" aside={<div className="row-actions"><Button variant="secondary" size="sm" onClick={() => setDraft(BUNDLED)}>Load from bundled defaults</Button><Button size="sm" disabled={draft.length >= MAX_ENTRIES} onClick={() => setDraft((d) => [...d, { id: suggestId('JEE_MAIN', 1, year, d), exam: 'JEE_MAIN', session: 1, date: null, window: null, status: 'expected', source: null, last_checked: null }])}>Add entry</Button></div>}>
        <p className="text-small text-slate">
          {meta ? `Last published ${when(meta.at)} by ${String(meta.by ?? 'an admin').slice(0, 8)}.` : 'Nothing published yet: users see the dates bundled with the app.'} Dates users picked themselves are never changed.
        </p>
        {!users.data && <div><Button variant="secondary" size="sm" loading={users.loading} onClick={users.run}>Show how many users follow each session (up to 200 reads)</Button></div>}
        {msg && <StatusBanner ok>{msg}</StatusBanner>}
        {err && <StatusBanner ok={false}>{err}</StatusBanner>}
        <div className="stack gap-section">
          {draft.map((e, i) => (
            <Card key={i}>
              <div className="stack gap-base">
                <div className="row-between">
                  <h3 className="text-h3">{EXAM_NAME[e.exam]} session {e.session}</h3>
                  <div className="row gap-tight">
                    {followers && <Chip tone="primary">{followers[`${e.exam}.${e.session}`] ?? 0} users follow</Chip>}
                    <Chip tone={e.status === 'official' ? 'primary' : 'accent'}>{e.status}</Chip>
                    <Button variant="ghost" size="sm" aria-label={`Remove ${e.id}`} onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                </div>
                <CardGrid cols={2}>
                  <Field label="Id" value={e.id} onChange={(ev) => patch(i, { id: ev.target.value })} />
                  <SelectField label="Exam" value={e.exam} onChange={(ev) => patch(i, { exam: ev.target.value as CalExam })}>
                    {EXAMS.map((x) => <option key={x} value={x}>{EXAM_NAME[x]}</option>)}
                  </SelectField>
                  <Field label="Session" type="number" min={1} max={4} value={e.session} onChange={(ev) => patch(i, { session: Number(ev.target.value) })} />
                  <SelectField label="Status" value={e.status} onChange={(ev) => patch(i, { status: ev.target.value as CalEntry['status'] })}>
                    <option value="expected">Expected</option>
                    <option value="official">Official</option>
                  </SelectField>
                  <Field label="Date" type="date" value={e.date ?? ''} onChange={(ev) => patch(i, { date: ev.target.value || null })} />
                  <Field label="Window start" type="date" value={e.window?.start ?? ''} onChange={(ev) => patch(i, { window: ev.target.value || e.window?.end ? { start: ev.target.value, end: e.window?.end ?? '' } : null })} />
                  <Field label="Window end" type="date" value={e.window?.end ?? ''} onChange={(ev) => patch(i, { window: ev.target.value || e.window?.start ? { start: e.window?.start ?? '', end: ev.target.value } : null })} />
                  <Field label="Last checked" type="date" value={e.last_checked ?? ''} onChange={(ev) => patch(i, { last_checked: ev.target.value || null })} />
                  <Field label="Source link" value={e.source ?? ''} maxLength={300} onChange={(ev) => patch(i, { source: ev.target.value || null })} />
                  <Field label="Note" value={e.note ?? ''} maxLength={200} onChange={(ev) => patch(i, { note: ev.target.value })} />
                </CardGrid>
                {(errs[i] ?? []).length > 0 && (
                  <ul role="alert" className="stack gap-tight text-small text-accent-ink">
                    {(errs[i] ?? []).map((m) => <li key={m} className="row gap-tight"><AlertIcon width={16} height={16} className="shrink-0" />{m}</li>)}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Pending changes">
        <Card>
          {changes.length === 0 ? <p className="text-slate">No changes compared with what is published.</p> : (
            <ul className="stack gap-tight">{changes.map((c) => <li key={`${c.kind}-${c.id}`}><Chip tone={c.kind === 'removed' ? 'accent' : 'primary'}>{c.kind}</Chip> {c.text}</li>)}</ul>
          )}
        </Card>
        {problems.length > 0 && <Banner tone="accent" role="alert" icon={<AlertIcon className="shrink-0" />}>Fix {problems.length} problem{problems.length === 1 ? '' : 's'} before publishing.</Banner>}
        <div><Button disabled={changes.length === 0 || problems.length > 0} onClick={() => setConfirm(true)}>Publish</Button></div>
      </Section>

      {confirm && (
        <Modal title="Publish the exam calendar?" onClose={() => setConfirm(false)} dismissLabel="Not yet">
          <div className="stack gap-base">
            <ul className="stack gap-tight">{changes.map((c) => <li key={`${c.kind}-${c.id}`}>{c.text}</li>)}</ul>
            <p className="text-slate">This updates every user's plan on their next open.</p>
            <div className="row-actions justify-end">
              <Button variant="secondary" onClick={() => setConfirm(false)}>Not yet</Button>
              <Button loading={busy} onClick={() => void publish()}>Publish to all users</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
