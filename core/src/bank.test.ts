import { describe, expect, it } from 'vitest';
import { latestSchema, manifestSchema, mockPaperSchema, shardSchema } from './bank';

const q = { id: 'q_1', type: 'SCQ', stem: 's', options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], answer: { keys: ['A'] }, solution: 'x' };

describe('bank schemas', () => {
  it('latest', () => {
    expect(latestSchema.safeParse({ version: 1 }).success).toBe(true);
    expect(latestSchema.safeParse({ version: 0 }).success).toBe(false);
  });
  it('manifest keeps unknown fields', () => {
    const m = manifestSchema.parse({ version: 1, files: [{ path: 'a', sha256: 'x', bytes: 1, kind: 'shard', extra: 1 }], qindex: { q_1: 'C' } });
    expect(m.files[0]).toHaveProperty('extra');
    expect(manifestSchema.safeParse({ version: 1 }).success).toBe(false);
  });
  it('shard needs valid questions; mock strips answers', () => {
    expect(shardSchema.safeParse([q]).success).toBe(true);
    expect(shardSchema.safeParse([{ id: 'x' }]).success).toBe(false);
    const p = mockPaperSchema.parse({ paperId: 'p', blueprint: 'b', title: 't', slots: ['q_1'], questions: [q] });
    expect(p.questions[0]).not.toHaveProperty('answer');
    expect(p.questions[0]).not.toHaveProperty('solution');
  });
});
