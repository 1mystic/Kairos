import { flattenSlots, resolveSubjects, type Blueprint, type Slot } from '../blueprint';
import { stripAnswer, type Answer, type PublicQuestion, type Question } from '../question';
import { chapterQuotas, quotaKey } from './quotas';
import { mulberry32, shuffle, softmaxSample, subSeed, type Rng } from './rng';

const DAY_MS = 86_400_000;

export interface GenHistory {
  /** qid -> last seen (epoch ms) */
  seen: Record<string, number>;
  /** qid -> number of mocks it has appeared in */
  exposure: Record<string, number>;
}

export interface GenOptions {
  /** weight of exposure count in the objective (default 0.05) */
  lambda?: number;
  /** weight of recency penalty (default 0.5) */
  mu?: number;
  /** questions with exposure above this are excluded (default 20) */
  maxExposure?: number;
  /** exclude questions seen within this many days (default 21) */
  seenDays?: number;
  /** max redraws when the TCC check fails (default 6) */
  maxRedraws?: number;
  /** annealing swaps (default 500) */
  annealSwaps?: number;
  /** absolute tolerance on expected avg p_correct vs target (default 0.05) */
  tccTol?: number;
  /** shuffle questions within each section (default true) */
  shuffleWithinSection?: boolean;
}

export interface GeneratePaperInput {
  blueprint: Blueprint;
  bank: Question[];
  /** chapterId -> weight (5-yr appearance share) */
  weights: Record<string, number>;
  /** histogram over p_correct bins (default: blueprint.difficulty_target.p_correct_hist, else uniform 5 bins) */
  difficultyTarget?: number[];
  history?: GenHistory;
  personalise?: { weakTopics: Record<string, number>; tilt: number };
  seed: number;
  now: number;
  options?: GenOptions;
}

export interface GeneratedPaper {
  slots: { slot: Slot; qid: string }[];
  /** same order as slots; answers stripped */
  paper: PublicQuestion[];
  /** qid -> answer, kept separate for client/worker grading */
  answers: Record<string, Answer | null>;
  /** expectedAvg: mean p_correct of selected questions; target: mean of the histogram; ok: |diff| <= tol */
  tcc: { expectedAvg: number; target: number; ok: boolean };
  redraws: number;
  /** sections for which seen/exposure exclusions had to be relaxed */
  relaxed: string[];
}

interface Cand {
  q: Question;
  id: string;
  ch: string;
  b: number;
  p: number;
  keys: string[];
  concepts: string[];
  weak: number;
  exposure: number;
  /** recency penalty in [0,2] */
  rec: number;
}

interface Section {
  key: string;
  slots: Slot[];
  pool: Cand[];
  relaxed: boolean;
}

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const logit = (p: number): number => Math.log(p / (1 - p));

function difficultyOf(q: Question): { b: number; p: number } {
  const d = q.difficulty;
  if (d?.b !== undefined) return { b: d.b, p: d.p_correct ?? 1 / (1 + Math.exp(d.b)) };
  if (d?.p_correct !== undefined) {
    const p = clamp(d.p_correct, 0.01, 0.99);
    return { b: -logit(p), p: d.p_correct };
  }
  return { b: 0, p: 0.5 };
}

/** Largest-remainder apportionment of `total` over `shares` (any non-negative scale). */
export function apportion(shares: number[], total: number): number[] {
  const s = shares.reduce((a, b) => a + b, 0);
  const ideal = shares.map((x) => (s > 0 ? (x / s) * total : total / shares.length));
  const out = ideal.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = ideal.map((_, i) => i).sort((i, j) => ideal[j]! - out[j]! - (ideal[i]! - out[i]!) || i - j);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length]!]!++;
  return out;
}

function buildSections(
  input: GeneratePaperInput,
  o: Required<GenOptions>,
  slots: Slot[],
): Section[] {
  const history = input.history ?? { seen: {}, exposure: {} };
  const weak = input.personalise?.weakTopics ?? {};
  const seenMs = o.seenDays * DAY_MS;
  const groups = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = quotaKey(s.subject, s.sectionId);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const toCand = (q: Question): Cand => {
    const { b, p } = difficultyOf(q);
    const keys: string[] = [];
    if (q.fingerprint?.simhash) keys.push('s:' + q.fingerprint.simhash);
    if (q.fingerprint?.emb_id) keys.push('e:' + q.fingerprint.emb_id);
    const last = history.seen[q.id];
    const age = last === undefined ? Infinity : input.now - last;
    const rec = age < seenMs ? 1 + (1 - age / seenMs) : Math.max(0, 1 - age / (90 * DAY_MS));
    return {
      q,
      id: q.id,
      ch: q.tax?.chapter ?? '_none',
      b,
      p,
      keys,
      concepts: q.tax?.concepts ?? [],
      weak: (q.tax?.topics ?? []).reduce((a, t) => a + (weak[t] ?? 0), 0),
      exposure: history.exposure[q.id] ?? 0,
      rec: Number.isFinite(rec) ? rec : 0,
    };
  };
  const out: Section[] = [];
  for (const [key, ss] of groups) {
    const first = ss[0]!;
    // a blueprint subject may be virtual (subject_map): draw across all its mapped taxonomy subjects
    const subjects = new Set(resolveSubjects(input.blueprint, first.subject));
    const typed = input.bank.filter(
      (q) =>
        q.status !== 'quarantined' && q.type === first.type && q.tax?.subject !== undefined && subjects.has(q.tax.subject),
    );
    const all = typed.map(toCand);
    const strict = all.filter((c) => {
      const last = history.seen[c.id];
      return c.exposure <= o.maxExposure && (last === undefined || input.now - last >= seenMs);
    });
    const relaxed = strict.length < ss.length;
    out.push({ key, slots: ss, pool: relaxed ? all : strict, relaxed });
  }
  return out;
}

interface Attempt {
  picks: Cand[][]; // per section, per slot-in-section
  dev: number;
  avg: number;
}

export function generatePaper(input: GeneratePaperInput): GeneratedPaper {
  const o: Required<GenOptions> = {
    lambda: 0.05,
    mu: 0.5,
    maxExposure: 20,
    seenDays: 21,
    maxRedraws: 6,
    annealSwaps: 500,
    tccTol: 0.05,
    shuffleWithinSection: true,
    ...input.options,
  };
  const hist =
    input.difficultyTarget ?? input.blueprint.difficulty_target?.p_correct_hist ?? [0.2, 0.2, 0.2, 0.2, 0.2];
  const nb = hist.length;
  const hsum = hist.reduce((a, b) => a + b, 0) || 1;
  const centre = (i: number): number => (i + 0.5) / nb;
  const target = hist.reduce((a, h, i) => a + h * centre(i), 0) / hsum;
  const btOf = (i: number): number => -logit(centre(i));

  const slots = flattenSlots(input.blueprint);
  const sections = buildSections(input, o, slots);
  for (const s of sections) {
    if (s.pool.length < s.slots.length)
      throw new Error(`generatePaper: bank has ${s.pool.length} questions for section ${s.key}, need ${s.slots.length}`);
  }
  const tilt = input.personalise ? clamp(input.personalise.tilt, 0.26, 0.29) : 0;
  const cost = (c: Cand, bt: number): number => Math.abs(c.b - bt) + o.lambda * c.exposure + o.mu * c.rec;

  const attempt = (rng: Rng): Attempt | null => {
    const usedId = new Set<string>();
    const used = new Set<string>(); // dedupe keys + concepts
    const keysOf = (c: Cand): string[] => [...c.keys, ...c.concepts.map((x) => 'c:' + x)];
    const conflict = (c: Cand): boolean => usedId.has(c.id) || keysOf(c).some((k) => used.has(k));
    const take = (c: Cand): void => {
      usedId.add(c.id);
      keysOf(c).forEach((k) => used.add(k));
    };
    const drop = (c: Cand): void => {
      usedId.delete(c.id);
      keysOf(c).forEach((k) => used.delete(k));
    };
    const total = slots.length;
    const weakTotal = Math.ceil(tilt * total); // ceil keeps the realised share inside 25-30% despite per-section shortfalls
    const weakAlloc = apportion(
      sections.map((s) => s.slots.length),
      weakTotal,
    );
    const bts: number[][] = [];
    const picks: Cand[][] = [];
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si]!;
      const n = sec.slots.length;
      const bands = shuffle(
        apportion(hist, n).flatMap((cnt, bi) => Array<number>(cnt).fill(bi)),
        rng,
      );
      const bt = bands.map(btOf);
      bts.push(bt);
      const capacity: Record<string, number> = {};
      for (const c of sec.pool) capacity[c.ch] = (capacity[c.ch] ?? 0) + 1;
      let qw = input.weights;
      if (tilt > 0) {
        // personalised: shift chapter mass toward chapters holding weak-topic questions so the
        // weak slots can be filled without breaking the (reshaped) quotas
        const weakCh = new Set(sec.pool.filter((c) => c.weak > 0).map((c) => c.ch));
        const norm = Object.keys(capacity).map((c) => Math.max(input.weights[c] ?? 0, 1e-3));
        const tot = norm.reduce((a, b) => a + b, 0);
        const chs = Object.keys(capacity);
        const wMass = chs.reduce((a, c, i) => a + (weakCh.has(c) ? norm[i]! / tot : 0), 0);
        const want = Math.max(wMass, Math.min(0.6, tilt * 1.7));
        qw = {};
        chs.forEach((c, i) => {
          const share = norm[i]! / tot;
          qw[c] = weakCh.has(c) ? (share / (wMass || 1)) * want : (share / (1 - wMass || 1)) * (1 - want);
        });
      }
      const quota = chapterQuotas({ count: n, weights: qw, capacity, rng });
      const picked: Record<string, number> = {};
      const weakCap = Math.min(weakAlloc[si]!, sec.pool.filter((c) => c.weak > 0).length);
      const weakSlot = new Set(shuffle([...Array(n).keys()], rng).slice(0, weakCap));
      // weak slots first so weak chapters' quota is not consumed by ordinary slots
      const order = [...Array(n).keys()].sort(
        (i, j) =>
          Number(weakSlot.has(j)) - Number(weakSlot.has(i)) || Math.abs(bt[j]!) - Math.abs(bt[i]!) || i - j,
      );
      const sp: (Cand | undefined)[] = Array<Cand | undefined>(n).fill(undefined);
      for (const i of order) {
        const isWeak = weakSlot.has(i);
        const tiers: ((c: Cand) => boolean)[] = [
          (c) => quota[c.ch]! > 0 && (isWeak ? c.weak > 0 : c.weak === 0),
          (c) => quota[c.ch]! > 0,
          (c) => (picked[c.ch] ?? 0) < (quota[c.ch] ?? 0) + 1,
        ];
        let cands: Cand[] = [];
        for (const t of tiers) {
          cands = sec.pool.filter((c) => !conflict(c) && t(c));
          if (cands.length) break;
        }
        if (!cands.length) return null;
        const score = (c: Cand): number => cost(c, bt[i]!) - (isWeak ? 0.2 * Math.min(1, c.weak) : 0);
        const top = cands
          .map((c) => ({ c, s: score(c) + rng() * 0.05 }))
          .sort((a, b) => a.s - b.s)
          .slice(0, 6);
        const ch = top[softmaxSample(top.map((t) => -t.s), 0.15, rng)]!.c;
        sp[i] = ch;
        take(ch);
        quota[ch.ch] = (quota[ch.ch] ?? 0) - 1;
        picked[ch.ch] = (picked[ch.ch] ?? 0) + 1;
      }
      picks.push(sp as Cand[]);
    }

    // annealing: same-chapter replacement, or swap two slots in a section
    const byCh = sections.map((sec) => {
      const m = new Map<string, Cand[]>();
      for (const c of sec.pool) m.set(c.ch, [...(m.get(c.ch) ?? []), c]);
      return m;
    });
    const energyOf = (ps: Cand[][]): number =>
      ps.reduce((a, sp, si) => a + sp.reduce((b, c, i) => b + cost(c, bts[si]![i]!), 0), 0);
    let energy = energyOf(picks);
    let best = picks.map((p) => p.slice());
    let bestE = energy;
    for (let it = 0; it < o.annealSwaps; it++) {
      const temp = 0.5 * (1 - it / o.annealSwaps) + 0.01;
      const si = Math.floor(rng() * sections.length);
      const n = picks[si]!.length;
      const i = Math.floor(rng() * n);
      const old = picks[si]![i]!;
      if (rng() < 0.6) {
        const opts = byCh[si]!.get(old.ch)!;
        const c = opts[Math.floor(rng() * opts.length)]!;
        if (c === old || (c.weak > 0) !== (old.weak > 0)) continue;
        drop(old);
        if (conflict(c)) {
          take(old);
          continue;
        }
        const d = cost(c, bts[si]![i]!) - cost(old, bts[si]![i]!);
        if (d <= 0 || rng() < Math.exp(-d / temp)) {
          take(c);
          picks[si]![i] = c;
          energy += d;
        } else take(old);
      } else {
        const j = Math.floor(rng() * n);
        if (j === i) continue;
        const other = picks[si]![j]!;
        const bt = bts[si]!;
        const d = cost(old, bt[j]!) + cost(other, bt[i]!) - cost(old, bt[i]!) - cost(other, bt[j]!);
        if (d <= 0 || rng() < Math.exp(-d / temp)) {
          picks[si]![i] = other;
          picks[si]![j] = old;
          energy += d;
        }
      }
      if (energy < bestE - 1e-12) {
        bestE = energy;
        best = picks.map((p) => p.slice());
      }
    }
    const fin = best;
    const all = fin.flat();
    const avg = all.reduce((a, c) => a + c.p, 0) / all.length;
    return { picks: fin, dev: Math.abs(avg - target), avg };
  };

  let bestA: { a: Attempt; k: number } | null = null;
  let tries = 0;
  for (let k = 0; k <= o.maxRedraws; k++) {
    tries = k;
    const a = attempt(mulberry32(subSeed(input.seed, k)));
    if (a && (!bestA || a.dev < bestA.a.dev)) bestA = { a, k };
    if (a && a.dev <= o.tccTol) break;
  }
  if (!bestA) throw new Error('generatePaper: no feasible paper under the hard constraints');
  const rng = mulberry32(subSeed(input.seed, 10_000 + bestA.k));
  const outSlots: { slot: Slot; qid: string }[] = [];
  const paper: PublicQuestion[] = [];
  const answers: Record<string, Answer | null> = {};
  sections.forEach((sec, si) => {
    const ps = o.shuffleWithinSection ? shuffle(bestA!.a.picks[si]!, rng) : bestA!.a.picks[si]!;
    sec.slots.forEach((slot, i) => {
      const c = ps[i]!;
      outSlots.push({ slot, qid: c.id });
      paper.push(stripAnswer(c.q));
      answers[c.id] = c.q.answer ?? null;
    });
  });
  return {
    slots: outSlots,
    paper,
    answers,
    tcc: { expectedAvg: bestA.a.avg, target, ok: bestA.a.dev <= o.tccTol },
    redraws: tries,
    relaxed: sections.filter((s) => s.relaxed).map((s) => s.key),
  };
}
