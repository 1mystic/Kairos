import { addDays, dayNumber, weekdayOf } from '@kairos/core';

/** Dashboard range: a window of whole local days ending at `end` (YYYY-MM-DD, inclusive). All maths is on date strings, never on timestamps, so DST cannot shift a day. */
export type RangeKind = 'daily' | 'week' | 'month';
export const RANGE_KINDS: readonly RangeKind[] = ['daily', 'week', 'month'];
export const RANGE_LENGTH: Record<RangeKind, number> = { daily: 1, week: 7, month: 30 };
export const RANGE_LABEL: Record<RangeKind, string> = { daily: 'Daily', week: 'Week', month: 'Month' };
export const PREVIOUS_WORD: Record<RangeKind, string> = { daily: 'previous day', week: 'previous week', month: 'previous 30 days' };

export interface Range {
  kind: RangeKind;
  /** last day of the window, inclusive */
  end: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of an epoch-ms instant (or Date) as YYYY-MM-DD. */
export function localDate(at: number | Date): string {
  const d = typeof at === 'number' ? new Date(at) : at;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayYmd = (now: number = Date.now()): string => localDate(now);

export function isYmd(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  try {
    dayNumber(s);
    return true;
  } catch {
    return false;
  }
}

export const rangeLength = (r: Range): number => RANGE_LENGTH[r.kind];
export const windowStart = (r: Range): string => addDays(r.end, 1 - rangeLength(r));

/** Dates of the window, oldest first. */
export function windowDays(r: Range): string[] {
  const start = windowStart(r);
  return Array.from({ length: rangeLength(r) }, (_, i) => addDays(start, i));
}

export function inWindow(date: string, r: Range): boolean {
  return date >= windowStart(r) && date <= r.end;
}

/** The equal-length window immediately before this one. */
export function previousRange(r: Range): Range {
  return { kind: r.kind, end: addDays(windowStart(r), -1) };
}

/** Move the window by whole windows. Never goes past today. */
export function shiftRange(r: Range, dir: 1 | -1, today: string): Range {
  const end = addDays(r.end, dir * rangeLength(r));
  return { kind: r.kind, end: end > today ? today : end };
}

export const canGoNext = (r: Range, today: string): boolean => r.end < today;

export function setKind(r: Range, kind: RangeKind): Range {
  return { kind, end: r.end };
}

export function clampToToday(r: Range, today: string): Range {
  return r.end > today ? { ...r, end: today } : r;
}

/** Days drawn in the trend chart: the window, or the last 7 days for a single-day range. */
export function trendDays(r: Range): string[] {
  if (r.kind !== 'daily') return windowDays(r);
  return Array.from({ length: 7 }, (_, i) => addDays(r.end, i - 6));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(date: string): { y: number; m: number; d: number } {
  dayNumber(date);
  return { y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)), d: Number(date.slice(8, 10)) };
}

/** "Wed 8 Nov 2026" */
export function formatDay(date: string, withYear = true): string {
  const { y, m, d } = parts(date);
  return `${WEEKDAYS[weekdayOf(date)]} ${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** "8 Nov" */
export function formatShort(date: string): string {
  const { m, d } = parts(date);
  return `${d} ${MONTHS[m - 1]}`;
}

export function rangeLabel(r: Range): string {
  if (r.kind === 'daily') return formatDay(r.end);
  const start = windowStart(r);
  const sameYear = start.slice(0, 4) === r.end.slice(0, 4);
  return `${sameYear ? formatShort(start) : `${formatShort(start)} ${start.slice(0, 4)}`} to ${formatShort(r.end)} ${r.end.slice(0, 4)}`;
}

/** "Today", "Yesterday" or the label: used for screen-reader announcements and headings. */
export function rangeTitle(r: Range, today: string): string {
  if (r.kind === 'daily') return r.end === today ? 'Today' : r.end === addDays(today, -1) ? 'Yesterday' : formatDay(r.end);
  if (r.end === today) return r.kind === 'week' ? 'Last 7 days' : 'Last 30 days';
  return rangeLabel(r);
}
