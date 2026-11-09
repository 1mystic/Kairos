import { describe, expect, it } from 'vitest';
import type { MasteryDoc } from '@kairos/core';
import { suggestSession, type ChapterInfo } from './suggestSession';

const NOW = Date.UTC(2026, 10, 9, 8);
const DAY = 86_400_000;
const ch = (id: string, count = 20): ChapterInfo => ({ id, name: `Name ${id}`, subject: 'PHY', count, topics: [`${id}.t1`] });
const chapters = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => ch(id));
const topic = (θ: number, rd: number, n: number, due = NOW + 10 * DAY) => ({ θ, rd, n, last: NOW, S: 3, D: 5, due, err_mix: {}, reps: 3, lapses: 0, st: 2 });
const common = { exam: 'JEE_MAIN', chaptersDone: [] as string[], chapters, now: NOW, seed: 1 };

describe('suggestSession', () => {
  it('takes the 3 weakest chapters with enough data, plus 1 due for review', () => {
    const mastery: MasteryDoc = {
      'A.t1': topic(-1.5, 0.2, 20),
      'B.t1': topic(-0.5, 0.2, 20),
      'C.t1': topic(0.2, 0.2, 20),
      'D.t1': topic(1.5, 0.2, 20, NOW - 2 * DAY), // strong, but overdue
      'E.t1': topic(-3, 1, 1), // weakest but we know too little
    };
    const s = suggestSession({ ...common, mastery });
    expect(s.source).toBe('mastery');
    expect(s.tasks.map((t) => t.chapter)).toEqual(['A', 'B', 'C', 'D']);
    expect(s.tasks.map((t) => t.bucket)).toEqual(['weak', 'weak', 'weak', 'review']);
    expect(s.tasks[3]!.kind).toBe('fsrs_due');
    expect(s.tasks[3]!.topic).toBe('D.t1');
    expect(s.questions).toBe(20);
    expect(s.focus.map((f) => f.reason)).toEqual(['Weak', 'Weak', 'Weak', 'Review due']);
    expect(s.summary).toMatch(/3 weak chapters, 1 review/);
  });

  it('falls back to chapters marked as done, then to the first chapters', () => {
    const done = suggestSession({ ...common, mastery: null, chaptersDone: ['C', 'B'] });
    expect(done.source).toBe('done');
    expect(done.tasks.map((t) => t.chapter)).toEqual(['C', 'B']);
    expect(done.questions).toBe(20);
    const first = suggestSession({ ...common, mastery: null });
    expect(first.source).toBe('first');
    expect(first.tasks.map((t) => t.chapter)).toEqual(['A', 'B', 'C', 'D']);
    expect(first.focus.every((f) => f.reason === 'Mixed')).toBe(true);
  });

  it('defaults to 20 questions, never more than a chapter holds, and honours size', () => {
    expect(suggestSession({ ...common, mastery: null }).questions).toBe(20);
    expect(suggestSession({ ...common, mastery: null, size: 15 }).questions).toBe(15);
    const small = suggestSession({ ...common, mastery: null, chapters: [ch('A', 2)] });
    expect(small.tasks[0]!.items).toBe(2);
  });

  it('skips chapters with no questions and handles an empty exam', () => {
    const s = suggestSession({ ...common, mastery: null, chapters: [ch('A', 0), ch('B')] });
    expect(s.tasks.map((t) => t.chapter)).toEqual(['B']);
    const none = suggestSession({ ...common, mastery: null, chapters: [] });
    expect(none.tasks).toEqual([]);
    expect(none.source).toBe('none');
  });

  it('is deterministic for a seed', () => {
    const mastery: MasteryDoc = { 'A.t1': topic(0, 0.2, 20), 'B.t1': topic(0, 0.2, 20), 'C.t1': topic(0, 0.2, 20), 'D.t1': topic(0, 0.2, 20) };
    const a = suggestSession({ ...common, mastery });
    const b = suggestSession({ ...common, mastery });
    expect(a.tasks.map((t) => t.chapter)).toEqual(b.tasks.map((t) => t.chapter));
  });

  it('puts chapters whose questions were all seen recently last when filling', () => {
    const s = suggestSession({ ...common, mastery: null, seen: { A: 20 } });
    expect(s.tasks.map((t) => t.chapter)).toEqual(['B', 'C', 'D', 'E']);
  });
});
