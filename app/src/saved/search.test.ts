import { describe, expect, it } from 'vitest';
import type { AiNote } from '../store/types';
import { damerauLevenshtein, scoreNote, searchNotes, stem, tokenMatch, tokenize } from './search';

const N = (over: Partial<AiNote> & { qid: string }): AiNote => ({ text: 'text', provider: 'claude', updatedAt: 1000, ...over });

describe('tokenize and stem', () => {
  it('lowercases, drops stop words and single letters, stems', () => {
    expect(tokenize('The Reflections of a Moving particle, and 2 forces!')).toEqual(['reflection', 'mov', 'particle', '2', 'force']);
  });
  it('joins common inflections', () => {
    expect(stem('reflecting')).toBe(stem('reflected'));
    expect(stem('batteries')).toBe('battery');
    expect(stem('forces')).toBe('force');
    expect(stem('mitosis')).toBe('mitosis');
    expect(stem('glass')).toBe('glass');
  });
  it('keeps non-Latin letters', () => {
    expect(tokenize('गति के नियम')).toContain('गति');
  });
});

describe('typo tolerance', () => {
  it('Damerau-Levenshtein handles substitution, insertion and transposition', () => {
    expect(damerauLevenshtein('motion', 'motion')).toBe(0);
    expect(damerauLevenshtein('motion', 'motoin')).toBe(1);
    expect(damerauLevenshtein('motion', 'mption')).toBe(1);
    expect(damerauLevenshtein('motion', 'motions')).toBe(1);
    expect(damerauLevenshtein('abc', 'xyz', 1)).toBeGreaterThan(1);
  });
  it('tokenMatch: exact > prefix > one typo (5+ letters only) > none', () => {
    expect(tokenMatch('motion', 'motion')).toBe(1);
    expect(tokenMatch('kinem', 'kinematic')).toBe(0.7);
    expect(tokenMatch('motoin', 'motion')).toBe(0.6);
    expect(tokenMatch('mat', 'cat')).toBe(0);
    expect(tokenMatch('cart', 'cat')).toBe(0);
  });
});

describe('searchNotes', () => {
  const ctx = { chapterNames: { 'PHY.LOM': 'Laws of Motion', 'BIO.CELL': 'Cell Division' }, topicNames: { 'PHY.LOM': ['Friction', 'Newton laws'] } };
  const a = N({ qid: 'q_a', chapter: 'PHY.LOM', stem: 'A block rests on a rough surface', text: 'Static friction balances the pull.', updatedAt: 1 });
  const b = N({ qid: 'q_b', chapter: 'BIO.CELL', stem: 'Which phase of mitosis', text: 'Chromosomes line up. Friction is not involved.', updatedAt: 2 });
  const c = N({ qid: 'q_c', text: 'Newton wrote the laws', updatedAt: 3 });

  it('returns everything, unchanged, for an empty query', () => {
    expect(searchNotes([a, b, c], '  ', ctx).map((n) => n.qid)).toEqual(['q_a', 'q_b', 'q_c']);
  });
  it('ranks chapter or topic hits above stem hits above note hits', () => {
    // "friction": topic of a's chapter (weight 3) beats a mention in b's note (weight 1)
    expect(searchNotes([b, a], 'friction', ctx).map((n) => n.qid)).toEqual(['q_a', 'q_b']);
  });
  it('matches by stem (plural/verb forms) and drops stop words', () => {
    expect(searchNotes([a, b, c], 'what are the laws', ctx).map((n) => n.qid)).toEqual(['q_a', 'q_c']);
  });
  it('tolerates one typo in a long word', () => {
    expect(searchNotes([a, b, c], 'mitoiss', ctx).map((n) => n.qid)).toEqual(['q_b']);
    expect(searchNotes([a, b, c], 'mitxxxx', ctx).map((n) => n.qid)).toEqual([]);
    expect(searchNotes([a, b, c], 'mitosis', ctx).map((n) => n.qid)).toEqual(['q_b']);
    expect(searchNotes([a, b, c], 'chromsomes', ctx).map((n) => n.qid)).toEqual(['q_b']);
    expect(searchNotes([a, b, c], 'frictoin', ctx).map((n) => n.qid)).toContain('q_a');
  });
  it('needs every word of a short query, most words of a long one', () => {
    expect(searchNotes([a, b, c], 'mitosis friction', ctx).map((n) => n.qid)).toEqual(['q_b']);
    expect(searchNotes([a, b, c], 'block rough surface zebra', ctx).map((n) => n.qid)).toEqual(['q_a']);
  });
  it('falls back to substring when the query has no usable words', () => {
    expect(searchNotes([a, b, c], 'q_c', ctx).map((n) => n.qid)).toEqual(['q_c']);
  });
  it('scoreNote is 0 for no match and breaks ties by newest in searchNotes', () => {
    expect(scoreNote(a, tokenize('zebra'), ctx)).toBe(0);
    const x = N({ qid: 'q_x', text: 'diffraction pattern', updatedAt: 5 });
    const y = N({ qid: 'q_y', text: 'diffraction pattern', updatedAt: 9 });
    expect(searchNotes([x, y], 'diffraction', ctx).map((n) => n.qid)).toEqual(['q_y', 'q_x']);
  });
});
