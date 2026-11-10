import type { Ambition } from '@kairos/core';
import { addDays, dayNumber } from '@kairos/core';
import type { ExamCalendar } from '@kairos/core';
import { CALENDAR, entriesFor } from './calendarData';
import { MAX_PROFILES, type ExamProfile } from '../exams/model';
import { isInterviewExam } from '../practice/taxonomy';
import { DEFAULT_MINUTES, type ExamSel, type OnboardingProfile } from './profileModel';

/** One exam choice in the form: a calendar session, the student's own date (sel 0), or no date at all (`none`, interview tracks). */
export interface ExamDraft {
  exam: string;
  /** calendar session number; 0 = custom date */
  sel: number;
  date: string;
  /** "No date yet": the profile keeps kind 'none' */
  none?: boolean;
}

export interface Draft {
  /** the exams the student picked, in the order they picked them: picks[0] is the primary / active exam */
  picks: ExamDraft[];
  /** which pick's plan the preview step shows (null = the first) */
  preview: string | null;
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

/** A fresh pick: calendar exams start on their first session, interview tracks start on "No date yet". */
export function newExamDraft(exam: string, cal: ExamCalendar = CALENDAR): ExamDraft {
  if (isInterviewExam(exam)) return { exam, sel: 0, date: '', none: true };
  const first = entriesFor(exam, cal)[0];
  const sel = first?.session ?? 0;
  return { exam, sel, date: defaultDateFor(exam, sel, cal) };
}

export function emptyDraft(): Draft {
  return { picks: [], preview: null, minutes: { ...DEFAULT_MINUTES }, offDay: 0, done: [], support: null, ambition: 'competitive', behind: null };
}

/** Prefill from the saved profile (active exam first). Profiles without a date become "No date yet" picks. */
export function draftFromProfile(p: OnboardingProfile): Draft {
  const d = emptyDraft();
  const ordered = [...p.profiles].sort((a, b) => Number(b.exam === p.examId) - Number(a.exam === p.examId));
  return {
    ...d,
    picks: ordered.map((x): ExamDraft => (x.kind === 'none' ? { exam: x.exam, sel: 0, date: '', none: true } : { exam: x.exam, sel: x.kind === 'calendar' ? x.session ?? 1 : 0, date: x.date ?? '' })),
    minutes: { ...p.minutesPerWeekday },
    offDay: p.offDay,
    done: [...p.chaptersDone],
    ambition: p.ambition,
  };
}

/** Read a saved draft: older drafts had `first` / `second` instead of `picks`. */
export function readDraft(raw: unknown): Draft {
  const base = emptyDraft();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Draft> & { first?: ExamDraft; second?: ExamDraft | null };
  const picks = Array.isArray(r.picks) ? r.picks : [r.first, r.second].filter((x): x is ExamDraft => !!x && typeof x.exam === 'string');
  const { first: _f, second: _s, ...rest } = r;
  void _f;
  void _s;
  return { ...base, ...rest, picks: picks.filter((x) => x && typeof x.exam === 'string').slice(0, MAX_PROFILES) };
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

/** exam id -> error text, for every pick that has a date problem. "No date yet" picks never have one. */
export function examErrors(d: Draft, today: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pick of d.picks) {
    if (pick.none) continue;
    const e = dateError(pick.date, today);
    if (e) out[pick.exam] = e;
  }
  return out;
}

/** At least one exam, and every dated pick has a usable date. */
export const examsOk = (d: Draft, today: string): boolean => d.picks.length > 0 && Object.keys(examErrors(d, today)).length === 0;

export const hasErrors = (d: Draft, today: string): boolean => !examsOk(d, today);

/** The plan input of one pick, or null for "No date yet". */
export const toExamSel = (x: ExamDraft): ExamSel | null => (x.none ? null : { exam: x.exam, session: x.sel, date: x.date });

/** Exam profiles to save, in pick order. */
export function toProfiles(d: Draft): ExamProfile[] {
  return d.picks.map((x): ExamProfile => (x.none ? { exam: x.exam, kind: 'none', date: null } : x.sel > 0 ? { exam: x.exam, kind: 'calendar', session: x.sel, date: x.date } : { exam: x.exam, kind: 'custom', date: x.date }));
}

/** Exam ids that have chapters to tick in step 3 come from all picks. */
export const pickIds = (d: Draft): string[] => d.picks.map((x) => x.exam);

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
