import { describe, expect, it } from 'vitest';
import { createMemoryGeneratedStore, isGeneratedId, paperCode, paperIdForSeed } from './generatedStore';

const rec = (id: string, createdAt: number) => ({ paperId: id, seed: 1, exam: 'JEE_MAIN', blueprintId: 'b', title: 't', paper: [], answers: { q: { keys: ['A'] } }, createdAt });

describe('generated paper store (in-memory adapter)', () => {
  it('saves, loads, lists newest first and removes', async () => {
    const s = createMemoryGeneratedStore();
    await s.put(rec('gen_0001', 1));
    await s.put(rec('gen_0002', 2));
    expect((await s.list()).map((r) => r.paperId)).toEqual(['gen_0002', 'gen_0001']);
    expect((await s.get('gen_0001'))?.answers).toEqual({ q: { keys: ['A'] } });
    await s.remove('gen_0001');
    expect(await s.get('gen_0001')).toBeNull();
  });
  it('ids and codes', () => {
    expect(paperIdForSeed(0xa4f2)).toBe('gen_a4f2');
    expect(paperCode('gen_a4f2')).toBe('A4F2');
    expect(paperCode(0xa4)).toBe('00A4');
    expect(isGeneratedId('gen_1')).toBe(true);
    expect(isGeneratedId('sample_jee_mini_v1')).toBe(false);
  });
});
