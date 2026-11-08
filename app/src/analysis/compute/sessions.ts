/** Mastery-tab maths from stored sessions and the mastery doc. Pure. */
import {
  attemptsFromEvents, behaviourLabels, type Attempt, type BehaviourLabel, type KairosEvent, type MasteryDoc, type Question,
} from '@kairos/core';
import type { SessionDoc } from '../../store';

export const DAY_MS = 86_400_000;

interface ChapterSum { n: number; correct: number; wrong: number; skipped: number; timeMs: number }
export const summaryOf = (s: SessionDoc): { byChapter: Record<string, ChapterSum>; labels: Partial<Record<BehaviourLabel, number>> } => {
  const sum = (s.summary ?? {}) as { byChapter?: Record<string, ChapterSum>; labels?: Partial<Record<BehaviourLabel, number>> };
  return { byChapter: sum.byChapter ?? {}, labels: sum.labels ?? {} };
};
const stamp = (s: SessionDoc) => s.endedAt ?? s.startedAt;

/** chapter id -> subject id, from the taxonomy. */
export type ChapterSubject = Record<string, string>;

export interface Trend {
  subject: string;
  last7: { n: number; accuracy: number | null };
  /** days 8..30 */
  prior: { n: number; accuracy: number | null };
  /** percentage points, last 7 days minus days 8..30; null when either side has < MIN_TREND_N answers */
  delta: number | null;
}
export const MIN_TREND_N = 5;

/** Practice accuracy of the last 7 days against the 23 days before, per subject. */
export function accuracyTrend(sessions: SessionDoc[], chapterSubject: ChapterSubject, now: number): Trend[] {
  const acc = new Map<string, { a: { n: number; c: number }; b: { n: number; c: number } }>();
  for (const s of sessions) {
    const age = now - stamp(s);
    if (age < 0 || age > 30 * DAY_MS) continue;
    const side = age <= 7 * DAY_MS ? 'a' : 'b';
    for (const [ch, c] of Object.entries(summaryOf(s).byChapter)) {
      const subj = chapterSubject[ch];
      if (!subj) continue;
      const e = acc.get(subj) ?? acc.set(subj, { a: { n: 0, c: 0 }, b: { n: 0, c: 0 } }).get(subj)!;
      e[side].n += c.correct + c.wrong;
      e[side].c += c.correct;
    }
  }
  return [...acc].map(([subject, e]) => {
    const f = (x: { n: number; c: number }) => ({ n: x.n, accuracy: x.n > 0 ? x.c / x.n : null });
    const last7 = f(e.a);
    const prior = f(e.b);
    const ok = last7.n >= MIN_TREND_N && prior.n >= MIN_TREND_N;
    return { subject, last7, prior, delta: ok ? Math.round((last7.accuracy! - prior.accuracy!) * 100) : null };
  });
}

export interface LabelWeek {
  /** week start (epoch ms), oldest first */
  from: number;
  careless: number;
  conceptGap: number;
  timeSink: number;
  other: number;
}
export const LABEL_GROUP: Record<BehaviourLabel, 'careless' | 'conceptGap' | 'timeSink' | 'other'> = {
  guess_careless: 'careless', silly_mistake: 'careless', concept_gap: 'conceptGap', time_sink: 'timeSink',
  fluency: 'other', overthinking: 'other', strategy: 'other',
};

/** Behaviour labels from session summaries, grouped per week (weeks end at `now`). */
export function labelMixByWeek(sessions: SessionDoc[], now: number, weeks = 8): LabelWeek[] {
  const out: LabelWeek[] = Array.from({ length: weeks }, (_, i) => ({
    from: now - (weeks - i) * 7 * DAY_MS, careless: 0, conceptGap: 0, timeSink: 0, other: 0,
  }));
  for (const s of sessions) {
    const age = now - stamp(s);
    if (age < 0 || age >= weeks * 7 * DAY_MS) continue;
    const w = out[weeks - 1 - Math.floor(age / (7 * DAY_MS))]!;
    for (const [l, c] of Object.entries(summaryOf(s).labels)) {
      const g = LABEL_GROUP[l as BehaviourLabel];
      if (g) w[g] += c ?? 0;
    }
  }
  return out;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export interface DifficultyBand { id: Difficulty; label: string; attempted: number; correct: number; accuracy: number | null }

/** Accuracy by item difficulty: p(correct) > 0.75 easy, < 0.4 hard (docs/05 5.3 uses 0.75 for easy). */
export function difficultyBands(attempts: Pick<Attempt, 'pCorrect' | 'correct' | 'skipped'>[]): DifficultyBand[] {
  const bands: DifficultyBand[] = [
    { id: 'easy', label: 'Easy', attempted: 0, correct: 0, accuracy: null },
    { id: 'medium', label: 'Medium', attempted: 0, correct: 0, accuracy: null },
    { id: 'hard', label: 'Hard', attempted: 0, correct: 0, accuracy: null },
  ];
  for (const a of attempts) {
    if (a.skipped) continue;
    const b = bands[a.pCorrect > 0.75 ? 0 : a.pCorrect < 0.4 ? 2 : 1]!;
    b.attempted++;
    if (a.correct) b.correct++;
  }
  for (const b of bands) b.accuracy = b.attempted ? b.correct / b.attempted : null;
  return bands;
}

/** Minutes of practice per subject over the last `days`. */
export function studyTimeBySubject(sessions: SessionDoc[], chapterSubject: ChapterSubject, now: number, days = 30): { subject: string; ms: number }[] {
  const t = new Map<string, number>();
  for (const s of sessions) {
    const age = now - stamp(s);
    if (age < 0 || age > days * DAY_MS) continue;
    for (const [ch, c] of Object.entries(summaryOf(s).byChapter)) {
      const subj = chapterSubject[ch];
      if (subj) t.set(subj, (t.get(subj) ?? 0) + c.timeMs);
    }
  }
  return [...t].map(([subject, ms]) => ({ subject, ms })).sort((a, b) => b.ms - a.ms);
}

// ---------------------------------------------------------------- mistakes

export interface LabelCount { label: BehaviourLabel; count: number; chapters: { chapter: string; count: number }[] }

/** Mistake labels that mean "lost marks for a fixable reason" (not fluency, which is a speed note on a right answer). */
export const MISTAKE_LABELS: BehaviourLabel[] = ['concept_gap', 'silly_mistake', 'guess_careless', 'time_sink', 'overthinking', 'strategy'];

/**
 * Repeated errors by label from the mastery doc (`err_mix` per topic, rolled up to chapters).
 * Needs no question data, so it works offline and for guests.
 */
export function topMistakes(doc: MasteryDoc | null | undefined, topicChapter: (id: string) => string | undefined): LabelCount[] {
  if (!doc) return [];
  const by = new Map<BehaviourLabel, Map<string, number>>();
  for (const [topic, t] of Object.entries(doc)) {
    const ch = topicChapter(topic) ?? topic;
    for (const [l, c] of Object.entries(t.err_mix)) {
      if (!MISTAKE_LABELS.includes(l as BehaviourLabel) || !c) continue;
      const m = by.get(l as BehaviourLabel) ?? by.set(l as BehaviourLabel, new Map()).get(l as BehaviourLabel)!;
      m.set(ch, (m.get(ch) ?? 0) + c);
    }
  }
  return [...by]
    .map(([label, m]) => ({
      label,
      count: [...m.values()].reduce((a, b) => a + b, 0),
      chapters: [...m].map(([chapter, count]) => ({ chapter, count })).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}

export interface MistakeExample { qid: string; chapter?: string; label: BehaviourLabel; timeMs: number; stem: string; exam: string }

/** Example questions behind each label, from session events + the questions of those sessions. Newest sessions first. */
export function mistakeExamples(
  sessions: SessionDoc[],
  questions: ReadonlyMap<string, Question>,
  perLabel = 3,
): Map<BehaviourLabel, MistakeExample[]> {
  const out = new Map<BehaviourLabel, MistakeExample[]>();
  const seen = new Set<string>();
  for (const s of [...sessions].sort((a, b) => stamp(b) - stamp(a))) {
    const events = (s.events ?? []) as KairosEvent[];
    if (!events.length) continue;
    const reasons = (s.reasons ?? {}) as Record<string, string>;
    const attempts = attemptsFromEvents(events, [...questions.values()].filter((q) => (s.qids as string[] | undefined)?.includes(q.id)));
    for (const a of attempts) {
      if (a.correct || seen.has(a.q)) continue;
      const q = questions.get(a.q);
      if (!q) continue;
      const withReason = reasons[a.q] ? { ...a, reason: reasonToLabel(reasons[a.q]!) } : a;
      for (const l of behaviourLabels(withReason)) {
        if (!MISTAKE_LABELS.includes(l)) continue;
        const list = out.get(l) ?? out.set(l, []).get(l)!;
        if (list.length >= perLabel) continue;
        seen.add(a.q);
        list.push({ qid: a.q, ...(q.tax?.chapter ? { chapter: q.tax.chapter } : {}), label: l, timeMs: a.timeMs, stem: plainStem(q.stem), exam: String(s.exam ?? 'JEE_MAIN') });
        break;
      }
    }
  }
  return out;
}

const REASON: Record<string, BehaviourLabel> = { silly: 'silly_mistake', misread: 'silly_mistake', concept: 'concept_gap', guessed: 'guess_careless', time: 'time_sink' };
const reasonToLabel = (id: string): BehaviourLabel | undefined => REASON[id];

/** One line of the stem without markdown/maths markers. */
export function plainStem(stem: string, max = 110): string {
  const t = stem.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[$*_`#>]/g, '').replace(/\\[a-zA-Z]+/g, '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
