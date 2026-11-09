import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useAdminData } from './data';

export type AdminStatus = { status: 'loading' } | { status: 'guest' } | { status: 'not_admin'; uid: string } | { status: 'admin'; uid: string };

const known = new Map<string, boolean>();
/** Tests: forget what was learned this session. */
export const resetAdminCache = (): void => known.clear();

/** Signed-in only: one getDoc(admins/{uid}) per session (cached in memory). Guests and errors are "not admin". */
export function useAdminStatus(): AdminStatus {
  const { user, loading } = useAuth();
  const data = useAdminData();
  const uid = user?.uid ?? null;
  const [, bump] = useState(0);
  useEffect(() => {
    if (!uid || known.has(uid)) return;
    let live = true;
    data.isAdmin(uid).then(
      (v) => known.set(uid, v),
      () => known.set(uid, false),
    ).finally(() => live && bump((n) => n + 1));
    return () => {
      live = false;
    };
  }, [uid, data]);
  if (loading) return { status: 'loading' };
  if (!uid) return { status: 'guest' };
  const v = known.get(uid);
  if (v === undefined) return { status: 'loading' };
  return v ? { status: 'admin', uid } : { status: 'not_admin', uid };
}

export const useIsAdmin = (): boolean => useAdminStatus().status === 'admin';
