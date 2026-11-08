/** Profile doc at users/{uid}. Schema is enforced by firestore.rules — do not deviate. */
export type ConsentStatus = 'not_required' | 'pending'; // client may never write 'granted'

export interface NewProfile {
  schemaVersion: 1;
  displayName: string;
  email: string;
  dob: string; // YYYY-MM-DD
  isMinor: boolean;
  consent: { status: ConsentStatus };
  onboarded: false;
}

export interface UserProfile extends Omit<NewProfile, 'consent' | 'onboarded'> {
  consent: { status: ConsentStatus | 'granted' };
  onboarded: boolean;
  exam?: string;
  examDate?: string | null;
  ambition?: 'comfortable' | 'competitive' | 'top';
  minutesPerWeekday?: Record<string, number>;
  offDay?: number | null;
  chaptersDone?: string[];
  lang?: 'en' | 'hi';
}

export interface ProfileInput {
  displayName: string;
  email: string;
  dob: string;
}

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDob(dob: string): boolean {
  const m = DOB_RE.exec(dob);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Local calendar date as YYYY-MM-DD. */
export function toYmd(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Whole years between dob and today (both YYYY-MM-DD). */
export function ageOn(dob: string, today: string): number {
  const [by = 0, bm = 0, bd = 0] = dob.split('-').map(Number);
  const [ty = 0, tm = 0, td = 0] = today.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

export function buildNewProfile(input: ProfileInput, today: Date | string = new Date()): NewProfile {
  const todayStr = typeof today === 'string' ? today : toYmd(today);
  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 80) throw new Error('Name must be 1 to 80 characters.');
  if (!isValidDob(input.dob)) throw new Error('Enter a valid date of birth.');
  if (input.dob > todayStr) throw new Error('Date of birth cannot be in the future.');
  const age = ageOn(input.dob, todayStr);
  if (age > 120) throw new Error('Enter a valid date of birth.');
  const isMinor = age < 18;
  return {
    schemaVersion: 1,
    displayName,
    email: input.email,
    dob: input.dob,
    isMinor,
    consent: { status: isMinor ? 'pending' : 'not_required' },
    onboarded: false,
  };
}
