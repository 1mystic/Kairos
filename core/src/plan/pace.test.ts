import { describe, expect, it } from 'vitest';
import {
  ambitionTarget, availableMinutes, behindOptions, capacityCheck, chapterRemainingMin, computePace,
  limitLoadChange, paceStatus, updateFu, workRemaining, type ChapterWork,
} from './pace';
import type { ScheduleDay } from './schedule';

const day = (kind: ScheduleDay['kind'], cap = 100, i = 0): ScheduleDay => ({ date: `2027-01-${String(i + 1).padStart(2, '0')}`, daysLeft: 30 - i, kind, phase: 'consolidate', capacityMin: cap });
const sched = (work: number, buffers = 0, cap = 100) => [
  ...Array.from({ length: work }, (_, i) => day('work', cap, i)),
  ...Array.from({ length: buffers }, (_, i) => day('buffer', cap, work + i)),
  day('mock', 300), day('off', 0),
];

describe('paceStatus boundaries', () => {
  it.each([
    [0, 'ahead'], [0.849, 'ahead'], [0.85, 'on_track'], [0.92, 'on_track'], [1.0, 'on_track'],
    [1.0001, 'slightly_behind'], [1.15, 'slightly_behind'], [1.1501, 'behind'], [3, 'behind'], [Infinity, 'behind'],
  ])('rho %s -> %s', (rho, s) => expect(paceStatus(rho)).toBe(s));
});

describe('computePace', () => {
  it('A counts only work days x fu', () => {
    expect(availableMinutes(sched(10, 2), 0.8)).toBe(800);
  });
  it('ahead / on track / no buffers spent', () => {
    const a = computePace({ workRemainingMin: 500, scheduleFromToday: sched(10), fu: 1, bufferDaysLeft: 3 });
    expect(a).toMatchObject({ W: 500, A: 1000, rho: 0.5, status: 'ahead', bufferToSpend: 0 });
    expect(a.message).toMatch(/Ahead/);
    const o = computePace({ workRemainingMin: 920, scheduleFromToday: sched(10), fu: 1, bufferDaysLeft: 3 });
    expect(o.status).toBe('on_track');
    expect(o.message).toBe('On track.');
  });
  it('slightly behind spends only as many buffers as needed', () => {
    const r = computePace({ workRemainingMin: 1100, scheduleFromToday: sched(10, 3), fu: 1, bufferDaysLeft: 3 });
    expect(r.status).toBe('slightly_behind');
    expect(r.bufferToSpend).toBe(1);
    expect(r.message).toMatch(/1 buffer day /);
    const two = computePace({ workRemainingMin: 1150, scheduleFromToday: sched(10, 3), fu: 1, bufferDaysLeft: 3 });
    expect(two.bufferToSpend).toBe(2);
    expect(two.message).toMatch(/2 buffer days/);
  });
  it('limited by buffers left and none left', () => {
    const r = computePace({ workRemainingMin: 1150, scheduleFromToday: sched(10, 3), fu: 1, bufferDaysLeft: 1 });
    expect(r.bufferToSpend).toBe(1);
    const n = computePace({ workRemainingMin: 1100, scheduleFromToday: sched(10, 3), fu: 1, bufferDaysLeft: 0 });
    expect(n.bufferToSpend).toBe(0);
    expect(n.message).toMatch(/no buffer/);
  });
  it('behind', () => {
    const r = computePace({ workRemainingMin: 2000, scheduleFromToday: sched(10, 1), fu: 1, bufferDaysLeft: 1 });
    expect(r.status).toBe('behind');
    expect(r.bufferToSpend).toBe(1);
    expect(r.message).toMatch(/Behind/);
  });
  it('edge: no capacity / no work', () => {
    expect(computePace({ workRemainingMin: 0, scheduleFromToday: [], fu: 1, bufferDaysLeft: 0 }).rho).toBe(0);
    const z = computePace({ workRemainingMin: 10, scheduleFromToday: [], fu: 1, bufferDaysLeft: 0 });
    expect(z.rho).toBe(Infinity);
    expect(z.status).toBe('behind');
  });
});

const chapters: ChapterWork[] = [
  { id: 'big', weight: 0.9, remainingMin: 300, marksCost: 12 },
  { id: 'smallB', weight: 0.2, remainingMin: 200, marksCost: 4 },
  { id: 'smallA', weight: 0.2, remainingMin: 150, marksCost: 2 },
  { id: 'mid', weight: 0.5, remainingMin: 100, marksCost: 6 },
];

describe('behindOptions', () => {
  it('null unless behind', () => {
    expect(behindOptions({ workRemainingMin: 1100, scheduleFromToday: sched(10), fu: 1, chapters })).toBeNull();
  });
  it('add minutes and drop lowest weight/marks first, requires consent', () => {
    const o = behindOptions({ workRemainingMin: 1300, scheduleFromToday: sched(10), fu: 1, chapters })!;
    expect(o.requiresConsent).toBe(true);
    expect(o.addMinutesPerDay).toBe(30); // (1300-1000)/10
    expect(o.addPercent).toBeCloseTo(0.3);
    expect(o.rampDays).toBe(2); // 1.3 <= 1.15^2
    expect(o.dropChapters.map((c) => c.id)).toEqual(['smallA', 'smallB']);
    expect(o.dropMarksCost).toBe(6);
    expect(o.rhoAfterDrop).toBeCloseTo(0.95);
    expect(o.dropReachesTarget).toBe(true);
  });
  it('drop plan can be insufficient; ties broken by id', () => {
    const o = behindOptions({ workRemainingMin: 5000, scheduleFromToday: sched(10), fu: 1, chapters })!;
    expect(o.dropChapters).toHaveLength(4);
    expect(o.dropReachesTarget).toBe(false);
    const t = behindOptions({ workRemainingMin: 1300, scheduleFromToday: sched(10), fu: 1, chapters: [
      { id: 'b', weight: 0.1, remainingMin: 400, marksCost: 1 }, { id: 'a', weight: 0.1, remainingMin: 400, marksCost: 1 }] })!;
    expect(t.dropChapters.map((c) => c.id)).toEqual(['a']);
  });
  it('no work days at all', () => {
    const o = behindOptions({ workRemainingMin: 100, scheduleFromToday: [], fu: 1, chapters: [] })!;
    expect(o.addMinutesPerDay).toBe(Infinity);
    expect(o.rampDays).toBe(0);
    expect(o.rhoAfterDrop).toBe(Infinity);
    expect(o.dropReachesTarget).toBe(false);
  });
});

describe('load rules', () => {
  it.each([
    [100, 200, 115], [100, 110, 110], [100, 50, 85], [100, 90, 90], [100, 100, 100],
    [0, 50, 50], [0, -5, 0],
  ])('limitLoadChange(%i,%i)=%i', (p, w, e) => expect(limitLoadChange(p, w)).toBeCloseTo(e));
  it('capacityCheck requires consent above stated', () => {
    expect(capacityCheck(120, 120).requiresConsent).toBe(false);
    expect(capacityCheck(121, 120).requiresConsent).toBe(true);
  });
});

describe('workRemaining', () => {
  it('ambition targets rise with weight and ambition', () => {
    expect(ambitionTarget('comfortable', 0)).toBeCloseTo(0.55);
    expect(ambitionTarget('comfortable', 1)).toBeCloseTo(0.65);
    expect(ambitionTarget('top', 1)).toBeCloseTo(0.9);
    expect(ambitionTarget('top', 5)).toBeCloseTo(0.9);
    expect(ambitionTarget('top', -1)).toBeCloseTo(0.8);
    expect(ambitionTarget('competitive', 0.5)).toBeGreaterThan(ambitionTarget('comfortable', 0.5));
    expect(ambitionTarget('competitive', 1)).toBeGreaterThan(ambitionTarget('competitive', 0));
  });
  it('W = sum max(0,(m*-m)/g) t + reviews', () => {
    const c = { id: 'a', weight: 0, mastery: 0.4, gain: 0.01, itemMin: 2 };
    expect(chapterRemainingMin(c, 'competitive')).toBeCloseTo(60); // (0.7-0.4)/0.01*2
    expect(workRemaining([c, { id: 'done', weight: 0, mastery: 0.99 }], { ambition: 'competitive', reviewMin: 40 })).toBeCloseTo(100);
    expect(workRemaining([], { ambition: 'top' })).toBe(0);
    expect(workRemaining([], { ambition: 'top', reviewMin: -5 })).toBe(0);
  });
  it('uses population priors when g / t missing', () => {
    expect(chapterRemainingMin({ id: 'a', weight: 0, mastery: 0.45 }, 'competitive')).toBeCloseTo((0.25 / 0.005) * 3);
    expect(chapterRemainingMin({ id: 'a', weight: 0, mastery: 0.45, gain: -1, itemMin: 0 }, 'competitive')).toBeCloseTo(150);
  });
});

describe('updateFu', () => {
  it('initialises, smooths, clamps', () => {
    expect(updateFu(null, 40, 50)).toEqual({ ewma: 0.8, fu: 0.8 * 1.1 });
    const n = updateFu(0.8, 50, 50);
    expect(n.ewma).toBeCloseTo(0.8 + (2 / 15) * 0.2);
    expect(updateFu(1, 100, 50).fu).toBe(1.1);
    expect(updateFu(0.1, 0, 50).fu).toBe(0.5);
    expect(updateFu(0.9, 0, 0)).toEqual({ ewma: 0.9, fu: 0.9 * 1.1 });
    expect(updateFu(null, 0, 0)).toEqual({ ewma: 1, fu: 1.1 });
  });
});
