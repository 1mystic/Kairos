/** Marks-lost waterfall (docs/04 mock report part 2). */
import { behaviourLabels, type BehaviourLabel } from '@kairos/core';
import type { MockDoc } from '../../store';
import {
  DEFAULT_MEDIAN_MS, rowsOf, round2, timelineOf, unsavedSelections, valueIsCorrect, type QMap, type Row,
} from './common';

export type BarId = 'max' | 'negative' | 'silly' | 'skippedEasy' | 'timeSink' | 'unsaved' | 'unreached' | 'remaining' | 'actual' | 'potential';

export interface WaterfallBar {
  id: BarId;
  label: string;
  /** one plain sentence for what the bar means */
  hint: string;
  /** marks (always >= 0; loss bars are subtracted from the running total) */
  marks: number;
  kind: 'total' | 'loss' | 'gain';
  qids: string[];
}

export interface Waterfall {
  max: number;
  actual: number;
  /** actual + recoverable.total */
  potential: number;
  recoverable: { silly: number; skippedEasy: number; unsaved: number; negativesAvoided: number; total: number };
  bars: WaterfallBar[];
  /** answers discarded without Save, from `analysis.lostUnsaved` (marks only known when answer keys were available) */
  lostUnsavedCount: number;
  /** how many questions had difficulty data; silly/skipped-easy need it */
  withDifficulty: number;
  total: number;
}

const BAR_TEXT: Record<Exclude<BarId, 'max' | 'actual' | 'potential'>, { label: string; hint: string }> = {
  negative: { label: 'Negative marking', hint: 'Marks taken off for wrong answers.' },
  silly: { label: 'Silly mistakes', hint: 'Easy questions (most students get them right) answered wrong.' },
  skippedEasy: { label: 'Easy ones skipped', hint: 'Easy questions you opened and left blank.' },
  timeSink: { label: 'Time sinks', hint: 'Wrong answers that took more than 3 minutes.' },
  unsaved: { label: 'Lost, not saved', hint: 'Right answers selected but never saved.' },
  unreached: { label: 'Not reached', hint: 'Questions never opened.' },
  remaining: { label: 'Concept gaps', hint: 'Everything else: questions that need more learning.' },
};

/**
 * max - negative - silly - skippedEasy - timeSink - unsaved - unreached - remaining = actual (exactly; `remaining` is the
 * per-question remainder, nothing is left unexplained). Each question's lost marks go to ONE bar, first match wins:
 * unsaved right answer > silly (core label `silly_mistake`) > time sink (`time_sink`) > skipped easy (`strategy`) >
 * unreached > remaining. Negative marks of every wrong answer always go to the negative bar.
 * Returns null while the paper is ungraded.
 */
export function markWaterfall(mock: MockDoc, questions?: QMap): Waterfall | null {
  const mr = rowsOf(mock, questions);
  if (!mr || !mr.graded) return null;
  const { analysis, rows } = mr;
  const events = timelineOf(mock);
  const drafts = unsavedSelections(events);
  const lostRight = new Set<string>();
  for (const [q, v] of drafts) if (valueIsCorrect(questions?.get(q), v) === true) lostRight.add(q);

  const sum = { negative: 0, silly: 0, skippedEasy: 0, timeSink: 0, unsaved: 0, unreached: 0, remaining: 0 };
  const ids: Record<keyof typeof sum, string[]> = { negative: [], silly: [], skippedEasy: [], timeSink: [], unsaved: [], unreached: [], remaining: [] };
  const rec = { silly: 0, skippedEasy: 0, unsaved: 0, negativesAvoided: 0 };
  let max = 0;
  let actual = 0;
  let withDifficulty = 0;
  for (const r of rows) {
    max += r.maxMarks;
    actual += r.marks;
    if (r.pCorrect !== null) withDifficulty++;
    if (r.verdict === 'correct') continue;
    const neg = r.marks < 0 ? -r.marks : 0;
    const rest = r.maxMarks - Math.max(r.marks, 0);
    if (neg > 0) {
      sum.negative += neg;
      ids.negative.push(r.qid);
    }
    const labels = labelsFor(r);
    let bucket: keyof typeof rec | 'timeSink' | 'unreached' | 'remaining';
    if (lostRight.has(r.qid)) bucket = 'unsaved';
    else if (r.verdict === 'wrong' && labels.includes('silly_mistake')) bucket = 'silly';
    else if (r.verdict === 'wrong' && labels.includes('time_sink')) bucket = 'timeSink';
    else if (r.verdict === 'blank' && r.visited && labels.includes('strategy')) bucket = 'skippedEasy';
    else if (r.verdict === 'blank' && !r.visited) bucket = 'unreached';
    else bucket = 'remaining';
    if (rest > 0) {
      sum[bucket as keyof typeof sum] += rest;
      ids[bucket as keyof typeof sum].push(r.qid);
    }
    if (bucket === 'silly' || bucket === 'skippedEasy' || bucket === 'unsaved') {
      rec[bucket] += rest;
      rec.negativesAvoided += neg;
    } else if (r.verdict === 'wrong' && labels.includes('guess_careless')) {
      rec.negativesAvoided += neg;
    }
  }
  const recTotal = rec.silly + rec.skippedEasy + rec.unsaved + rec.negativesAvoided;
  const mk = (id: Exclude<BarId, 'max' | 'actual' | 'potential'>): WaterfallBar => ({
    id, ...BAR_TEXT[id], marks: round2(sum[id]), kind: 'loss', qids: ids[id],
  });
  const bars: WaterfallBar[] = [
    { id: 'max', label: 'Maximum', hint: 'Marks available in this paper.', marks: round2(max), kind: 'total', qids: [] },
    mk('negative'), mk('silly'), mk('skippedEasy'), mk('timeSink'), mk('unsaved'), mk('unreached'), mk('remaining'),
    { id: 'actual', label: 'Your score', hint: 'Marks you scored.', marks: round2(actual), kind: 'total', qids: [] },
    {
      id: 'potential', label: 'Potential score', kind: 'gain', qids: [...new Set([...ids.silly, ...ids.skippedEasy, ...ids.unsaved])],
      hint: 'Your score plus the marks within reach by fixing silly mistakes, easy skips, unsaved answers and guesses that cost negatives.',
      marks: round2(actual + recTotal),
    },
  ];
  return {
    max: round2(max),
    actual: round2(actual),
    potential: round2(actual + recTotal),
    recoverable: { silly: round2(rec.silly), skippedEasy: round2(rec.skippedEasy), unsaved: round2(rec.unsaved), negativesAvoided: round2(rec.negativesAvoided), total: round2(recTotal) },
    bars,
    lostUnsavedCount: analysis.lostUnsaved,
    withDifficulty,
    total: rows.length,
  };
}

/** Core behaviour labels for one mock row (reuses `behaviourLabels`, never re-derives its thresholds). */
export function labelsFor(r: Row): BehaviourLabel[] {
  if (!r.visited || !r.verdict) return [];
  return behaviourLabels({
    correct: r.verdict === 'correct',
    timeMs: r.timeMs,
    medianTimeMs: r.medianMs ?? DEFAULT_MEDIAN_MS,
    pCorrect: r.pCorrect ?? 0.5,
    changedCorrectToWrong: false,
    skipped: r.verdict === 'blank',
  });
}
