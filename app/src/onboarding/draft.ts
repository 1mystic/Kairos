import type { Ambition } from '@kairos/core';
import { addDays, dayNumber } from '@kairos/core';
import type { ExamCalendar } from '@kairos/core';
import { CALENDAR, entriesFor } from './calendarData';
import { DEFAULT_MINUTES, type ExamSel, type OnboardingProfile } from './profileModel';

/** One exam choice in the form: a calendar session, or the student's own date (sel 0). */
export interface ExamDraft {
  exam: string;
  /** calendar session number; 0 = custom date */
  sel: number;
  date: string;
}

export interface Draft {
  first: ExamDraft;
  second: ExamDraft | null;
  minutes: Record<number, number>;
  offDay: number | null;
  done: string[];
  support: 'coaching' | 'self' | null;
  ambition: Ambition;
  behind: 'add' | 'drop' | null;
}

export const DRAFT_KEY = 'kairos-onboarding-draft';
export const MAX_DAYS = 1100;

export function defaultDateFor(exam: string, sel: number, cal: ExamCalendar = CALENDAR): string {
  const e = entriesFor(exam, cal).find((x) => x.session === sel);
  return e?.date ?? e?.window?.start ?? '';
}

export function newExamDraft(exam: string, cal: ExamCalendar = CALENDAR): ExamDraft {
  const first = entriesFor(exam, cal)[0];
  const sel = first?.session ?? 0;
  return { exam, sel, date: defaultDateFor(exam, sel, cal) };
}

export function emptyDraft(cal: ExamCalendar = CALENDAR): Draft {
  return { first: newExamDraft('JEE_MAIN', cal), second: null, minutes: { ...DEFAULT_MINUTES }, offDay: 0, done: [], support: null, ambition: 'competitive', behind: null };
}

export function draftFromProfile(p: OnboardingProfile): Draft {
  const d = emptyDraft();
  const [a, b] = p.exams;
  return {
    ...d,
    first: a ? { exam: a.exam, sel: a.session, date: a.date } : d.first,
    second: b ? { exam: b.exam, sel: b.session, date: b.date } : null,
    minutes: { ...p.minutesPerWeekday },
    offDay: p.offDay,
    done: [...p.chaptersDone],
    ambition: p.ambition,
  };
}

/** Error text for an exam date, or undefined when it is a usable date. */
export function dateError(date: string, today: string): string | undefined {
  if (!date) return 'Pick a date, or the date you expect.';
  try {
    const n = dayNumber(date) - dayNumber(today);
    if (n < 1) return 'That date is today or in the past. Pick a day ahead.';
    if (n > MAX_DAYS) return 'That is more than three years away. Check the year.';
  } catch {
    return 'Enter a valid date.';
  }
  return undefined;
}

export function examErrors(d: Draft, today: string): { first?: string; second?: string } {
  const out: { first?: string; second?: string } = {};
  const e1 = dateError(d.first.date, today);
  if (e1) out.first = e1;
  if (d.second) {
    const e2 = dateError(d.second.date, today);
    if (e2) out.second = e2;
    else if (d.second.exam === d.first.exam && d.second.sel === d.first.sel) out.second = 'Pick a different exam or session for the second one.';
  }
  return out;
}

export const toExamSels = (d: Draft): ExamSel[] =>
  [d.first, ...(d.second ? [d.second] : [])].map((x) => ({ exam: x.exam, session: x.sel, date: x.date }));

export const hasErrors = (d: Draft, today: string): boolean => Object.keys(examErrors(d, today)).length > 0;

/** Presets for step 2. */
export function sameEveryDay(minutes: Record<number, number>, offDay: number | null): Record<number, number> {
  const ref = minutes[1] ?? 120;
  return Object.fromEntries(Array.from({ length: 7 }, (_, d) => [d, d === offDay ? 0 : ref]));
}
export function weekendsHeavier(minutes: Record<number, number>, offDay: number | null): Record<number, number> {
  const base = minutes[1] ?? 120;
  const heavy = Math.min(480, Math.round((base * 1.5) / 15) * 15);
  return Object.fromEntries(Array.from({ length: 7 }, (_, d) => [d, d === offDay ? 0 : d === 0 || d === 6 ? heavy : base]));
}

export const tomorrow = (today: string): string => addDays(today, 1);
