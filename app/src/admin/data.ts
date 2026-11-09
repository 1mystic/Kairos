import { createContext, useContext } from 'react';
import { collection, doc, documentId, getDoc, getDocs, limit as fsLimit, orderBy, query, setDoc, where } from 'firebase/firestore';
import { getLatestVersion, getManifest } from '../bank/client';
import { jsonSafe } from '../config/remote';
import { getServices } from '../lib/firebase';
import type { StatsRow } from './insights';
import { stampDoc } from './publish';
import type { UserRow } from './users';

export interface BankInfo { version: number; files: number; totals: Record<string, number> }

/** Everything the admin console reads or writes. Tests inject a fake through AdminDataContext. */
export interface AdminData {
  /** does admins/{uid} exist? */
  isAdmin(uid: string): Promise<boolean>;
  /** ONE query by document id over the range (<= 90 reads) */
  getStats(start: string, end: string): Promise<StatsRow[]>;
  /** ONE query, newest first (reads = docs returned) */
  getUsers(limit: number): Promise<UserRow[]>;
  getConfig(id: string): Promise<Record<string, unknown> | null>;
  /** ONE setDoc; adds updatedAt (serverTimestamp) and updatedBy */
  publishConfig(id: string, payload: Record<string, unknown>, uid: string): Promise<void>;
  bankInfo(): Promise<BankInfo>;
}

export const firestoreAdminData: AdminData = {
  async isAdmin(uid) {
    const { db } = getServices();
    return (await getDoc(doc(db, 'admins', uid))).exists();
  },
  async getStats(start, end) {
    const { db } = getServices();
    const snap = await getDocs(query(collection(db, 'stats'), where(documentId(), '>=', start), where(documentId(), '<=', end)));
    return snap.docs.map((d) => ({ day: d.id, data: jsonSafe(d.data()) as Record<string, number> }));
  },
  async getUsers(limit) {
    const { db } = getServices();
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), fsLimit(limit)));
    // Keep only what the summaries need. The rows are cached in sessionStorage by useCachedQuery, so email and
    // date of birth (minors!) must never leave this function.
    return snap.docs.map((d) => {
      const { displayName, isMinor, consent, onboarded, exam, createdAt } = d.data() as Record<string, unknown>;
      const status = (consent as { status?: unknown } | undefined)?.status;
      return {
        id: d.id,
        data: jsonSafe({ displayName, isMinor, onboarded, exam, createdAt, ...(typeof status === 'string' ? { consent: { status } } : {}) }) as Record<string, unknown>,
      };
    });
  },
  async getConfig(id) {
    const { db } = getServices();
    const s = await getDoc(doc(db, 'config', id));
    return s.exists() ? (jsonSafe(s.data()) as Record<string, unknown>) : null;
  },
  async publishConfig(id, payload, uid) {
    const { db } = getServices();
    await setDoc(doc(db, 'config', id), stampDoc(payload, uid));
  },
  async bankInfo() {
    const version = await getLatestVersion();
    const m = await getManifest(version);
    return { version, files: m.files.length, totals: (m.totals ?? {}) as Record<string, number> };
  },
};

export const AdminDataContext = createContext<AdminData>(firestoreAdminData);
export const useAdminData = (): AdminData => useContext(AdminDataContext);
