import type { ExamCalendar } from '@kairos/core';
import { useExamCalendar } from '../config';
import { Button, Chip, LinkButton, SettingRow, Skeleton } from '../components/ui';
import { EXAM_LABELS } from '../plan/syllabus';
import { entriesFor, prettyDate } from '../onboarding/calendarData';
import type { ExamSel } from '../onboarding/profileModel';
import { useOnboardingProfile } from '../onboarding/useOnboardingProfile';
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

/** Rows for Settings > Exam and plan. */
export function ExamPlanRows() {
  const { loading, profile, save } = useOnboardingProfile();
  const { calendar } = useExamCalendar();
  const roadmap = useRoadmap();
  const first = profile.exams[0];
  if (loading) return <Skeleton className="h-s8 w-full" />;
  const follows = !!first && first.session > 0;
  const next = toggleDateSource(profile.exams, calendar);
  return (
    <>
      <SettingRow label="Exam and date" description={first ? `${EXAM_LABELS[first.exam] ?? first.exam}, ${prettyDate(first.date)}` : 'No exam date yet. Set one and Kairos plans backwards from it.'}>
        <LinkButton to="/onboarding" variant="secondary" size="sm">{first ? 'Change exam or date' : 'Set exam date'}</LinkButton>
      </SettingRow>
      {first && (
        <SettingRow
          label="Date source"
          description={follows ? 'Follows the official calendar: if the date changes, your plan moves with it.' : 'My own date: it stays exactly as you set it.'}
        >
          <Chip tone="primary">{follows ? 'Official calendar' : 'My own date'}</Chip>
          <Button variant="secondary" size="sm" disabled={!next} onClick={() => next && void save({ exams: next })}>
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
