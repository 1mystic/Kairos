import { EXAM_NAME } from './calendarEdit';

export interface UserRow { id: string; data: Record<string, unknown> }

export interface UsersSummary {
  total: number;
  /** true when the read hit its limit, so `total` is "at least" */
  capped: boolean;
  onboarded: number;
  minors: number;
  consentPending: number;
  /** primary exam -> students */
  exams: Array<{ key: string; label: string; count: number }>;
  followsCalendar: number;
  customDate: number;
  noExam: number;
  /** "JEE_MAIN.1" -> students following that calendar session (any exam they chose) */
  sessionFollowers: Record<string, number>;
  /** oldest week first, last = the 7 days up to `now` */
  signupsPerWeek: Array<{ label: string; count: number }>;
  /** initials + created + exam only: no email, no date of birth */
  recent: Array<{ id: string; initials: string; created: number | null; exam: string }>;
}

export function initials(name: unknown): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  const s = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  return s || '?';
}

const WEEK = 7 * 86_400_000;

export function summarizeUsers(rows: readonly UserRow[], now: number, limit = 200, weeks = 8): UsersSummary {
  const exams = new Map<string, number>();
  const sessionFollowers: Record<string, number> = {};
  let onboarded = 0, minors = 0, consentPending = 0, follows = 0, custom = 0, none = 0;
  const buckets = Array.from({ length: weeks }, () => 0);
  for (const { data: d } of rows) {
    if (d.onboarded === true) onboarded++;
    if (d.isMinor === true) minors++;
    if ((d.consent as { status?: string } | undefined)?.status === 'pending') consentPending++;
    const packed = typeof d.exam === 'string' ? d.exam : '';
    const toks = packed.split('+').filter(Boolean).map((t) => {
      const [head = '', sess] = (t.split('@')[0] ?? '').split('.');
      return { exam: head, session: Number(sess) || 0 };
    });
    const primary = toks[0];
    if (primary) {
      exams.set(primary.exam, (exams.get(primary.exam) ?? 0) + 1);
      if (primary.session > 0) follows++;
      else custom++;
    } else none++;
    for (const t of toks) if (t.session > 0) sessionFollowers[`${t.exam}.${t.session}`] = (sessionFollowers[`${t.exam}.${t.session}`] ?? 0) + 1;
    const created = typeof d.createdAt === 'number' ? d.createdAt : null;
    if (created !== null) {
      const w = Math.floor((now - created) / WEEK);
      if (w >= 0 && w < weeks) buckets[weeks - 1 - w] = (buckets[weeks - 1 - w] ?? 0) + 1;
    }
  }
  return {
    total: rows.length,
    capped: rows.length >= limit,
    onboarded,
    minors,
    consentPending,
    exams: [...exams].map(([key, count]) => ({ key, label: EXAM_NAME[key] ?? key, count })).sort((a, b) => b.count - a.count),
    followsCalendar: follows,
    customDate: custom,
    noExam: none,
    sessionFollowers,
    signupsPerWeek: buckets.map((count, i) => ({ label: i === weeks - 1 ? 'This week' : `${weeks - 1 - i} wk ago`, count })),
    recent: rows.slice(0, 20).map(({ id, data: d }) => ({
      id,
      initials: initials(d.displayName),
      created: typeof d.createdAt === 'number' ? d.createdAt : null,
      exam: (() => {
        const e = typeof d.exam === 'string' ? (d.exam.split('+')[0] ?? '').split('.')[0] ?? '' : '';
        return e ? (EXAM_NAME[e] ?? e) : 'Not set';
      })(),
    })),
  };
}
