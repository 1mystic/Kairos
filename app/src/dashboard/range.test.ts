import { describe, expect, it } from 'vitest';
import { canGoNext, formatDay, localDate, previousRange, rangeLabel, rangeTitle, setKind, shiftRange, trendDays, windowDays, windowStart, inWindow, type Range } from './range';

const r = (kind: Range['kind'], end: string): Range => ({ kind, end });

describe('range windows', () => {
  it('daily is one day, week 7, month 30 (end inclusive)', () => {
    expect(windowDays(r('daily', '2026-11-08'))).toEqual(['2026-11-08']);
    expect(windowDays(r('week', '2026-11-08'))).toHaveLength(7);
    expect(windowStart(r('week', '2026-11-08'))).toBe('2026-11-02');
    expect(windowStart(r('month', '2026-11-08'))).toBe('2026-10-10');
    expect(windowDays(r('month', '2026-11-08'))).toHaveLength(30);
  });
  it('crosses month and year ends', () => {
    expect(windowStart(r('week', '2027-01-03'))).toBe('2026-12-28');
    expect(windowStart(r('month', '2026-03-01'))).toBe('2026-01-31');
    expect(windowDays(r('week', '2024-03-02'))).toContain('2024-02-29');
  });
  it('is DST-safe: 7 consecutive distinct dates over spring-forward and fall-back', () => {
    for (const end of ['2026-03-30', '2026-03-09', '2026-11-02', '2026-10-26']) {
      const d = windowDays(r('week', end));
      expect(new Set(d).size).toBe(7);
      for (let i = 1; i < 7; i++) expect(Date.parse(`${d[i]}T00:00:00Z`) - Date.parse(`${d[i - 1]}T00:00:00Z`)).toBe(86_400_000);
    }
  });
  it('previous range is the equal window right before', () => {
    expect(previousRange(r('week', '2026-11-08'))).toEqual(r('week', '2026-11-01'));
    expect(previousRange(r('daily', '2026-03-01'))).toEqual(r('daily', '2026-02-28'));
    expect(windowDays(previousRange(r('month', '2026-11-08')))).toHaveLength(30);
  });
  it('shift moves by whole windows and never past today', () => {
    expect(shiftRange(r('week', '2026-11-08'), -1, '2026-11-08').end).toBe('2026-11-01');
    expect(shiftRange(r('week', '2026-11-01'), 1, '2026-11-08').end).toBe('2026-11-08');
    expect(shiftRange(r('week', '2026-11-05'), 1, '2026-11-08').end).toBe('2026-11-08');
    expect(canGoNext(r('daily', '2026-11-08'), '2026-11-08')).toBe(false);
    expect(canGoNext(r('daily', '2026-11-07'), '2026-11-08')).toBe(true);
  });
  it('setKind keeps the end date; inWindow checks bounds', () => {
    expect(setKind(r('daily', '2026-11-08'), 'month')).toEqual(r('month', '2026-11-08'));
    expect(inWindow('2026-11-02', r('week', '2026-11-08'))).toBe(true);
    expect(inWindow('2026-11-01', r('week', '2026-11-08'))).toBe(false);
  });
  it('daily trend shows the last 7 days', () => {
    expect(trendDays(r('daily', '2026-11-08'))).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  });
  it('labels', () => {
    expect(formatDay('2026-11-08')).toBe('Sun 8 Nov 2026');
    expect(rangeLabel(r('week', '2026-11-08'))).toBe('2 Nov to 8 Nov 2026');
    expect(rangeLabel(r('week', '2027-01-03'))).toBe('28 Dec 2026 to 3 Jan 2027');
    expect(rangeTitle(r('daily', '2026-11-08'), '2026-11-08')).toBe('Today');
    expect(rangeTitle(r('daily', '2026-11-07'), '2026-11-08')).toBe('Yesterday');
  });
  it('localDate uses local calendar fields', () => {
    expect(localDate(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08');
    expect(localDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
