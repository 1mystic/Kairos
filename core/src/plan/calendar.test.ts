import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addDays, dayNumber, daysLeft, fromDayNumber, nearestExam, needsRollForward, parseExamCalendar,
  reanchorNotice, resolveExamDate, secondaryOnlyTopics, weekdayOf, type ExamCalendarEntry,
} from './calendar';

const entry = (o: Partial<ExamCalendarEntry> = {}): ExamCalendarEntry => ({
  id: 'JEE_MAIN_2027_S1', exam: 'JEE_MAIN', session: 1, date: null, window: null, status: 'expected', source: null, ...o,
});

describe('dates', () => {
  it('daysLeft is DST safe', () => {
    expect(daysLeft('2027-03-15', '2027-03-13')).toBe(2); // US DST
    expect(daysLeft('2026-10-26', '2026-10-24')).toBe(2); // EU DST end
    expect(daysLeft('2027-04-04', '2027-03-28')).toBe(7);
    expect(daysLeft('2027-01-22', '2027-01-22')).toBe(0);
    expect(daysLeft('2027-01-20', '2027-01-22')).toBe(-2);
  });
  it('addDays / weekday / roundtrip', () => {
    expect(addDays('2027-02-27', 2)).toBe('2027-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(weekdayOf('2027-01-22')).toBe(5);
    expect(fromDayNumber(dayNumber('2030-12-31'))).toBe('2030-12-31');
  });
  it('rejects invalid dates', () => {
    expect(() => dayNumber('2027-02-30')).toThrow();
    expect(() => dayNumber('27-1-1')).toThrow();
  });
});

describe('calendar', () => {
  it('parses the shipped exam_calendar.json', () => {
    const json = JSON.parse(readFileSync(new URL('../../../content/exam_calendar.json', import.meta.url), 'utf8'));
    const cal = parseExamCalendar(json);
    expect(cal.length).toBeGreaterThanOrEqual(4);
    expect(cal.every((e) => e.status === 'expected')).toBe(true);
  });
  it('rejects bad entries', () => {
    expect(() => parseExamCalendar([{ id: 'x', exam: 'A', session: 1, date: 'nope', status: 'expected' }])).toThrow();
    expect(() => parseExamCalendar([{ id: 'x', exam: 'A', session: 1, date: null, status: 'maybe' }])).toThrow();
  });
  it('resolveExamDate', () => {
    expect(resolveExamDate({})).toBeNull();
    expect(resolveExamDate({ calendarEntry: entry() })).toBeNull();
    expect(resolveExamDate({ calendarEntry: entry({ date: '2027-01-22', status: 'official' }) })).toEqual({ date: '2027-01-22', status: 'official', confirmed: true });
    expect(resolveExamDate({ calendarEntry: entry({ date: '2027-01-22' }) })?.confirmed).toBe(false);
    expect(resolveExamDate({ calendarEntry: entry({ window: { start: '2027-01-21', end: '2027-01-30' } }) })).toEqual({ date: '2027-01-21', status: 'expected', confirmed: false });
    expect(resolveExamDate({ calendarEntry: entry({ date: '2027-01-22' }), customDate: '2027-02-01' })).toEqual({ date: '2027-02-01', status: 'custom', confirmed: true });
  });
  it('needsRollForward', () => {
    const e = entry({ date: '2027-01-22' });
    expect(needsRollForward(e, '2027-01-22')).toBe(false);
    expect(needsRollForward(e, '2027-01-23')).toBe(true);
    expect(needsRollForward(entry(), '2030-01-01')).toBe(false);
    expect(needsRollForward(entry({ window: { start: '2027-01-21', end: '2027-01-30' } }), '2027-01-29')).toBe(false);
    expect(needsRollForward(entry({ window: { start: '2027-01-21', end: '2027-01-30' } }), '2027-01-31')).toBe(true);
    expect(needsRollForward(entry({ session: 2, date: '2027-01-01' }), '2027-06-01')).toBe(false);
    expect(needsRollForward(entry({ exam: 'NEET_UG', date: '2027-01-01' }), '2027-06-01')).toBe(false);
  });
  it('reanchorNotice only when a confirmed date changes', () => {
    const a = { date: '2027-01-22', status: 'official' as const, confirmed: true };
    const b = { date: '2027-01-29', status: 'official' as const, confirmed: true };
    expect(reanchorNotice(a, b)).toBe('Exam date changed from 22 Jan to 29 Jan; your plan was re-anchored.');
    expect(reanchorNotice(a, { ...b, date: '2028-01-05' })).toContain('22 Jan 2027 to 5 Jan 2028');
    expect(reanchorNotice(a, a)).toBeNull();
    expect(reanchorNotice(null, b)).toBeNull();
    expect(reanchorNotice(a, null)).toBeNull();
    expect(reanchorNotice({ ...a, confirmed: false }, b)).toBeNull();
  });
  it('nearestExam and secondaryOnlyTopics', () => {
    const l = [{ date: '2027-05-01', n: 'neet' }, { date: '2027-01-22', n: 'jee' }, { date: '2026-12-01', n: 'past' }];
    expect(nearestExam(l)?.n).toBe('past');
    expect(nearestExam(l, '2027-01-01')?.n).toBe('jee');
    expect(nearestExam(l, '2028-01-01')).toBeUndefined();
    expect(secondaryOnlyTopics(['a', 'b'], ['b', 'c', 'c', 'd'])).toEqual(['c', 'd']);
  });
});
