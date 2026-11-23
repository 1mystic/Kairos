import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { allPolicies, chapterOrderPolicy, compareToBaselines, difficultyOnlyPolicy, fixedRoundRobinPolicy, METRICS, SIM_ATTEMPT_COLUMNS, weakestFirstPolicy, expectedScore, hashSeed, makeWorld, mergeResults, normal, pairedDiff, plannerPolicy, randomPolicy, runSim, simulateStudent, summarize } from './index';
import { logit } from './util';

describe('rng', () => {
  it('mulberry32 is deterministic, uniform-ish and in [0,1)', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    const xs = Array.from({ length: 2000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 2000 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    expect(xs.reduce((s, x) => s + x, 0) / xs.length).toBeCloseTo(0.5, 1);
    expect(mulberry32(6)()).not.toBe(xs[0]);
  });
  it('hashSeed differs by input; normal has ~0 mean and ~1 sd', () => {
    expect(hashSeed(1, 'a')).not.toBe(hashSeed(1, 'b'));
    expect(hashSeed(1, 'a')).toBe(hashSeed(1, 'a'));
    const r = mulberry32(1);
    const xs = Array.from({ length: 4000 }, () => normal(r));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
    expect(m).toBeCloseTo(0, 1);
    expect(sd).toBeCloseTo(1, 1);
    expect(logit(0.5)).toBeCloseTo(0, 9);
  });
});

describe('world', () => {
  it('3 subjects x 8 chapters x 4 topics, weights sum to 1, deterministic', () => {
    const w = makeWorld();
    expect(w.topics).toHaveLength(96);
    expect(w.topics.reduce((a, t) => a + t.weight, 0)).toBeCloseTo(1, 9);
    expect(makeWorld().topics[5]!.bank).toEqual(w.topics[5]!.bank);
    expect(makeWorld({ seed: 8 }).topics[5]!.bank).not.toEqual(w.topics[5]!.bank);
    expect(w.topics[0]!.bank).toEqual([...w.topics[0]!.bank].sort((a, b) => a - b));
    expect(w.topics[0]!.questions[0]!.tax?.topics).toEqual([w.topics[0]!.id]);
  });
  it('expected score increases with ability', () => {
    const w = makeWorld();
    expect(expectedScore(w, () => 1)).toBeGreaterThan(expectedScore(w, () => 0));
    expect(expectedScore(w, () => -4)).toBeLessThan(0);
  });
});

describe('simulateStudent', () => {
  const mk = (seed = 1) => simulateStudent({ trueTheta: { a: 0, b: 0 }, learningRate: 0.03, forgetting: 10, seed });
  const bs = Array.from({ length: 12 }, () => 0);

  it('answers with P = sigmoid(theta - b)', () => {
    const s = mk();
    const out = s.practice('a', 0, [-2, 0, 2]);
    expect(out[0]!.p).toBeCloseTo(1 / (1 + Math.exp(-2)), 6);
    expect(out[1]!.p).toBeGreaterThan(0.45);
    expect(out[2]!.p).toBeLessThan(out[1]!.p);
    let hits = 0;
    const s2 = simulateStudent({ trueTheta: { a: 3 }, learningRate: 0, forgetting: 10, seed: 3 });
    for (const o of s2.practice('a', 0, Array.from({ length: 400 }, () => 0))) hits += o.correct ? 1 : 0;
    expect(hits / 400).toBeGreaterThan(0.9);
  });

  it('learns from practice, saturating', () => {
    const s = mk();
    const t0 = s.thetaAt('a', 0);
    s.practice('a', 0, bs);
    const t1 = s.thetaAt('a', 0);
    s.practice('a', 0, bs);
    const t2 = s.thetaAt('a', 0);
    for (let i = 0; i < 40; i++) s.practice('a', 0, bs);
    const tEnd = s.thetaAt('a', 0);
    expect(t1).toBeGreaterThan(t0);
    expect(t2 - t1).toBeLessThan(t1 - t0 + 1e-9);
    expect(tEnd).toBeLessThanOrEqual(3 + 1e-6);
    expect(s.exposures('a')).toBe(12 * 42);
    expect(s.thetaAt('b', 0)).toBe(0);
  });

  it('forgets over time; spaced review keeps more than massed practice', () => {
    const s = mk();
    s.practice('a', 0, bs);
    const fresh = s.thetaAt('a', 0);
    expect(s.thetaAt('a', 30)).toBeLessThan(fresh - 0.3);
    expect(s.thetaAt('a', 1000)).toBeCloseTo(0, 3);

    const spaced = mk();
    const massed = mk();
    for (const d of [0, 6, 14, 30]) spaced.practice('a', d, bs);
    for (const d of [0, 0, 0, 0]) massed.practice('a', d, bs);
    expect(spaced.thetaAt('a', 60)).toBeGreaterThan(massed.thetaAt('a', 60));
  });

  it('is deterministic per seed; unknown topics throw; empty practice is a no-op', () => {
    const run = (seed: number) => mk(seed).practice('a', 0, bs).map((o) => o.correct).join('');
    expect(run(4)).toBe(run(4));
    expect(() => mk().thetaAt('zzz', 0)).toThrow();
    const s = mk();
    expect(s.practice('a', 3, [])).toEqual([]);
    expect(s.exposures('a')).toBe(0);
  });
});

describe('stats', () => {
  it('pairedDiff: CI and one-sided p', () => {
    const a = Array.from({ length: 100 }, (_, i) => 10 + (i % 7));
    const b = a.map((x, i) => x - 2 - (i % 3) * 0.1);
    const d = pairedDiff(a, b);
    expect(d.mean).toBeGreaterThan(2);
    expect(d.ci95[0]).toBeGreaterThan(0);
    expect(d.p).toBeLessThan(0.001);
    const same = pairedDiff(a, a);
    expect(same.mean).toBe(0);
    expect(same.p).toBeCloseTo(0.5, 6);
    expect(pairedDiff(b, a).p).toBeGreaterThan(0.99);
    expect(pairedDiff([1], [0]).p).toBeLessThanOrEqual(0.5);
    expect(pairedDiff([1, 2], [0, 1]).p).toBeLessThan(1e-9);
  });
});

describe('validation harness', () => {
  it('is deterministic and batches merge to the same result', () => {
    const cfg = { students: 3, days: 20, seed: 7 };
    const a = runSim(cfg);
    expect(runSim(cfg)).toEqual(a);
    const merged = mergeResults([runSim({ ...cfg, students: 2 }), runSim({ ...cfg, students: 1, firstStudent: 2 })]);
    expect(merged).toEqual(a);
    expect(a.policies).toEqual(['planner', 'random', 'chapter_order']);
    expect(mergeResults([]).policies).toEqual([]);
  });

  it('policies use the same students (paired) and all produce non-trivial gains', () => {
    const r = runSim({ students: 4, days: 30, seed: 3, policies: [randomPolicy, chapterOrderPolicy, plannerPolicy({ name: 'p2' })] });
    expect(r.policies).toEqual(['random', 'chapter_order', 'p2']);
    for (const p of r.policies) for (const g of r.gains[p]!) expect(g).toBeGreaterThan(0);
  });

  it('mini-sim (120 students): planner beats random and chapter-order, 95% CI above 0', () => {
    const res = compareToBaselines({ students: 120, days: 45, seed: 11 });
    expect(res.students).toBe(120);
    expect(res.plannerGain).toBeGreaterThan(res.randomGain);
    expect(res.plannerGain).toBeGreaterThan(res.chapterOrderGain);
    expect(res.vsRandom.ci95[0]).toBeGreaterThan(0);
    expect(res.vsChapterOrder.ci95[0]).toBeGreaterThan(0);
    expect(res.pValuePaired).toBeLessThan(0.05);
    expect(res.passes).toBe(true);
  }, 25_000);

  it('summarize flags a failing planner', () => {
    const res = summarize({ policies: ['planner', 'random', 'chapter_order'], gains: { planner: [1, 1, 1, 2], random: [2, 2, 2, 3], chapter_order: [0, 0, 0, 0] }, metrics: {} });
    expect(res.passes).toBe(false);
  });
});

describe('baseline policies (Phase A)', () => {
  it('every policy runs, is deterministic, stays within budget and reports all metrics', () => {
    const cfg = { students: 2, days: 25, seed: 5, policies: allPolicies() };
    const a = runSim(cfg);
    expect(runSim(cfg)).toEqual(a);
    expect(a.policies).toEqual(['random', 'fixed_round_robin', 'difficulty_only', 'weakest_first', 'chapter_order', 'planner']);
    for (const p of a.policies) {
      for (const m of METRICS) expect(a.metrics[p]![m]).toHaveLength(2);
      for (const g of a.gains[p]!) expect(g).toBeGreaterThan(0);
      for (const r of a.metrics[p]!.retention) expect(r).toBeGreaterThan(0);
      for (const r of a.metrics[p]!.retention) expect(r).toBeLessThanOrEqual(1);
      for (const w of a.metrics[p]!.wastedMin) expect(w).toBeLessThanOrEqual(a.metrics[p]!.practiceMin[0]! + a.metrics[p]!.practiceMin[1]!);
    }
    // all policies get the same minutes (paired design): practice minutes within 15% of random
    const base = a.metrics.random!.practiceMin[0]!;
    for (const p of [fixedRoundRobinPolicy, difficultyOnlyPolicy, weakestFirstPolicy]) expect(Math.abs(a.metrics[p.name]!.practiceMin[0]! - base) / base).toBeLessThan(0.15);
  });

  it('fixed round robin cycles every topic; weakest first concentrates on few topics', () => {
    const w = makeWorld();
    const seen = new Set<string>();
    const inst = fixedRoundRobinPolicy.start(w, []);
    const ctx = { day: 0, date: '2026-01-05', schedule: [], sched: { date: '2026-01-05', daysLeft: 50, kind: 'work', phase: 'build', capacityMin: 180 }, budgetMin: 180, fu: 1, mastery: {}, world: w, rng: mulberry32(1), seed: 1, examId: 'jee' } as const;
    for (let d = 0; d < 20; d++) for (const t of inst.plan({ ...ctx, day: d })) seen.add(t.topic);
    expect(seen.size).toBe(w.topics.length);
    const wk = weakestFirstPolicy.start(w, []).plan({ ...ctx, mastery: { [w.topics[3]!.id]: { θ: -2, rd: 0.5, n: 5, last: 0, S: 1, D: 5, due: 0, err_mix: {}, reps: 1, lapses: 0, st: 2 } } });
    expect(wk[0]!.topic).toBe(w.topics[3]!.id);
    expect(difficultyOnlyPolicy.start(w, []).plan(ctx).every((t) => t.targetP === 0.5)).toBe(true);
  });

  it('emits the attempt table with consistent bookkeeping', () => {
    const rows: Array<Record<string, unknown>> = [];
    runSim({ students: 1, days: 12, seed: 2, policies: [plannerPolicy()], onAttempt: (r) => rows.push(r as unknown as Record<string, unknown>) });
    expect(rows.length).toBeGreaterThan(50);
    expect(Object.keys(rows[0]!).sort()).toEqual([...SIM_ATTEMPT_COLUMNS].sort());
    const byTopic = new Map<string, number>();
    for (const r of rows) {
      const t = r.topic as string;
      expect(r.prior_n_topic).toBe(byTopic.get(t) ?? 0);
      byTopic.set(t, (byTopic.get(t) ?? 0) + 1);
      if (r.prior_n_topic === 0) expect(r.days_since_last_topic).toBe(-1);
      expect(r.fsrs_r as number).toBeGreaterThan(0);
      expect(r.fsrs_r as number).toBeLessThanOrEqual(1);
    }
    expect(rows.some((r) => (r.k_in_session as number) > 0)).toBe(true);
    expect(rows.some((r) => (r.elo_n as number) > 0)).toBe(true);
  });
});


describe('learned recall in the sim', () => {
  it('a planner using the learned model picks items by predicted P and runs deterministically', () => {
    const p = plannerPolicy({ name: 'pl', recall: 'learned', config: { recallModel: 'learned', priorityMode: 'uncertainty' } });
    const cfg = { students: 2, days: 20, seed: 4, policies: [p, plannerPolicy()] };
    const a = runSim(cfg);
    expect(runSim(cfg)).toEqual(a);
    expect(p.recall).toBe('learned');
    for (const g of a.gains.pl!) expect(g).toBeGreaterThan(0);
    expect(a.gains.pl).not.toEqual(a.gains.planner);
  });
});
