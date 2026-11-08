/** Ordered "what to fix" list (part 8). Plain JSON so the planner can read it later from `analysis.fix`. */
import type { MockDoc } from '../../store';
import { attemptedRow, lastSaveTimes, marksText, rowsOf, timelineOf, type QMap } from './common';
import type { Fatigue } from './fatigue';
import type { HeatCell } from './heatmap';
import type { Waterfall } from './waterfall';
import { labelsFor } from './waterfall';

export interface FixItem {
  id: string;
  text: string;
  chapter?: string;
  /** marks this would have been worth on this paper (or, for chapters, its share of the paper) */
  marksAtStake: number;
  /** in-app route */
  link: string;
}

export const MAX_FIX_ITEMS = 5;

export function fixList(input: {
  mock: MockDoc;
  questions?: QMap;
  waterfall: Waterfall | null;
  heat?: HeatCell[];
  fatigue?: Fatigue | null;
  /** chapters of this paper only: restricts "Revise ..." to what the paper tested */
  limit?: number;
}): FixItem[] {
  const { mock, waterfall: w } = input;
  const mr = rowsOf(mock, input.questions);
  if (!mr || !mr.graded || !w) return [];
  const exam = mr.analysis.exam;
  const review = `/exam/${mock.paperId}/result/${mock.id}`;
  const practice = (ch: string) => `/practice/${exam}/${ch}`;
  const bar = (id: string) => w.bars.find((b) => b.id === id)!;
  const items: FixItem[] = [];

  const topChapter = (qids: string[]): string | undefined => {
    const tally = new Map<string, number>();
    for (const r of mr.rows) if (qids.includes(r.qid) && r.chapter) tally.set(r.chapter, (tally.get(r.chapter) ?? 0) + (r.maxMarks - Math.max(r.marks, 0)));
    return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
  };

  const silly = bar('silly');
  if (silly.marks > 0) {
    const ch = topChapter(silly.qids);
    items.push({
      id: 'silly',
      text: `Re-read the question before locking in (silly mistakes cost ${marksText(silly.marks)})`,
      ...(ch ? { chapter: ch } : {}),
      marksAtStake: w.recoverable.silly,
      link: ch ? practice(ch) : review,
    });
  }
  const neg = bar('negative');
  if (neg.marks > 0) {
    const guessIds = mr.rows.filter((r) => r.verdict === 'wrong' && labelsFor(r).includes('guess_careless')).map((r) => r.qid);
    items.push({
      id: 'guess',
      text: `Skip when below 40% sure (negative marking cost ${marksText(neg.marks)}${guessIds.length ? `, ${guessIds.length} of them quick guesses` : ''})`,
      marksAtStake: neg.marks,
      link: review,
    });
  }
  const skipped = bar('skippedEasy');
  if (skipped.marks > 0) {
    const ch = topChapter(skipped.qids);
    items.push({
      id: 'skipped_easy',
      text: `Try the easy questions before moving on: ${skipped.qids.length} easy ${skipped.qids.length === 1 ? 'one' : 'ones'} were left blank (${marksText(skipped.marks)} marks)`,
      ...(ch ? { chapter: ch } : {}),
      marksAtStake: skipped.marks,
      link: ch ? practice(ch) : review,
    });
  }
  const sink = bar('timeSink');
  if (sink.marks > 0) {
    const mins = Math.round(mr.rows.filter((r) => sink.qids.includes(r.qid)).reduce((a, r) => a + r.timeMs, 0) / 60_000);
    items.push({
      id: 'time_sink',
      text: `Set a 3-minute limit per question: long answers that ended wrong took ${mins} min and cost ${marksText(sink.marks)}`,
      marksAtStake: sink.marks,
      link: review,
    });
  }
  if (w.lostUnsavedCount > 0) {
    items.push({
      id: 'unsaved',
      text: `Press Save & Next before you move on (${w.lostUnsavedCount} ${w.lostUnsavedCount === 1 ? 'answer was' : 'answers were'} lost${bar('unsaved').marks > 0 ? `, ${marksText(bar('unsaved').marks)} marks` : ''})`,
      marksAtStake: w.recoverable.unsaved,
      link: review,
    });
  }
  const inPaper = new Set(mr.rows.map((r) => r.chapter).filter((c): c is string => !!c));
  const lostBy = (ch: string) => mr.rows.filter((r) => r.chapter === ch).reduce((a, r) => a + r.maxMarks - Math.max(r.marks, 0), 0);
  for (const c of (input.heat ?? []).filter((h) => h.flagged && (inPaper.size === 0 || inPaper.has(h.id))).slice(0, 2)) {
    const stake = inPaper.has(c.id) ? lostBy(c.id) : c.weight * w.max;
    items.push({
      id: `chapter:${c.id}`,
      text: `Revise ${c.name} (high weight, low mastery)`,
      chapter: c.id,
      marksAtStake: Math.round(stake * 10) / 10,
      link: practice(c.id),
    });
  }
  const f = input.fatigue;
  if (f && f.trend === 'dropped' && f.dropPoints !== null) {
    const saves = lastSaveTimes(timelineOf(mock));
    const cut = mr.analysis.usedMs - f.last.spanMin * 60_000;
    const lost = mr.rows.filter((r) => attemptedRow(r) && (saves.get(r.qid) ?? -1) >= cut).reduce((a, r) => a + r.maxMarks - Math.max(r.marks, 0), 0);
    items.push({
      id: 'fatigue',
      text: `Build stamina with a full 3-hour set: accuracy dropped ${f.dropPoints} points in the last ${f.last.spanMin >= 59 ? 'hour' : `${f.last.spanMin} minutes`}`,
      marksAtStake: Math.round(lost * 10) / 10,
      link: '/mocks',
    });
  }
  // stable: biggest stake first, ties keep the order above
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => b.it.marksAtStake - a.it.marksAtStake || a.i - b.i)
    .slice(0, input.limit ?? MAX_FIX_ITEMS)
    .map((x) => x.it);
}
