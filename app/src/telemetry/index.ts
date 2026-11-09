import { doc, getDoc, increment, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { getServices } from '../lib/firebase';
import { sessionCounts, type Counts } from './logic';
import { Telemetry, type StatsAdapter, type TelemetryDeps } from './telemetry';

export { Telemetry, TELEMETRY_KEY, type StatsAdapter, type TelemetryDeps } from './telemetry';
export * from './logic';

export function createFirestoreStatsAdapter(): StatsAdapter {
  return {
    async hasSeen(day, uid) {
      const { db } = getServices();
      return (await getDoc(doc(db, 'stats', day, 'seen', uid))).exists();
    },
    async addActive(day, uid) {
      const { db } = getServices();
      const b = writeBatch(db);
      b.set(doc(db, 'stats', day), { active: increment(1), updatedAt: serverTimestamp() }, { merge: true });
      b.set(doc(db, 'stats', day, 'seen', uid), { at: serverTimestamp() });
      await b.commit();
    },
    async addCounts(day, counts) {
      const { db } = getServices();
      const inc = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, increment(v as number)]));
      await setDoc(doc(db, 'stats', day), { ...inc, updatedAt: serverTimestamp() }, { merge: true });
    },
  };
}

const realDeps = (): TelemetryDeps => ({
  adapter: createFirestoreStatsAdapter(),
  storage: typeof localStorage === 'undefined' ? null : localStorage,
  now: () => new Date(),
  getUid: () => {
    try {
      return getServices().auth.currentUser?.uid ?? null;
    } catch {
      return null;
    }
  },
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
});

let inst: Telemetry | null = null;
let onBump: (() => void) | null = null;
const tel = (): Telemetry => (inst ??= new Telemetry(realDeps()));

/** Tests: use a custom instance (null restores the default). */
export function setTelemetry(t: Telemetry | null): void {
  inst = t;
}

/** Accumulate anonymous counters (in memory + localStorage). Guests are skipped. */
export function bumpStats(partial: Counts): void {
  if (tel().bump(partial)) onBump?.();
}

export function reportSession(s: { exam?: string | null; answered: number; correct: number }): void {
  bumpStats(sessionCounts(s));
}
export const reportMock = (): void => bumpStats({ mocks: 1 });
export const reportDiagnostic = (): void => bumpStats({ diagnostics: 1 });
export const reportUpload = (n = 1): void => bumpStats({ uploads: n });
export const reportSignup = (): void => bumpStats({ signups: 1 });
export const reportOnboarded = (): void => bumpStats({ onboarded: 1 });

/**
 * Call once at app start (main.tsx). Flushes once a day shortly after load / sign-in / the first report,
 * and when the page is hidden with data pending. Returns an uninstall function.
 */
export function installTelemetry(): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, reason: 'timer' | 'hide' = 'timer') => {
    const t = setTimeout(() => {
      timers.delete(t);
      void tel().flush(reason);
    }, ms);
    timers.add(t);
  };
  onBump = () => later(20_000);
  const onVis = () => {
    if (document.visibilityState === 'hidden') void tel().flush('hide');
  };
  const onHide = () => void tel().flush('hide');
  const onOnline = () => later(2_000);
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', onHide);
  window.addEventListener('online', onOnline);
  later(5_000);
  let offAuth: (() => void) | null = null;
  void import('firebase/auth').then(({ onAuthStateChanged }) => {
    try {
      offAuth = onAuthStateChanged(getServices().auth, (u) => u && later(3_000));
    } catch {
      /* no firebase config (tests, dev without env) */
    }
  });
  return () => {
    onBump = null;
    timers.forEach(clearTimeout);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', onHide);
    window.removeEventListener('online', onOnline);
    offAuth?.();
  };
}
