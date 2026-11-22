import { useCallback, useEffect, useMemo, useState } from 'react';
import { taskLink } from '../../plan/engine';
import { useOnboardingProfile } from '../../onboarding/useOnboardingProfile';
import { planDate } from '../../onboarding/profileModel';
import { useTodayPlan } from '../../plan/usePlan';
import { useStore } from '../../store';
import { getSessionBuffer, isResumable } from '../buffer';
import { cardModel, type CardModel } from './todayModel';
import { suggestSession, type Suggestion } from './suggestSession';
import { loadChapterInfos, loadTodayContext } from './todayData';

/** Id prefix of a Today session in the practice buffer, so only today's one is offered as "Continue". */
export const todaySessionPrefix = (date: string): string => `today-${date}-`;

/** Everything the Home card needs. Reads the plan hook plus the local resume buffer; the exam suggestion is only loaded when the plan is unavailable. */
export function useTodayCard(): { model: CardModel; retry(): void } {
  const plan = useTodayPlan();
  const profile = useOnboardingProfile();
  const store = useStore();
  const [buffered, setBuffered] = useState<{ done: number; total: number } | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionReady, setSuggestionReady] = useState(false);
  const [nonce, setNonce] = useState(0);

  const planKind = plan.state.kind;
  const exam = profile.profile.examId ?? undefined;
  const chaptersDone = profile.profile.chaptersDone;

  useEffect(() => {
    let live = true;
    getSessionBuffer()
      .load()
      .then((s) => {
        const now = Date.now();
        if (live) setBuffered(s && isResumable(s, now) && s.id.startsWith(todaySessionPrefix(planDate(new Date(now)))) ? { done: s.index, total: s.qids.length } : null);
      })
      .catch(() => live && setBuffered(null));
    return () => {
      live = false;
    };
  }, [nonce]);

  // plan failed: suggest from mastery so the card still has something useful
  useEffect(() => {
    if ((planKind !== 'error' && planKind !== 'steady') || !exam || profile.loading) return;
    let live = true;
    setSuggestionReady(false);
    (async () => {
      try {
        const now = Date.now();
        const [{ infos }, ctx] = await Promise.all([loadChapterInfos(exam), loadTodayContext(store, now)]);
        if (live) {
          setSuggestion(suggestSession({ exam, mastery: ctx.mastery, chaptersDone, chapters: infos, seen: ctx.seenByChapter, now, seed: now }));
          setSuggestionReady(true);
        }
      } catch {
        if (live) {
          setSuggestion(null);
          setSuggestionReady(true);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [planKind, exam, profile.loading, store, chaptersDone, nonce]);

  const view = plan.state.kind === 'ready' ? plan.state.view : null;
  const mockTask = plan.plan?.tasks.find((t) => t.kind === 'mock' && t.status === 'todo');
  const mockLink = view && mockTask ? taskLink(mockTask, view.ctx.syllabus.examOf, view.ctx.exam.exam) : null;
  const errorMessage = plan.state.kind === 'error' ? plan.state.message : undefined;

  const model = useMemo(
    () =>
      cardModel({
        loading: plan.loading || profile.loading,
        planKind,
        plan: plan.plan,
        names: view?.ctx.syllabus.names ?? {},
        mockLink,
        daysLeft: plan.daysLeft,
        examLabel: plan.examLabel,
        status: plan.status,
        buffered,
        suggestion,
        suggestionReady,
        hasExam: profile.hasExam || !!exam,
        chapterLink: (ch: string) => { const ex = view?.ctx.syllabus.examOf[ch] ?? exam; return ex ? `/practice/${ex}/${ch}` : null; },
        ...(errorMessage ? { errorMessage } : {}),
      }),
    [plan.loading, profile.loading, planKind, plan.plan, view, mockLink, plan.daysLeft, plan.examLabel, plan.status, buffered, suggestion, profile.hasExam, exam, errorMessage, suggestionReady],
  );

  const refresh = plan.refresh;
  const retry = useCallback(() => {
    setNonce((n) => n + 1);
    refresh();
  }, [refresh]);
  return { model, retry };
}
