import { dayNumber, fromDayNumber } from '@kairos/core';

export const STAT_FIELDS = ['signups', 'sessions', 'questions', 'correct', 'mocks', 'diagnostics', 'uploads', 'active', 'onboarded', 'sessions_JEE_MAIN', 'sessions_NEET_UG', 'sessions_IAT'] as const;
export type StatField = (typeof STAT_FIELDS)[number];
export type DayStats = { day: string } & Record<StatField, number>;
export interface StatsRow { day: string; data: Record<string, number> }

export const EXAM_SESSION_FIELDS = [
  { field: 'sessions_JEE_MAIN', label: 'JEE Main' },
  { field: 'sessions_NEET_UG', label: 'NEET' },
  { field: 'sessions_IAT', label: 'IAT' },
] as const;

/** Every day of the range (oldest first), zero where no stats doc exists. */
export function fillDays(rows: readonly StatsRow[], end: string, days: number): DayStats[] {
  const byDay = new Map(rows.map((r) => [r.day, r.data]));
  const endN = dayNumber(end);
  const out: DayStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = fromDayNumber(endN - i);
    const d: Record<string, number> = byDay.get(day) ?? {};
    const row = { day } as DayStats;
    for (const f of STAT_FIELDS) {
      const v = d[f];
      row[f] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    }
    out.push(row);
  }
  return out;
}

export type Totals = Record<StatField, number>;
export function totals(rows: readonly DayStats[]): Totals {
  const t = Object.fromEntries(STAT_FIELDS.map((f) => [f, 0])) as Totals;
  for (const r of rows) for (const f of STAT_FIELDS) t[f] += r[f];
  return t;
}

/** correct / questions, or null with no questions. */
export const accuracy = (t: Pick<Totals, 'correct' | 'questions'>): number | null => (t.questions > 0 ? t.correct / t.questions : null);
/** Average daily active learners over the days that have any data. */
export function avgActive(rows: readonly DayStats[]): number {
  return rows.length ? totals(rows).active / rows.length : 0;
}
/** Share of sign-ups that finished onboarding (0..1), null with no sign-ups. */
export const onboardedShare = (t: Pick<Totals, 'onboarded' | 'signups'>): number | null => (t.signups > 0 ? Math.min(1, t.onboarded / t.signups) : null);

const pctChange = (cur: number, prev: number): number => Math.round(((cur - prev) / prev) * 100);

/** Plain-words observations from the last 7 days vs the 7 before. Pure; every claim has a minimum sample. */
export function buildInsights(rows: readonly DayStats[]): string[] {
  const out: string[] = [];
  if (rows.length >= 14) {
    const cur = rows.slice(-7);
    const prev = rows.slice(-14, -7);
    const c = totals(cur);
    const p = totals(prev);
    const ac = accuracy(c);
    const ap = accuracy(p);
    if (ac !== null && ap !== null && c.questions >= 50 && p.questions >= 50) {
      const pts = Math.round((ac - ap) * 100);
      if (Math.abs(pts) >= 2) out.push(`Accuracy ${pts < 0 ? 'fell' : 'rose'} ${Math.abs(pts)} points this week.`);
    }
    for (const { field, label } of EXAM_SESSION_FIELDS) {
      if (p[field] >= 5) {
        const ch = pctChange(c[field], p[field]);
        if (Math.abs(ch) >= 10) out.push(`${label} sessions ${ch > 0 ? 'grew' : 'fell'} ${Math.abs(ch)}% this week.`);
      }
    }
    if (p.active >= 5) {
      const ch = pctChange(c.active, p.active);
      if (Math.abs(ch) >= 10) out.push(`Daily active learners ${ch > 0 ? 'grew' : 'fell'} ${Math.abs(ch)}% this week.`);
    }
    if (c.signups > 0 || p.signups > 0) out.push(`${c.signups} new sign-up${c.signups === 1 ? '' : 's'} this week, ${p.signups} the week before.`);
  }
  const all = totals(rows);
  const share = onboardedShare(all);
  if (share !== null && all.signups >= 10 && share < 0.6) out.push(`Only ${Math.round(share * 100)}% of sign-ups finish setting up their plan. The setup steps may be worth a look.`);
  if (out.length === 0) out.push('Not enough data yet to spot trends. Insights appear once there are two weeks of activity.');
  return out;
}

/** Range in days -> [start, end] YYYY-MM-DD, `end` = today. */
export const rangeBounds = (today: string, days: number): [string, string] => [fromDayNumber(dayNumber(today) - (days - 1)), today];
