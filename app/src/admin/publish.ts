import { serverTimestamp } from 'firebase/firestore';

/** Every config/* write carries exactly the contract fields plus these two. `ts` is injectable for tests. */
export function stampDoc<T extends Record<string, unknown>>(payload: T, uid: string, ts: unknown = serverTimestamp()): T & { updatedAt: unknown; updatedBy: string } {
  return { ...payload, updatedAt: ts, updatedBy: uid };
}
