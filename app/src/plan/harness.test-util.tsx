import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { AuthContext, type AuthContextValue } from '../auth/AuthProvider';
import { createMemoryLocalDb, StoreProvider, NudgeProvider, type LocalDb } from '../store';
import type { FsAdapter } from '../store';
import type { KV } from '../store/nudgeLogic';
import type { Taxonomy } from '../practice/taxonomy';
import taxRaw from '../../../content/taxonomy/taxonomy.json';
import { PlanEnvProvider, type PlanEnv } from './usePlan';

export const TAX = taxRaw as unknown as Taxonomy;

const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as KV;
};

export function authValue(uid: string | null): AuthContextValue {
  return {
    user: uid ? { uid } : null,
    profile: uid ? { displayName: 'Asha', isMinor: false, consent: { status: 'not_required' }, onboarded: false } : null,
    loading: false,
  } as unknown as AuthContextValue;
}

export const NOW = new Date('2026-11-08T10:00:00');

export const testEnv = (over: Partial<PlanEnv> = {}): Partial<PlanEnv> => {
  const writes: Record<string, number> = {};
  return {
    now: () => NOW,
    calendar: [],
    loadTax: async () => TAX,
    loadAvailable: async () => null,
    getPlanWrites: (d) => writes[d] ?? 0,
    bumpPlanWrites: (d) => void (writes[d] = (writes[d] ?? 0) + 1),
    ...over,
  };
};

/** Guest (localDb) or signed-in (fsAdapter + uid) harness with router, store, nudge and plan env. */
export function Harness({ children, localDb, fsAdapter, uid = null, env, path = '/' }: { children: ReactNode; localDb?: LocalDb; fsAdapter?: FsAdapter; uid?: string | null; env?: Partial<PlanEnv>; path?: string }) {
  localStorage.setItem('kairos-guest', '1');
  return (
    <AuthContext.Provider value={authValue(uid)}>
      <StoreProvider localDb={localDb ?? createMemoryLocalDb()} {...(fsAdapter ? { fsAdapter } : {})}>
        <MemoryRouter initialEntries={[path]}>
          <NudgeProvider kv={mem()}>
            <PlanEnvProvider env={env ?? testEnv()}>{children}</PlanEnvProvider>
          </NudgeProvider>
        </MemoryRouter>
      </StoreProvider>
    </AuthContext.Provider>
  );
}
