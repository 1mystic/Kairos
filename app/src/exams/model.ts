import { daysLeft } from '@kairos/core';
import { isExamId } from '../practice/taxonomy';

/**
 * Exam profiles: a student prepares for up to MAX_PROFILES exams at once and has one ACTIVE exam.
 *
 * Cloud/guest profile fields (all optional, so old accounts keep working):
 *   profiles:   [{ exam, kind, session?, date }]   at most 7, one per exam id
 *   activeExam: "JEE_MAIN"                           which profile the app follows
 * The packed legacy `exam` ("JEE_MAIN.1") and `examDate` are ALWAYS written for the active profile too, so code that
 * only knows the old fields (dashboard, practice picker, diagnostic, analysis, older app versions) follows the active exam.
 * Accounts that only have the packed strings are read with `profilesFromLegacy` (never written back until the student edits).
 */

export type ProfileKind = 'calendar' | 'custom' | 'none';

export interface ExamProfile {
  exam: string;
  /** calendar: follows an exam_calendar session; custom: the student's own date; none: no date (interview tracks) */
  kind: ProfileKind;
  /** calendar session number (>= 1), calendar profiles only */
  session?: number;
  date?: string | null;
}

export interface ExamProfiles {
  profiles: ExamProfile[];
  /** exam id of the active profile; null only when there are no profiles */
  active: string | null;
}

export const MAX_PROFILES = 7;
/** firestore.rules: activeExam is a string of at most 20 characters */
export const MAX_ACTIVE_LEN = 20;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: readonly ProfileKind[] = ['calendar', 'custom', 'none'];

export const emptyProfiles = (): ExamProfiles => ({ profiles: [], active: null });

/** One stored map -> a valid profile, or null. Dates must be YYYY-MM-DD; a `none` profile never carries a date. */
export function normaliseProfile(x: unknown): ExamProfile | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.exam !== 'string' || !isExamId(o.exam)) return null;
  const kind = KINDS.find((k) => k === o.kind);
  if (!kind) return null;
  const date = typeof o.date === 'string' && YMD.test(o.date) ? o.date : null;
  if (kind === 'none') return { exam: o.exam, kind, date: null };
  if (kind === 'calendar') {
    const session = typeof o.session === 'number' && Number.isInteger(o.session) && o.session >= 1 ? o.session : 1;
    return { exam: o.exam, kind, session, date };
  }
  return { exam: o.exam, kind, date };
}

/** Stored list -> valid, de-duplicated (one per exam) profiles, at most MAX_PROFILES. */
export function parseProfiles(raw: unknown): ExamProfile[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ExamProfile[] = [];
  for (const item of raw) {
    const p = normaliseProfile(item);
    if (!p || seen.has(p.exam)) continue;
    seen.add(p.exam);
    out.push(p);
    if (out.length >= MAX_PROFILES) break;
  }
  return out;
}

/** Plain maps for Firestore / IndexedDB (no undefined values). */
export function serialiseProfiles(list: readonly ExamProfile[]): Array<Record<string, unknown>> {
  return list.slice(0, MAX_PROFILES).map((p) => ({
    exam: p.exam,
    kind: p.kind,
    ...(p.kind === 'calendar' ? { session: p.session ?? 1 } : {}),
    date: p.kind === 'none' ? null : p.date ?? null,
  }));
}

/**
 * Packed legacy strings -> profiles. "JEE_MAIN.1" (date in examDate), "JEE_MAIN.2+NEET_UG.1@2027-05-03" (later exams carry their date).
 * Session > 0 = calendar, 0 = own date. An exam without a date becomes a `none` profile. Not written anywhere.
 */
export function profilesFromLegacy(exam: string | undefined | null, examDate: string | null | undefined): ExamProfile[] {
  if (!exam) return [];
  const out: ExamProfile[] = [];
  const seen = new Set<string>();
  exam.split('+').forEach((tok, i) => {
    const [head = '', at] = tok.split('@');
    const [id = '', sess] = head.split('.');
    if (!isExamId(id) || seen.has(id)) return;
    const raw = i === 0 ? examDate : at;
    const date = typeof raw === 'string' && YMD.test(raw) ? raw : null;
    const session = Number(sess) || 0;
    seen.add(id);
    if (!date) out.push({ exam: id, kind: 'none', date: null });
    else if (session > 0) out.push({ exam: id, kind: 'calendar', session, date });
    else out.push({ exam: id, kind: 'custom', date });
  });
  return out.slice(0, MAX_PROFILES);
}

export interface ProfileSource {
  profiles?: unknown;
  activeExam?: unknown;
  exam?: unknown;
  examDate?: unknown;
}

/** `profiles` wins when present and valid; otherwise derive from the packed strings. The active exam falls back to the first profile. */
export function profilesOf(p: ProfileSource | null | undefined): ExamProfiles {
  if (!p) return emptyProfiles();
  let profiles = parseProfiles(p.profiles);
  if (profiles.length === 0) profiles = profilesFromLegacy(typeof p.exam === 'string' ? p.exam : undefined, typeof p.examDate === 'string' ? p.examDate : null);
  if (profiles.length === 0) return emptyProfiles();
  const wanted = typeof p.activeExam === 'string' ? p.activeExam : '';
  const active = profiles.some((x) => x.exam === wanted) ? wanted : profiles[0]!.exam;
  return { profiles, active };
}

export const activeProfile = (s: ExamProfiles): ExamProfile | null => s.profiles.find((p) => p.exam === s.active) ?? null;

/** Switch the active exam. Unknown exam ids leave the state unchanged. */
export function withActive(s: ExamProfiles, exam: string): ExamProfiles {
  return s.profiles.some((p) => p.exam === exam) ? { ...s, active: exam } : s;
}

export const canAddProfile = (s: ExamProfiles): boolean => s.profiles.length < MAX_PROFILES;

/** Add (or replace the same exam). Beyond the limit nothing is added. The first profile becomes active automatically. */
export function addProfile(s: ExamProfiles, p: ExamProfile, opts: { activate?: boolean } = {}): ExamProfiles {
  const clean = normaliseProfile(p);
  if (!clean) return s;
  const has = s.profiles.some((x) => x.exam === clean.exam);
  if (!has && !canAddProfile(s)) return s;
  const profiles = has ? s.profiles.map((x) => (x.exam === clean.exam ? clean : x)) : [...s.profiles, clean];
  const active = opts.activate || !s.active ? clean.exam : s.active;
  return { profiles, active };
}

/** Remove one profile. The last profile cannot be removed. Removing the active one activates the first remaining. */
export function removeProfile(s: ExamProfiles, exam: string): ExamProfiles {
  if (s.profiles.length <= 1 || !s.profiles.some((p) => p.exam === exam)) return s;
  const profiles = s.profiles.filter((p) => p.exam !== exam);
  return { profiles, active: s.active === exam ? profiles[0]!.exam : s.active };
}

/** Change the sitting/date of one profile (kind, session, date). The exam id cannot change. */
export function updateProfile(s: ExamProfiles, exam: string, patch: Partial<Omit<ExamProfile, 'exam'>>): ExamProfiles {
  const cur = s.profiles.find((p) => p.exam === exam);
  if (!cur) return s;
  const next = normaliseProfile({ ...cur, ...patch, exam });
  if (!next) return s;
  return { ...s, profiles: s.profiles.map((p) => (p.exam === exam ? next : p)) };
}

/** Packed `exam` / `examDate` for one profile (the legacy fields every older code path reads). */
export function packedFor(p: ExamProfile): { exam: string; examDate: string | null } {
  const session = p.kind === 'calendar' ? p.session ?? 1 : 0;
  return { exam: `${p.exam}.${session}`, examDate: p.kind === 'none' ? null : p.date ?? null };
}

export interface ProfileFieldsOut {
  profiles: Array<Record<string, unknown>>;
  activeExam: string;
  exam: string;
  examDate: string | null;
}

/** The ONE profile write: profiles + activeExam + the packed fields of the active profile. Null when there is nothing to write. */
export function toProfileFields(s: ExamProfiles): ProfileFieldsOut | null {
  const a = activeProfile(s);
  if (!a || s.profiles.length === 0) return null;
  return { profiles: serialiseProfiles(s.profiles), activeExam: a.exam.slice(0, MAX_ACTIVE_LEN), ...packedFor(a) };
}

/** Whole days to the profile's date, or null when it has none. Negative once passed. */
export function profileDaysLeft(p: ExamProfile, today: string): number | null {
  return p.kind !== 'none' && p.date ? daysLeft(p.date, today) : null;
}

/** "42 days to go", "Exam day is past", "No date yet" */
export function daysWords(p: ExamProfile, today: string): string {
  const n = profileDaysLeft(p, today);
  if (n === null) return 'No date yet';
  if (n < 0) return 'Date has passed';
  if (n === 0) return 'Today';
  return `${n} day${n === 1 ? '' : 's'} to go`;
}

/** Exam ids not yet chosen, in registry order (for the "Add an exam" picker). */
export const remainingExams = (s: ExamProfiles, all: readonly string[]): string[] => all.filter((id) => !s.profiles.some((p) => p.exam === id));
