import { parseExamCalendar, type ExamCalendar, type ExamCalendarEntry } from '@kairos/core';
import raw from '../../../content/exam_calendar.json';

/** content/exam_calendar.json, validated. Dates are filled in as the exam bodies announce them. */
export const CALENDAR: ExamCalendar = parseExamCalendar(raw);

export const entriesFor = (exam: string, cal: ExamCalendar = CALENDAR): ExamCalendarEntry[] =>
  cal.filter((e) => e.exam === exam).sort((a, b) => a.session - b.session);

export const findEntry = (exam: string, session: number, cal: ExamCalendar = CALENDAR): ExamCalendarEntry | undefined =>
  cal.find((e) => e.exam === exam && e.session === session);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "22 Jan 2027" */
export function prettyDate(iso: string, withWeekday = false): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const wd = withWeekday ? `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ` : '';
  return `${wd}${d} ${MONTHS[m - 1]} ${y}`;
}
/** "Sat 22 Jan" */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAY_SHORT = DAYS;
