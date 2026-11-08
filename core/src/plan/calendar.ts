import { z } from 'zod';

/** Local-date arithmetic on YYYY-MM-DD strings. Uses UTC day numbers, so DST can never shift a day. */
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dayNumber(date: string): number {
  const m = ISO_RE.exec(date);
  if (!m) throw new Error(`invalid date: ${date}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new Error(`invalid date: ${date}`);
  }
  return ms / 86_400_000;
}

export function fromDayNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  return fromDayNumber(dayNumber(date) + n);
}

/** 0 = Sunday ... 6 = Saturday (same as Date#getDay). */
export function weekdayOf(date: string): number {
  return new Date(dayNumber(date) * 86_400_000).getUTCDay();
}

/** Whole days from `today` to `examDate` (0 on exam day, negative once passed). */
export function daysLeft(examDate: string, today: string): number {
  return dayNumber(examDate) - dayNumber(today);
}

const isoDate = z.string().refine(
  (s) => {
    try {
      dayNumber(s);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'expected a valid YYYY-MM-DD date' },
);

export const ExamStatus = z.enum(['expected', 'official']);
export type ExamStatus = z.infer<typeof ExamStatus>;

export const ExamCalendarEntry = z.object({
  id: z.string().min(1),
  exam: z.string().min(1),
  session: z.number().int().positive(),
  date: isoDate.nullable(),
  window: z.object({ start: isoDate, end: isoDate }).nullable().optional(),
  status: ExamStatus,
  source: z.string().nullable().optional(),
});
export type ExamCalendarEntry = z.infer<typeof ExamCalendarEntry>;

export const ExamCalendar = z.array(ExamCalendarEntry);
export type ExamCalendar = z.infer<typeof ExamCalendar>;

export function parseExamCalendar(json: unknown): ExamCalendar {
  return ExamCalendar.parse(json);
}

export interface ResolvedExamDate {
  date: string;
  /** `custom` = the student typed their own date. */
  status: 'expected' | 'official' | 'custom';
  /** official or custom: safe to anchor a plan without caveats. */
  confirmed: boolean;
}

/** Custom date wins; otherwise calendar date, else window start (expected); else null (ask the student). */
export function resolveExamDate(input: {
  calendarEntry?: ExamCalendarEntry;
  customDate?: string;
}): ResolvedExamDate | null {
  if (input.customDate) {
    dayNumber(input.customDate);
    return { date: input.customDate, status: 'custom', confirmed: true };
  }
  const e = input.calendarEntry;
  if (!e) return null;
  if (e.date) return { date: e.date, status: e.status, confirmed: e.status === 'official' };
  if (e.window) return { date: e.window.start, status: 'expected', confirmed: false };
  return null;
}

/** JEE Main session 1 has passed: ask the student about session 2 and roll forward. */
export function needsRollForward(entry: ExamCalendarEntry, today: string): boolean {
  if (entry.exam !== 'JEE_MAIN' || entry.session !== 1) return false;
  const last = entry.window?.end ?? entry.date;
  return last !== null && last !== undefined && dayNumber(today) > dayNumber(last);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pretty(date: string, withYear: boolean): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** One-line message when a confirmed exam date changes; null otherwise. */
export function reanchorNotice(prev: ResolvedExamDate | null, next: ResolvedExamDate | null): string | null {
  if (!prev || !next || !prev.confirmed || prev.date === next.date) return null;
  const withYear = prev.date.slice(0, 4) !== next.date.slice(0, 4);
  return `Exam date changed from ${pretty(prev.date, withYear)} to ${pretty(next.date, withYear)}; your plan was re-anchored.`;
}

/** Nearest upcoming exam (date >= today when given; otherwise the earliest). */
export function nearestExam<T extends { date: string }>(list: readonly T[], today?: string): T | undefined {
  const pool = today ? list.filter((e) => dayNumber(e.date) >= dayNumber(today)) : [...list];
  let best: T | undefined;
  for (const e of pool) if (!best || dayNumber(e.date) < dayNumber(best.date)) best = e;
  return best;
}

/** Topics only the secondary exam needs (added on top of the nearest/primary exam's syllabus). */
export function secondaryOnlyTopics(primary: Iterable<string>, secondary: Iterable<string>): string[] {
  const p = new Set(primary);
  return [...new Set(secondary)].filter((t) => !p.has(t));
}
