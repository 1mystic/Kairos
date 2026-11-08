import { createPaletteState, paletteReducer, type PaletteState } from '@kairos/core';
import { loadAnswerMap, loadSampleModel } from './fixtures';
import { applyKey } from './Keypad';
import { buildMockDoc, expireAttempt, formatClock, gradeAttempt, newAttempt, readAnalysis, resolveAttempt } from './model';

const model = loadSampleModel();
const answers = loadAnswerMap(model.exam);

describe('exam model for the sample mini paper', () => {
  it('maps 9 questions to subjects/sections by type and scales the duration', () => {
    expect(model.slots).toHaveLength(9);
    expect(model.slots.map((s) => `${s.subject}.${s.sectionId}`)).toEqual([
      'PHY.A', 'PHY.A', 'PHY.B', 'CHE.A', 'CHE.A', 'CHE.B', 'MAT.A', 'MAT.A', 'MAT.B',
    ]);
    expect(model.slots[2]!.type).toBe('NVQ');
    expect(model.durationMs).toBe(22 * 60_000);
  });

  it('finds answers for every slot in the practice shards', () => {
    for (const s of model.slots) expect(answers.get(s.qid)?.answer).toBeTruthy();
  });
});

function run(pick: (i: number) => 'right' | 'wrong' | 'skip'): PaletteState {
  let s = createPaletteState(model.slots.map((x) => x.qid), 'mock', 0);
  model.slots.forEach((slot, i) => {
    const a = answers.get(slot.qid)!.answer!;
    const p = pick(i);
    if (p !== 'skip') {
      const keys = 'keys' in a ? a.keys : null;
      const answer = keys
        ? { keys: p === 'right' ? keys : [['A', 'B', 'C', 'D'].find((k) => !keys.includes(k))!] }
        : { value: p === 'right' ? ('value' in a ? a.value : 'range' in a ? a.range[0] : 0) : 987654 };
      s = paletteReducer(s, { type: 'SELECT', answer, now: 1000 * (i + 1) });
    }
    s = paletteReducer(s, { type: 'SAVE_NEXT', now: 1000 * (i + 1) + 500 });
  });
  return paletteReducer(s, { type: 'SUBMIT', reason: 'manual', now: 20_000 });
}

describe('grading integration', () => {
  it('all right = max, with +4 each', () => {
    const score = gradeAttempt(model, run(() => 'right'), answers)!;
    expect(score.marks).toBe(36);
    expect(score.max).toBe(36);
    expect(score.correct).toBe(9);
  });
  it('mixed attempts apply negative marking and blanks', () => {
    const score = gradeAttempt(model, run((i) => (i < 3 ? 'right' : i < 5 ? 'wrong' : 'skip')), answers)!;
    expect(score.marks).toBe(12 - 2);
    expect(score.wrong).toBe(2);
    expect(score.blank).toBe(4);
    expect(score.bySubject.PHY!.marks).toBe(12);
  });
  it('is pending (null) when answers are unavailable', () => {
    expect(gradeAttempt(model, run(() => 'right'), null)).toBeNull();
    expect(gradeAttempt(model, run(() => 'right'), new Map())).toBeNull();
  });
  it('builds a JSON-clean MockDoc with the documented analysis', () => {
    const state = run((i) => (i === 0 ? 'right' : 'skip'));
    const score = gradeAttempt(model, state, answers);
    const doc = buildMockDoc({ id: 'm_1', model, state, focusLog: [{ t: 5, type: 'leave' }], score, answers, submittedAt: 99, usedMs: 20_000 });
    expect(doc.paperId).toBe(model.paperId);
    expect(Array.isArray(doc.timeline)).toBe(true);
    const a = readAnalysis(doc)!;
    expect(a.pending).toBe(false);
    expect(a.questions).toHaveLength(9);
    expect(a.questions[0]).toMatchObject({ verdict: 'correct', marks: 4 });
    expect(a.questions[1]!.verdict).toBe('blank');
    expect(a.focusLog).toEqual([{ t: 5, type: 'leave' }]);
    expect(a.maxBySubject.PHY).toBe(12);
    expect(a.questions.reduce((n, q) => n + q.timeMs, 0)).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
  it('pending doc has no score', () => {
    const state = run(() => 'right');
    const doc = buildMockDoc({ id: 'm_2', model, state, focusLog: [], score: null, answers: null, submittedAt: 1, usedMs: 1 });
    expect(doc.score).toBeNull();
    expect(readAnalysis(doc)!.pending).toBe(true);
  });
});

describe('resume rules', () => {
  const a = newAttempt(model, 1_000_000, 'en');
  it('resumes inside the window, expires after, finalises a submitted one', () => {
    expect(resolveAttempt(undefined, 0, 1)).toBe('none');
    expect(resolveAttempt(a, 1_000_000 + 60_000, model.durationMs)).toBe('resume');
    expect(resolveAttempt(a, 1_000_000 + model.durationMs, model.durationMs)).toBe('expired');
    const closed = expireAttempt(a, model.durationMs);
    expect(closed.state.submitReason).toBe('auto');
    expect(resolveAttempt(closed, 0, model.durationMs)).toBe('finalize');
  });
});

describe('keypad logic and clock', () => {
  it('applies keys', () => {
    expect(applyKey('', '1')).toBe('1');
    expect(applyKey('1', '-')).toBe('-1');
    expect(applyKey('-1', '-')).toBe('1');
    expect(applyKey('', '.')).toBe('0.');
    expect(applyKey('1.5', '.')).toBe('1.5');
    expect(applyKey('12', 'BACKSPACE')).toBe('1');
    expect(applyKey('12', 'CLEAR')).toBe('');
    expect(applyKey('1', 'a')).toBe('1');
  });
  it('formats', () => {
    expect(formatClock(3 * 3600_000)).toBe('03:00:00');
    expect(formatClock(0)).toBe('00:00:00');
    expect(formatClock(61_001)).toBe('00:01:02');
  });
});
