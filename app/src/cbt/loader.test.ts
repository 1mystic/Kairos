import { afterEach, describe, expect, it } from 'vitest';
import { parseBlueprint, stripAnswer } from '@kairos/core';
import { createMemoryGeneratedStore, setGeneratedStore } from '../diagnostic/generatedStore';
import { mkQ } from '../practice/fixtures.test-util';
import { loadGeneratedExamData } from './loader';

const bp = parseBlueprint({
  id: 'bp_gen',
  exam: 'JEE_MAIN',
  mode: 'CBT',
  duration_min: 30,
  ui_skin: 'x',
  subjects: [{ code: 'PHY', sections: [{ id: 'A', type: 'SCQ', count: 2, marks: { correct: 4, wrong: -1, blank: 0 } }] }],
  time_slots: ['09:00'],
});
const qs = [mkQ('g1'), mkQ('g2')];

afterEach(() => setGeneratedStore(undefined));

describe('gen_ papers in the exam loader', () => {
  it('loads paper, answers and blueprint from kairos-generated instead of the bank', async () => {
    const store = createMemoryGeneratedStore();
    setGeneratedStore(store);
    await store.put({
      paperId: 'gen_00a4',
      seed: 0xa4,
      exam: 'JEE_MAIN',
      blueprintId: 'bp_gen',
      blueprint: bp,
      title: 'Mock #00A4',
      paper: qs.map(stripAnswer),
      answers: { g1: { keys: ['B'] }, g2: { keys: ['B'] } },
      createdAt: 1,
    });
    const d = await loadGeneratedExamData('gen_00a4');
    expect(d.model.slots.map((s) => s.qid)).toEqual(['g1', 'g2']);
    expect(d.model.durationMs).toBe(30 * 60_000);
    expect(d.model.exam).toBe('JEE_MAIN');
    const a = await d.loadAnswers();
    expect(a?.get('g1')?.answer).toEqual({ keys: ['B'] });
  });

  it('reports a missing paper in plain words', async () => {
    setGeneratedStore(createMemoryGeneratedStore());
    await expect(loadGeneratedExamData('gen_dead')).rejects.toThrow(/not on this device/);
  });
});
