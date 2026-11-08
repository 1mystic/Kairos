import { useEffect, useState } from 'react';
import type { Question } from '@kairos/core';
import {
  getLatestVersion,
  getManifest,
  getMockPaper,
  getShard,
  type Manifest,
  type MockPaper,
} from './client';

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
}

/** Runs `load` whenever `key` changes (key null = idle). Ignores stale results. */
function useAsync<T>(key: string | null, load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: Error }>({ key: null });
  useEffect(() => {
    if (key === null) return;
    let live = true;
    load().then(
      (data) => live && setState({ key, data }),
      (e: unknown) => live && setState({ key, error: e instanceof Error ? e : new Error(String(e)) }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies `load`
  }, [key]);
  const settled = state.key === key && key !== null;
  return {
    data: settled ? state.data : undefined,
    error: settled ? state.error : undefined,
    loading: key !== null && !settled,
  };
}

export function useManifest(): AsyncState<{ version: number; manifest: Manifest }> {
  return useAsync('manifest', async () => {
    const version = await getLatestVersion();
    return { version, manifest: await getManifest(version) };
  });
}

export function useMockPaper(paperId: string | null): AsyncState<{ version: number; paper: MockPaper }> {
  return useAsync(paperId && `mock:${paperId}`, async () => {
    const version = await getLatestVersion();
    return { version, paper: await getMockPaper(version, paperId!) };
  });
}

export function useShard(
  exam: string | null,
  subject: string | null,
  chapter: string | null,
): AsyncState<{ version: number; questions: Question[] }> {
  const on = exam && subject && chapter;
  return useAsync(on ? `shard:${exam}/${subject}/${chapter}` : null, async () => {
    const version = await getLatestVersion();
    return { version, questions: await getShard(version, exam!, subject!, chapter!) };
  });
}
