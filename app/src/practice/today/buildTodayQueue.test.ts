import { describe, expect, it, vi } from 'vitest';
import * as core from '@kairos/core';
import type { MasteryDoc, Question, Task } from '@kairos/core';
import { mkQ } from '../fixtures.test-util';
import { buildTodayQueue, completedTaskIds, orderTasks, reasonOf, seenMap } from './buildTodayQueue';

const NOW = Date.UTC(2026, 10, 9, 8);
const DAY = 86_400_000;

const task = (id: string, chapter: string, items: number, over: Partial<Task> = {}): Task => ({
  id, kind: 'practice', topic: chapter, chapter, subject: 'PHY', items, est_min: items * 2, priority: 1, status: 'todo', ...over,
});
/** n questions of a chapter, cycling E/M/H */
const bank = (chapter: string, n: number, over: (i: number) => Record<string, unknown> = () => ({})): Question[] =>
  Array.from({ length: n }, (_, i) => {
    const label = ['E', 'M', 'H'][i % 3]!;
    const b = { E: -1, M: 0.1, H: 1.2 }[label]!;
    return mkQ(`${chapter}_${i}`, { tax: { subject: 'PHY', chapter, topics: [`${chapter}.t${i % 2}`] }, difficulty: { label, b, median_time_s: 60 }, ...over(i) });
  });
const mastery = (topic: string, θ: number): MasteryDoc => ({ [topic]: { θ, rd: 0.2, n: 12, last: NOW, S: 3, D: 5, due: NOW, err_mix: {}, reps: 3, lapses: 0, st: 2 } });

const base = (over: Record<string, unknown> = {}) => ({ seen: {}, mastery: null, now: NOW, seed: 7, ...over });

describe('orderTasks / reasonOf', () => {
  it('warm-up, then weak, then mixed, then review, light review last; priority inside a group', () => {
    const ts = [
      task('a', 'A', 5, { kind: 'light_review' }),
      task('b', 'B', 5, { kind: 'fsrs_due' }),
      task('c', 'C', 5),
      task('d', 'D', 5, { bucket: 'weak', priority: 1 }),
      task('e', 'E', 5, { bucket: 'weak', priority: 3 }),
      task('f', 'F', 5, { warmup: true }),
    ];
    expect(orderTasks(ts).map((t) => t.id)).toEqual(['f', 'e', 'd', 'c', 'b', 'a']);
  });
  it('names the reason in plain words', () => {
    expect(reasonOf(task('a', 'A', 1, { bucket: 'weak' }))).toBe('Weak');
    expect(reasonOf(task('a', 'A', 1, { kind: 'fsrs_due' }))).toBe('Review due');
    expect(reasonOf(task('a', 'A', 1, { carried_from: '2026-11-07' }))).toBe('Carried over');
    expect(reasonOf(task('a', 'A', 1))).toBe('Mixed');
  });
});

describe('buildTodayQueue', () => {
  const tasks = [task('t1', 'A', 5, { bucket: 'weak' }), task('t2', 'B', 6), task('t3', 'C', 4, { kind: 'light_review' })];
  const qs = { A: bank('A', 20), B: bank('B', 20), C: bank('C', 20) };

  it('follows the planner order and never exceeds the plan', () => {
    const r = buildTodayQueue({ tasks, questionsByChapter: qs, ...base() });
    expect(r.sections.map((s) => s.task.id)).toEqual(['t1', 't2', 't3']);
    expect(r.sections.map((s) => s.qids.length)).toEqual([5, 6, 4]);
    expect(r.queue).toHaveLength(15);
    expect(r.queue.map((q) => q.id)).toEqual(r.sections.flatMap((s) => s.qids));
  });

  it('respects maxQuestions', () => {
    const r = buildTodayQueue({ tasks, questionsByChapter: qs, ...base({ maxQuestions: 8 }) });
    expect(r.queue).toHaveLength(8);
    expect(r.sections.map((s) => s.qids.length)).toEqual([5, 3]);
  });

  it('has no duplicates, even when chapters share questions', () => {
    const shared = bank('A', 6);
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 4), task('t2', 'B', 4)], questionsByChapter: { A: shared, B: [...shared, ...bank('B', 3)] }, ...base() });
    const ids = r.queue.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is deterministic for a seed and changes with another', () => {
    const a = buildTodayQueue({ tasks, questionsByChapter: qs, ...base() });
    const b = buildTodayQueue({ tasks, questionsByChapter: qs, ...base() });
    const c = buildTodayQueue({ tasks, questionsByChapter: qs, ...base({ seed: 8 }) });
    expect(a.queue.map((q) => q.id)).toEqual(b.queue.map((q) => q.id));
    expect(c.queue.map((q) => q.id)).not.toEqual(a.queue.map((q) => q.id));
  });

  it('excludes questions seen in the last 21 days', () => {
    const seen = Object.fromEntries(qs.A.slice(0, 10).map((q) => [q.id, NOW - 3 * DAY]));
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 8)], questionsByChapter: qs, ...base({ seen }) });
    expect(r.queue.every((q) => !(q.id in seen))).toBe(true);
    expect(r.explain.some((l) => /repeat/.test(l))).toBe(false);
  });

  it('counts a question seen 22 days ago as new', () => {
    const seen = Object.fromEntries(qs.A.map((q) => [q.id, NOW - 22 * DAY]));
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 5)], questionsByChapter: qs, ...base({ seen }) });
    expect(r.queue).toHaveLength(5);
    expect(r.explain.some((l) => /repeat/.test(l))).toBe(false);
  });

  it('relaxes the exclusion with a note when too few are new', () => {
    const seen = Object.fromEntries(qs.A.slice(0, 18).map((q, i) => [q.id, NOW - (i + 1) * DAY]));
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 5)], questionsByChapter: qs, ...base({ seen }) });
    expect(r.queue).toHaveLength(5);
    expect(r.queue.filter((q) => q.id in seen)).toHaveLength(3);
    expect(r.explain.join(' ')).toMatch(/only 2 new questions left, so 3 repeat/);
  });

  it('prefers a twin (same topic, different question) for fsrs_due', () => {
    // A_0.. have topics A.t0 / A.t1 alternating; the student saw A_1 (topic A.t1) before; the due topic is A.t1
    const seen = { A_1: NOW - 2 * DAY };
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 4, { kind: 'fsrs_due', topic: 'A.t1' })], questionsByChapter: { A: bank('A', 12) }, ...base({ seen }) });
    expect(r.queue).toHaveLength(4);
    expect(r.queue.map((q) => q.id)).not.toContain('A_1');
    expect(r.queue.every((q) => q.tax?.topics?.includes('A.t1'))).toBe(true);
    expect(r.explain.join(' ')).toMatch(/same idea as before/);
  });

  it('tops up with other questions when there are not enough twins', () => {
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 5, { kind: 'fsrs_due', topic: 'A.t1' })], questionsByChapter: { A: bank('A', 6) }, ...base() });
    expect(r.queue).toHaveLength(5);
  });

  it('picks near the target success rate when mastery is known', () => {
    const pool = bank('A', 30);
    const strong = buildTodayQueue({ tasks: [task('t1', 'A', 6, { target_p: 0.65 })], questionsByChapter: { A: pool }, ...base({ mastery: mastery('A', 2) }) });
    const weak = buildTodayQueue({ tasks: [task('t1', 'A', 6, { target_p: 0.65 })], questionsByChapter: { A: pool }, ...base({ mastery: mastery('A', -2) }) });
    const meanB = (q: Question[]) => q.reduce((a, x) => a + (x.difficulty?.b ?? 0), 0) / q.length;
    expect(meanB(strong.queue)).toBeGreaterThan(meanB(weak.queue));
  });

  it('spreads easy, medium and hard when there is no mastery data', () => {
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 9)], questionsByChapter: { A: bank('A', 30) }, ...base() });
    const labels = r.queue.map((q) => q.difficulty?.label);
    expect(labels.filter((l) => l === 'E')).toHaveLength(3);
    expect(labels.filter((l) => l === 'M')).toHaveLength(3);
    expect(labels.filter((l) => l === 'H')).toHaveLength(3);
    expect(labels.slice(0, 3)).toEqual(['E', 'E', 'E']);
  });

  it('estimates time from median_time_s, default 120 s', () => {
    const noTime = bank('A', 6, () => ({ difficulty: { label: 'M', b: 0 } }));
    const r = buildTodayQueue({ tasks: [task('t1', 'A', 6)], questionsByChapter: { A: noTime }, ...base() });
    expect(r.estMin).toBe(12);
    const r2 = buildTodayQueue({ tasks: [task('t1', 'B', 6)], questionsByChapter: { B: bank('B', 6) }, ...base() });
    expect(r2.estMin).toBe(6);
  });

  it('trims from the end to fit maxMinutes', () => {
    const r = buildTodayQueue({ tasks, questionsByChapter: qs, ...base({ maxMinutes: 10 }) });
    expect(r.estMin).toBeLessThanOrEqual(10);
    expect(r.sections[0]!.qids).toHaveLength(5); // the weak task is kept whole
    expect(r.explain.join(' ')).toMatch(/Trimmed/);
  });

  it('skips chapters without questions and says so', () => {
    const r = buildTodayQueue({ tasks, questionsByChapter: { A: qs.A }, names: { B: 'Optics' }, ...base() });
    expect(r.sections.map((s) => s.task.id)).toEqual(['t1']);
    expect(r.explain.join(' ')).toMatch(/Optics has no questions available yet/);
  });

  it('returns an empty queue (and says why) when nothing is available', () => {
    const r = buildTodayQueue({ tasks, questionsByChapter: {}, ...base() });
    expect(r.queue).toEqual([]);
    expect(r.estMin).toBe(0);
  });

  it('leaves out the student\'s own uploads, questions without an answer key, mocks and finished tasks', () => {
    const mixed = [...bank('A', 4), mkQ('u_1', { tax: { subject: 'PHY', chapter: 'A' } }), mkQ('noans', { answer: null, tax: { subject: 'PHY', chapter: 'A' } })];
    const r = buildTodayQueue({
      tasks: [task('t1', 'A', 10), task('m', '', 0, { kind: 'mock' }), task('d', 'B', 5, { status: 'done' }), task('x', 'B', 5, { kind: 'diagnostic' })],
      questionsByChapter: { A: mixed, B: bank('B', 5) },
      ...base(),
    });
    expect(r.queue.map((q) => q.id).sort()).toEqual(['A_0', 'A_1', 'A_2', 'A_3']);
    const withMine = buildTodayQueue({ tasks: [task('t1', 'A', 10)], questionsByChapter: { A: mixed }, includeMine: true, ...base() });
    expect(withMine.queue.map((q) => q.id)).toContain('u_1');
  });

  it('explains each section in words', () => {
    const r = buildTodayQueue({ tasks, questionsByChapter: qs, names: { A: 'Kinematics' }, ...base({ mastery: mastery('A', 0.5) }) });
    expect(r.explain[0]).toMatch(/15 questions across 3 topics, about \d+ min/);
    expect(r.explain.some((l) => l.startsWith('Kinematics: 5 questions, a topic that needs work'))).toBe(true);
  });
});

describe('completedTaskIds / seenMap', () => {
  it('ticks tasks whose chapter count is covered, consuming the count', () => {
    const qs = [...bank('A', 7), ...bank('B', 2)];
    const open = [task('t1', 'A', 5), task('t2', 'A', 5), task('t3', 'B', 3)];
    expect(completedTaskIds(open, qs)).toEqual(['t1']);
  });
  it('ignores done tasks and mocks', () => {
    expect(completedTaskIds([task('t1', 'A', 2, { status: 'done' }), task('m', '', 0, { kind: 'mock' })], bank('A', 5))).toEqual([]);
  });
  it('maps question ids to their latest session start', () => {
    const m = seenMap([{ startedAt: 5, qids: ['a', 'b'] }, { startedAt: 9, qids: ['a'] }, { startedAt: 3, events: [{ a: 'visit', q: 'c' }] }]);
    expect(m).toEqual({ a: 9, b: 5, c: 3 });
  });
});

describe('buildTodayQueue recall model', () => {
  const qs = bank('K', 30);
  const run = (recallModel?: 'elo' | 'learned') =>
    buildTodayQueue({ ...base({ mastery: mastery('K', 0.4) }), tasks: [task('t', 'K', 6)], questionsByChapter: { K: qs }, ...(recallModel ? { recallModel } : {}) }).queue.map((q) => q.id);

  it('elo model (explicit or default) is identical and never calls predictRecall', () => {
    const spy = vi.spyOn(core, 'predictRecall');
    const dflt = run();
    expect(run('elo')).toEqual(dflt);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it('learned model scores through predictRecall and can change the pick', () => {
    const spy = vi.spyOn(core, 'predictRecall').mockImplementation((_t, b) => 1 / (1 + Math.exp(-(-2 - b))));
    const learned = run('learned');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.every((c) => c[3]?.model === 'learned')).toBe(true);
    spy.mockRestore();
    expect(learned).not.toEqual(run('elo'));
  });
});
