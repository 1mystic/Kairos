import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBlueprint, flattenSlots } from './blueprint';
import { parseQuestion, type Question } from './question';
import {
  evaluateResponse,
  evaluateDetailed,
  scorePaper,
  jeeAdvancedPartial,
  allOrNothing,
  sectionKey,
  type PaperResponse,
} from './scoring';

const opts = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: key }));
const mk = (type: string, answer: unknown): Question =>
  parseQuestion({ id: 'q', type, stem: 's', options: opts, answer });
const keys = (...k: string[]) => ({ keys: k });

describe('evaluateResponse', () => {
  it('SCQ', () => {
    const q = mk('SCQ', keys('B'));
    expect(evaluateResponse(q, keys('B'))).toBe('correct');
    expect(evaluateResponse(q, keys('C'))).toBe('wrong');
    expect(evaluateResponse(q, keys())).toBe('blank');
    expect(evaluateResponse(q, null)).toBe('blank');
    expect(evaluateResponse(q, undefined)).toBe('blank');
    expect(evaluateResponse(q, { value: 2 })).toBe('wrong');
  });
  it('throws without answer', () => {
    const q = parseQuestion({ id: 'q', type: 'SCQ', stem: 's', options: opts });
    expect(() => evaluateResponse(q, keys('A'))).toThrow();
  });
  it('NVQ tolerance and range', () => {
    const t = mk('NVQ', { value: 2.5, tol: 0.01 });
    expect(evaluateResponse(t, { value: '2.51' })).toBe('correct');
    expect(evaluateResponse(t, { value: 2.49 })).toBe('correct');
    expect(evaluateResponse(t, { value: '2.52' })).toBe('wrong');
    expect(evaluateResponse(t, { value: 'abc' })).toBe('wrong');
    expect(evaluateResponse(t, { value: '  ' })).toBe('blank');
    expect(evaluateResponse(t, keys())).toBe('blank');
    expect(evaluateResponse(t, keys('A'))).toBe('wrong');
    const noTol = mk('NVQ', { value: 3 });
    expect(evaluateResponse(noTol, { value: 3 })).toBe('correct');
    expect(evaluateResponse(noTol, { value: 3.1 })).toBe('wrong');
    const r = mk('NVQ', { range: [2.4, 2.6] });
    expect(evaluateResponse(r, { value: 2.4 })).toBe('correct');
    expect(evaluateResponse(r, { value: 2.6 })).toBe('correct');
    expect(evaluateResponse(r, { value: 2.61 })).toBe('wrong');
  });
  it('INT is exact', () => {
    const q = mk('INT', { value: 4, tol: 0.5 });
    expect(evaluateResponse(q, { value: 4 })).toBe('correct');
    expect(evaluateResponse(q, { value: 4.2 })).toBe('wrong');
  });
  it('MSQ hooks', () => {
    const q = mk('MSQ', keys('A', 'C'));
    expect(evaluateResponse(q, keys('C', 'A'))).toBe('correct');
    expect(evaluateResponse(q, keys('A'))).toBe('wrong');
    expect(evaluateResponse(q, keys('A'), { msq: allOrNothing })).toBe('wrong');
    expect(evaluateResponse(q, keys('A'), { msq: jeeAdvancedPartial })).toBe('partial');
    expect(evaluateDetailed(q, keys('A'), { msq: jeeAdvancedPartial }).partialMarks).toBe(1);
    expect(evaluateResponse(q, keys('A', 'B'), { msq: jeeAdvancedPartial })).toBe('wrong');
    expect(evaluateResponse(q, keys('A', 'C'), { msq: jeeAdvancedPartial })).toBe('correct');
    const custom = { msq: () => ({ verdict: 'partial' as const }) };
    expect(evaluateDetailed(q, keys('A'), custom).partialMarks).toBe(0);
  });
});

describe('scorePaper', () => {
  const bp = parseBlueprint(
    JSON.parse(
      readFileSync(
        new URL('../../content/blueprints/jee_main_2026_p1.json', import.meta.url),
        'utf8',
      ),
    ),
  );
  const slots = flattenSlots(bp);
  const questions = slots.map((s) =>
    s.type === 'NVQ' ? mk('NVQ', { value: 7 }) : mk('SCQ', keys('A')),
  );
  const ans = (
    a: PaperResponse['answer'],
    status: PaperResponse['status'] = 'answered',
  ): PaperResponse => ({
    answer: a,
    status,
  });

  it('scores a mixed paper per subject/section', () => {
    const responses: PaperResponse[] = slots.map(() => ans(null, 'not_answered'));
    responses[0] = ans(keys('A')); // PHY A correct +4
    responses[1] = ans(keys('B')); // PHY A wrong -1
    responses[20] = ans({ value: '7' }, 'answered_marked'); // PHY B correct +4
    responses[21] = ans({ value: 8 }); // PHY B wrong -1
    responses[25] = ans(keys('A')); // CHE A correct +4
    const r = scorePaper(bp, questions, responses);
    expect(r.max).toBe(300);
    expect(r.marks).toBe(10);
    expect(r).toMatchObject({ correct: 3, wrong: 2, blank: 70, partial: 0 });
    expect(r.bySubject.PHY).toMatchObject({ marks: 6, correct: 2, wrong: 2, blank: 21 });
    expect(r.bySubject.CHE!.marks).toBe(4);
    expect(r.bySubject.MAT!.marks).toBe(0);
    expect(r.bySection[sectionKey('PHY', 'B')]).toMatchObject({
      marks: 3,
      correct: 1,
      wrong: 1,
      blank: 3,
    });
  });

  it('ignores marked-without-answer and unsaved states', () => {
    const responses: PaperResponse[] = slots.map(() => ans(null, 'not_answered'));
    responses[0] = ans(keys('A'), 'marked');
    responses[1] = ans(keys('A'), 'not_answered');
    responses[2] = ans(keys('A'), 'not_visited');
    const r = scorePaper(bp, questions, responses);
    expect(r.marks).toBe(0);
    expect(r.blank).toBe(75);
  });

  it('handles missing questions/responses and partial marks', () => {
    const adv = parseBlueprint({
      id: 'adv',
      exam: 'JEE_ADV',
      mode: 'CBT',
      duration_min: 180,
      ui_skin: 'x',
      subjects: [
        {
          code: 'PHY',
          sections: [
            { id: 'A', type: 'MSQ', count: 2, marks: { correct: 4, wrong: -2, blank: 0 } },
          ],
        },
      ],
      time_slots: [],
    });
    const qs = [mk('MSQ', keys('A', 'B', 'C')), undefined];
    const r = scorePaper(adv, qs, [ans(keys('A', 'B')), ans(keys('A'))], {
      msq: jeeAdvancedPartial,
    });
    expect(r).toMatchObject({ marks: 2, partial: 1, blank: 1, max: 8 });
    const r2 = scorePaper(adv, qs, [undefined]);
    expect(r2.marks).toBe(0);
  });
});
