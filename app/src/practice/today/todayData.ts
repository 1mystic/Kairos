import type { Manifest, MasteryDoc, Question } from '@kairos/core';
import { getLatestVersion, getManifest, getShard } from '../../bank/client';
import type { UserStore } from '../../store';
import { loadTaxonomy, buildChapterRows } from '../taxonomy';
import { RECENCY_DAYS } from '../queue';
import { seenMap } from './buildTodayQueue';
import type { ChapterInfo } from './suggestSession';

const DAY_MS = 86_400_000;
export const SHARD_CONCURRENCY = 4;

/** Run `fn` over `items` with at most `limit` in flight; results keep the input order. */
export async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return out;
}

/** Chapters of one exam that have questions, with names and topic ids (taxonomy + manifest; both are cached by the service worker). */
export async function loadChapterInfos(exam: string): Promise<{ infos: ChapterInfo[]; manifest: Manifest; version: number }> {
  const version = await getLatestVersion();
  const [manifest, tax] = await Promise.all([getManifest(version), loadTaxonomy()]);
  const topics = new Map<string, string[]>();
  for (const s of tax.subjects) for (const c of s.chapters) topics.set(c.id, c.topics.map((t) => t.id));
  const infos = buildChapterRows(tax, manifest, exam).flatMap((s) => s.chapters.map((c) => ({ id: c.id, name: c.name, subject: c.subject, count: c.count, topics: topics.get(c.id) ?? [] })));
  return { infos, manifest, version };
}

/**
 * Only the shards for the chapters named, 4 at a time. A chapter that fails to load is left out (the queue builder notes it as skipped).
 * `examOf` maps a chapter to its exam when the student prepares for several; others use `exam`.
 */
export async function loadShards(
  manifest: Manifest,
  version: number,
  exam: string,
  chapters: readonly string[],
  examOf: Readonly<Record<string, string>> = {},
): Promise<Record<string, Question[]>> {
  const out: Record<string, Question[]> = {};
  await mapPool([...new Set(chapters)], SHARD_CONCURRENCY, async (chapter) => {
    const ex = examOf[chapter] ?? exam;
    const ref = manifest.files.find((f) => f.kind === 'shard' && f.exam === ex && f.chapter === chapter && !!f.subject);
    if (!ref?.subject) return;
    try {
      out[chapter] = await getShard(version, ex, ref.subject, chapter);
    } catch {
      /* skipped */
    }
  });
  return out;
}

export interface TodayContext {
  mastery: MasteryDoc | null;
  seen: Record<string, number>;
  /** chapter id -> questions seen in the last 3 weeks (for the suggestion) */
  seenByChapter: Record<string, number>;
}

/** Reads used to build a session: one mastery doc and the sessions of the last 21 days (bounded, like the practice screen). */
export async function loadTodayContext(store: UserStore, now: number, withSessions = true): Promise<TodayContext> {
  const [mastery, sessions] = await Promise.all([
    store.getState('mastery').catch(() => null) as Promise<MasteryDoc | null>,
    withSessions ? store.listSessions({ since: now - RECENCY_DAYS * DAY_MS, limit: 200 }).catch(() => []) : Promise.resolve([]),
  ]);
  const seenByChapter: Record<string, number> = {};
  for (const s of sessions) {
    const chapters = Array.isArray(s.chapters) ? (s.chapters as string[]) : typeof s.chapter === 'string' && s.chapter !== 'mixed' ? [s.chapter] : [];
    const n = Array.isArray(s.qids) ? s.qids.length : 0;
    for (const c of chapters) seenByChapter[c] = (seenByChapter[c] ?? 0) + n / Math.max(1, chapters.length);
  }
  return { mastery: mastery ?? null, seen: seenMap(sessions), seenByChapter };
}
