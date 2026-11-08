import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LinkButton, Button, Modal } from '../components/ui';
import { useGuest, useLocalStore } from './StoreProvider';
import {
  MANY_SESSIONS, bannerVisible, flushPending, loadNudge, requestNudge, saveNudge, snoozeBanner, trackActiveDay,
  type KV, type NudgeKind,
} from './nudgeLogic';

export interface NudgeApi {
  /** Ask to show a sign-in prompt for a milestone. No-op for signed-in users, repeats, or a second modal today. */
  nudge(kind: NudgeKind): void;
  bannerVisible: boolean;
  dismissBanner(): void;
}

const noop: NudgeApi = { nudge: () => {}, bannerVisible: false, dismissBanner: () => {} };
const Ctx = createContext<NudgeApi>(noop);

export function useSignInNudge(): NudgeApi {
  return useContext(Ctx);
}

const COPY: Record<NudgeKind, string> = {
  first_session: 'Nice start. Sign in to keep this session safe and reach it from any device.',
  three_days: 'Three days in. Sign in so your progress stays with you, even on a new phone.',
  exam_date_set: 'Your plan is worth keeping. Sign in to save it to your account.',
  many_sessions: 'You have built up a lot of practice here. Sign in to back it up.',
};

export function NudgeProvider({ children, kv, now = () => new Date() }: { children: ReactNode; kv?: KV; now?: () => Date }) {
  const { isGuest } = useGuest();
  const local = useLocalStore();
  const storage: KV = kv ?? localStorage;
  const [modal, setModal] = useState<NudgeKind | null>(null);
  const [tick, setTick] = useState(0);

  const nudge = useCallback((kind: NudgeKind) => {
    if (!isGuest) return;
    const r = requestNudge(loadNudge(storage), kind, now());
    saveNudge(storage, r.state);
    if (r.show) setModal(r.show);
  }, [isGuest, storage, now]);

  useEffect(() => {
    if (!isGuest) return;
    let s = trackActiveDay(loadNudge(storage), now());
    saveNudge(storage, s);
    const want: NudgeKind[] = [];
    if (s.activeDays.length >= 3) want.push('three_days');
    void local.listSessions().then((l) => {
      if (l.length >= MANY_SESSIONS) want.push('many_sessions');
    }).catch(() => {}).finally(() => {
      s = loadNudge(storage);
      for (const k of want) {
        const r = requestNudge(s, k, now());
        s = r.state;
        if (r.show) setModal(r.show);
      }
      const f = flushPending(s, now());
      s = f.state;
      if (f.show) setModal(f.show);
      saveNudge(storage, s);
    });
  }, [isGuest, local, storage, now]);

  const api = useMemo<NudgeApi>(() => ({
    nudge,
    bannerVisible: isGuest && bannerVisible(loadNudge(storage), now().getTime()) && tick >= 0,
    dismissBanner: () => { saveNudge(storage, snoozeBanner(loadNudge(storage), now().getTime())); setTick((t) => t + 1); },
  }), [nudge, isGuest, storage, now, tick]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {modal && (
        <Modal title="Keep your progress safe" onClose={() => setModal(null)} dismissLabel="Not now">
          <p className="text-slate">{COPY[modal]}</p>
          <div className="stack gap-tight sm:flex-row-reverse">
            <LinkButton to="/signup" onClick={() => setModal(null)}>Create account</LinkButton>
            <Button variant="secondary" onClick={() => setModal(null)}>Not now</Button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}
