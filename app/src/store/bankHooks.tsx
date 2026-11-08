import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { UserQuestion } from '@kairos/core';
import { useAuth } from '../auth/AuthProvider';
import { getServices } from '../lib/firebase';
import { useGuest } from './StoreProvider';
import { userBankSource, type BankStore, type BankUsage, type UserBankSource } from './bank';
import { CloudBankStore, createBankFirestoreAdapter, type BankFsAdapter } from './bankCloud';
import type { KvDb } from './bankDb';
import { LocalBankStore, createBankIdb } from './bankLocal';

export interface BankEnv {
  store: BankStore;
  /** true for a signed-out visitor: data stays on this device */
  isGuest: boolean;
}

export const BankContext = createContext<BankEnv | null>(null);

/**
 * Picks the bank store like useStore does: Local when signed out / guest, Cloud when signed in with a
 * profile. Mount once around /upload and /bank. Tests can use <BankContext.Provider value=...> instead.
 */
export function BankProvider({ children, db, adapter }: { children: ReactNode; db?: KvDb; adapter?: BankFsAdapter }) {
  const { user, profile } = useAuth();
  const { isGuest } = useGuest();
  const kv = useMemo(() => db ?? createBankIdb(), [db]);
  const uid = user && profile ? user.uid : null;
  const local = useMemo(() => new LocalBankStore(kv), [kv]);
  const fs = useRef<BankFsAdapter | null>(adapter ?? null);
  const cloud = useMemo(() => {
    if (!uid) return null;
    fs.current ??= createBankFirestoreAdapter(getServices().db);
    return new CloudBankStore(uid, fs.current, kv);
  }, [uid, kv]);
  const value = useMemo<BankEnv>(() => ({ store: cloud ?? local, isGuest: isGuest || !uid }), [cloud, local, isGuest, uid]);
  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBankEnv(): BankEnv {
  const c = useContext(BankContext);
  if (!c) throw new Error('useBankStore must be used inside BankProvider');
  return c;
}
export function useBankStore(): BankStore {
  return useBankEnv().store;
}

export interface UserQuestionsState {
  questions: UserQuestion[];
  usage: BankUsage;
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
}
const ZERO: BankUsage = { questions: 0, images: 0, addedToday: 0 };

/** The user's private questions + usage, loaded once and reloaded on demand. */
export function useUserQuestions(): UserQuestionsState {
  const store = useBankStore();
  const [state, setState] = useState<Omit<UserQuestionsState, 'reload'>>({ questions: [], usage: ZERO, loading: true, error: null });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const reload = useCallback(async () => {
    try {
      const [questions, usage] = await Promise.all([store.listQuestions(), store.usage()]);
      if (alive.current) setState({ questions, usage, loading: false, error: null });
    } catch (e) {
      if (alive.current) setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : 'Could not load your questions.' }));
    }
  }, [store]);
  useEffect(() => { void reload(); }, [reload]);
  return { ...state, reload };
}

/** Practice-mode source for the user's own questions. `needs_answer` ones only with includeSelfCheck. */
export function useUserBankSource(opts: { includeSelfCheck?: boolean } = {}): UserBankSource {
  const store = useBankStore();
  return useMemo(() => userBankSource(store, opts), [store, opts.includeSelfCheck]); // eslint-disable-line react-hooks/exhaustive-deps
}
