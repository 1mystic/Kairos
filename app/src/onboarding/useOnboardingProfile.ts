import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import type { Profile } from '../store/types';
import { parseProfile, saveOnboardingFields, toFields, type OnboardingProfile } from './profileModel';

const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
/** Tell every mounted profile hook to re-read (after any profile write from outside `save`). */
export const notifyProfileChanged = notify;

/** A number that changes whenever the profile was written (exam switch, onboarding save). Lets other hooks re-run. */
export function useProfileVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    subs.add(bump);
    return () => {
      subs.delete(bump);
    };
  }, []);
  return v;
}

export interface OnboardingProfileApi {
  loading: boolean;
  /** typed profile with defaults; `exams` is empty until the student sets a date */
  profile: OnboardingProfile;
  /** true once onboarding was completed (or an exam date exists) */
  onboarded: boolean;
  hasExam: boolean;
  /** one write (guest: IndexedDB, signed in: one Firestore update) */
  save(patch: Partial<OnboardingProfile>): Promise<void>;
  refresh(): void;
}

/** The student's onboarding answers. Works for guests (local profile) and signed-in users (cloud profile). */
export function useOnboardingProfile(): OnboardingProfileApi {
  const store = useStore();
  const [raw, setRaw] = useState<{ loading: boolean; profile: Profile | null }>({ loading: true, profile: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    subs.add(bump);
    return () => {
      subs.delete(bump);
    };
  }, []);

  useEffect(() => {
    let live = true;
    store.getProfile().then(
      (p) => live && setRaw({ loading: false, profile: p }),
      () => live && setRaw({ loading: false, profile: null }),
    );
    return () => {
      live = false;
    };
  }, [store, tick]);

  const save = useCallback(
    async (patch: Partial<OnboardingProfile>) => {
      await saveOnboardingFields(store, toFields(patch));
      notify();
    },
    [store],
  );
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const profile = useMemo(() => parseProfile(raw.profile), [raw.profile]);
  return { loading: raw.loading, profile, onboarded: profile.onboarded || profile.examId !== null, hasExam: profile.examId !== null, save, refresh };
}
