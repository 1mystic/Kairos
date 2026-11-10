import type { PlanDoc, UserStore } from '../store/types';

/**
 * Per-exam storage keys, so a student preparing for several exams does not overwrite one exam's plan or pace with another's.
 *
 *   plans/{exam}~{YYYY-MM-DD}   new plan docs (the firestore rule accepts any plan id)
 *   plans/{YYYY-MM-DD}          older docs: still READ for the legacy owner exam, never written again
 *   state/pace                  { byExam: { JEE_MAIN: {...}, DSA_INTERVIEW: {...} }, legacyExam }; the old flat shape is read as the
 *                               legacy owner's entry and moved into byExam on the next write
 * Mastery stays shared by topic id (practising a topic helps every exam that has it).
 */

export const planKey = (exam: string, date: string): string => `${exam}~${date}`;

/** Exam id and date of a keyed plan id, or null for a plain date id. */
export function parsePlanKey(id: string): { exam: string; date: string } | null {
  const i = id.indexOf('~');
  return i > 0 ? { exam: id.slice(0, i), date: id.slice(i + 1) } : null;
}

/** Plan of one exam on one date: the keyed doc first, then (legacy owner only) the old date-only doc. */
export async function getPlanFor(store: Pick<UserStore, 'getPlan'>, exam: string, date: string, legacyOwner: boolean): Promise<PlanDoc | null> {
  const keyed = await store.getPlan(planKey(exam, date)).catch(() => null);
  if (keyed) return keyed;
  return legacyOwner ? store.getPlan(date).catch(() => null) : null;
}

type Doc = Record<string, unknown>;
const isObj = (x: unknown): x is Doc => !!x && typeof x === 'object' && !Array.isArray(x);

/** The exam that owns pre-multi-exam data (flat pace doc, date-keyed plans): the stamped `legacyExam`, else the given guess. */
export function legacyOwnerOf(raw: Doc | null | undefined, guess: string): string {
  return typeof raw?.legacyExam === 'string' ? raw.legacyExam : guess;
}

/** state/pace entry of one exam, or null when it has none yet. */
export function readPaceFor(raw: Doc | null | undefined, exam: string, ownerGuess: string): Doc | null {
  if (!raw) return null;
  if (isObj(raw.byExam)) {
    const e = (raw.byExam as Doc)[exam];
    return isObj(e) ? e : null;
  }
  // old flat shape: it belongs to the legacy owner
  return Object.keys(raw).length > 0 && legacyOwnerOf(raw, ownerGuess) === exam ? raw : null;
}

/** The whole state/pace doc to write after `exam`'s entry changed. A flat doc is moved under its legacy owner first. */
export function withPaceFor(raw: Doc | null | undefined, exam: string, state: Doc, ownerGuess: string): Doc {
  const owner = legacyOwnerOf(raw, ownerGuess);
  let byExam: Doc = {};
  if (raw && isObj(raw.byExam)) byExam = { ...(raw.byExam as Doc) };
  else if (raw && Object.keys(raw).length > 0) {
    const { legacyExam: _l, ...flat } = raw;
    void _l;
    byExam = { [owner]: flat };
  }
  byExam[exam] = state;
  return { byExam, legacyExam: owner };
}
