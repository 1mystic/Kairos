import type { ExamCalendar } from '@kairos/core';
import { useExamCalendar } from '../config';
import { Button, Chip, LinkButton, SettingRow, Skeleton } from '../components/ui';
import { EXAM_LABELS } from '../plan/syllabus';
import { entriesFor, prettyDate } from '../onboarding/calendarData';
import type { ExamSel } from '../onboarding/profileModel';
import { activeProfile, updateProfile, type ExamProfile } from '../exams/model';
import { useActiveExam } from '../exams/useActiveExam';
import { useRoadmap } from './useRoadmap';

/**
 * Flip the primary exam between "follows the official calendar" (session N) and "my own date" (session 0).
 * Following keeps the student's date until the calendar has one for that session (then the next plan open re-anchors with a notice).
 */
export function toggleDateSource(exams: readonly ExamSel[], calendar: ExamCalendar): ExamSel[] | null {
  const [first, ...rest] = exams;
  if (!first) return null;
  if (first.session > 0) return [{ ...first, session: 0 }, ...rest];
  const entries = entriesFor(first.exam, calendar);
  const entry = entries.find((e) => (e.date ?? e.window?.start) === first.date) ?? entries[0];
  if (!entry) return null;
  return [{ ...first, session: entry.session, date: entry.date ?? first.date }, ...rest];
}

/** The profile patch of the date-source toggle for one profile (null when it cannot flip: no date, or an exam without a calendar). */
export function toggleProfileSource(p: ExamProfile, calendar: ExamCalendar): Pick<ExamProfile, 'kind' | 'session' | 'date'> | null {
  if (p.kind === 'none' || !p.date) return null;
  const sel: ExamSel = { exam: p.exam, session: p.kind === 'calendar' ? p.session ?? 1 : 0, date: p.date };
  const next = toggleDateSource([sel], calendar)?.[0];
  if (!next) return null;
  return next.session > 0 ? { kind: 'calendar', session: next.session, date: next.date } : { kind: 'custom', date: next.date };
}

/** Rows for Settings > Exam and plan. The rows describe the ACTIVE exam; /exams manages all of them. */
export function ExamPlanRows() {
  const { loading, state, profiles, label, commit } = useActiveExam();
  const { calendar } = useExamCalendar();
  const roadmap = useRoadmap();
  const first = activeProfile(state);
  if (loading) return <Skeleton className="h-s8 w-full" />;
  const dated = !!first && first.kind !== 'none' && !!first.date;
  const follows = first?.kind === 'calendar';
  const patch = first ? toggleProfileSource(first, calendar) : null;
  return (
    <>
      <SettingRow
        label="Your exams"
        description={first ? `Active: ${label}${dated ? `, ${prettyDate(first.date!)}` : ', no date yet'}. ${profiles.length > 1 ? `${profiles.length} exams in total.` : 'Add more to prepare for several at once.'}` : 'No exam yet. Choose yours and Kairos plans backwards from the date.'}
      >
        <LinkButton to="/exams" variant="secondary" size="sm">{first ? 'Manage exams' : 'Choose exams'}</LinkButton>
        <LinkButton to="/onboarding" variant="secondary" size="sm">{first ? 'Edit plan setup' : 'Set up'}</LinkButton>
      </SettingRow>
      {first && dated && (
        <SettingRow
          label={`Date source for ${EXAM_LABELS[first.exam] ?? first.exam}`}
          description={follows ? 'Follows the official calendar: if the date changes, your plan moves with it.' : 'My own date: it stays exactly as you set it.'}
        >
          <Chip tone="primary">{follows ? 'Official calendar' : 'My own date'}</Chip>
          <Button variant="secondary" size="sm" disabled={!patch} onClick={() => patch && void commit(updateProfile(state, first.exam, patch))}>
            {follows ? 'Use my own date' : 'Follow the official calendar'}
          </Button>
        </SettingRow>
      )}
      <SettingRow
        label="Roadmap"
        description={roadmap.mode === 'custom' ? 'Custom: your own sprint, buffer and phase settings.' : 'Default: follows the exam calendar and Kairos defaults.'}
      >
        <Chip tone={roadmap.mode === 'custom' ? 'accent' : 'primary'}>{roadmap.mode === 'custom' ? 'Custom' : 'Default'}</Chip>
        <LinkButton to="/roadmap" variant="secondary" size="sm">Edit roadmap</LinkButton>
      </SettingRow>
    </>
  );
}
