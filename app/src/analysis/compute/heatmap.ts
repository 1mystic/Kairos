/** Chapter weight x mastery grid (part 6 and the Mastery tab). Honest about uncertainty. */
import { masteryProb, type Aggregate } from '@kairos/core';

export interface ChapterRef { id: string; name: string; subject: string }
export interface ChapterEvidence { correct: number; wrong: number; blank: number; marksLost: number }

/** unknown: the estimate is too wide to say anything (never shown as "weak"). */
export type MasteryBand = 'unknown' | 'low' | 'mid' | 'good' | 'strong';

export interface HeatCell {
  id: string;
  name: string;
  subject: string;
  /** share of the exam, 0..1 (equal shares when no weights are given) */
  weight: number;
  /** P(correct) on a medium question, 0..1; null when unknown */
  mastery: number | null;
  band: MasteryBand;
  /** the core confidence label, kept for the detail panel */
  confidence: 'not_enough_data' | 'rough' | 'confident' | 'none';
  n: number;
  /** high weight and low mastery (needs an estimate that is at least rough) */
  flagged: boolean;
  /** weight x (1 - mastery); unknown chapters assume 0.5 */
  priority: number;
  evidence?: ChapterEvidence;
}

export const LOW_THETA = -0.4;

export function bandOf(agg: Aggregate | undefined): { band: MasteryBand; mastery: number | null } {
  if (!agg || agg.n === 0 || agg.label === 'not_enough_data') return { band: 'unknown', mastery: null };
  const m = masteryProb(agg.theta);
  return { band: agg.theta <= LOW_THETA ? 'low' : m >= 0.8 ? 'strong' : m >= 0.6 ? 'good' : 'mid', mastery: m };
}

export function chapterHeatmap(input: {
  chapters: ChapterRef[];
  mastery: Record<string, Aggregate>;
  /** relative weights by chapter id; missing chapters get the mean, none given = equal */
  weights?: Record<string, number>;
  evidence?: Record<string, ChapterEvidence>;
}): HeatCell[] {
  const { chapters, mastery, weights, evidence } = input;
  if (chapters.length === 0) return [];
  const given = chapters.map((c) => weights?.[c.id]).filter((w): w is number => typeof w === 'number' && w > 0);
  const fallback = given.length ? given.reduce((a, b) => a + b, 0) / given.length : 1;
  const raw = chapters.map((c) => (weights?.[c.id] && weights[c.id]! > 0 ? weights[c.id]! : fallback));
  const total = raw.reduce((a, b) => a + b, 0);
  const meanShare = 1 / chapters.length;
  const cells = chapters.map((c, i): HeatCell => {
    const agg = mastery[c.id];
    const { band, mastery: m } = bandOf(agg);
    const weight = raw[i]! / total;
    const cell: HeatCell = {
      id: c.id, name: c.name, subject: c.subject, weight, mastery: m, band,
      confidence: agg && agg.n > 0 ? agg.label : 'none',
      n: agg?.n ?? 0,
      flagged: band === 'low' && weight >= meanShare - 1e-9,
      priority: weight * (1 - (m ?? 0.5)),
    };
    const ev = evidence?.[c.id];
    if (ev) cell.evidence = ev;
    return cell;
  });
  return cells.sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.priority - a.priority || a.name.localeCompare(b.name));
}
