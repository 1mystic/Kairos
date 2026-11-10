import { useState } from 'react';
import { AlertIcon } from '../components/icons';
import { Banner, Button, Page, PageHeader } from '../components/ui';
import { useExamCalendar } from '../config';
import { emptyDraft, examErrors, examsOk, toProfiles, type ExamDraft } from '../onboarding/draft';
import { ExamSelector } from '../onboarding/ExamChooser';
import { planDate } from '../onboarding/profileModel';
import { MAX_PROFILES, addProfile } from './model';
import { useActiveExam } from './useActiveExam';

/**
 * Pick more exams (only exams the student has not chosen yet), set their sittings, save in ONE profile write.
 * The active exam stays as it is; "Make active" on the manage page (or the switcher) changes it.
 */
export function AddExamForm({ today: todayProp, onDone, onCancel }: { today?: string; onDone(): void; onCancel?(): void }) {
  const today = todayProp ?? planDate(new Date());
  const { calendar } = useExamCalendar();
  const { state, commit } = useActiveExam(today);
  const [picks, setPicks] = useState<ExamDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  const taken = state.profiles.map((p) => p.exam);
  const slots = MAX_PROFILES - taken.length;
  const draft = { ...emptyDraft(), picks };
  const errors = examErrors(draft, today);
  const ok = examsOk(draft, today);

  const save = async () => {
    if (!ok) return;
    setBusy(true);
    setErr(undefined);
    try {
      let next = state;
      for (const p of toProfiles(draft)) next = addProfile(next, p);
      await commit(next);
      onDone();
    } catch {
      setErr('We could not save that. Your choices are still here; try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack gap-section">
      {slots <= 0 ? (
        <Banner tone="accent" icon={<AlertIcon className="shrink-0" />}>You are already preparing for the most exams we can track ({MAX_PROFILES}). Remove one first.</Banner>
      ) : (
        <ExamSelector picks={picks} onChange={(next) => setPicks(next.slice(0, slots))} today={today} errors={errors} exclude={taken} calendar={calendar} />
      )}
      {err && <Banner tone="bad" role="alert" icon={<AlertIcon className="shrink-0" />}>{err}</Banner>}
      <div className="row justify-between gap-s3">
        {onCancel ? <Button variant="secondary" onClick={onCancel}>Cancel</Button> : <span />}
        <Button loading={busy} disabled={!ok || slots <= 0} onClick={() => void save()}>{picks.length > 1 ? 'Add these exams' : 'Add exam'}</Button>
      </div>
    </div>
  );
}

/** `/onboarding?add=1`: the same form as a page. */
export function AddExamPage({ today, onDone }: { today?: string; onDone(): void }) {
  return (
    <Page width="form">
      <PageHeader title="Add an exam" subtitle="Prepare for more than one exam. Each keeps its own plan and date; you switch between them from the top of the page." />
      <AddExamForm {...(today ? { today } : {})} onDone={onDone} onCancel={onDone} />
    </Page>
  );
}
