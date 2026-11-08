import {
  generatePaper,
  masteryByChapter,
  maxMarks,
  stripAnswer,
  totalQuestions,
  type Blueprint,
  type GenHistory,
  type GeneratedPaper,
  type MasteryDoc,
  type Question,
  type QuestionType,
} from '@kairos/core';
import { BANK_BASE } from '../bank/config';
import { topicMeta, type Taxonomy } from '../practice/taxonomy';
import type { MockDoc, SessionDoc } from '../store';

export const TYPE_WORDS: Record<QuestionType, string> = {
  SCQ: 'single correct',
  MSQ: 'multiple correct',
  NVQ: 'numerical',
  INT: 'integer',
} as Record<QuestionType, string>;

export const WEAK_TILT = 0.27; // core clamps to 26-29%, inside the 25-30% product rule
export const WEAK_MIN_N = 3;
export const WEAK_THETA = -0.2;
export const MAX_WEAK_CHAPTERS = 8;
export const MINI_FRACTION = 0.2;

// ---------------------------------------------------------------- structure

export interface SectionRow {
  subject: string;
  id: string;
  type: QuestionType;
  count: number;
  correct: number;
  wrong: number;
}
export interface BlueprintSummary {
  sections: SectionRow[];
  subjects: { code: string; sections: SectionRow[]; count: number; marks: number }[];
  total: number;
  marks: number;
  durationMin: number;
}

/** Counts, marks and duration straight from the blueprint (nothing hard-coded). */
export function summarizeBlueprint(bp: Blueprint): BlueprintSummary {
  const subjects = bp.subjects.map((s) => {
    const sections = s.sections.map((sec) => ({
      subject: s.code,
      id: sec.id,
      type: sec.type,
      count: sec.count,
      correct: sec.marks.correct,
      wrong: sec.marks.wrong,
    }));
    return {
      code: s.code,
      sections,
      count: sections.reduce((n, x) => n + x.count, 0),
      marks: sections.reduce((n, x) => n + x.count * x.correct, 0),
    };
  });
  return { sections: subjects.flatMap((s) => s.sections), subjects, total: totalQuestions(bp), marks: maxMarks(bp), durationMin: bp.duration_min };
}

// ---------------------------------------------------------------- bank adaptation

/** Blueprint subject code -> bank subjects it draws from (IAT's BIO = BOT + ZOO). */
export function subjectAliases(tax: Taxonomy | null | undefined): Record<string, string[]> {
  return ((tax as unknown as { iat_subject_map?: Record<string, string[]> } | null)?.iat_subject_map) ?? {};
}

/**
 * Bank view for a blueprint: questions whose subject the blueprint does not name but an alias maps to
 * one it does are relabelled for selection (BOT/ZOO -> BIO). Questions with no topics get their chapter
 * as topic so weak-chapter tilt can see them. `restore` maps ids back to the untouched originals.
 */
export function prepareBank(bank: Question[], bp: Blueprint, aliases: Record<string, string[]>, weakChapters: ReadonlySet<string> = new Set()) {
  const codes = new Set(bp.subjects.map((s) => s.code));
  const toSubject = new Map<string, string>();
  for (const [code, subs] of Object.entries(aliases)) if (codes.has(code)) for (const s of subs) if (!codes.has(s)) toSubject.set(s, code);
  const originals = new Map(bank.map((q) => [q.id, q]));
  const prepared = bank.map((q) => {
    const subj = q.tax?.subject;
    const ch = q.tax?.chapter;
    const remap = subj ? toSubject.get(subj) : undefined;
    const needTopic = !!ch && weakChapters.has(ch) && !(q.tax?.topics?.length);
    if (!remap && !needTopic) return q;
    return { ...q, tax: { ...q.tax, ...(remap ? { subject: remap } : {}), ...(needTopic ? { topics: [ch] } : {}) } } as Question;
  });
  return { prepared, restore: (id: string): Question => originals.get(id)! };
}

// ---------------------------------------------------------------- capacity

export interface Shortfall {
  subject: string;
  section: string;
  type: QuestionType;
  need: number;
  have: number;
}

/** Sections the bank cannot fill (the generator would throw). Pool = same subject + type, not quarantined. */
export function capacityShortfalls(bp: Blueprint, preparedBank: Question[]): Shortfall[] {
  const out: Shortfall[] = [];
  for (const s of bp.subjects)
    for (const sec of s.sections) {
      const have = preparedBank.filter((q) => q.status !== 'quarantined' && q.type === sec.type && q.tax?.subject === s.code).length;
      if (have < sec.count) out.push({ subject: s.code, section: sec.id, type: sec.type, need: sec.count, have });
    }
  return out;
}

/**
 * Mini paper: about a fifth of each section (at least 1), never more than the bank can fill, empty
 * sections and subjects dropped, duration scaled by the share of questions kept (min 5 minutes).
 * Same blueprint id, so analysis and results line up with the full exam.
 */
export function miniBlueprint(bp: Blueprint, preparedBank: Question[], fraction = MINI_FRACTION): Blueprint {
  const full = totalQuestions(bp);
  const subjects = bp.subjects
    .map((s) => ({
      ...s,
      sections: s.sections
        .map((sec) => {
          const have = preparedBank.filter((q) => q.status !== 'quarantined' && q.type === sec.type && q.tax?.subject === s.code).length;
          return { ...sec, count: Math.min(have, Math.max(1, Math.round(sec.count * fraction))) };
        })
        .filter((sec) => sec.count > 0),
    }))
    .filter((s) => s.sections.length > 0);
  const kept = subjects.reduce((n, s) => n + s.sections.reduce((m, sec) => m + sec.count, 0), 0);
  return { ...bp, subjects, duration_min: Math.max(5, Math.round((bp.duration_min * kept) / Math.max(1, full))) };
}

// ---------------------------------------------------------------- weak tilt

export interface WeakPlan {
  /** chapters the tilt aims at, weakest first */
  chapters: string[];
  /** how many of them came from unseen-chapter fallback rather than measured weakness */
  unseen: string[];
  weakTopics: Record<string, number>;
}

/**
 * Weak = chapter aggregate (core `masteryByChapter`) with at least WEAK_MIN_N attempts and theta at or
 * below WEAK_THETA, lowest first. If fewer than 3 such chapters exist, chapters never attempted (and
 * present in the bank) top the list up, so a new student still gets a useful tilt. Weight rises as theta falls.
 */
export function planWeak(doc: MasteryDoc | null | undefined, tax: Taxonomy | null | undefined, bank: Question[]): WeakPlan {
  const inBank = [...new Set(bank.map((q) => q.tax?.chapter).filter((c): c is string => !!c))];
  const agg = doc && tax ? masteryByChapter(doc, topicMeta(tax)) : {};
  const measured = inBank
    .filter((c) => (agg[c]?.n ?? 0) >= WEAK_MIN_N && agg[c]!.theta <= WEAK_THETA)
    .sort((a, b) => agg[a]!.theta - agg[b]!.theta)
    .slice(0, MAX_WEAK_CHAPTERS);
  const unseen: string[] = [];
  if (measured.length < 3) {
    for (const c of inBank) {
      if (measured.length + unseen.length >= 3) break;
      if ((agg[c]?.n ?? 0) === 0) unseen.push(c);
    }
  }
  const chapters = [...measured, ...unseen];
  const wOf = (c: string) => Math.min(1.5, Math.max(0.5, 0.5 + -(agg[c]?.theta ?? 0) / 2));
  const weakTopics: Record<string, number> = {};
  for (const q of bank) {
    const c = q.tax?.chapter;
    if (!c || !chapters.includes(c)) continue;
    for (const t of q.tax?.topics?.length ? q.tax.topics : [c]) weakTopics[t] = wOf(c);
  }
  return { chapters, unseen, weakTopics };
}

// ---------------------------------------------------------------- history

/** qid -> last seen, and qid -> number of mocks it appeared in, from stored sessions and mocks. */
export function buildHistory(sessions: readonly SessionDoc[], mocks: readonly MockDoc[]): GenHistory {
  const seen: Record<string, number> = {};
  const exposure: Record<string, number> = {};
  const touch = (id: string, t: number) => {
    seen[id] = Math.max(seen[id] ?? 0, t);
  };
  for (const s of sessions) {
    const t = Number(s.endedAt ?? s.startedAt) || 0;
    const ids = Array.isArray(s.qids) ? (s.qids as unknown[]).map(String) : ((s.events ?? []) as { q?: string; a?: string }[]).filter((e) => e.a === 'visit' && e.q).map((e) => e.q!);
    for (const id of new Set(ids)) touch(id, t);
  }
  for (const m of mocks) {
    const t = Number(m.submittedAt ?? 0) || 0;
    const qs = ((m.analysis as { questions?: { qid?: string }[] } | undefined)?.questions ?? []).map((x) => x.qid).filter((x): x is string => !!x);
    for (const id of new Set(qs)) {
      touch(id, t);
      exposure[id] = (exposure[id] ?? 0) + 1;
    }
  }
  return { seen, exposure };
}

// ---------------------------------------------------------------- weights

/** chapter weights: the blueprint's file when it is published, else equal per chapter present in the bank. */
export async function loadChapterWeights(bp: Blueprint, version: number, bank: Question[]): Promise<{ weights: Record<string, number>; source: 'file' | 'equal' }> {
  const chapters = [...new Set(bank.map((q) => q.tax?.chapter).filter((c): c is string => !!c))];
  const equal = Object.fromEntries(chapters.map((c) => [c, 1]));
  if (!bp.chapter_weights) return { weights: equal, source: 'equal' };
  try {
    const res = await fetch(`${BANK_BASE}/v${version}/${bp.chapter_weights}`);
    if (!res.ok) throw new Error('missing');
    const j = (await res.json()) as Record<string, unknown>;
    const raw = (j.weights && typeof j.weights === 'object' ? j.weights : j) as Record<string, unknown>;
    const w: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && v >= 0) w[k] = v;
    if (Object.keys(w).length === 0) throw new Error('empty');
    const mean = Object.values(w).reduce((a, b) => a + b, 0) / Object.keys(w).length;
    return { weights: Object.fromEntries(chapters.map((c) => [c, w[c] ?? mean])), source: 'file' };
  } catch {
    return { weights: equal, source: 'equal' };
  }
}

// ---------------------------------------------------------------- generate

export interface GenerateOk {
  ok: true;
  result: GeneratedPaper;
  /** public questions restored to the original (un-relabelled) bank entries */
  paper: GeneratedPaper['paper'];
  weakShare: number;
  notes: string[];
}
export interface GenerateFail {
  ok: false;
  message: string;
}

const sectionName = (key: string) => {
  const [subject, id] = key.split(':');
  return `${subject} section ${id}`;
};

export function generateMock(inp: {
  blueprint: Blueprint;
  bank: Question[];
  weights: Record<string, number>;
  history: GenHistory;
  weak: WeakPlan | null;
  aliases: Record<string, string[]>;
  seed: number;
  now: number;
}): GenerateOk | GenerateFail {
  const weakSet = new Set(inp.weak?.chapters ?? []);
  const { prepared, restore } = prepareBank(inp.bank, inp.blueprint, inp.aliases, weakSet);
  try {
    const result = generatePaper({
      blueprint: inp.blueprint,
      bank: prepared,
      weights: inp.weights,
      history: inp.history,
      ...(inp.weak && inp.weak.chapters.length ? { personalise: { weakTopics: inp.weak.weakTopics, tilt: WEAK_TILT } } : {}),
      seed: inp.seed,
      now: inp.now,
    });
    const paper = result.slots.map((s) => stripAnswer(restore(s.qid)));
    const weakCount = result.slots.filter((s) => weakSet.has(restore(s.qid).tax?.chapter ?? '')).length;
    const notes: string[] = [];
    if (result.relaxed.length)
      notes.push(`Few unseen questions are left for ${result.relaxed.map(sectionName).join(', ')}, so some questions you have met recently come back.`);
    if (!result.tcc.ok)
      notes.push('The difficulty mix is a little off a real paper because this bank is still small. It is the closest fit we could make.');
    return { ok: true, result, paper, weakShare: weakCount / Math.max(1, result.slots.length), notes };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
