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

describe('image schema', () => {
  const id = '0123456789abcdef';
  const id2 = 'fedcba9876543210';
  const im = (o: object = {}) => ({ id, w: 659, h: 300, alt: 'a diagram', variants: [480, 659], ...o });
  const img = (alt = 'a diagram', i = id) => `![${alt}](img:${i})`;
  const withImg = (o: object = {}) => ({ type: 'SCQ', stem: `see ${img()}`, images: [im()], ...o });
  it('accepts real variant widths (not just 960)', () => {
    expect(ok(withImg())).toBe(true);
    expect(ok(withImg({ images: [im({ w: 480, variants: [480] })] }))).toBe(true);
  });
  it('rejects bad image entries', () => {
    for (const bad of [
      { id: 'XYZ' },
      { w: 960 },
      { w: 0, variants: [0] },
      { h: 0 },
      { alt: '' },
      { alt: '  ' },
      { variants: [] },
      { variants: [480, 480, 659] },
      { variants: [-1, 659] },
      { extra: 1 },
    ])
      expect(ok(withImg({ images: [im(bad)] }))).toBe(false);
    expect(ok(withImg({ images: ['0123456789abcdef'] }))).toBe(false);
  });
  it('requires refs and declarations to agree (stem, options, solution)', () => {
    expect(ok(withImg({ images: [] }))).toBe(false); // referenced, undeclared
    expect(ok(withImg({ stem: 'no image' }))).toBe(false); // declared, unreferenced
    expect(ok(withImg({ stem: 's', solution: img() }))).toBe(true);
    expect(
      ok(withImg({ stem: 's', options: [{ key: 'A', text: img() }, { key: 'B', text: 'x' }] })),
    ).toBe(true);
    expect(ok(withImg({ images: [im(), im({ id: id2 })] }))).toBe(false);
    expect(ok(withImg({ images: [im(), im()] }))).toBe(false); // duplicate
    expect(ok(withImg({ stem: 's', passage: img() }))).toBe(true);
  });
  it('rejects other image syntaxes and blank markdown alt', () => {
    for (const stem of [
      '![x](http://e.com/a.png)',
      '![x](/img/a.png)',
      '![x](img:ABC)',
      '![x][ref]',
      `![](img:${id})`,
    ])
      expect(ok({ type: 'SCQ', stem, images: [im()] })).toBe(false);
  });
  it('public questions are checked too', () => {
    expect(publicQuestionSchema.safeParse({ ...base, ...withImg() }).success).toBe(true);
    expect(publicQuestionSchema.safeParse({ ...base, ...withImg({ images: [] }) }).success).toBe(false);
  });
});
