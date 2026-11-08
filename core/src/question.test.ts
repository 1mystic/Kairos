import { describe, it, expect } from 'vitest';
import { parseQuestion, stripAnswer, questionSchema, publicQuestionSchema } from './question';

const opts = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: key }));
const base = { id: 'q1', stem: 's $x$', options: opts };
const ok = (o: object) => questionSchema.safeParse({ ...base, ...o }).success;

describe('question schema', () => {
  it('accepts valid SCQ and strips answers', () => {
    const q = parseQuestion({
      ...base,
      type: 'SCQ',
      answer: { keys: ['B'] },
      solution: 'sol',
      solution_source: 'official',
    });
    const p = stripAnswer(q);
    expect(p).not.toHaveProperty('answer');
    expect(p).not.toHaveProperty('solution');
    expect(p).not.toHaveProperty('solution_source');
    expect(p.id).toBe('q1');
    expect(publicQuestionSchema.safeParse({ ...base, type: 'SCQ' }).success).toBe(true);
  });
  it('allows missing / null answer (mock shards)', () => {
    expect(ok({ type: 'SCQ' })).toBe(true);
    expect(ok({ type: 'SCQ', answer: null })).toBe(true);
  });
  it('SCQ needs exactly 1 key, in options', () => {
    expect(ok({ type: 'SCQ', answer: { keys: ['A', 'B'] } })).toBe(false);
    expect(ok({ type: 'SCQ', answer: { keys: ['Z'] } })).toBe(false);
    expect(ok({ type: 'SCQ', answer: { value: 2 } })).toBe(false);
    expect(ok({ type: 'ASSERT_REASON', answer: { keys: ['C'] } })).toBe(true);
  });
  it('MSQ allows several keys, all in options', () => {
    expect(ok({ type: 'MSQ', answer: { keys: ['A', 'C'] } })).toBe(true);
    expect(ok({ type: 'MSQ', answer: { keys: ['A', 'Q'] } })).toBe(false);
  });
  it('NVQ/INT need numeric answers', () => {
    expect(ok({ type: 'NVQ', answer: { keys: ['A'] } })).toBe(false);
    expect(ok({ type: 'NVQ', answer: { value: 2.5, tol: 0.01 } })).toBe(true);
    expect(ok({ type: 'NVQ', answer: { range: [2.4, 2.6] } })).toBe(true);
    expect(ok({ type: 'NVQ', answer: { range: [2.6, 2.4] } })).toBe(false);
    expect(ok({ type: 'INT', answer: { value: 4 } })).toBe(true);
    expect(ok({ type: 'INT', answer: { value: 4.5 } })).toBe(false);
    expect(ok({ type: 'INT', answer: { range: [1, 2] } })).toBe(true);
  });
  it('PARA_CHILD / MATCH accept any variant', () => {
    expect(ok({ type: 'PARA_CHILD', answer: { value: 3 } })).toBe(true);
    expect(ok({ type: 'MATCH', answer: { keys: ['A'] } })).toBe(true);
  });
});
