import { parseBlueprint, type Blueprint, type Manifest, type Question } from '@kairos/core';
import { BANK_BASE } from '../bank/config';
import { getLatestVersion, getManifest, getShard } from '../bank/client';

export interface ExamBank {
  version: number;
  manifest: Manifest;
  questions: Question[];
}

const CONCURRENCY = 6;
const memo = new Map<string, Promise<ExamBank>>();

/**
 * Every practice shard of one exam (answers included: they are public static content), loaded a few at
 * a time with progress. Memoised per bank version + exam, and the client caches each shard in IndexedDB,
 * so a second call (predicted score after the mock generator) is free.
 */
export function loadExamBank(exam: string, onProgress?: (done: number, total: number) => void): Promise<ExamBank> {
  return (async () => {
    const version = await getLatestVersion();
    const key = `${version}:${exam}`;
    let p = memo.get(key);
    if (!p) {
      p = (async () => {
        const manifest = await getManifest(version);
        const shards = manifest.files.filter((f) => f.kind === 'shard' && f.exam === exam && f.subject && f.chapter);
        const out: Question[][] = new Array(shards.length);
        let next = 0;
        let done = 0;
        onProgress?.(0, shards.length);
        const worker = async () => {
          while (next < shards.length) {
            const i = next++;
            const f = shards[i]!;
            out[i] = await getShard(version, exam, f.subject!, f.chapter!);
            onProgress?.(++done, shards.length);
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, shards.length) }, worker));
        return { version, manifest, questions: out.flat() };
      })();
      p.catch(() => memo.delete(key));
      memo.set(key, p);
    } else {
      const r = await p;
      onProgress?.(1, 1);
      return r;
    }
    return p;
  })();
}

export function resetExamBankMemo(): void {
  memo.clear();
  bpMemo.clear();
}

const bpMemo = new Map<string, Promise<Blueprint[]>>();

/** All blueprints published with the bank version (they are about 1 KB each). */
export function loadBlueprints(version: number, manifest: Manifest): Promise<Blueprint[]> {
  let p = bpMemo.get(String(version));
  if (!p) {
    const files = manifest.files.filter((f) => f.kind === 'blueprint');
    p = Promise.all(
      files.map(async (f) => {
        const res = await fetch(`${BANK_BASE}/v${version}/${f.path}`);
        if (!res.ok) throw new Error(`blueprint ${f.path}: HTTP ${res.status}`);
        return parseBlueprint(await res.json());
      }),
    );
    p.catch(() => bpMemo.delete(String(version)));
    bpMemo.set(String(version), p);
  }
  return p;
}

export async function blueprintsForExam(exam: string): Promise<{ version: number; blueprints: Blueprint[] }> {
  const version = await getLatestVersion();
  const all = await loadBlueprints(version, await getManifest(version));
  return { version, blueprints: all.filter((b) => b.exam === exam) };
}
