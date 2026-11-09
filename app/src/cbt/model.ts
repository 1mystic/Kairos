/**
 * Pure exam-mode model: slot mapping, grading, MockDoc construction and resume rules.
 * No React, no network. Everything here is unit tested.
 */
import {
  createPaletteState,
  evaluateDetailed,
  legendCounts,
  paletteReducer,
  scorePaper,
  toPaperResponses,
  statuses,
  flattenSlots,
  resolveSubjects,
  type Blueprint,
  type KairosEvent,
  type LegendCounts,
  type PaletteState,
  type PaperScore,
  type PublicQuestion,
  type Question,
  type Response,
  type Slot,
  type Tally,
  type Verdict,
} from '@kairos/core';
import type { MockDoc } from '../store';

export type Lang = 'en' | 'hi';

/** Typed view of `MockPaper` (core's loose zod type erases the known keys through `Omit`). */
export interface MockPaperLike {
  paperId: string;
  blueprint: string;
  title: string;
  mini?: boolean;
  slots: string[];
  questions: PublicQuestion[];
}

export interface ExamSlot extends Slot {
  qid: string;
}

export interface ExamModel {
  paperId: string;
  title: string;
  exam: string;
  blueprintId: string;
  /** Blueprint actually used for the run. For `mini` papers it is cut down to the questions present. */
  blueprint: Blueprint;
  slots: ExamSlot[];
  /** Public (answer-free) questions, `questions[i]` belongs to `slots[i]`. */
  questions: PublicQuestion[];
  durationMs: number;
  mini: boolean;
}

/**
 * Maps a mock paper onto its blueprint.
 *
 * Full papers: `paper.slots[i]` is the question for `flattenSlots(blueprint)[i]`.
 * Mini papers (a handful of questions from a full blueprint): per subject, in blueprint section
 * order, each section takes the paper's questions of that subject whose type matches the section,
 * up to the section's count. Empty sections and subjects are dropped, and the duration is scaled by
 * the share of questions kept (minimum 1 minute).
 */
export function buildExamModel(paper: MockPaperLike, blueprint: Blueprint): ExamModel {
  const byId = new Map(paper.questions.map((q) => [q.id, q]));
  const need = (id: string): PublicQuestion => {
    const q = byId.get(id);
    if (!q) throw new Error(`mock ${paper.paperId}: slot refers to unknown question ${id}`);
    return q;
  };

  let bp = blueprint;
  let qids: string[];
  if (paper.mini) {
    const used = new Set<string>();
    qids = [];
    const subjects = [];
    for (const subj of blueprint.subjects) {
      // A blueprint subject may be virtual (GATE DA's `DA` maps to PRS, LA, CO, PDS, DBW, ML, AI): match by resolved subjects.
      const subjectSet = new Set(resolveSubjects(blueprint, subj.code));
      const mine = paper.slots.filter((id) => subjectSet.has(need(id).tax?.subject ?? ''));
      const sections = [];
      for (const sec of subj.sections) {
        const take = mine.filter((id) => !used.has(id) && need(id).type === sec.type).slice(0, sec.count);
        if (take.length === 0) continue;
        take.forEach((id) => used.add(id));
        qids.push(...take);
        sections.push({ ...sec, count: take.length });
      }
      if (sections.length) subjects.push({ ...subj, sections });
    }
    if (qids.length === 0) throw new Error(`mock ${paper.paperId}: no question matches blueprint ${blueprint.id}`);
    const totalFull = flattenSlots(blueprint).length;
    const durationMin = Math.max(1, Math.round((blueprint.duration_min * qids.length) / totalFull));
    bp = { ...blueprint, subjects, duration_min: durationMin };
  } else {
    qids = [...paper.slots];
  }

  const slots = flattenSlots(bp);
  if (slots.length !== qids.length) {
    throw new Error(`mock ${paper.paperId}: ${qids.length} questions but blueprint ${bp.id} has ${slots.length} slots`);
  }
  return {
    paperId: paper.paperId,
    title: paper.title,
    exam: bp.exam,
    blueprintId: blueprint.id,
    blueprint: bp,
    slots: slots.map((s, i) => ({ ...s, qid: qids[i]! })),
    questions: qids.map(need),
    durationMs: Math.round(bp.duration_min * 60_000),
    mini: !!paper.mini,
  };
}

// ---------------------------------------------------------------- grading

/** Grades with answer-bearing questions (same qids). Null when any answer is unavailable: "Result pending". */
export function gradeAttempt(
  model: ExamModel,
  state: PaletteState,
  answers: ReadonlyMap<string, Question> | null | undefined,
): PaperScore | null {
  if (!answers) return null;
  const qs = model.slots.map((s) => answers.get(s.qid));
  if (qs.some((q) => !q || !q.answer)) return null;
  return scorePaper(model.blueprint, qs, toPaperResponses(state));
}

export interface FocusEntry {
  /** ms since session start */
  t: number;
  type: 'leave' | 'visit';
}

export interface QuestionOutcome {
  qid: string;
  subject: string;
  sectionId: string;
  type: string;
  status: string;
  /** verdict is absent while the result is pending */
  verdict?: Verdict;
  marks?: number;
  /** ms spent with the question open */
  timeMs: number;
}

/** docs/03 MockDoc.analysis written by exam mode. Later analysis tabs read this. Never mutate fields. */
export interface MockAnalysis {
  v: 1;
  /** true when answers were unavailable at submit: score is null, grade later (phase 4 server grading) */
  pending: boolean;
  title: string;
  exam: string;
  blueprintId: string;
  durationMs: number;
  usedMs: number;
  submitReason: 'manual' | 'auto';
  /** score.bySubject / score.bySection copies (empty when pending) */
  subjectScores: Record<string, Tally>;
  sectionScores: Record<string, Tally>;
  /** per-section max marks keyed like sectionScores (`PHY.A`), plus per subject */
  maxBySubject: Record<string, number>;
  maxBySection: Record<string, number>;
  counts: LegendCounts & { correct: number; wrong: number; blank: number; partial: number };
  /** times a draft answer was discarded by navigating away without Save */
  lostUnsaved: number;
  /** leave/visit of the browser tab, never punished */
  focusLog: FocusEntry[];
  /** one per slot, in paper order */
  questions: QuestionOutcome[];
}

export function timePerQuestion(events: readonly KairosEvent[], endT: number, ids: readonly string[]): number[] {
  const acc = new Map<string, number>();
  let openQ: string | null = null;
  let since = 0;
  for (const e of events) {
    if (e.a === 'visit') {
      openQ = e.q;
      since = e.t;
    } else if (e.a === 'leave' && openQ === e.q) {
      acc.set(e.q, (acc.get(e.q) ?? 0) + Math.max(0, e.t - since));
      openQ = null;
    }
  }
  if (openQ) acc.set(openQ, (acc.get(openQ) ?? 0) + Math.max(0, endT - since));
  return ids.map((id) => acc.get(id) ?? 0);
}

function marksFor(slot: Slot, q: Question, answer: Response | null, scored: boolean): { verdict: Verdict; marks: number } {
  if (!scored) return { verdict: 'blank', marks: slot.marks.blank };
  const e = evaluateDetailed(q, answer);
  const marks =
    e.verdict === 'correct' ? slot.marks.correct : e.verdict === 'wrong' ? slot.marks.wrong : e.verdict === 'partial' ? e.partialMarks : slot.marks.blank;
  return { verdict: e.verdict, marks };
}

export interface BuildMockArgs {
  id: string;
  model: ExamModel;
  state: PaletteState;
  focusLog: FocusEntry[];
  score: PaperScore | null;
  answers?: ReadonlyMap<string, Question> | null;
  submittedAt: number;
  usedMs: number;
}

const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T; // firestore rejects `undefined`

export function buildMockDoc(a: BuildMockArgs): MockDoc {
  const { model, state, score } = a;
  const legend = legendCounts(state);
  const times = timePerQuestion(state.events, a.usedMs, model.slots.map((s) => s.qid));
  const st = statuses(state);
  const responses = model.slots.map((s, i) => ({
    qid: s.qid,
    answer: state.questions[i]!.savedAnswer,
    status: st[i]!,
  }));
  const maxBySubject: Record<string, number> = {};
  const maxBySection: Record<string, number> = {};
  for (const s of model.slots) {
    maxBySubject[s.subject] = (maxBySubject[s.subject] ?? 0) + s.marks.correct;
    const k = `${s.subject}.${s.sectionId}`;
    maxBySection[k] = (maxBySection[k] ?? 0) + s.marks.correct;
  }
  const questions: QuestionOutcome[] = model.slots.map((s, i) => {
    const out: QuestionOutcome = {
      qid: s.qid,
      subject: s.subject,
      sectionId: s.sectionId,
      type: s.type,
      status: st[i]!,
      timeMs: times[i]!,
    };
    const q = a.answers?.get(s.qid);
    if (score && q?.answer) {
      const r = responses[i]!;
      const m = marksFor(s, q, r.answer, r.status === 'answered' || r.status === 'answered_marked');
      out.verdict = m.verdict;
      out.marks = m.marks;
    }
    return out;
  });
  const analysis: MockAnalysis = {
    v: 1,
    pending: !score,
    title: model.title,
    exam: model.exam,
    blueprintId: model.blueprintId,
    durationMs: model.durationMs,
    usedMs: a.usedMs,
    submitReason: state.submitReason ?? 'manual',
    subjectScores: score?.bySubject ?? {},
    sectionScores: score?.bySection ?? {},
    maxBySubject,
    maxBySection,
    counts: {
      ...legend,
      correct: score?.correct ?? 0,
      wrong: score?.wrong ?? 0,
      blank: score?.blank ?? 0,
      partial: score?.partial ?? 0,
    },
    lostUnsaved: state.lostUnsaved,
    focusLog: a.focusLog,
    questions,
  };
  return plain({
    id: a.id,
    paperId: model.paperId,
    submittedAt: a.submittedAt,
    responses,
    timeline: state.events,
    score: score ?? null,
    analysis,
  });
}

/** Typed read of `MockDoc.analysis`; undefined for docs written by something else. */
export function readAnalysis(mock: MockDoc): MockAnalysis | undefined {
  const a = mock.analysis as Partial<MockAnalysis> | undefined;
  return a && a.v === 1 ? (a as MockAnalysis) : undefined;
}

export const isPaperScore = (s: unknown): s is PaperScore =>
  !!s && typeof s === 'object' && typeof (s as PaperScore).marks === 'number' && typeof (s as PaperScore).max === 'number';

// ---------------------------------------------------------------- attempts (resume)

export interface Attempt {
  v: 1;
  paperId: string;
  /** epoch ms of the Start click. The clock is always `now - startedAtEpoch`, so it never pauses. */
  startedAtEpoch: number;
  state: PaletteState;
  lang: Lang;
  focusLog: FocusEntry[];
  savedAtEpoch: number;
}

export type AttemptResolution = 'none' | 'resume' | 'expired' | 'finalize';

export function resolveAttempt(a: Attempt | undefined | null, nowEpoch: number, durationMs: number): AttemptResolution {
  if (!a) return 'none';
  if (a.state.submitted) return 'finalize';
  return nowEpoch - a.startedAtEpoch >= durationMs ? 'expired' : 'resume';
}

export function newAttempt(model: ExamModel, nowEpoch: number, lang: Lang): Attempt {
  return {
    v: 1,
    paperId: model.paperId,
    startedAtEpoch: nowEpoch,
    state: createPaletteState(model.slots.map((s) => s.qid), 'mock', 0),
    lang,
    focusLog: [],
    savedAtEpoch: nowEpoch,
  };
}

/** Closes an expired attempt exactly at the deadline. */
export function expireAttempt(a: Attempt, durationMs: number): Attempt {
  return { ...a, state: paletteReducer(a.state, { type: 'SUBMIT', reason: 'auto', now: durationMs }) };
}

export const mockIdFor = (startedAtEpoch: number) => `m_${startedAtEpoch}`;

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(ss)}`;
}

export function describeResponse(r: Response | null | undefined): string {
  if (!r) return 'Not answered';
  if ('keys' in r) return r.keys.length ? [...r.keys].sort().join(', ') : 'Not answered';
  return String(r.value);
}
