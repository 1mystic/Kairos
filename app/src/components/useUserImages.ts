import { useContext, useEffect, useMemo, useState } from 'react';
import type { ImageRef, PublicQuestion, Question } from '@kairos/core';
import { BankContext } from '../store/bankHooks';

type Q = Pick<Question | PublicQuestion, 'id' | 'images'> & { source?: { kind?: string } };

/** A question from the user's own bank (images live in the bank store, not on the CDN). */
export function isUserQuestion(q: Q): boolean {
  return q.source?.kind === 'user' || q.id.startsWith('u_');
}

const MAX_CACHE = 64;
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function remember(id: string, url: string) {
  cache.delete(id);
  cache.set(id, url);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string);
}

/** Test hook: forget cached data URLs. */
export function clearUserImageCache(): void {
  cache.clear();
  inflight.clear();
}

const EMPTY: Record<string, string> = {};

/**
 * data/blob URLs for the images of a user question, loaded through the bank store and cached across
 * renders and questions (image ids are content hashes, so a cached URL never goes stale).
 * Returns an empty map for bank questions or outside a BankProvider, so they pay nothing.
 */
export function useUserImageMap(question: Q, enabled: boolean = isUserQuestion(question)): Record<string, string> {
  const env = useContext(BankContext);
  const store = env?.store ?? null;
  const images: readonly ImageRef[] = question.images ?? [];
  const key = enabled && store ? images.map((i) => i.id).join(',') : '';
  const [loaded, setLoaded] = useState<Record<string, string>>(EMPTY);

  useEffect(() => {
    if (!key || !store) {
      setLoaded(EMPTY);
      return;
    }
    let live = true;
    const ids = key.split(',');
    const fromCache = () => Object.fromEntries(ids.filter((id) => cache.has(id)).map((id) => [id, cache.get(id)!]));
    setLoaded(fromCache());
    const missing = ids.filter((id) => !cache.has(id));
    if (missing.length === 0) return;
    void Promise.all(
      missing.map((id) => {
        let p = inflight.get(id);
        if (!p) {
          p = store
            .getMedia(id)
            .catch(() => null)
            .finally(() => inflight.delete(id));
          inflight.set(id, p);
        }
        return p.then((u) => {
          if (u) remember(id, u);
        });
      }),
    ).then(() => {
      if (live) setLoaded(fromCache());
    });
    return () => {
      live = false;
    };
  }, [key, store]);

  return useMemo(() => loaded, [loaded]);
}
