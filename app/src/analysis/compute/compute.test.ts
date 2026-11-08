import { describe, expect, it } from 'vitest';
import type { Aggregate } from '@kairos/core';
import { buildMock, MASTERY, MIN, mkSession, typicalMock, TYPICAL, type QSpec } from '../__fixtures__';
import {
  accuracyTrend, attemptAccuracyQuadrant, chapterHeatmap, difficultyBands, fatigueCurve, fixList, labelMixByWeek,
  markWaterfall, plainStem, quadrantOf, studyTimeBySubject, timeMap, topMistakes, vsTop, DAY_MS,
} from './index';

const bar = (w: NonNullable<ReturnType<typeof markWaterfall>>, id: string) => w.bars.find((b) => b.id === id)!;

describe('markWaterfall', () => {
  const { mock, questions } = typicalMock();
  const w = markWaterfall(mock, questions)!;
  it('matches the hand-checked numbers', () => {
    expect(w.max).toBe(48);
    expect(w.actual).toBe(7);
    expect(Object.fromEntries(w.bars.map((b) => [b.id, b.marks]))).toMatchObject({
      max: 48, negative: 5, silly: 8, skippedEasy: 4, timeSink: 4, unsaved: 4, unreached: 4, remaining: 12, actual: 7, potential: 26,
    });
    expect(w.recoverable).toEqual({ silly: 8, skippedEasy: 4, unsaved: 4, negativesAvoided: 3, total: 19 });
  });
  it('sums to max - actual exactly and carries the question ids', () => {
    const lost = w.bars.filter((b) => b.kind === 'loss').reduce((a, b) => a + b.marks, 0);
    expect(lost).toBe(w.max - w.actual);
    expect(bar(w, 'silly').qids).toEqual(['p2', 'm4']);
    expect(bar(w, 'skippedEasy').qids).toEqual(['p4']);
    expect(bar(w, 'timeSink').qids).toEqual(['p3']);
    expect(bar(w, 'unsaved').qids).toEqual(['m3']);
    expect(bar(w, 'unreached').qids).toEqual(['c3']);
    expect(bar(w, 'negative').qids).toEqual(['p2', 'p3', 'c2', 'm2', 'm4']);
  });
  it('potential is never below actual', () => {
    expect(w.potential).toBeGreaterThanOrEqual(w.actual);
    const clean = buildMock([TYPICAL[0]!, TYPICAL[4]!]);
    const c = markWaterfall(clean.mock, clean.questions)!;
    expect(c.potential).toBe(c.actual);
  });
  it('without difficulty data nothing is called silly or easy-skipped, but the sum still holds', () => {
    const w2 = markWaterfall(mock)!;
    expect(w2.withDifficulty).toBe(0);
    expect(bar(w2, 'silly').marks).toBe(0);
    expect(bar(w2, 'skippedEasy').marks).toBe(0);
    const lost = w2.bars.filter((b) => b.kind === 'loss').reduce((a, b) => a + b.marks, 0);
    expect(lost).toBe(w2.max - w2.actual);
  });
  it('is null for a pending paper', () => {
    const pending = { ...mock, analysis: { ...(mock.analysis as object), pending: true, questions: [] } };
    expect(markWaterfall(pending, questions)).toBeNull();
    expect(markWaterfall({ id: 'x', paperId: 'p' }, questions)).toBeNull();
  });
});

describe('attemptAccuracyQuadrant', () => {
  it('uses inclusive cutoffs at 60% / 60%', () => {
    expect(quadrantOf(0.6, 0.6)).toBe('steady');
    expect(quadrantOf(0.59, 0.6)).toBe('cautious');
    expect(quadrantOf(0.6, 0.59)).toBe('careless');
    expect(quadrantOf(0.1, 0.1)).toBe('untouched');
    expect(quadrantOf(0, null)).toBe('untouched');
  });
  it('groups per subject and chapter with advice', () => {
    const { mock, questions } = typicalMock();
    const q = attemptAccuracyQuadrant(mock, questions, (c) => c)!;
    const phy = q.subjects.find((s) => s.key === 'PHY')!;
    // 3 of 4 attempted (p4 blank), 1 of 3 correct
    expect(phy).toMatchObject({ n: 4, attempted: 3, correct: 1, attemptRate: 0.75, quadrant: 'careless' });
    expect(phy.accuracy).toBeCloseTo(1 / 3);
    expect(phy.advice).toMatch(/Slow down/);
    const che = q.subjects.find((s) => s.key === 'CHE')!;
    expect(che.quadrant).toBe('untouched'); // 2 of 4 attempted = 50%
    expect(q.chapters.length).toBe(6);
    expect(q.chapters.every((c) => c.thin)).toBe(true); // 2 questions each
  });
});

describe('timeMap', () => {
  const { mock, questions } = typicalMock();
  const t = timeMap(mock, questions)!;
  it('buckets cover the 3 hours and sum to the time used on questions', () => {
    expect(t.buckets).toHaveLength(18);
    const spent = 24.5 * MIN;
    expect(t.totalMs).toBe(spent);
    expect(t.buckets.reduce((a, b) => a + b.totalMs, 0)).toBe(spent);
    expect(t.buckets.reduce((a, b) => a + Object.values(b.bySubject).reduce((x, y) => x + y, 0), 0)).toBe(spent);
    const fromAnalysis = (mock.analysis as { questions: { timeMs: number }[] }).questions.reduce((a, q) => a + q.timeMs, 0);
    expect(t.totalMs).toBe(fromAnalysis);
  });
  it('splits a span across bucket boundaries and by subject', () => {
    expect(t.buckets[0]!.bySubject.PHY).toBe(10 * MIN); // p1 4 + p2 2 + p3 4 of its 5
    expect(t.buckets[1]!.bySubject.PHY).toBe(2 * MIN); // p3 last minute + p4
    expect(t.buckets[16]!.bySubject.MAT).toBe(3 * MIN);
  });
  it('puts marks in the bucket of the last save', () => {
    expect(t.buckets.map((b) => b.marks).filter((m) => m !== 0)).toEqual([3, -1, 3, 3, -1]);
    expect(t.buckets[0]!.marks).toBe(3);
  });
  it('flags questions slower than 1.5x their median', () => {
    expect(t.slowest[0]!.qid).toBe('p3'); // 2.5x, then p1/p2 at 2x
    expect(t.slowest.every((q) => q.ratio! > 1.5)).toBe(true);
    expect(t.slowest.map((q) => q.qid)).not.toContain('m2'); // 1.2x
    expect(t.perQuestion.find((q) => q.qid === 'p3')!.ratio).toBe(2.5);
  });
});

describe('fatigueCurve', () => {
  const mk = (early: boolean[], late: boolean[]): QSpec[] => [
    ...early.map((c, i): QSpec => ({ qid: `e${i}`, subject: 'PHY', chapter: 'PHY.LOM', p: 0.5, verdict: c ? 'correct' : 'wrong', spans: [[5 + i * 10, 8 + i * 10]], saveMin: 8 + i * 10 })),
    ...late.map((c, i): QSpec => ({ qid: `l${i}`, subject: 'PHY', chapter: 'PHY.LOM', p: 0.5, verdict: c ? 'correct' : 'wrong', spans: [[125 + i * 12, 128 + i * 12]], saveMin: 128 + i * 12 })),
  ];
  it('calls out a drop and has a negative slope', () => {
    const { mock } = buildMock(mk([true, true, true, true, true, true], [true, false, false, false]), { usedMin: 180 });
    const f = fatigueCurve(mock)!;
    expect(f.trend).toBe('dropped');
    expect(f.dropPoints).toBe(75);
    expect(f.slopePerHour!).toBeLessThan(0);
    expect(f.text).toBe('Accuracy dropped 75 points in the last hour.');
  });
  it('positive slope when the student improves', () => {
    const { mock } = buildMock(mk([false, false, false, false, true, false], [true, true, true, true]), { usedMin: 180 });
    const f = fatigueCurve(mock)!;
    expect(f.trend).toBe('improved');
    expect(f.slopePerHour!).toBeGreaterThan(0);
  });
  it('does not read a trend from too few answers', () => {
    const { mock } = buildMock(mk([true], [false]), { usedMin: 180 });
    const f = fatigueCurve(mock)!;
    expect(f.trend).toBe('unknown');
    expect(f.dropPoints).toBeNull();
    expect(f.slopePerHour).toBeNull();
  });
  it('windows are 30 minutes stepping by 10 and end at the time used', () => {
    const { mock } = buildMock(mk([true, true, true], []), { usedMin: 180 });
    const f = fatigueCurve(mock)!;
    expect(f.points[0]).toMatchObject({ fromMin: 0, toMin: 30 });
    expect(f.points[1]!.fromMin).toBe(10);
    expect(f.points.at(-1)!.toMin).toBe(180);
  });
});

describe('chapterHeatmap', () => {
  const chapters = [
    { id: 'PHY.ROT', name: 'Rotation', subject: 'PHY' },
    { id: 'PHY.LOM', name: 'Laws of Motion', subject: 'PHY' },
    { id: 'CHE.CHEQ', name: 'Equilibrium', subject: 'CHE' },
    { id: 'MAT.CALC', name: 'Calculus', subject: 'MAT' },
    { id: 'MAT.COMP', name: 'Complex numbers', subject: 'MAT' },
  ];
  const mastery: Record<string, Aggregate> = {
    'PHY.ROT': { theta: -1.1, rd: 0.25, n: 14, label: 'confident' },
    'PHY.LOM': { theta: 0.9, rd: 0.2, n: 20, label: 'confident' },
    'CHE.CHEQ': { theta: -0.9, rd: 0.7, n: 2, label: 'not_enough_data' },
    'MAT.CALC': { theta: -0.8, rd: 0.4, n: 8, label: 'rough' },
  };
  it('flags high weight + low mastery, ranks by priority, and never calls an uncertain chapter weak', () => {
    const cells = chapterHeatmap({ chapters, mastery, weights: { 'PHY.ROT': 4, 'MAT.CALC': 1, 'PHY.LOM': 2, 'CHE.CHEQ': 2, 'MAT.COMP': 1 } });
    expect(cells.map((c) => c.id).slice(0, 2)).toEqual(['PHY.ROT', 'MAT.CALC'].slice(0, 1).concat(cells[1]!.id));
    const rot = cells.find((c) => c.id === 'PHY.ROT')!;
    expect(rot).toMatchObject({ flagged: true, band: 'low' });
    expect(rot.weight).toBeCloseTo(0.4);
    const che = cells.find((c) => c.id === 'CHE.CHEQ')!;
    expect(che).toMatchObject({ flagged: false, band: 'unknown', mastery: null });
    expect(cells.find((c) => c.id === 'MAT.COMP')!.band).toBe('unknown');
    const calc = cells.find((c) => c.id === 'MAT.CALC')!;
    expect(calc.band).toBe('low');
    expect(calc.flagged).toBe(false); // weight 1/9 is below the mean share 1/5
    expect(cells.find((c) => c.id === 'PHY.LOM')!.band).toBe('good');
  });
  it('equal weights when none are given', () => {
    const cells = chapterHeatmap({ chapters, mastery });
    expect(cells.every((c) => Math.abs(c.weight - 0.2) < 1e-9)).toBe(true);
    expect(cells.filter((c) => c.flagged).map((c) => c.id).sort()).toEqual(['MAT.CALC', 'PHY.ROT']);
    expect(cells[0]!.flagged).toBe(true);
  });
  it('empty input gives no cells', () => expect(chapterHeatmap({ chapters: [], mastery })).toEqual([]));
});

describe('vsTop', () => {
  const { mock } = typicalMock();
  it('is null without benchmark data', () => {
    expect(vsTop(mock)).toBeNull();
    expect(vsTop(mock, null)).toBeNull();
    expect(vsTop(mock, {})).toBeNull();
  });
  it('compares when a benchmark exists for the paper', () => {
    const r = vsTop(mock, { paper_x: { marks: 30, max: 48, bySubject: { PHY: 10 } } })!;
    expect(r.marksGap).toBe(23);
    expect(r.subjectGaps).toEqual([{ subject: 'PHY', you: 2, top: 10, gap: 8 }]);
  });
});

describe('fixList', () => {
  const { mock, questions } = typicalMock();
  const waterfall = markWaterfall(mock, questions)!;
  const heat = chapterHeatmap({
    chapters: [{ id: 'PHY.ROT', name: 'Rotation', subject: 'PHY' }, { id: 'MAT.CALC', name: 'Calculus', subject: 'MAT' }],
    mastery: { 'PHY.ROT': { theta: -1.1, rd: 0.25, n: 14, label: 'confident' } },
  });
  const fix = fixList({ mock, questions, waterfall, heat, fatigue: fatigueCurve(mock, questions) });
  it('returns at most 5, biggest stake first, plain JSON', () => {
    expect(fix.length).toBe(5);
    const stakes = fix.map((f) => f.marksAtStake);
    expect([...stakes].sort((a, b) => b - a)).toEqual(stakes);
    expect(JSON.parse(JSON.stringify(fix))).toEqual(fix);
  });
  it('uses specific wording and links', () => {
    expect(fix[0]).toMatchObject({ id: 'silly', marksAtStake: 8, text: 'Re-read the question before locking in (silly mistakes cost 8)' });
    expect(fix.find((f) => f.id === 'guess')!.text).toBe('Skip when below 40% sure (negative marking cost 5, 1 of them quick guesses)');
    const chapter = fix.find((f) => f.id === 'chapter:PHY.ROT');
    if (chapter) expect(chapter.link).toBe('/practice/JEE_MAIN/PHY.ROT');
    expect(fix.find((f) => f.id === 'guess')!.link).toBe('/exam/paper_x/result/m_1');
    expect(fix.every((f) => f.link.startsWith('/'))).toBe(true);
  });
  it('is empty when nothing was lost', () => {
    const clean = buildMock([TYPICAL[0]!]);
    expect(fixList({ mock: clean.mock, questions: clean.questions, waterfall: markWaterfall(clean.mock, clean.questions) })).toEqual([]);
  });
});

describe('session maths', () => {
  const now = 100 * DAY_MS;
  const ch = { 'PHY.ROT': 'PHY', 'CHE.CHEQ': 'CHE' };
  const rec = (n: number, c: number) => ({ n, correct: c, wrong: n - c, skipped: 0, timeMs: n * 60_000 });
  const sessions = [
    mkSession('a', now - 2 * DAY_MS, { 'PHY.ROT': rec(10, 8) }, { silly_mistake: 1, concept_gap: 1 }),
    mkSession('b', now - 20 * DAY_MS, { 'PHY.ROT': rec(10, 4), 'CHE.CHEQ': rec(3, 1) }, { time_sink: 2, guess_careless: 1 }),
    mkSession('c', now - 60 * DAY_MS, { 'PHY.ROT': rec(10, 10) }),
  ];
  it('trend compares the last 7 days with the 23 before and needs enough answers', () => {
    const t = accuracyTrend(sessions, ch, now);
    const phy = t.find((x) => x.subject === 'PHY')!;
    expect(phy.last7).toEqual({ n: 10, accuracy: 0.8 });
    expect(phy.prior).toEqual({ n: 10, accuracy: 0.4 });
    expect(phy.delta).toBe(40);
    expect(t.find((x) => x.subject === 'CHE')!.delta).toBeNull();
  });
  it('groups labels per week, newest last', () => {
    const w = labelMixByWeek(sessions, now, 8);
    expect(w).toHaveLength(8);
    expect(w[7]).toMatchObject({ careless: 1, conceptGap: 1, timeSink: 0 });
    expect(w[5]).toMatchObject({ careless: 1, timeSink: 2 }); // 20 days ago = week index 7 - 2
  });
  it('study time sums by subject within the window', () => {
    expect(studyTimeBySubject(sessions, ch, now, 30)).toEqual([{ subject: 'PHY', ms: 20 * 60_000 }, { subject: 'CHE', ms: 3 * 60_000 }]);
  });
  it('difficulty bands ignore skipped questions', () => {
    const b = difficultyBands([
      { pCorrect: 0.9, correct: true, skipped: false }, { pCorrect: 0.8, correct: false, skipped: false },
      { pCorrect: 0.5, correct: true, skipped: false }, { pCorrect: 0.2, correct: false, skipped: false }, { pCorrect: 0.2, correct: false, skipped: true },
    ]);
    expect(b.map((x) => [x.id, x.attempted, x.accuracy])).toEqual([['easy', 2, 0.5], ['medium', 1, 1], ['hard', 1, 0]]);
  });
  it('top mistakes roll err_mix up by label and chapter', () => {
    const m = topMistakes(MASTERY, (t) => t);
    expect(m[0]).toMatchObject({ label: 'concept_gap', count: 9 });
    expect(m[0]!.chapters[0]).toEqual({ chapter: 'PHY.ROT', count: 6 });
    expect(topMistakes(null, () => undefined)).toEqual([]);
  });
  it('plainStem strips markup', () => expect(plainStem('Find $\\alpha$ **now** ![x](img:a)')).toBe('Find now'));
});
