import { describe, expect, it } from 'vitest';
import { flattenSlots } from '../blueprint';
import { chapterQuotas, computeQuotas } from './quotas';
import { dirichlet, gamma, mulberry32, sample, shuffle, softmaxSample, subSeed } from './rng';
import { apportion, generatePaper } from './select';
import { diagnosticSummary, nextDiagnosticItem, updateTheta, type Answered, type ChapterTheta } from './diagnostic';
import { predictScore } from './predict';
import { jeeBlueprint, syntheticBank, syntheticWeights, SUBJECTS } from './testbank.test-util';

const bp = jeeBlueprint();
const bank = syntheticBank();
const weights = syntheticWeights();
const now = 1_800_000_000_000;
const DAY = 86_400_000;

describe('rng', () => {
  it('mulberry32 is deterministic and in [0,1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x >= 0 && x < 1).toBe(true);
    }
    expect(mulberry32(8)()).not.toBe(mulberry32(7)());
    expect(subSeed(1, 0)).not.toBe(subSeed(1, 1));
  });
  it('shuffle / sample', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const s = shuffle(xs, mulberry32(1));
    expect([...s].sort()).toEqual(xs);
    expect(xs).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(sample(xs, 3, mulberry32(2))).size).toBe(3);
    expect(sample(xs, 99, mulberry32(2))).toHaveLength(8);
    expect(sample(xs, -1, mulberry32(2))).toHaveLength(0);
  });
  it('gamma mean ~ shape (incl. shape<1); dirichlet sums to 1', () => {
    const r = mulberry32(3);
    for (const k of [0.4, 2, 9]) {
      let t = 0;
      for (let i = 0; i < 4000; i++) t += gamma(k, r);
      expect(t / 4000).toBeGreaterThan(k * 0.9);
      expect(t / 4000).toBeLessThan(k * 1.1);
    }
    const d = dirichlet([5, 10, 35], r);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it('softmaxSample prefers high scores; throws on empty', () => {
    const r = mulberry32(4);
    let hi = 0;
    for (let i = 0; i < 500; i++) if (softmaxSample([0, 5], 1, r) === 1) hi++;
    expect(hi).toBeGreaterThan(450);
    expect(softmaxSample([1, 1, 1], 1e-9, () => 0.9999999)).toBeLessThan(3);
    expect(softmaxSample([1, 2], 1, () => 1)).toBe(1);
    expect(() => softmaxSample([], 1, r)).toThrow();
  });
});

describe('quotas', () => {
  it('sum exactly to count over many seeds and track weights', () => {
    const cap: Record<string, number> = {};
    for (let c = 0; c < 10; c++) cap[`c${c}`] = 15;
    const w: Record<string, number> = {};
    for (let c = 0; c < 10; c++) w[`c${c}`] = c + 1;
    const sums = Array<number>(10).fill(0);
    for (let s = 0; s < 200; s++) {
      const q = chapterQuotas({ count: 20, weights: w, capacity: cap, rng: mulberry32(s) });
      expect(Object.values(q).reduce((a, b) => a + b, 0)).toBe(20);
      for (let c = 0; c < 10; c++) sums[c]! += q[`c${c}`]!;
    }
    expect(sums[9]).toBeGreaterThan(sums[0]!);
  });
  it('redistributes when capacity is short and handles degenerate input', () => {
    const q = chapterQuotas({
      count: 10,
      weights: { a: 100, b: 1, c: 1 },
      capacity: { a: 2, b: 5, c: 5, z: 0 },
      rng: mulberry32(1),
    });
    expect(q.a).toBeLessThanOrEqual(2);
    expect(q.z).toBe(0);
    expect(q.a! + q.b! + q.c!).toBe(10);
    const over = chapterQuotas({ count: 50, weights: {}, capacity: { a: 3, b: 4 }, rng: mulberry32(1) });
    expect(over).toEqual({ a: 3, b: 4 });
    expect(chapterQuotas({ count: 5, weights: {}, capacity: {}, rng: mulberry32(1) })).toEqual({});
    expect(chapterQuotas({ count: 0, weights: {}, capacity: { a: 1 }, rng: mulberry32(1) })).toEqual({ a: 0 });
  });
  it('computeQuotas covers every subject x section', () => {
    const slots = flattenSlots(bp);
    const q = computeQuotas({
      slots,
      weights,
      rng: mulberry32(1),
      capacity: (subj) => Object.fromEntries(Array.from({ length: 10 }, (_, c) => [`${subj}-ch${c}`, 15])),
    });
    expect(Object.keys(q)).toHaveLength(6);
    expect(Object.values(q['PHY:A']!).reduce((a, b) => a + b, 0)).toBe(20);
    expect(Object.values(q['MAT:B']!).reduce((a, b) => a + b, 0)).toBe(5);
  });
  it('apportion sums exactly (incl. zero shares)', () => {
    expect(apportion([1, 1, 1], 10).reduce((a, b) => a + b, 0)).toBe(10);
    expect(apportion([0, 0], 3).reduce((a, b) => a + b, 0)).toBe(3);
  });
});

const byId = new Map(bank.map((q) => [q.id, q]));

describe('generatePaper', () => {
  it('hard constraints hold across 200 seeds', () => {
    const slots = flattenSlots(bp);
    let tccOk = 0;
    for (let seed = 0; seed < 200; seed++) {
      const g = generatePaper({ blueprint: bp, bank, weights, seed, now });
      expect(g.slots).toHaveLength(slots.length);
      expect(g.paper).toHaveLength(slots.length);
      const ids = g.slots.map((s) => s.qid);
      expect(new Set(ids).size).toBe(ids.length);
      const clusters = new Set<string>();
      const concepts = new Set<string>();
      const chCount: Record<string, number> = {};
      g.slots.forEach(({ slot, qid }, i) => {
        const q = byId.get(qid)!;
        expect(slot.index).toBe(i);
        expect(q.type).toBe(slot.type);
        expect(q.tax!.subject).toBe(slot.subject);
        expect(clusters.has(q.fingerprint!.simhash!)).toBe(false);
        clusters.add(q.fingerprint!.simhash!);
        for (const c of q.tax!.concepts!) {
          expect(concepts.has(c)).toBe(false);
          concepts.add(c);
        }
        const k = `${slot.subject}:${slot.sectionId}:${q.tax!.chapter}`;
        chCount[k] = (chCount[k] ?? 0) + 1;
        expect('answer' in g.paper[i]!).toBe(false);
        expect(g.answers[qid]).toEqual(q.answer);
      });
      if (g.tcc.ok) tccOk++;
      expect(Math.abs(g.tcc.expectedAvg - g.tcc.target) <= 0.05).toBe(g.tcc.ok);
    }
    expect(tccOk).toBe(200);
  });

  it('quota stays near the Dirichlet draw (chapter counts sum per section)', () => {
    const g = generatePaper({ blueprint: bp, bank, weights, seed: 5, now });
    const sec: Record<string, number> = {};
    for (const { slot, qid } of g.slots) {
      const k = `${slot.subject}:${slot.sectionId}`;
      sec[k] = (sec[k] ?? 0) + 1;
      expect(byId.get(qid)!.tax!.subject).toBe(slot.subject);
    }
    expect(sec['PHY:A']).toBe(20);
    expect(sec['CHE:B']).toBe(5);
  });

  it('same seed -> identical; different seed -> differs', () => {
    const a = generatePaper({ blueprint: bp, bank, weights, seed: 11, now });
    const b = generatePaper({ blueprint: bp, bank, weights, seed: 11, now });
    const c = generatePaper({ blueprint: bp, bank, weights, seed: 12, now });
    expect(a.slots.map((s) => s.qid)).toEqual(b.slots.map((s) => s.qid));
    expect(a.slots.map((s) => s.qid)).not.toEqual(c.slots.map((s) => s.qid));
  });

  it('section order follows the blueprint; shuffle can be disabled', () => {
    const g = generatePaper({ blueprint: bp, bank, weights, seed: 3, now, options: { shuffleWithinSection: false } });
    expect(g.slots.map((s) => s.slot.subject).slice(0, 25).every((s) => s === 'PHY')).toBe(true);
    expect(g.slots[20]!.slot.sectionId).toBe('B');
  });

  it('excludes recently seen and over-exposed questions; prefers fresh', () => {
    const seen: Record<string, number> = {};
    const exposure: Record<string, number> = {};
    for (const q of bank) {
      const n = Number(q.id.split('-')[2]);
      if (n % 2 === 0) seen[q.id] = now - 5 * DAY;
      else if (n % 5 === 1) exposure[q.id] = 99;
    }
    for (let seed = 0; seed < 20; seed++) {
      const g = generatePaper({ blueprint: bp, bank, weights, seed, now, history: { seen, exposure } });
      for (const { qid } of g.slots) {
        expect(seen[qid]).toBeUndefined();
        expect(exposure[qid]).toBeUndefined();
      }
      expect(g.relaxed).toEqual([]);
    }
  });

  it('relaxes exclusions when the pool is too small instead of failing', () => {
    const seen = Object.fromEntries(bank.map((q) => [q.id, now - DAY]));
    const g = generatePaper({ blueprint: bp, bank, weights, seed: 1, now, history: { seen, exposure: {} } });
    expect(g.relaxed).toHaveLength(6);
    expect(g.slots).toHaveLength(75);
  });

  it('throws if the bank lacks questions for a section; quarantined excluded', () => {
    const small = bank.filter((q) => q.type === 'SCQ');
    expect(() => generatePaper({ blueprint: bp, bank: small, weights, seed: 1, now })).toThrow(/need 5/);
    const quarantined = bank.map((q) => ({ ...q, status: 'quarantined' as const }));
    expect(() => generatePaper({ blueprint: bp, bank: quarantined, weights, seed: 1, now })).toThrow();
  });

  it('throws when constraints are infeasible (all one concept)', () => {
    const bad = bank.map((q) => ({ ...q, tax: { ...q.tax!, concepts: ['same'] } }));
    expect(() =>
      generatePaper({ blueprint: bp, bank: bad, weights, seed: 1, now, options: { maxRedraws: 1 } }),
    ).toThrow(/feasible/);
  });

  it('uses emb_id clusters and tolerates questions with no fingerprint/difficulty/chapter', () => {
    const odd = bank.map((q, i) => ({
      ...q,
      fingerprint: i % 3 === 0 ? { emb_id: `e${Math.floor(i / 6)}` } : undefined,
      difficulty: i % 4 === 0 ? undefined : i % 4 === 1 ? { p_correct: 0.4 } : i % 4 === 2 ? { b: 0.3 } : q.difficulty,
      tax: i % 7 === 0 ? { subject: q.tax!.subject } : q.tax,
    }));
    const g = generatePaper({ blueprint: bp, bank: odd, weights, seed: 2, now });
    const emb = g.slots.map((s) => odd.find((q) => q.id === s.qid)!.fingerprint?.emb_id).filter(Boolean);
    expect(new Set(emb).size).toBe(emb.length);
  });

  it('flags TCC out of tolerance when target is unreachable and reports redraws', () => {
    const g = generatePaper({
      blueprint: bp,
      bank,
      weights,
      seed: 1,
      now,
      difficultyTarget: [0, 0, 0, 0, 1],
      options: { tccTol: 0.001, maxRedraws: 2 },
    });
    expect(g.tcc.ok).toBe(false);
    expect(g.redraws).toBe(2);
    expect(g.tcc.target).toBeCloseTo(0.9, 10);
  });

  it('uses uniform difficulty when no target is given', () => {
    const noTarget = { ...bp, difficulty_target: undefined };
    const g = generatePaper({ blueprint: noTarget, bank, weights, seed: 1, now });
    expect(g.tcc.target).toBeCloseTo(0.5, 10);
  });

  it('personalised tilt: 25-30% weak-topic slots, counts unchanged', () => {
    const weakTopics: Record<string, number> = {};
    for (const s of SUBJECTS) for (let c = 0; c < 10; c += 2) weakTopics[`${s}-ch${c}-t0`] = 1;
    for (const tilt of [0.1, 0.275, 0.9]) {
      for (let seed = 0; seed < 30; seed++) {
        const g = generatePaper({
          blueprint: bp,
          bank,
          weights,
          seed,
          now,
          personalise: { weakTopics, tilt },
        });
        const weak = g.slots.filter((s) =>
          byId.get(s.qid)!.tax!.topics!.some((t) => weakTopics[t]),
        ).length;
        const share = weak / g.slots.length;
        expect(share).toBeGreaterThanOrEqual(0.25);
        expect(share).toBeLessThanOrEqual(0.31);
        expect(g.slots).toHaveLength(75);
      }
    }
  });
});

describe('diagnostic', () => {
  const studied = ['PHY-ch0', 'PHY-ch1', 'PHY-ch2', 'CHE-ch0'];
  const run = (correctFn: (qid: string) => boolean, budget?: number) => {
    const answered: Answered[] = [];
    const theta: Record<string, ChapterTheta> = {};
    const order: string[] = [];
    for (let i = 0; i < 100; i++) {
      const nx = nextDiagnosticItem({ studiedChapters: studied, bank, answered, theta, timeBudgetS: budget });
      if (nx.done) return { answered, order, reason: nx.reason };
      order.push(nx.chapter);
      answered.push({ qid: nx.qid, correct: correctFn(nx.qid) });
      Object.assign(theta, diagnosticSummary({ studiedChapters: studied, bank, answered }));
    }
    throw new Error('did not stop');
  };
  it('covers each studied chapter twice, rotating, then stops', () => {
    const r = run(() => true);
    expect(r.reason).toBe('covered');
    expect(r.answered).toHaveLength(8);
    expect(r.order.slice(0, 4)).toEqual(studied);
    for (const ch of studied) expect(r.order.filter((c) => c === ch)).toHaveLength(2);
  });
  it('stops on the time budget', () => {
    const r = run(() => false, 150);
    expect(r.reason).toBe('time');
    expect(r.answered.length).toBeLessThan(8);
  });
  it('picks max-information item (closest to theta) and reports exhaustion', () => {
    const nx = nextDiagnosticItem({ studiedChapters: ['PHY-ch0'], bank, answered: [], theta: { 'PHY-ch0': { θ: 1.5, rd: 1 } } });
    if (nx.done) throw new Error('x');
    const pool = bank.filter((q) => q.tax!.chapter === 'PHY-ch0');
    const dist = (q: (typeof bank)[number]) => Math.abs(1.5 - q.difficulty!.b!);
    expect(dist(nx.question)).toBe(Math.min(...pool.map(dist)));
    const all = pool.map((q) => ({ qid: q.id, correct: true }));
    const ex = nextDiagnosticItem({ studiedChapters: ['PHY-ch0'], bank, answered: all, theta: {}, perChapter: 99, timeBudgetS: 1e9 });
    expect(ex).toEqual({ done: true, reason: 'exhausted' });
    expect(nextDiagnosticItem({ studiedChapters: [], bank, answered: [], theta: {} })).toEqual({ done: true, reason: 'covered' });
  });
  it('handles missing difficulty and unknown qids in answered', () => {
    const q = { ...bank[0]!, id: 'nodiff', difficulty: undefined };
    const q2 = { ...bank[1]!, id: 'pc', difficulty: { p_correct: 0.3 } };
    const s = diagnosticSummary({
      studiedChapters: ['PHY-ch0'],
      bank: [q, q2, { ...bank[2]!, id: 'other', tax: { subject: 'PHY', chapter: 'zzz' } }],
      answered: [
        { qid: 'nodiff', correct: true },
        { qid: 'pc', correct: false },
        { qid: 'ghost', correct: true },
        { qid: 'other', correct: true },
      ],
    });
    expect(s['PHY-ch0']!.n).toBe(2);
  });
  it('summary: right answers raise theta, wrong lower it, rd shrinks', () => {
    const q = bank.find((x) => x.tax!.chapter === 'PHY-ch0')!;
    const up = diagnosticSummary({ studiedChapters: ['PHY-ch0', 'PHY-ch1'], bank, answered: [{ qid: q.id, correct: true }] });
    const dn = diagnosticSummary({ studiedChapters: ['PHY-ch0'], bank, answered: [{ qid: q.id, correct: false }] });
    expect(up['PHY-ch0']!.θ).toBeGreaterThan(0);
    expect(dn['PHY-ch0']!.θ).toBeLessThan(0);
    expect(up['PHY-ch0']!.rd).toBeLessThan(1.5);
    expect(up['PHY-ch1']).toEqual({ θ: 0, rd: 1.5, n: 0 });
    expect(updateTheta({ θ: 0, rd: 1 }, 0, true).θ).toBeGreaterThan(0);
  });
});

describe('predictScore', () => {
  const args = { blueprint: bp, bank, weights, sims: 60, seed: 9 };
  it('is deterministic and ordered', () => {
    const a = predictScore({ ...args, theta: () => 0.5 });
    const b = predictScore({ ...args, theta: () => 0.5 });
    expect(a).toEqual(b);
    expect(a.p25).toBeLessThanOrEqual(a.p50);
    expect(a.p50).toBeLessThanOrEqual(a.p75);
  });
  it('is monotone in theta and bounded by max marks / blank', () => {
    const means = [-3, -1, 0, 1, 3].map((t) => predictScore({ ...args, theta: () => t }).mean);
    for (let i = 1; i < means.length; i++) expect(means[i]!).toBeGreaterThan(means[i - 1]!);
    expect(means[0]!).toBeGreaterThanOrEqual(0);
    expect(means[4]!).toBeLessThanOrEqual(300);
  });
  it('uses topic, chapter or subject keys and defaults to 500 sims', () => {
    const seen = new Set<string>();
    const r = predictScore({
      blueprint: bp,
      bank: bank.map((q, i) => ({
        ...q,
        tax: i % 2 ? { subject: q.tax!.subject } : { subject: q.tax!.subject, chapter: q.tax!.chapter },
        difficulty: i % 3 ? undefined : { p_correct: 0.5 },
      })),
      weights,
      seed: 1,
      sims: 12,
      theta: (k) => (seen.add(k), 0),
    });
    expect(Number.isFinite(r.mean)).toBe(true);
    expect(seen.size).toBeGreaterThan(0);
    const d = predictScore({ blueprint: bp, bank, weights, seed: 1, theta: () => 0 });
    expect(Number.isFinite(d.p50)).toBe(true);
    expect(predictScore({ ...args, sims: 1, theta: () => 0 }).p25).toBeDefined();
  });
});
