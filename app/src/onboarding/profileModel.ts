import type { Ambition } from '@kairos/core';
import { toYmd, type UserProfile } from '../lib/profile';
import type { GuestProfile, Profile, UserStore } from '../store/types';

/**
 * One chosen exam. `session` is the calendar session (1, 2); 0 means the student typed their own date.
 * The cloud profile only allows `exam` (<= 40 chars) and `examDate`, so exams are packed into `exam`:
 *   "JEE_MAIN.1"                      one exam, date in examDate
 *   "JEE_MAIN.2+NEET_UG.1@2027-05-03" nearest first; every later exam carries its own date
 * Worst case is about 31 characters.
 */
export interface ExamSel {
  exam: string;
  session: number;
  date: string;
}

export interface OnboardingProfile {
  /** nearest first; [0] is the primary exam (its date is `examDate`) */
  exams: ExamSel[];
  ambition: Ambition;
  /** 0 = Sunday ... 6 = Saturday */
  minutesPerWeekday: Record<number, number>;
  offDay: number | null;
  chaptersDone: string[];
  lang: 'en' | 'hi';
  onboarded: boolean;
}

export const DEFAULT_MINUTES: Record<number, number> = { 0: 180, 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 180 };

export const emptyOnboarding = (): OnboardingProfile => ({
  exams: [],
  ambition: 'competitive',
  minutesPerWeekday: { ...DEFAULT_MINUTES },
  offDay: 0,
  chaptersDone: [],
  lang: 'en',
  onboarded: false,
});

export function encodeExams(exams: readonly ExamSel[]): { exam: string; examDate: string | null } {
  const sorted = [...exams].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (sorted.length === 0) return { exam: '', examDate: null };
  const exam = sorted.map((e, i) => `${e.exam}.${e.session}${i > 0 ? `@${e.date}` : ''}`).join('+');
  return { exam, examDate: sorted[0]!.date };
}

export function decodeExams(exam: string | undefined, examDate: string | null | undefined): ExamSel[] {
  if (!exam || !examDate) return [];
  const out: ExamSel[] = [];
  exam.split('+').forEach((tok, i) => {
    const [head = '', at] = tok.split('@');
    const [id = '', sess] = head.split('.');
    const date = i === 0 ? examDate : at;
    if (id && date) out.push({ exam: id, session: Number(sess) || 0, date });
  });
  return out;
}

const num = (x: unknown, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** Profile (guest or cloud) -> typed onboarding view with defaults. */
export function parseProfile(p: Profile | null | undefined): OnboardingProfile {
  const base = emptyOnboarding();
  if (!p) return base;
  const q = p as Partial<UserProfile & GuestProfile>;
  const minutes: Record<number, number> = { ...DEFAULT_MINUTES };
  for (let d = 0; d < 7; d++) minutes[d] = Math.max(0, Math.round(num(q.minutesPerWeekday?.[String(d)], minutes[d]!)));
  return {
    exams: decodeExams(q.exam, q.examDate),
    ambition: q.ambition === 'comfortable' || q.ambition === 'top' || q.ambition === 'competitive' ? q.ambition : base.ambition,
    minutesPerWeekday: minutes,
    offDay: q.offDay === null ? null : typeof q.offDay === 'number' ? q.offDay : base.offDay,
    chaptersDone: Array.isArray(q.chaptersDone) ? q.chaptersDone.slice(0, 400) : [],
    lang: q.lang === 'hi' ? 'hi' : 'en',
    onboarded: q.onboarded === true,
  };
}

export type ProfileFields = Partial<Pick<UserProfile, 'onboarded' | 'exam' | 'examDate' | 'ambition' | 'minutesPerWeekday' | 'offDay' | 'chaptersDone' | 'lang'>>;

/** Typed patch -> the cloud-allowed field names. Only keys present in `patch` are written. */
export function toFields(patch: Partial<OnboardingProfile>): ProfileFields {
  const f: ProfileFields = {};
  if (patch.exams) Object.assign(f, encodeExams(patch.exams));
  if (patch.ambition) f.ambition = patch.ambition;
  if (patch.minutesPerWeekday) f.minutesPerWeekday = Object.fromEntries(Object.entries(patch.minutesPerWeekday).map(([k, v]) => [k, v]));
  if (patch.offDay !== undefined) f.offDay = patch.offDay;
  if (patch.chaptersDone) f.chaptersDone = patch.chaptersDone.slice(0, 400);
  if (patch.lang) f.lang = patch.lang;
  if (patch.onboarded !== undefined) f.onboarded = patch.onboarded;
  return f;
}

/** One write. Guests: merges into the local guest profile (creating it if missing). Signed in: one Firestore update. */
export async function saveOnboardingFields(store: UserStore, fields: ProfileFields, now = Date.now()): Promise<void> {
  if (store.kind === 'local' && !(await store.getProfile())) {
    await store.saveProfile({ kind: 'guest', displayName: 'Guest', createdAt: now, ...fields });
    return;
  }
  await store.saveProfile(fields);
}

/** Local date of an instant, with the day starting at 04:00 (a student up at 01:00 is still on "yesterday"). */
export function planDate(now: Date): string {
  return toYmd(new Date(now.getTime() - 4 * 3_600_000));
}
