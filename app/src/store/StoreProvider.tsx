import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getServices } from '../lib/firebase';
import type { UserProfile } from '../lib/profile';
import { FirestoreStore, createFirestoreAdapter, type FsAdapter } from './FirestoreStore';
import type { KvDb } from './bankDb';
import { CloudBankStore, createBankFirestoreAdapter, type BankFsAdapter } from './bankCloud';
import { LocalBankStore, createBankIdb } from './bankLocal';
import { LocalStore } from './LocalStore';
import { createIdbLocalDb, type LocalDb } from './localDb';
import { discardLocal, inspectMigration, runMigration, type MigrationPlan, type MigrationResult } from './migrate';
import { MigrationDialog } from './MigrationDialog';
import type { GuestProfile, UserStore } from './types';
import { isGuestProfile } from './types';

export const GUEST_FLAG = 'kairos-guest';

export type MigrationState =
  | { phase: 'idle' }
  | { phase: 'ask'; plan: MigrationPlan }
  | { phase: 'running' }
  | { phase: 'done'; result: MigrationResult }
  | { phase: 'error'; plan?: MigrationPlan };

interface StoreCtx {
  store: UserStore;
  local: LocalStore;
  /** true for a visitor who chose "Continue as guest" and is not signed in */
  isGuest: boolean;
  startGuest(): Promise<void>;
  /** sign out, empty the local store, and return to guest mode */
  signOutToGuest(): Promise<void>;
  migration: MigrationState;
  retryMigration(): void;
}

const Ctx = createContext<StoreCtx | null>(null);

function useCtx(): StoreCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}

/** The store feature code should use: LocalStore when signed out, FirestoreStore when signed in. */
export function useStore(): UserStore {
  return useCtx().store;
}
export function useGuest() {
  const { isGuest, startGuest, signOutToGuest } = useCtx();
  return { isGuest, startGuest, signOutToGuest };
}
/** Returns a function that starts guest mode (creates the local guest profile). Navigate to "/" after it resolves. */
export function useStartGuest(): () => Promise<void> {
  return useCtx().startGuest;
}
/** For a Settings row "Add this device's progress": `retry()` re-checks and reopens the prompt. */
export function useMigration() {
  const { migration, retryMigration } = useCtx();
  return { migration, retry: retryMigration };
}
export function useLocalStore(): LocalStore {
  return useCtx().local;
}

export interface StoreProviderProps {
  children: ReactNode;
  /** inject for tests; default is IndexedDB `kairos-guest` */
  localDb?: LocalDb;
  /** inject for tests; default is the real Firestore */
  fsAdapter?: FsAdapter;
  /** inject for tests; default is IndexedDB `kairos-bank-user` */
  bankDb?: KvDb;
  /** inject for tests; default is the real Firestore */
  bankAdapter?: BankFsAdapter;
  now?: () => number;
}

export function StoreProvider({ children, localDb, fsAdapter, bankDb, bankAdapter, now = Date.now }: StoreProviderProps) {
  const { user, profile, loading, signOut, patchProfile } = useAuth();
  const patch = useRef(patchProfile);
  patch.current = patchProfile;
  const local = useMemo(() => new LocalStore(localDb ?? createIdbLocalDb()), [localDb]);
  const [guestFlag, setGuestFlag] = useState(() => {
    try { return localStorage.getItem(GUEST_FLAG) === '1'; } catch { return false; }
  });
  const [migration, setMigration] = useState<MigrationState>({ phase: 'idle' });

  const kv = useMemo(() => bankDb ?? createBankIdb(), [bankDb]);
  const localBank = useMemo(() => new LocalBankStore(kv), [kv]);
  const bankFs = useRef<BankFsAdapter | null>(bankAdapter ?? null);
  const adapter = useRef<FsAdapter | null>(fsAdapter ?? null);
  const uid = user && profile ? user.uid : null;
  const cloud = useMemo(() => {
    if (!uid) return null;
    adapter.current ??= createFirestoreAdapter(getServices().db);
    return new FirestoreStore(uid, adapter.current, (f) => patch.current?.(f as Partial<UserProfile>));
  }, [uid]);
  const store: UserStore = cloud ?? local;
  const bankDeps = useCallback((c: FirestoreStore) => {
    bankFs.current ??= createBankFirestoreAdapter(getServices().db);
    return { bank: { local: localBank, cloud: new CloudBankStore(c.uid, bankFs.current, kv, now) } };
  }, [localBank, kv, now]);

  const ensureGuestProfile = useCallback(async () => {
    const existing = await local.getProfile();
    if (!isGuestProfile(existing)) {
      const p: GuestProfile = { kind: 'guest', displayName: 'Guest', createdAt: now() };
      await local.saveProfile(p);
    }
  }, [local, now]);

  const startGuest = useCallback(async () => {
    // IndexedDB can be blocked (private mode, storage denied): guest mode still opens, it just will not persist
    await ensureGuestProfile().catch(() => {});
    try { await navigator.storage?.persist?.(); } catch { /* unsupported: fine */ }
    try { localStorage.setItem(GUEST_FLAG, '1'); } catch { /* private mode: still works this tab */ }
    setGuestFlag(true);
  }, [ensureGuestProfile]);

  // returning guests: make sure the local profile exists
  useEffect(() => {
    if (guestFlag && !user && !loading) void ensureGuestProfile().catch(() => {});
  }, [guestFlag, user, loading, ensureGuestProfile]);

  const signOutToGuest = useCallback(async () => {
    // Guest data that was never added to the account (prompt postponed / upload failed / over the caps) must not be
    // wiped silently. Cloud data is never copied back to this device, so nothing here belongs to the account that left.
    let keep = false;
    try {
      const meta = await local.getMeta();
      keep = ((await local.hasData()) && meta.migratedTo !== user?.uid) || (await localBank.listQuestions()).length > 0;
    } catch { /* unreadable local store: nothing to protect */ }
    await signOut();
    if (!keep) {
      await local.clearAll().catch(() => {});
      await localBank.clearAll().catch(() => {});
    }
    setMigration({ phase: 'idle' });
    await startGuest();
  }, [signOut, local, localBank, startGuest, user?.uid]);

  // migration after sign-in / sign-up, once the profile exists
  const attempted = useRef<string | null>(null);
  const migrating = useRef(false);
  const migrate = useCallback(async (c: FirestoreStore) => {
    if (migrating.current) return; // double click on "Add progress" / effect + retry
    migrating.current = true;
    let plan: MigrationPlan | undefined;
    try {
      plan = await inspectMigration(local, c, now(), bankDeps(c));
      if (plan.status === 'none') return;
      if (plan.status === 'ask') { setMigration({ phase: 'ask', plan }); return; }
      setMigration({ phase: 'running' });
      setMigration({ phase: 'done', result: await runMigration(local, c, c.uid, 'new', now(), bankDeps(c)) });
    } catch {
      setMigration({ phase: 'error', plan });
    } finally {
      migrating.current = false;
    }
  }, [local, now, bankDeps]);

  useEffect(() => {
    if (!cloud) { attempted.current = null; return; } // signed out: a later sign-in (even the same account) is checked again
    if (attempted.current === cloud.uid) return;
    attempted.current = cloud.uid;
    void migrate(cloud);
  }, [cloud, migrate]);

  const retryMigration = useCallback(() => { if (cloud) void migrate(cloud); }, [cloud, migrate]);

  const answer = useCallback(async (add: boolean) => {
    if (!cloud) return;
    setMigration({ phase: 'running' });
    try {
      if (add) setMigration({ phase: 'done', result: await runMigration(local, cloud, cloud.uid, 'merge', now(), bankDeps(cloud)) });
      else { await discardLocal(local, localBank); setMigration({ phase: 'idle' }); }
    } catch {
      setMigration({ phase: 'error' });
    }
  }, [cloud, local, localBank, now, bankDeps]);

  const value = useMemo<StoreCtx>(
    () => ({ store, local, isGuest: guestFlag && !user, startGuest, signOutToGuest, migration, retryMigration }),
    [store, local, guestFlag, user, startGuest, signOutToGuest, migration, retryMigration],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <MigrationDialog state={migration} onAdd={() => void answer(true)} onDiscard={() => void answer(false)} onRetry={retryMigration} onClose={() => setMigration({ phase: 'idle' })} onLater={() => setMigration({ phase: 'idle' })} />
    </Ctx.Provider>
  );
}
