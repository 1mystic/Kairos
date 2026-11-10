import { useCallback, useMemo } from 'react';
import { daysLeft } from '@kairos/core';
import { notifyProfileChanged, useOnboardingProfile } from '../onboarding/useOnboardingProfile';
import { planDate, saveExamState } from '../onboarding/profileModel';
import { examLabel } from '../plan/syllabus';
import { useStore } from '../store';
import type { UserStore } from '../store/types';
import { activeProfile, withActive, type ExamProfile, type ExamProfiles } from './model';

/**
 * Writes are coalesced: while one profile write is in flight, later requests replace each other and only the LAST one is written next
 * (rapid switching between exams costs at most two writes, a single switch costs exactly one).
 */
let inflight: Promise<void> | null = null;
let queued: { store: UserStore; state: ExamProfiles } | null = null;

export function persistExamState(store: UserStore, state: ExamProfiles): Promise<void> {
  queued = { store, state };
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      while (queued) {
        const job = queued;
        queued = null;
        await saveExamState(job.store, job.state);
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export interface ActiveExamApi {
  loading: boolean;
  /** all of the student's exam profiles (empty before onboarding) */
  profiles: ExamProfile[];
  state: ExamProfiles;
  /** the active profile, or null when the student has not picked an exam */
  active: ExamProfile | null;
  activeExam: string | null;
  /** "JEE Main", or null */
  label: string | null;
  /** days to the active exam, null when it has no date */
  daysLeft: number | null;
  /** make another profile active: one profile write, then every screen follows without a reload */
  setActive(exam: string): Promise<void>;
  /** write a changed profile list (add / remove / change date) in one profile write */
  commit(next: ExamProfiles): Promise<void>;
}

/** The active exam of the signed-in student or guest. Switching re-renders everything that reads it. */
export function useActiveExam(today?: string): ActiveExamApi {
  const store = useStore();
  const { loading, profile } = useOnboardingProfile();
  const state = useMemo<ExamProfiles>(() => ({ profiles: profile.profiles, active: profile.examId }), [profile.profiles, profile.examId]);
  const active = activeProfile(state);
  const commit = useCallback(
    async (next: ExamProfiles) => {
      await persistExamState(store, next);
      notifyProfileChanged();
    },
    [store],
  );
  const setActive = useCallback(
    async (exam: string) => {
      if (exam === state.active) return;
      const next = withActive(state, exam);
      if (next === state) return;
      await commit(next);
    },
    [state, commit],
  );
  const day = today ?? planDate(new Date());
  return {
    loading,
    profiles: state.profiles,
    state,
    active,
    activeExam: active?.exam ?? null,
    label: active ? examLabel(active.exam) : null,
    daysLeft: active && active.kind !== 'none' && active.date ? daysLeft(active.date, day) : null,
    setActive,
    commit,
  };
}
