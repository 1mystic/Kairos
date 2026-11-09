/** Firestore rejects commits over ~10 MiB, so batches are bounded by size as well as by op count. */
export const BATCH_MAX_BYTES = 4_000_000;

export function approxBytes(data: unknown): number {
  try {
    return JSON.stringify(data)?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Split ops into chunks of at most `maxOps` operations and about `maxBytes` of payload (one op may exceed it alone). */
export function chunkOps<T extends { data: unknown }>(ops: readonly T[], maxOps: number, maxBytes: number = BATCH_MAX_BYTES): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  let bytes = 0;
  for (const op of ops) {
    const b = approxBytes(op.data);
    if (cur.length > 0 && (cur.length >= maxOps || bytes + b > maxBytes)) {
      out.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(op);
    bytes += b;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}
