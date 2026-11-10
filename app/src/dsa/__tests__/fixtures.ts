import type { Catalog, Problem } from '../catalog';

const mk = (n: number, t: string, d: Problem['d'], pat: string): Problem => ({
  n, t, d, tg: ['array'], pat, br: 'Try all pairs', bt: 'O(n^2)', bs: 'O(1)', ot: 'O(n)', os: 'O(1)', trick: 'Remember the complement', real: '', lang: 'py', chapter: 'ALG.ARR',
});

export const fakeCatalog = (): Catalog => ({
  version: 1,
  tracks: [
    { id: 'backend', name: 'Backend', focus: 'Hashing and graphs', ids: ['two-sum', 'valid-anagram', 'course-schedule'] },
    { id: 'ml', name: 'ML engineer', focus: 'Arrays and heaps', ids: ['two-sum', 'top-k'] },
  ],
  problems: {
    'two-sum': mk(1, 'Two Sum', 'E', 'Hash map'),
    'valid-anagram': mk(242, 'Valid Anagram', 'E', 'Hash map'),
    'course-schedule': mk(207, 'Course Schedule', 'M', 'Graph'),
    'top-k': mk(347, 'Top K Frequent', 'M', 'Heap'),
  },
});
