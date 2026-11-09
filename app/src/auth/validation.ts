import { isValidDob, toYmd } from '../lib/profile';

export type Errors<K extends string> = Partial<Record<K, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_RE.test(email.trim())) return 'That email address does not look right.';
}

export function validateSignIn(v: { email: string; password: string }): Errors<'email' | 'password'> {
  const e: Errors<'email' | 'password'> = {};
  const em = validateEmail(v.email);
  if (em) e.email = em;
  if (!v.password) e.password = 'Enter your password.';
  return e;
}

export function validateDob(dob: string, today: Date = new Date()): string | undefined {
  if (!dob) return 'Date of birth is required.';
  if (!isValidDob(dob)) return 'Enter a valid date of birth.';
  if (dob > toYmd(today)) return 'Date of birth cannot be in the future.';
}

export function validateSignUp(
  v: { name: string; email: string; password: string; dob: string },
  today: Date = new Date(),
): Errors<'name' | 'email' | 'password' | 'dob'> {
  const e: Errors<'name' | 'email' | 'password' | 'dob'> = {};
  const name = v.name.trim();
  if (!name) e.name = 'Enter your name.';
  else if (name.length > 80) e.name = 'Name can be at most 80 characters.';
  const em = validateEmail(v.email);
  if (em) e.email = em;
  if (v.password.length < 8) e.password = 'Choose a password with at least 8 characters.';
  const d = validateDob(v.dob, today);
  if (d) e.dob = d;
  return e;
}

/** A path we may send a user back to after sign-in: same-origin, not an auth page. */
export function safeReturnPath(from: unknown): string | null {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return null;
  if (/^\/(signin|signup|forgot|complete-profile)(\/|$)/.test(from)) return null;
  return from;
}
