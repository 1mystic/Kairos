import { bFromPCorrect, pCorrect, type Question } from '@kairos/core';
import { mulberry32, seededShuffle } from './rng';

export type Band = 'E' | 'M' | 'H';
export const SESSION_SIZES = [10, 20, 30] as const;
export const RECENCY_DAYS = 21;
export const TARGET_P = 0.65;

/** Difficulty band of a question: label first, then b, then p_correct, else medium. */
export function bandOf(q: Question): Band {
  const d = q.difficulty;
  const l = d?.label?.trim().toUpperCase().charAt(0);
  if (l === 'E' || l === 'M' || l === 'H') return l;
  const b = d?.b ?? (d?.p_correct !== undefined ? bFromPCorrect(d.p_correct) : undefined);
  if (b === undefined) return 'M';
  return b < -0.5 ? 'E' : b > 0.5 ? 'H' : 'M';
}

/** Item difficulty b (logit scale). */
export function bOf(q: Question): number {
  const d = q.difficulty;
  if (d?.b !== undefined) return d.b;
  if (d?.p_correct !== undefined) return bFromPCorrect(d.p_correct);
  return { E: -0.9, M: 0.1, H: 1.1 }[bandOf(q)];
}

export interface QueueOptions {
  size: number;
  seed: number;
  /** question ids seen in the recency window */
  seen?: ReadonlySet<string>;
  /** learner ability for the topic mix; undefined = no data, use an E->M->H spread */
  theta?: number;
  bands?: ReadonlySet<Band>;
}

export interface Queue {
  questions: Question[];
  /** how many had to be reused from the recency window because the pool ran short */
  repeats: number;
}

/**
 * Practice queue. Questions without an answer key cannot be checked, so they are dropped.
 * Recently seen questions are excluded unless that would leave fewer than `size`
 * (then the shortfall is filled from them and counted in `repeats`).
 */
export function buildQueue(pool: readonly Question[], o: QueueOptions): Queue {
  const rng = mulberry32(o.seed);
  const usable = pool.filter(
    (q) => !!q.answer && (!o.bands || o.bands.size === 0 || o.bands.has(bandOf(q))),
  );
  const seen = o.seen ?? new Set<string>();
  const fresh = usable.filter((q) => !seen.has(q.id));
  const stale = usable.filter((q) => seen.has(q.id));
  const size = Math.max(0, o.size);

  const pick = (from: Question[], n: number): Question[] => {
    if (from.length <= n) return order(seededShuffle(from, rng), o.theta);
    const shuffled = seededShuffle(from, rng);
    if (o.theta !== undefined) {
      const theta = o.theta;
      const scored = shuffled
        .map((q) => ({ q, s: Math.abs(pCorrect(theta, bOf(q)) - TARGET_P) + rng() * 0.08 }))
        .sort((a, b) => a.s - b.s);
      return order(
        scored.slice(0, n).map((x) => x.q),
        theta,
      );
    }
    // no data: spread across bands, E first then M then H
    const groups: Record<Band, Question[]> = { E: [], M: [], H: [] };
    for (const q of shuffled) groups[bandOf(q)].push(q);
    const out: Question[] = [];
    const share: Record<Band, number> = { E: Math.ceil(n / 3), M: Math.ceil(n / 3), H: n - 2 * Math.ceil(n / 3) };
    for (const b of ['E', 'M', 'H'] as Band[]) out.push(...groups[b].splice(0, Math.max(0, share[b])));
    // top up from whatever is left if a band ran short
    const rest = (['M', 'E', 'H'] as Band[]).flatMap((b) => groups[b]);
    while (out.length < n && rest.length) out.push(rest.shift()!);
    return order(out, undefined);
  };

  const first = pick(fresh, size);
  const need = size - first.length;
  const second = need > 0 ? pick(stale, need) : [];
  return { questions: [...first, ...second], repeats: second.length };
}

/** With θ: keep the seeded order (variety). Without: E, M, H. */
function order(qs: Question[], theta: number | undefined): Question[] {
  if (theta !== undefined) return qs;
  const rank = { E: 0, M: 1, H: 2 } as const;
  return [...qs].sort((a, b) => rank[bandOf(a)] - rank[bandOf(b)]);
}

/** Mean θ of the topics the pool touches that the student has data for; undefined when there is none. */
export function thetaFor(
  pool: readonly Question[],
  doc: Record<string, { θ: number; n: number }> | null | undefined,
): number | undefined {
  if (!doc) return undefined;
  const ts: number[] = [];
  for (const q of pool) {
    const t = doc[q.tax?.topics?.[0] ?? q.tax?.chapter ?? ''];
    if (t && t.n > 0) ts.push(t.θ);
  }
  return ts.length ? ts.reduce((a, b) => a + b, 0) / ts.length : undefined;
}

/** Ids of questions visited in past sessions (practice sessions store `qids`; otherwise read events). */
export function seenIds(sessions: readonly { qids?: unknown; events?: unknown[] }[]): Set<string> {
  const out = new Set<string>();
  for (const s of sessions) {
    if (Array.isArray(s.qids)) for (const id of s.qids) out.add(String(id));
    else for (const e of (s.events ?? []) as { q?: string; a?: string }[]) if (e.a === 'visit' && e.q) out.add(e.q);
  }
  return out;
}
