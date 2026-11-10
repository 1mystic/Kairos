import { useState } from 'react';
import { AlertIcon } from '../components/icons';
import { Banner, Button, Card, CardGrid, Chip, EmptyState, LinkButton, Modal, Page, PageHeader, PageSkeleton } from '../components/ui';
import { entriesFor, prettyDate } from '../onboarding/calendarData';
import { examErrors, emptyDraft, type ExamDraft } from '../onboarding/draft';
import { SittingBlock } from '../onboarding/ExamChooser';
import { planDate } from '../onboarding/profileModel';
import { useExamCalendar } from '../config';
import { EXAM_LONG_NAMES, isInterviewExam } from '../practice/taxonomy';
import { examLabel } from '../plan/syllabus';
import { AddExamForm } from './AddExam';
import { MAX_PROFILES, canAddProfile, daysWords, profileDaysLeft, removeProfile, updateProfile, type ExamProfile } from './model';
import { useActiveExam } from './useActiveExam';

const draftOf = (p: ExamProfile): ExamDraft => (p.kind === 'none' ? { exam: p.exam, sel: 0, date: '', none: true } : { exam: p.exam, sel: p.kind === 'calendar' ? p.session ?? 1 : 0, date: p.date ?? '' });

/** The profile patch a sitting block result stands for. */
export function patchFromDraft(x: ExamDraft): Pick<ExamProfile, 'kind' | 'session' | 'date'> {
  if (x.none) return { kind: 'none', date: null };
  if (x.sel > 0) return { kind: 'calendar', session: x.sel, date: x.date };
  return { kind: 'custom', date: x.date };
}

/** One-line description of where the date comes from. */
export function sourceWords(p: ExamProfile): string {
  if (p.kind === 'calendar') return 'Follows the official calendar: if the date changes, your plan moves with it.';
  if (p.kind === 'custom') return 'Your own date: it stays exactly as you set it.';
  return isInterviewExam(p.exam) ? 'No target date: Kairos plans steady daily practice.' : 'No date set.';
}

function ChangeSitting({ profile, today, onClose }: { profile: ExamProfile; today: string; onClose(): void }) {
  const { state, commit } = useActiveExam(today);
  const [v, setV] = useState<ExamDraft>(draftOf(profile));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  const error = examErrors({ ...emptyDraft(), picks: [v] }, today)[v.exam];
  const save = async () => {
    setBusy(true);
    try {
      await commit(updateProfile(state, profile.exam, patchFromDraft(v)));
      onClose();
    } catch {
      setErr('We could not save that. Try again.');
      setBusy(false);
    }
  };
  return (
    <Modal title={`${examLabel(profile.exam)}: date and sitting`} onClose={onClose}>
      <SittingBlock value={v} onChange={setV} today={today} error={error} />
      {err && <Banner tone="bad" role="alert" icon={<AlertIcon className="shrink-0" />}>{err}</Banner>}
      <div className="row justify-between gap-s3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={!!error} onClick={() => void save()}>Save</Button>
      </div>
    </Modal>
  );
}

function ConfirmRemove({ profile, onClose }: { profile: ExamProfile; onClose(): void }) {
  const { state, commit } = useActiveExam();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await commit(removeProfile(state, profile.exam));
      onClose();
    } catch {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Remove ${examLabel(profile.exam)}?`} onClose={onClose}>
      <p className="text-slate">Its plan and date are removed from your list. Your practice history and what you have learned stay, and you can add it again any time.</p>
      <div className="row justify-between gap-s3">
        <Button variant="secondary" onClick={onClose}>Keep it</Button>
        <Button variant="danger" loading={busy} onClick={() => void go()}>Remove {examLabel(profile.exam)}</Button>
      </div>
    </Modal>
  );
}

function statusChip(p: ExamProfile, today: string) {
  const n = profileDaysLeft(p, today);
  if (n === null) return <Chip>No date</Chip>;
  return <Chip tone={n < 0 ? 'neutral' : 'primary'}>{daysWords(p, today)}</Chip>;
}

/** `/exams`: every exam profile as a card, with Make active / Change date / Remove, and Add an exam. */
export function ManageExamsPage({ today: todayProp }: { today?: string } = {}) {
  const today = todayProp ?? planDate(new Date());
  const { calendar } = useExamCalendar();
  const { loading, state, profiles, setActive } = useActiveExam(today);
  const [edit, setEdit] = useState<string | null>(null);
  const [rm, setRm] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) return <PageSkeleton cards={3} cols={2} />;
  const editing = profiles.find((p) => p.exam === edit);
  const removing = profiles.find((p) => p.exam === rm);
  const activate = async (exam: string) => {
    setBusy(exam);
    try { await setActive(exam); } finally { setBusy(null); }
  };
  return (
    <Page>
      <PageHeader
        title="Your exams"
        subtitle="Prepare for several exams at once. One is active: Home, practice and your plan follow it."
        actions={canAddProfile(state) ? <Button onClick={() => setAdding(true)}>Add an exam</Button> : undefined}
      />
      {profiles.length === 0 ? (
        <EmptyState title="No exams yet" action={<LinkButton to="/onboarding">Set up your exams</LinkButton>}>Choose the exams you are preparing for and Kairos plans your days.</EmptyState>
      ) : (
        <CardGrid cols={2}>
          {profiles.map((p) => {
            const isActive = p.exam === state.active;
            const hasWindow = p.kind === 'calendar' && !p.date && entriesFor(p.exam, calendar).some((e) => e.session === p.session && e.window);
            return (
              <Card
                key={p.exam}
                as="article"
                aria-label={examLabel(p.exam)}
                footer={
                  <div className="row gap-tight">
                    {!isActive && <Button size="sm" loading={busy === p.exam} onClick={() => void activate(p.exam)}>Make active</Button>}
                    <Button size="sm" variant="secondary" onClick={() => setEdit(p.exam)}>Change date or sitting</Button>
                    <Button size="sm" variant="danger-ghost" disabled={profiles.length <= 1} onClick={() => setRm(p.exam)} title={profiles.length <= 1 ? 'You need at least one exam' : undefined}>Remove</Button>
                  </div>
                }
              >
                <div className="stack gap-tight">
                  <div className="row justify-between gap-s3">
                    <h2 className="text-h3">{examLabel(p.exam)}</h2>
                    {isActive && <Chip tone="primary">Active</Chip>}
                  </div>
                  <p className="text-small text-slate">{EXAM_LONG_NAMES[p.exam] ?? p.exam}</p>
                  <div className="row gap-tight">{statusChip(p, today)}{hasWindow && <Chip tone="accent">Exam window</Chip>}</div>
                  <p className="text-body tabular">{p.date && p.kind !== 'none' ? prettyDate(p.date, true) : 'No date yet'}</p>
                  <p className="text-small text-slate">{sourceWords(p)}</p>
                </div>
              </Card>
            );
          })}
        </CardGrid>
      )}
      {profiles.length > 0 && (
        <p className="text-small text-slate">You can track up to {MAX_PROFILES} exams. Your mastery is shared: practising a topic helps every exam that has it.</p>
      )}
      {editing && <ChangeSitting profile={editing} today={today} onClose={() => setEdit(null)} />}
      {removing && <ConfirmRemove profile={removing} onClose={() => setRm(null)} />}
      {adding && (
        <Modal title="Add an exam" onClose={() => setAdding(false)}>
          <AddExamForm today={today} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
        </Modal>
      )}
    </Page>
  );
}
