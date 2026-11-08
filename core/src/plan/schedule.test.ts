import { describe, expect, it } from 'vitest';
import { addDays, daysLeft } from './calendar';
import { buildSchedule, countByKind, scheduleFrom, workMinutes, type ScheduleInput } from './schedule';

const mins = (v: number | number[]) => {
  const a = Array.isArray(v) ? v : Array(7).fill(v);
  return Object.fromEntries(a.map((x: number, i: number) => [i, x])) as Record<number, number>;
};
// deterministic LCG
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

describe('buildSchedule', () => {
  it('empty when exam is today or past', () => {
    expect(buildSchedule({ today: '2027-01-01', examDate: '2027-01-01', minutesPerWeekday: mins(100), offDay: null })).toEqual([]);
    expect(buildSchedule({ today: '2027-01-05', examDate: '2027-01-01', minutesPerWeekday: mins(100), offDay: null })).toEqual([]);
  });

  it('is deterministic and covers today..exam-1', () => {
    const inp: ScheduleInput = { today: '2027-01-01', examDate: '2027-05-01', minutesPerWeekday: mins(240), offDay: 0 };
    const a = buildSchedule(inp);
    expect(a).toEqual(buildSchedule(inp));
    expect(a).toHaveLength(daysLeft('2027-05-01', '2027-01-01'));
    expect(a[0]?.date).toBe('2027-01-01');
    expect(a.at(-1)?.date).toBe('2027-04-30');
  });

  it('short runways start in the right phase', () => {
    const s40 = buildSchedule({ today: '2027-01-01', examDate: '2027-02-10', minutesPerWeekday: mins(240), offDay: null });
    expect(s40[0]?.phase).toBe('consolidate');
    const s10 = buildSchedule({ today: '2027-01-01', examDate: '2027-01-11', minutesPerWeekday: mins(240), offDay: null });
    expect(s10[0]?.phase).toBe('final_sprint');
    expect(s10.map((d) => d.kind)).toEqual([...Array(8).fill('sprint_mock'), 'taper', 'taper']);
  });

  it('off-day overridden in sprint with a warning, respected elsewhere (taper too)', () => {
    const s = buildSchedule({ today: '2027-01-01', examDate: '2027-03-01', minutesPerWeekday: mins(240), offDay: 0 });
    for (const d of s) {
      const isSun = new Date(d.date + 'T00:00:00Z').getUTCDay() === 0;
      if (!isSun) continue;
      if (d.kind === 'sprint_mock') {
        expect(d.offDayOverridden).toBe(true);
        expect(d.warning).toMatch(/off-day/);
      } else {
        expect(d.kind).toBe('off');
        expect(d.capacityMin).toBe(0);
      }
    }
    expect(s.some((d) => d.offDayOverridden)).toBe(true);
    // taper on off day
    const t = buildSchedule({ today: '2027-01-01', examDate: '2027-01-04', minutesPerWeekday: mins(100), offDay: 0 }); // Fri Sat Sun
    expect(t.map((d) => d.kind)).toEqual(['sprint_mock', 'taper', 'off']);
  });

  it('mocks need enough capacity and are deferred', () => {
    // 90 min weekdays, 300 on Saturday only; strengthen-phase weekly mocks must land on Saturdays
    const m = mins([0, 90, 90, 90, 90, 90, 300]);
    const s = buildSchedule({ today: '2027-01-01', examDate: '2027-04-10', minutesPerWeekday: m, offDay: null });
    const mocks = s.filter((d) => d.kind === 'mock');
    expect(mocks.length).toBeGreaterThan(3);
    for (const d of mocks) expect(d.capacityMin).toBeGreaterThanOrEqual(210);
    // no capacity anywhere for mocks -> none placed
    const none = buildSchedule({ today: '2027-01-01', examDate: '2027-04-10', minutesPerWeekday: mins(60), offDay: null });
    expect(countByKind(none).mock).toBe(0);
  });

  it('countByKind / workMinutes / scheduleFrom', () => {
    const s = buildSchedule({ today: '2027-01-01', examDate: '2027-03-01', minutesPerWeekday: mins(100), offDay: null });
    const c = countByKind(s);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(s.length);
    expect(workMinutes(s)).toBe(c.work * 100);
    expect(scheduleFrom(s, '2027-02-01')[0]?.date).toBe('2027-02-01');
  });

  it('handles DST boundaries without skipping or repeating dates', () => {
    const s = buildSchedule({ today: '2027-03-10', examDate: '2027-03-20', minutesPerWeekday: mins(60), offDay: null });
    expect(s.map((d) => d.date)).toEqual(Array.from({ length: 10 }, (_, i) => addDays('2027-03-10', i)));
  });

  it('invariants over randomized inputs', () => {
    const r = rng(42);
    for (let k = 0; k < 150; k++) {
      const N = 1 + Math.floor(r() * 300);
      const today = addDays('2026-11-08', Math.floor(r() * 400));
      const m = mins(Array.from({ length: 7 }, () => Math.floor(r() * 400)));
      const offDay = r() < 0.7 ? Math.floor(r() * 7) : null;
      const s = buildSchedule({ today, examDate: addDays(today, N), minutesPerWeekday: m, offDay });
      expect(s).toHaveLength(N);

      // taper = last 2 days (or an off-day there)
      for (const d of s.slice(-2)) expect(['taper', 'off']).toContain(d.kind);
      for (const d of s.slice(-2)) expect(d.phase).toBe('taper');
      // sprint days are mocks (daysLeft 3..15)
      for (const d of s.filter((x) => x.daysLeft >= 3 && x.daysLeft <= 15)) expect(d.kind).toBe('sprint_mock');
      // capacity never exceeds stated, off days respected outside sprint
      let cap = 0;
      for (const d of s) {
        const wd = new Date(d.date + 'T00:00:00Z').getUTCDay();
        expect(d.capacityMin).toBeLessThanOrEqual(m[wd] as number);
        cap += d.capacityMin;
        if (offDay !== null && wd === offDay && d.kind !== 'sprint_mock') {
          expect(d.kind).toBe('off');
          expect(d.capacityMin).toBe(0);
        }
        if (d.kind === 'off') expect(offDay).toBe(wd);
      }
      let statedSum = 0;
      for (let i = 0; i < N; i++) statedSum += m[new Date(addDays(today, i) + 'T00:00:00Z').getUTCDay()] as number;
      expect(cap).toBeLessThanOrEqual(statedSum);
      // buffers ~ 1 per 7 work days
      const c = countByKind(s);
      expect(c.buffer).toBe(Math.floor((c.work + c.buffer) / 8));
      expect(c.work).toBeGreaterThanOrEqual(7 * c.buffer);
    }
  });
});
