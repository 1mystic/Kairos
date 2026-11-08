import type { Question } from '@kairos/core';
import { getLatestVersion, getShard } from '../bank/client';

/**
 * Where practice questions come from. The bank-shard source is built in; the upload feature
 * (W4d) can add a source for the user's private questions without touching the session code.
 */
export interface QuestionSource {
  id: string;
  label: string;
  load(): Promise<Question[]>;
}

export interface ChapterRef {
  exam: string;
  subject: string;
  chapter: string;
}

export function bankShardSource(ref: ChapterRef): QuestionSource {
  return {
    id: `bank:${ref.exam}/${ref.subject}/${ref.chapter}`,
    label: ref.chapter,
    async load() {
      const version = await getLatestVersion();
      return getShard(version, ref.exam, ref.subject, ref.chapter);
    },
  };
}

/** Several sources merged (mixed practice); a failing source is skipped as long as one loads. */
export function mergeSources(id: string, label: string, sources: QuestionSource[]): QuestionSource {
  return {
    id,
    label,
    async load() {
      const results = await Promise.allSettled(sources.map((s) => s.load()));
      const ok = results.filter((r): r is PromiseFulfilledResult<Question[]> => r.status === 'fulfilled');
      if (ok.length === 0 && results.length > 0) throw (results[0] as PromiseRejectedResult).reason;
      const seen = new Set<string>();
      return ok.flatMap((r) => r.value).filter((q) => !seen.has(q.id) && !!seen.add(q.id));
    },
  };
}

/** Registry other features can extend, e.g. `registerSource(ownBankSource)`. */
const extra: QuestionSource[] = [];
export function registerSource(s: QuestionSource): void {
  if (!extra.some((e) => e.id === s.id)) extra.push(s);
}
export function extraSources(): readonly QuestionSource[] {
  return extra;
}
