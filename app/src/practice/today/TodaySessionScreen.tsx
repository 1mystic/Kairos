import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { MasteryDoc, Question, Task } from '@kairos/core';
import { useAuth } from '../../auth/AuthProvider';
import { Banner, Button, Card, EmptyState, LinkButton, Page, PageHeader, SkeletonCards } from '../../components/ui';
import { planDate } from '../../onboarding/profileModel';
import { useOnboardingProfile } from '../../onboarding/useOnboardingProfile';
import { useTodayPlan } from '../../plan/usePlan';
import { reportSession } from '../../telemetry';
import { useSignInNudge, useStore } from '../../store';
import { getSessionBuffer, isResumable, type BufferedSession } from '../buffer';
import { commitSession, type SessionMeta } from '../finish';
import { hashSeed } from '../rng';
import { SessionRunner } from '../SessionRunner';
import { buildTodayQueue, completedTaskIds, isSessionTask, type TodayQueue } from './buildTodayQueue';
import { DEFAULT_SUGGEST_SIZE, suggestSession } from './suggestSession';
import { loadChapterInfos, loadShards, loadTodayContext } from './todayData';
import { fmtMin } from '../../plan/format';
import { todaySessionPrefix } from './useTodayCard';

type RunBase = Parameters<typeof SessionRunner>[0]['base'];

type Phase =
  | { kind: 'loading' }
  | { kind: 'no_exam' }
  | { kind: 'empty'; notes: string[] }
  | { kind: 'error'; message: string; retry?: () => void }
  | { kind: 'ready'; built: TodayQueue; run: RunInfo; more: boolean }
  | { kind: 'run'; questions: Question[]; base: RunBase; initial: BufferedSession | null; resumed: boolean }
  | { kind: 'saving' };

interface RunInfo {
  exam: string;
  chapters: string[];
  seed: number;
  date: string;
}

const MORE_SIZE = 15;
const newId = (date: string) => `${todaySessionPrefix(date)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * `/practice/today`: builds the day's session from the plan (or from mastery when there is no plan), loads only the shards it needs,
 * shows why those questions, then runs the normal session runner. One addSession + one putState('mastery') at the end (commitSession).
 */
export function TodaySessionScreen() {
  const [sp] = useSearchParams();
  const more = sp.get('more') === '1';
  const store = useStore();
  const nav = useNavigate();
  const { nudge } = useSignInNudge();
  const { user } = useAuth();
  const plan = useTodayPlan();
  const profile = useOnboardingProfile();
  const buffer = getSessionBuffer();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [why, setWhy] = useState(false);
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  });
  const ranFor = useRef<string | null>(null);

  const waiting = plan.loading || profile.loading;
  const uid = user?.uid ?? 'guest';

  useEffect(() => {
    if (waiting) return;
    const key = `${attempt}:${more}`;
    if (ranFor.current === key) return;
    ranFor.current = key;
    let live = true;
    const set = (p: Phase) => live && setPhase(p);
    (async () => {
      try {
        const now = Date.now();
        const date = planDate(new Date(now));
        const view = plan.state.kind === 'ready' ? plan.state.view : null;
        const exam = view?.ctx.exam.exam ?? profile.profile.exams[0]?.exam;
        if (!exam) return set({ kind: 'no_exam' });
        const examOf = view?.ctx.syllabus.examOf ?? {};
        const { infos, manifest, version } = await loadChapterInfos(exam);
        const nameOf: Record<string, string> = { ...(view?.ctx.syllabus.names ?? {}) };
        for (const c of infos) nameOf[c.id] ??= c.name;

        // an unfinished Today session from this date resumes as it was
        const saved = await buffer.load().catch(() => null);
        if (isResumable(saved, now) && saved.id.startsWith(todaySessionPrefix(date)) && !more) {
          const shards = await loadShards(manifest, version, saved.exam, saved.chapters, examOf);
          const byId = new Map(Object.values(shards).flat().map((q) => [q.id, q]));
          const questions = saved.qids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
          if (questions.length === saved.qids.length) {
            const base: RunBase = { id: saved.id, startedAt: saved.startedAt, exam: saved.exam, chapter: saved.chapter, chapters: saved.chapters, mode: saved.mode, size: saved.size, seed: saved.seed };
            return set({ kind: 'run', questions, base, initial: saved, resumed: true });
          }
          await buffer.clear().catch(() => {});
        }

        const ctx = await loadTodayContext(store, now);
        let tasks: Task[] = [];
        if (view && !more) tasks = view.plan.tasks.filter((t) => isSessionTask(t) && t.status === 'todo');
        if (tasks.length === 0) {
          const s = suggestSession({ exam, mastery: ctx.mastery, chaptersDone: profile.profile.chaptersDone, chapters: infos, seen: ctx.seenByChapter, now, seed: hashSeed(`${date}|${uid}|s`), size: more ? MORE_SIZE : DEFAULT_SUGGEST_SIZE });
          tasks = s.tasks;
        }
        if (tasks.length === 0) return set({ kind: 'empty', notes: [] });
        const chaptersNeeded = [...new Set(tasks.map((t) => t.chapter))];
        const shards = await loadShards(manifest, version, exam, chaptersNeeded, examOf);
        // same date + same student + same inputs = the same queue after a reload
        const seed = hashSeed(`${date}|${uid}|${more ? 'more' : 'plan'}`);
        const built = buildTodayQueue({ tasks, questionsByChapter: shards, seen: ctx.seen, mastery: ctx.mastery as MasteryDoc | null, now, seed, names: nameOf });
        if (built.queue.length === 0) return set({ kind: 'empty', notes: built.explain.slice(1) });
        set({ kind: 'ready', built, more, run: { exam, chapters: [...new Set(built.sections.map((s) => s.task.chapter))], seed, date } });
      } catch (e) {
        set({ kind: 'error', message: e instanceof Error ? e.message : String(e), retry: () => { ranFor.current = null; setPhase({ kind: 'loading' }); setAttempt((n) => n + 1); } });
      }
    })();
    return () => {
      live = false;
      // StrictMode re-runs the effect: allow it to start over
      ranFor.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, attempt, more]);

  const start = useCallback((built: TodayQueue, run: RunInfo) => {
    const base: RunBase = { id: newId(run.date), startedAt: Date.now(), exam: run.exam, chapter: 'mixed', chapters: run.chapters, mode: 'relaxed', size: built.queue.length, seed: run.seed };
    setPhase({ kind: 'run', questions: built.queue, base, initial: null, resumed: false });
  }, []);

  const finish = async (
    run: { questions: Question[]; base: RunBase },
    r: { events: Parameters<typeof commitSession>[2]['events']; reasons: Record<string, string>; endedAt: number },
  ) => {
    setPhase({ kind: 'saving' });
    const { base } = run;
    // plan tasks this session fully covered and that are still open; ticked once, after the session is stored
    const open = planRef.current.plan?.tasks.filter((t) => t.status === 'todo') ?? [];
    const taskIds = completedTaskIds(open, run.questions);
    try {
      const meta: SessionMeta & Record<string, unknown> = {
        id: base.id,
        startedAt: base.startedAt,
        endedAt: r.endedAt,
        exam: base.exam,
        chapter: base.chapter,
        chapters: base.chapters,
        mode: base.mode,
        source: 'today',
        ...(taskIds.length ? { planTaskIds: taskIds } : {}),
      };
      const committed = await commitSession(store, meta, { events: r.events, questions: run.questions, reasons: r.reasons });
      try { const sm = committed.result.summary; reportSession({ exam: base.exam, answered: sm.correct + sm.wrong, correct: sm.correct }); } catch { /* telemetry never blocks */ }
      await buffer.clear().catch(() => {});
      // the planner's own auto-tick would also see this session; tick() only flips tasks that are still open, so nothing counts twice
      for (const id of taskIds) planRef.current.tick(id);
      nudge('first_session');
      nav(`/practice/summary/${base.id}`, { replace: true });
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e), retry: () => void finish(run, r) });
    }
  };

  const back = <LinkButton to="/practice" variant="secondary">Choose a chapter</LinkButton>;
  switch (phase.kind) {
    case 'loading':
      return (
        <Page width="reading">
          <PageHeader title="Today's session" subtitle="Building your session…" />
          <SkeletonCards count={2} cols={1} />
        </Page>
      );
    case 'saving':
      return <Page width="reading"><EmptyState title="Saving your session">Just a moment.</EmptyState></Page>;
    case 'no_exam':
      return (
        <Page width="reading">
          <EmptyState title="Pick your exam first" action={<><LinkButton to="/onboarding">Pick your exam</LinkButton> {back}</>}>
            Today's session is built from your exam and your plan.
          </EmptyState>
        </Page>
      );
    case 'empty':
      return (
        <Page width="reading">
          <EmptyState title="No questions to build a session from yet" action={back}>
            {phase.notes.length ? phase.notes.join(' ') : 'There are no questions for these chapters yet. You can choose a chapter yourself.'}
          </EmptyState>
        </Page>
      );
    case 'error':
      return (
        <Page width="reading">
          <EmptyState title={phase.retry ? 'That did not work' : 'Something went wrong'} action={<>{phase.retry && <Button onClick={phase.retry}>Try again</Button>} {back}</>}>
            {phase.message}
          </EmptyState>
        </Page>
      );
    case 'ready': {
      const { built, run } = phase;
      return (
        <Page width="reading">
          <PageHeader title="Today's session" subtitle={`${built.queue.length} questions · about ${fmtMin(built.estMin)}`} />
          <Card tone="primary" as="section" aria-label="Session ready">
            <div className="stack gap-base">
              <p className="text-body">{phase.more ? 'A little extra practice, chosen from what you have seen least.' : 'Chosen from your plan and what you have practised.'}</p>
              <div className="row-actions">
                <Button size="lg" onClick={() => start(built, run)}>Start</Button>
                <Button variant="ghost" aria-expanded={why} onClick={() => setWhy((v) => !v)}>{why ? 'Hide why' : 'See why'}</Button>
              </div>
              {why && (
                <section aria-label="Why these questions" className="stack gap-tight">
                  <h2 className="text-h3">Why these questions</h2>
                  <ul className="stack gap-tight">
                    {built.explain.map((line) => <li key={line} className="text-body">{line}</li>)}
                  </ul>
                </section>
              )}
            </div>
          </Card>
        </Page>
      );
    }
    case 'run':
      return (
        <Page width="app">
          {phase.resumed && <Banner>Picking up where you left off ({phase.initial?.index ?? 0} of {phase.questions.length} done).</Banner>}
          <SessionRunner
            key={phase.base.id}
            questions={phase.questions}
            base={phase.base}
            initial={phase.initial}
            buffer={buffer}
            onFinish={(r) => void finish(phase, r)}
            onLeave={() => nav('/')}
          />
        </Page>
      );
  }
}
