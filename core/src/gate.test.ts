import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBlueprint, flattenSlots, totalQuestions, maxMarks, resolveSubjects } from './blueprint';
import { parseQuestion, type Question } from './question';
import { evaluateResponse, roundMarks, scorePaper, sectionKey, type PaperResponse } from './scoring';
import { generatePaper } from './gen/select';

const gate = parseBlueprint(
  JSON.parse(readFileSync(new URL('../../content/blueprints/gate_da_2027.json', import.meta.url), 'utf8')),
);
const MAPPED = ['PRS', 'LA', 'CO', 'PDS', 'DBW', 'ML', 'AI'];
const opts = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: key }));

function gateBank(): Question[] {
  const out: Question[] = [];
  let n = 0;
  const add = (subject: string, ch: number, type: 'SCQ' | 'MSQ' | 'NVQ', count: number): void => {
    for (let i = 0; i < count; i++) {
      const id = `${subject}-${ch}-${type}-${i}`;
      const p = 0.2 + ((n * 37) % 60) / 100;
      out.push({
        id,
        type,
        stem: id,
        options: type === 'NVQ' ? undefined : opts,
        answer: type === 'SCQ' ? { keys: ['A'] } : type === 'MSQ' ? { keys: ['A', 'B'] } : { range: [2, 3] },
        solution: 's',
        tax: { subject, chapter: `${subject}.C${ch}`, topics: [`${subject}.C${ch}.t`], concepts: [`k${n}`] },
        difficulty: { p_correct: p, b: -Math.log(p / (1 - p)), median_time_s: 90 },
        fingerprint: { simhash: `h${n}` },
      } as Question);
      n++;
    }
  };
  for (let c = 0; c < 2; c++) add('GA', c, 'SCQ', 10);
  for (const s of MAPPED) {
    for (let c = 0; c < 2; c++) {
      add(s, c, 'SCQ', 8);
      add(s, c, 'MSQ', 4);
      add(s, c, 'NVQ', 4);
    }
  }
  return out;
}

describe('GATE DA blueprint', () => {
  it('totals and structure', () => {
    expect(totalQuestions(gate)).toBe(65);
    expect(maxMarks(gate)).toBe(100);
    const slots = flattenSlots(gate);
    expect(slots).toHaveLength(65);
    expect(slots.map((s) => s.sectionId).filter((x, i, a) => a.indexOf(x) === i)).toEqual([
      'GA1', 'GA2', 'T1M-MCQ', 'T1M-MSQ', 'T1M-NAT', 'T2M-MCQ', 'T2M-MSQ', 'T2M-NAT',
    ]);
    expect(slots[10]).toMatchObject({ subject: 'DA', sectionId: 'T1M-MCQ', type: 'SCQ' });
    expect(slots[64]).toMatchObject({ sectionId: 'T2M-NAT', type: 'NVQ', index: 64 });
  });

  it('resolveSubjects', () => {
    expect(resolveSubjects(gate, 'DA')).toEqual(MAPPED);
    expect(resolveSubjects(gate, 'GA')).toEqual(['GA']);
    expect(resolveSubjects(gate, 'OTHER')).toEqual(['OTHER']);
  });

  it('stores 6 d.p. negative marks', () => {
    const m = gate.subjects[0]!.sections.map((s) => s.marks.wrong);
    expect(m).toEqual([-0.333333, -0.666667]);
  });

  it('generatePaper fills all 65 slots across the mapped subjects', () => {
    const bank = gateBank();
    const g = generatePaper({ blueprint: gate, bank, weights: {}, seed: 11, now: 1_800_000_000_000 });
    expect(g.slots).toHaveLength(65);
    const byId = new Map(bank.map((q) => [q.id, q]));
    const ids = g.slots.map((s) => s.qid);
    expect(new Set(ids).size).toBe(65);
    for (const { slot, qid } of g.slots) {
      const q = byId.get(qid)!;
      expect(q.type).toBe(slot.type);
      const allowed = slot.subject === 'DA' ? MAPPED : ['GA'];
      expect(allowed).toContain(q.tax!.subject);
    }
    const da = g.slots.filter((s) => s.slot.subject === 'DA').map((s) => byId.get(s.qid)!.tax!.subject);
    expect(da).toHaveLength(55);
    expect(new Set(da).size).toBeGreaterThanOrEqual(4); // spread over the mapped subjects
    expect(g.slots.filter((s) => s.slot.marks.correct === 2)).toHaveLength(35);
  });

  it('a mapped subject with no matching questions fails clearly', () => {
    const bank = gateBank().filter((q) => q.tax!.subject === 'GA');
    expect(() => generatePaper({ blueprint: gate, bank, weights: {}, seed: 1, now: 0 })).toThrow(/DA:/);
  });
});

describe('GATE scoring', () => {
  const slots = flattenSlots(gate);
  const questions: Question[] = slots.map((s, i) =>
    parseQuestion({
      id: `g${i}`,
      type: s.type,
      stem: 's',
      options: s.type === 'NVQ' ? undefined : opts,
      answer: s.type === 'SCQ' ? { keys: ['A'] } : s.type === 'MSQ' ? { keys: ['A', 'B'] } : { range: [2, 3] },
    }),
  );
  const ans = (answer: PaperResponse['answer']): PaperResponse => ({ answer, status: 'answered' });
  const idx = (id: string, k = 0): number => slots.findIndex((s) => s.sectionId === id) + k;

  it('perfect paper is exactly 100', () => {
    const rs = slots.map((s) =>
      ans(s.type === 'SCQ' ? { keys: ['A'] } : s.type === 'MSQ' ? { keys: ['B', 'A'] } : { value: '2.5' }),
    );
    const r = scorePaper(gate, questions, rs);
    expect(r.marks).toBe(100);
    expect(r.max).toBe(100);
    expect(r.correct).toBe(65);
  });

  it('all MCQ wrong gives -1/3 and -2/3 without drift', () => {
    const rs = slots.map((s) => ans(s.type === 'SCQ' ? { keys: ['B'] } : null));
    const r = scorePaper(gate, questions, rs);
    expect(r.bySection[sectionKey('GA', 'GA1')]!.marks).toBe(-1.67);
    expect(r.bySection[sectionKey('GA', 'GA2')]!.marks).toBe(-3.33);
    expect(r.bySubject.DA!.marks).toBe(-11.33);
    expect(r.marks).toBe(-16.33);
    expect(r.wrong).toBe(33);
  });

  it('mixed hand-built responses', () => {
    const rs: (PaperResponse | null)[] = slots.map(() => null);
    for (let k = 0; k < 2; k++) rs[idx('GA1', k)] = ans({ keys: ['A'] });
    for (let k = 2; k < 5; k++) rs[idx('GA1', k)] = ans({ keys: ['C'] }); // 2 - 0.999999
    for (let k = 0; k < 2; k++) rs[idx('GA2', k)] = ans({ keys: ['A'] });
    for (let k = 2; k < 5; k++) rs[idx('GA2', k)] = ans({ keys: ['D'] }); // 4 - 2.000001
    rs[idx('T1M-MSQ', 0)] = ans({ keys: ['A', 'B'] }); // +1
    rs[idx('T1M-MSQ', 1)] = ans({ keys: ['A'] }); // wrong, no negative
    rs[idx('T1M-MSQ', 2)] = ans({ keys: ['A', 'B', 'C'] }); // wrong, no negative
    rs[idx('T1M-NAT', 0)] = ans({ value: '2.5' });
    rs[idx('T1M-NAT', 1)] = ans({ value: 3 });
    rs[idx('T1M-NAT', 2)] = ans({ value: '3.01' }); // wrong, no negative
    rs[idx('T2M-MSQ', 0)] = ans({ keys: ['B', 'A'] }); // +2
    rs[idx('T2M-NAT', 0)] = ans({ value: '2.999' }); // +2
    const r = scorePaper(gate, questions, rs);
    expect(r.bySubject.GA!.marks).toBe(3);
    expect(r.bySection[sectionKey('DA', 'T1M-MSQ')]).toMatchObject({ marks: 1, correct: 1, wrong: 2 });
    expect(r.bySection[sectionKey('DA', 'T1M-NAT')]).toMatchObject({ marks: 2, correct: 2, wrong: 1 });
    expect(r.marks).toBe(10);
  });
});

describe('GATE question types', () => {
  const mk = (type: string, answer: unknown): Question =>
    parseQuestion({ id: 'q', type, stem: 's', options: type === 'NVQ' ? undefined : opts, answer });
  it('NVQ range accepts decimal strings and bounds', () => {
    const q = mk('NVQ', { range: [0.34, 0.36] });
    expect(evaluateResponse(q, { value: '0.35' })).toBe('correct');
    expect(evaluateResponse(q, { value: '0.34' })).toBe('correct');
    expect(evaluateResponse(q, { value: '0.361' })).toBe('wrong');
    expect(evaluateResponse(q, { value: '-0.35' })).toBe('wrong');
    expect(evaluateResponse(q, { value: '' })).toBe('blank');
  });
  it('NVQ {value,tol}', () => {
    const q = mk('NVQ', { value: 1.5, tol: 0.05 });
    expect(evaluateResponse(q, { value: '1.54' })).toBe('correct');
    expect(evaluateResponse(q, { value: '1.56' })).toBe('wrong');
  });
  it('MSQ exact set only', () => {
    const q = mk('MSQ', { keys: ['A', 'C'] });
    expect(evaluateResponse(q, { keys: ['C', 'A'] })).toBe('correct');
    expect(evaluateResponse(q, { keys: ['A'] })).toBe('wrong');
    expect(evaluateResponse(q, { keys: ['A', 'B', 'C'] })).toBe('wrong');
  });
});

describe('roundMarks', () => {
  it('rounds to 2 d.p., no -0, integers unchanged', () => {
    expect(roundMarks(99.999999)).toBe(100);
    expect(roundMarks(-0.333333)).toBe(-0.33);
    expect(roundMarks(-16.333333)).toBe(-16.33);
    expect(roundMarks(-0.000001)).toBe(0);
    expect(Object.is(roundMarks(-0.000001), 0)).toBe(true);
    expect(roundMarks(300)).toBe(300);
    expect(roundMarks(-45)).toBe(-45);
  });
});
