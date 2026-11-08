/** Test/dev fixtures: self-consistent MockDoc, questions and sessions built from a small spec. */
import type { MasteryDoc, Question, Verdict } from '@kairos/core';
import type { MockAnalysis } from '../../cbt/model';
import type { MockDoc, SessionDoc } from '../../store';

export interface QSpec {
  qid: string;
  subject: string;
  chapter: string;
  /** population p(correct) */
  p: number;
  /** median time, seconds */
  median?: number;
  verdict: Verdict;
  /** visit..leave spans in minutes since start */
  spans?: [number, number][];
  /** minute of the last save (the answer that counted); only for non-blank */
  saveMin?: number;
  /** a selection that was never saved, at this minute */
  draftMin?: number;
}

export const MIN = 60_000;
const MARKS = { correct: 4, wrong: -1, blank: 0, partial: 2 } as const;

export interface BuiltMock {
  mock: MockDoc;
  questions: Map<string, Question>;
}

export function buildMock(specs: QSpec[], o: { id?: string; paperId?: string; usedMin?: number; durationMin?: number; exam?: string; submittedAt?: number; title?: string } = {}): BuiltMock {
  const usedMs = (o.usedMin ?? 170) * MIN;
  const timeline: { t: number; q: string; a: string; v?: string; ctx: 'mock' }[] = [];
  const questions = new Map<string, Question>();
  const counts: Record<string, number> = {};
  const aq: MockAnalysis['questions'] = [];
  const maxBySubject: Record<string, number> = {};
  const maxBySection: Record<string, number> = {};
  const subjectScores: MockAnalysis['subjectScores'] = {};
  let marks = 0;
  let correct = 0, wrong = 0, blank = 0, partial = 0;
  let lost = 0;
  for (const s of specs) {
    questions.set(s.qid, {
      id: s.qid, type: 'SCQ', stem: `stem ${s.qid}`, options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: key })),
      answer: { keys: ['B'] }, tax: { subject: s.subject, chapter: s.chapter, topics: [] },
      difficulty: { p_correct: s.p, ...(s.median ? { median_time_s: s.median } : {}) },
    } as unknown as Question);
    let timeMs = 0;
    for (const [from, to] of s.spans ?? []) {
      timeline.push({ t: from * MIN, q: s.qid, a: 'visit', ctx: 'mock' });
      if (s.draftMin !== undefined && s.draftMin >= from && s.draftMin <= to) {
        timeline.push({ t: s.draftMin * MIN, q: s.qid, a: 'select', v: 'B', ctx: 'mock' });
        lost++;
      }
      if (s.saveMin !== undefined && s.saveMin >= from && s.saveMin <= to) {
        timeline.push({ t: s.saveMin * MIN, q: s.qid, a: 'save', v: s.verdict === 'correct' ? 'B' : 'C', ctx: 'mock' });
      }
      timeline.push({ t: to * MIN, q: s.qid, a: 'leave', ctx: 'mock' });
      timeMs += (to - from) * MIN;
    }
    const m = MARKS[s.verdict];
    marks += m;
    if (s.verdict === 'correct') correct++; else if (s.verdict === 'wrong') wrong++; else if (s.verdict === 'partial') partial++; else blank++;
    counts[s.subject] = (counts[s.subject] ?? 0) + 1;
    maxBySubject[s.subject] = (maxBySubject[s.subject] ?? 0) + 4;
    maxBySection[`${s.subject}.A`] = (maxBySection[`${s.subject}.A`] ?? 0) + 4;
    const t = (subjectScores[s.subject] ??= { marks: 0, correct: 0, wrong: 0, blank: 0, partial: 0 });
    t.marks += m;
    t[s.verdict] += 1;
    aq.push({
      qid: s.qid, subject: s.subject, sectionId: 'A', type: 'SCQ',
      status: (s.spans?.length ?? 0) === 0 ? 'not_visited' : s.verdict === 'blank' ? 'not_answered' : 'answered',
      verdict: s.verdict, marks: m, timeMs,
    });
  }
  timeline.sort((a, b) => a.t - b.t);
  const max = Object.values(maxBySubject).reduce((a, b) => a + b, 0);
  const analysis: MockAnalysis = {
    v: 1, pending: false, title: o.title ?? 'Test paper', exam: o.exam ?? 'JEE_MAIN', blueprintId: 'jee_main_2026_p1',
    durationMs: (o.durationMin ?? 180) * MIN, usedMs, submitReason: 'manual', subjectScores, sectionScores: {},
    maxBySubject, maxBySection,
    counts: { not_visited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0, correct, wrong, blank, partial },
    lostUnsaved: lost, focusLog: [], questions: aq,
  };
  const mock: MockDoc = {
    id: o.id ?? 'm_1', paperId: o.paperId ?? 'paper_x', submittedAt: o.submittedAt ?? 1_700_000_000_000,
    responses: [], timeline, score: { marks, max, correct, wrong, blank, partial, bySubject: subjectScores, bySection: {} }, analysis,
  };
  return { mock, questions };
}

/**
 * The hand-checked paper: 12 questions, +4/-1, 48 marks. Expected waterfall:
 * max 48, negative 5, silly 8, skippedEasy 4, timeSink 4, unsaved 4, unreached 4, remaining 12, actual 7,
 * recoverable silly 8 + skipped 4 + unsaved 4 + negatives 3 = 19, potential 26.
 */
export const TYPICAL: QSpec[] = [
  { qid: 'p1', subject: 'PHY', chapter: 'PHY.ROT', p: 0.5, median: 120, verdict: 'correct', spans: [[0, 4]], saveMin: 4 },
  { qid: 'p2', subject: 'PHY', chapter: 'PHY.ROT', p: 0.85, median: 60, verdict: 'wrong', spans: [[4, 6]], saveMin: 6 },
  { qid: 'p3', subject: 'PHY', chapter: 'PHY.LOM', p: 0.3, median: 120, verdict: 'wrong', spans: [[6, 11]], saveMin: 11 },
  { qid: 'p4', subject: 'PHY', chapter: 'PHY.LOM', p: 0.9, median: 60, verdict: 'blank', spans: [[11, 12]] },
  { qid: 'c1', subject: 'CHE', chapter: 'CHE.CHEQ', p: 0.5, median: 100, verdict: 'correct', spans: [[20, 23]], saveMin: 23 },
  { qid: 'c2', subject: 'CHE', chapter: 'CHE.CHEQ', p: 0.5, median: 100, verdict: 'wrong', spans: [[23, 23.5]], saveMin: 23.5 },
  { qid: 'c3', subject: 'CHE', chapter: 'CHE.THER', p: 0.5, median: 100, verdict: 'blank' },
  { qid: 'c4', subject: 'CHE', chapter: 'CHE.THER', p: 0.5, median: 100, verdict: 'blank', spans: [[30, 31]] },
  { qid: 'm1', subject: 'MAT', chapter: 'MAT.CALC', p: 0.5, median: 100, verdict: 'correct', spans: [[150, 153]], saveMin: 153 },
  { qid: 'm2', subject: 'MAT', chapter: 'MAT.CALC', p: 0.5, median: 100, verdict: 'wrong', spans: [[153, 155]], saveMin: 155 },
  { qid: 'm3', subject: 'MAT', chapter: 'MAT.COMP', p: 0.5, median: 100, verdict: 'blank', spans: [[160, 161]], draftMin: 160.5 },
  { qid: 'm4', subject: 'MAT', chapter: 'MAT.COMP', p: 0.8, median: 100, verdict: 'wrong', spans: [[165, 167]], saveMin: 167 },
];

export const typicalMock = () => buildMock(TYPICAL);

/** Sessions with summaries shaped like core `summarizeSession`. */
export function mkSession(id: string, startedAt: number, byChapter: Record<string, { n: number; correct: number; wrong: number; skipped: number; timeMs: number }>, labels: Record<string, number> = {}): SessionDoc {
  return { id, startedAt, endedAt: startedAt + 600_000, exam: 'JEE_MAIN', summary: { byChapter, labels } };
}

export const MASTERY: MasteryDoc = {
  'PHY.ROT': { θ: -1.1, rd: 0.25, n: 14, last: 0, S: 3, D: 5, due: 0, err_mix: { concept_gap: 6, silly_mistake: 2 }, reps: 3, lapses: 0, st: 2 },
  'PHY.LOM': { θ: 0.9, rd: 0.2, n: 20, last: 0, S: 9, D: 4, due: 0, err_mix: { time_sink: 1 }, reps: 4, lapses: 0, st: 2 },
  'CHE.CHEQ': { θ: -0.9, rd: 0.7, n: 2, last: 0, S: 1, D: 5, due: 0, err_mix: { guess_careless: 2 }, reps: 1, lapses: 0, st: 1 },
  'MAT.CALC': { θ: -0.8, rd: 0.4, n: 8, last: 0, S: 2, D: 5, due: 0, err_mix: { concept_gap: 3, silly_mistake: 1 }, reps: 2, lapses: 0, st: 2 },
};
