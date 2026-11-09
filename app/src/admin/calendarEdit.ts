import { dayNumber } from '@kairos/core';

export const EXAMS = ['JEE_MAIN', 'NEET_UG', 'IAT', 'JEE_ADV'] as const;
export type CalExam = (typeof EXAMS)[number];
export const EXAM_NAME: Record<string, string> = { JEE_MAIN: 'JEE Main', NEET_UG: 'NEET UG', IAT: 'IAT', JEE_ADV: 'JEE Advanced' };
export const MAX_ENTRIES = 40;

/** One row of config/exam_calendar.entries (same shape as content/exam_calendar.json). */
export interface CalEntry {
  id: string;
  exam: CalExam;
  session: number;
  date: string | null;
  window: { start: string; end: string } | null;
  status: 'expected' | 'official';
  source: string | null;
  last_checked: string | null;
  note?: string;
}

const validDate = (s: string | null | undefined): boolean => {
  if (!s) return false;
  try {
    dayNumber(s);
    return true;
  } catch {
    return false;
  }
};

/** Lenient read of a published doc or the bundled json: junk rows are dropped, fields normalised. */
export function normalizeEntries(raw: unknown): CalEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: CalEntry[] = [];
  for (const r of raw as Array<Record<string, unknown>>) {
    if (!r || typeof r.id !== 'string' || !(EXAMS as readonly string[]).includes(r.exam as string)) continue;
    const w = r.window as { start?: unknown; end?: unknown } | null | undefined;
    const e: CalEntry = {
      id: r.id,
      exam: r.exam as CalExam,
      session: typeof r.session === 'number' ? r.session : 1,
      date: typeof r.date === 'string' ? r.date : null,
      window: w && typeof w.start === 'string' && typeof w.end === 'string' ? { start: w.start, end: w.end } : null,
      status: r.status === 'official' ? 'official' : 'expected',
      source: typeof r.source === 'string' && r.source ? r.source : null,
      last_checked: typeof r.last_checked === 'string' ? r.last_checked : null,
    };
    const note = typeof r.note === 'string' ? r.note : typeof r._note === 'string' ? r._note : '';
    if (note) e.note = note.slice(0, 200);
    out.push(e);
  }
  return out;
}

export const suggestId = (exam: string, session: number, year: number, existing: readonly CalEntry[]): string => {
  const base = exam === 'JEE_MAIN' ? `JEE_MAIN_${year}_S${session}` : session > 1 ? `${exam}_${year}_S${session}` : `${exam}_${year}`;
  let id = base;
  for (let n = 2; existing.some((e) => e.id === id); n++) id = `${base}_${n}`;
  return id;
};

/** Plain-words problems per entry (index-aligned). Ranges match the firestore.rules contract. */
export function entryErrors(entries: readonly CalEntry[]): string[][] {
  return entries.map((e, i) => {
    const errs: string[] = [];
    if (!/^[A-Za-z0-9_]{1,60}$/.test(e.id)) errs.push('Id: letters, digits and underscores only, up to 60.');
    else if (entries.findIndex((x) => x.id === e.id) !== i) errs.push('Id is used by another entry.');
    if (!Number.isInteger(e.session) || e.session < 1 || e.session > 4) errs.push('Session must be a whole number from 1 to 4.');
    if (e.date !== null && !validDate(e.date)) errs.push('Date is not a valid day.');
    if (e.window) {
      if (!validDate(e.window.start) || !validDate(e.window.end)) errs.push('Window needs a valid start and end day.');
      else if (dayNumber(e.window.start) > dayNumber(e.window.end)) errs.push('Window ends before it starts.');
    }
    if (e.status === 'official' && !e.date && !e.window) errs.push('An official entry needs a date or a window.');
    if (e.source && e.source.length > 300) errs.push('Source is longer than 300 characters.');
    if (e.last_checked !== null && !validDate(e.last_checked)) errs.push('Last checked is not a valid day.');
    if (e.note && e.note.length > 200) errs.push('Note is longer than 200 characters.');
    return errs;
  });
}

export function listErrors(entries: readonly CalEntry[]): string[] {
  const out: string[] = [];
  if (entries.length === 0) out.push('Add at least one entry.');
  if (entries.length > MAX_ENTRIES) out.push(`At most ${MAX_ENTRIES} entries.`);
  entryErrors(entries).forEach((errs, i) => errs.forEach((m) => out.push(`${entries[i]?.id || `Entry ${i + 1}`}: ${m}`)));
  return out;
}

const label = (e: CalEntry) => `${EXAM_NAME[e.exam] ?? e.exam} session ${e.session}`;
const shown = (e: CalEntry) => (e.date ? e.date : e.window ? `${e.window.start} to ${e.window.end}` : 'no date');

export interface Change { kind: 'added' | 'removed' | 'changed'; id: string; text: string }

/** Human-readable differences between the published calendar and the draft. */
export function diffEntries(published: readonly CalEntry[], draft: readonly CalEntry[]): Change[] {
  const out: Change[] = [];
  const old = new Map(published.map((e) => [e.id, e]));
  const now = new Map(draft.map((e) => [e.id, e]));
  for (const e of draft) {
    const o = old.get(e.id);
    if (!o) {
      out.push({ kind: 'added', id: e.id, text: `Add ${label(e)}: ${shown(e)} (${e.status}).` });
      continue;
    }
    const parts: string[] = [];
    if (o.date !== e.date || JSON.stringify(o.window) !== JSON.stringify(e.window)) parts.push(`date ${shown(o)} to ${shown(e)}`);
    if (o.status !== e.status) parts.push(`status ${o.status} to ${e.status}`);
    if (o.session !== e.session) parts.push(`session ${o.session} to ${e.session}`);
    if (o.exam !== e.exam) parts.push(`exam ${o.exam} to ${e.exam}`);
    if ((o.source ?? '') !== (e.source ?? '')) parts.push('source');
    if ((o.last_checked ?? '') !== (e.last_checked ?? '')) parts.push(`last checked ${o.last_checked ?? 'never'} to ${e.last_checked ?? 'never'}`);
    if ((o.note ?? '') !== (e.note ?? '')) parts.push('note');
    if (parts.length) out.push({ kind: 'changed', id: e.id, text: `${label(e)}: ${parts.join(', ')}.` });
  }
  for (const o of published) if (!now.has(o.id)) out.push({ kind: 'removed', id: o.id, text: `Remove ${label(o)} (${shown(o)}).` });
  return out;
}

/** The document to publish: contract fields only (server fields are added by stampDoc). */
export function buildCalendarDoc(entries: readonly CalEntry[]): { v: 1; entries: CalEntry[] } {
  return {
    v: 1,
    entries: entries.map((e) => ({
      id: e.id,
      exam: e.exam,
      session: e.session,
      date: e.date || null,
      window: e.window ?? null,
      status: e.status,
      source: e.source ? e.source.trim() || null : null,
      last_checked: e.last_checked || null,
      ...(e.note?.trim() ? { note: e.note.trim() } : {}),
    })),
  };
}
