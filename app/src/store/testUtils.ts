import type { FsAdapter } from './FirestoreStore';

/** In-memory Firestore stand-in for tests. `failBatchAt` makes the Nth batch (1-based) throw once. */
export function fakeFs(initial: Record<string, Record<string, unknown>> = {}) {
  const docs = new Map(Object.entries(initial));
  const batches: number[] = [];
  const queries: Array<{ path: string; field: string; since?: number; limit: number }> = [];
  const state = { failBatchAt: 0, n: 0 };
  const adapter: FsAdapter = {
    async get(p) { return docs.get(p) ?? null; },
    async set(p, d) { docs.set(p, d); },
    async updateProfile(p, f) { docs.set(p, { ...(docs.get(p) ?? {}), ...f }); },
    async list(c, o) {
      const out = [...docs.entries()].filter(([k]) => k.startsWith(`${c}/`) && !k.slice(c.length + 1).includes('/')).map(([k, data]) => ({ id: k.slice(c.length + 1), data }));
      return o?.limit ? out.slice(0, o.limit) : out;
    },
    async listRecent(c, q) {
      queries.push({ path: c, ...q });
      const rows = [...docs.entries()].filter(([k]) => k.startsWith(`${c}/`) && !k.slice(c.length + 1).includes('/'))
        .map(([k, data]) => ({ id: k.slice(c.length + 1), data }))
        .filter((r) => q.since === undefined || Number(r.data[q.field]) >= q.since)
        .sort((a, b) => Number(b.data[q.field]) - Number(a.data[q.field]));
      return Number.isFinite(q.limit) ? rows.slice(0, q.limit) : rows;
    },
    async delete(p) { docs.delete(p); },
    async batchSet(ops) {
      state.n += 1;
      if (state.n === state.failBatchAt) throw new Error('network');
      batches.push(ops.length);
      for (const o of ops) docs.set(o.path, o.data);
    },
  };
  return { adapter, docs, batches, state, queries };
}
