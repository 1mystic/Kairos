import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parseBlueprint, totalQuestions, maxMarks, sectionFor, flattenSlots } from './blueprint';

const dir = new URL('../../content/blueprints/', import.meta.url);
const load = (f: string) => parseBlueprint(JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

describe('blueprints', () => {
  it('parses every real blueprint file', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) expect(() => load(f)).not.toThrow();
  });

  it.each([
    ['jee_main_2026_p1.json', 75, 300],
    ['neet_ug_2027.json', 180, 720],
    ['iat_2026.json', 60, 240],
  ])('%s totals', (f, q, m) => {
    const b = load(f);
    expect(totalQuestions(b)).toBe(q);
    expect(maxMarks(b)).toBe(m);
    expect(flattenSlots(b)).toHaveLength(q);
  });

  it('keeps unknown _verify/_note keys', () => {
    const b = load('neet_ug_2027.json');
    expect((b as Record<string, unknown>)._verify).toBeTypeOf('string');
  });

  it('sectionFor finds sections', () => {
    const b = load('jee_main_2026_p1.json');
    expect(sectionFor(b, 'PHY', 'B')?.type).toBe('NVQ');
    expect(sectionFor(b, 'PHY', 'Z')).toBeUndefined();
    expect(sectionFor(b, 'XXX', 'A')).toBeUndefined();
  });

  it('flattenSlots orders subjects then sections', () => {
    const b = load('jee_main_2026_p1.json');
    const s = flattenSlots(b);
    expect(s[0]).toMatchObject({
      subject: 'PHY',
      sectionId: 'A',
      type: 'SCQ',
      index: 0,
      sectionIndex: 0,
    });
    expect(s[19]).toMatchObject({ sectionId: 'A', sectionIndex: 19 });
    expect(s[20]).toMatchObject({ subject: 'PHY', sectionId: 'B', type: 'NVQ', sectionIndex: 0 });
    expect(s[25]).toMatchObject({ subject: 'CHE', sectionId: 'A' });
    expect(s[74]).toMatchObject({ subject: 'MAT', sectionId: 'B', index: 74 });
    expect(s[0]!.marks).toEqual({ correct: 4, wrong: -1, blank: 0 });
  });

  it('rejects invalid blueprints', () => {
    expect(() => parseBlueprint({ id: 'x' })).toThrow();
  });
});
