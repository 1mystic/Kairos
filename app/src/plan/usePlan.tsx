import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  addDays,
  needsRollForward,
  reanchorNotice,
  resolveExamDate,
  type DayPlan,
  type ExamCalendar,
  type ExamCalendarEntry,
  type MasteryDoc,
  type PaceResult,
  type PaceStatus,
  type Task,
} from '@kairos/core';
import { getLatestVersion, getManifest } from '../bank/client';
import { useExamCalendar, useRoadmapDefaults } from '../config';
import { CALENDAR, findEntry, prettyDate } from '../onboarding/calendarData';
import { parseRoadmapState, resolveRoadmap } from '../roadmap/model';
import { planDate, saveOnboardingFields, toFields, parseProfile, type ExamSel, type OnboardingProfile } from '../onboarding/profileModel';
import { loadTaxonomy, type Taxonomy } from '../practice/taxonomy';
import { useStore } from '../store';
import type { PlanDoc, SessionDoc } from '../store/types';
import {
  advanceFu,
  buildPlanContext,
  buildSnapshot,
  commitDay,
  computeTodayPace,
  examState,
  nextMock,
  parkedItems,
  readPaceState,
  snapshotDue,
  todayPlan,
  yesterdayStats,
  DAY_MS,
  type PaceBundle,
  type PaceState,
  type ParkedItem,
  type PlanContext,
  type PlanSetup,
  type StoredPlan,
  type Yesterday,
} from './engine';
import { examLabel } from './syllabus';
import type { ScheduleDay } from '@kairos/core';

/* ------------------------------------------------------------------ environment (injectable for tests) */

export interface PlanEnv {
  now(): Date;
  /** exam calendar (content/exam_calendar.json by default) */
  calendar: ExamCalendar;
  loadTax(): Promise<Taxonomy>;
  /** chapter ids that have practice questions, or null when unknown (offline, no manifest) */
  loadAvailable(exams: readonly string[]): Promise<Set<string> | null>;
  /** replan-driven plan writes already made today */
  getPlanWrites(date: string): number;
  bumpPlanWrites(date: string): void;
}

export const defaultEnv: PlanEnv = {
  now: () => new Date(),
  calendar: CALENDAR,
  loadTax: loadTaxonomy,
  async loadAvailable(exams) {
    try {
      const v = await getLatestVersion();
      const m = await getManifest(v);
      const set = new Set<string>();
      for (const f of m.files) if (f.kind === 'shard' && f.chapter && exams.includes(f.exam ?? '')) set.add(f.chapter);
      return set;
    } catch {
      return null;
    }
  },
  getPlanWrites(date) {
    try {
      return Number(localStorage.getItem(`kairos-planwrites:${date}`)) || 0;
    } catch {
      return 0;
    }
  },
  bumpPlanWrites(date) {
    try {
      localStorage.setItem(`kairos-planwrites:${date}`, String(this.getPlanWrites(date) + 1));
      localStorage.removeItem(`kairos-planwrites:${addDays(date, -3)}`);
    } catch {
      /* private mode */
    }
  },
};

const EnvCtx = createContext<PlanEnv>(defaultEnv);
export function PlanEnvProvider({ env, children }: { env: Partial<PlanEnv>; children: ReactNode }) {
  const v = useMemo(() => ({ ...defaultEnv, ...env }), [env]);
  return <EnvCtx.Provider value={v}>{children}</EnvCtx.Provider>;
}

/* ------------------------------------------------------------------ view model */

export interface RollForward {
  entry: ExamCalendarEntry;
  next: ExamCalendarEntry | undefined;
  label: string;
  nextLabel: string;
}

export interface PlanView {
  today: string;
  ctx: PlanContext;
  plan: StoredPlan;
  horizon: DayPlan[];
  bundle: PaceBundle;
  yesterday: Yesterday | null;
  nextMock: ScheduleDay | null;
  parked: ParkedItem[];
  profile: OnboardingProfile;
  /** calendar entry date changed under the plan */
  reanchor: string | null;
  tax: Taxonomy;
}

export type PlanState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'passed'; exam: ExamSel }
  | { kind: 'ready'; view: PlanView }
  | { kind: 'error'; message: string };

export interface TodayPlan {
  loading: boolean;
  plan: DayPlan | null;
  pace: PaceResult | null;
  daysLeft: number | null;
  examLabel: string | null;
  status: PaceStatus | null;
  refresh(): void;
  /** toggle a task between todo and done (debounced write to plans/{date}) */
  tick(taskId: string): void;
  /** everything else the plan screens need */
  state: PlanState;
  rollForward: RollForward | null;
  acceptRollForward(date: string): Promise<void>;
  dismissRollForward(): void;
  unpark(item: ParkedItem): Promise<void>;
  parkChapters(ids: string[]): Promise<void>;
  addMinutesPerDay(n: number): Promise<void>;
  raiseAmbition(): Promise<void>;
}

const TICK_DEBOUNCE_MS = 4000;

function exampleReanchor(profile: OnboardingProfile, pace: PaceState, cal: ExamCalendar): { notice: string | null; exams: ExamSel[] | null } {
  const primary = profile.exams[0];
  if (!primary || primary.session <= 0) return { notice: null, exams: null };
  const entry = findEntry(primary.exam, primary.session, cal);
  if (!entry?.date) return { notice: null, exams: null };
  const next = resolveExamDate({ calendarEntry: entry });
  if (!next || next.date === primary.date) return { notice: null, exams: null };
  const prevStatus = pace.anchor?.status === 'official' ? 'official' : 'expected';
  const prev = { date: primary.date, status: prevStatus as 'official' | 'expected', confirmed: prevStatus === 'official' };
  const notice = reanchorNotice(prev, next) ?? `${examLabel(primary.exam)} now has ${next.status === 'official' ? 'an official' : 'an expected'} date: ${prettyDate(next.date)}. Your plan was re-anchored.`;
  return { notice, exams: [{ ...primary, date: next.date }, ...profile.exams.slice(1)] };
}

/** Today's plan and pace. Loads, replans on every open, writes at most the daily snapshot and a changed plan. */
export function useTodayPlan(): TodayPlan {
  const store = useStore();
  const baseEnv = useContext(EnvCtx);
  // the default calendar is the bundled file: swap in the admin-published one (tests and callers that pass their own calendar keep it)
  const remote = useExamCalendar();
  const { defaults: roadmapDefaults } = useRoadmapDefaults();
  const env = useMemo(() => (baseEnv.calendar === CALENDAR ? { ...baseEnv, calendar: remote.calendar } : baseEnv), [baseEnv, remote.calendar]);
  const [state, setState] = useState<PlanState>({ kind: 'loading' });
  const [rf, setRf] = useState<RollForward | null>(null);
  const [rfDismissed, setRfDismissed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const viewRef = useRef<PlanView | null>(null);
  const writtenRef = useRef<StoredPlan | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const v = viewRef.current;
    if (!dirty.current || !v) return;
    dirty.current = false;
    await store.putPlan(v.today, JSON.parse(JSON.stringify(v.plan)) as PlanDoc).catch(() => {
      dirty.current = true;
    });
    writtenRef.current = v.plan;
  }, [store]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [flush]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const now = env.now();
        const today = planDate(now);
        const profile = parseProfile(await store.getProfile());
        // roll-forward prompt: JEE Main session 1 has passed
        const rollEntry = profile.exams.map((e) => (e.session > 0 ? findEntry(e.exam, e.session, env.calendar) : undefined)).find((e) => e && needsRollForward(e, today));
        if (live)
          setRf(
            rollEntry
              ? { entry: rollEntry, next: findEntry(rollEntry.exam, rollEntry.session + 1, env.calendar), label: `${examLabel(rollEntry.exam)} Session ${rollEntry.session}`, nextLabel: `Session ${rollEntry.session + 1}` }
              : null,
          );
        const es = examState(profile, today);
        if (es.kind === 'none') return live && setState({ kind: 'none' });
        if (es.kind === 'passed') return live && setState({ kind: 'passed', exam: es.exam });

        const [tax, mastery, paceRaw, roadmapRaw] = await Promise.all([env.loadTax(), store.getState('mastery').catch(() => null), store.getState('pace').catch(() => null), store.getState('roadmap').catch(() => null)]);
        const scheduleConfig = resolveRoadmap(parseRoadmapState(roadmapRaw), roadmapDefaults).schedule;
        let pace = readPaceState(paceRaw);
        const re = exampleReanchor(profile, pace, env.calendar);
        let exams = profile.exams;
        let dirtyPace = false;
        if (re.exams) {
          exams = re.exams;
          await saveOnboardingFields(store, toFields({ exams }));
          pace = { ...pace, anchor: { date: re.exams[0]!.date, status: 'official' } };
          dirtyPace = true;
        }
        const setup: PlanSetup = { exams, ambition: profile.ambition, minutesPerWeekday: profile.minutesPerWeekday, offDay: profile.offDay, chaptersDone: profile.chaptersDone };
        const dates = Array.from({ length: 8 }, (_, i) => addDays(today, -i));
        const [sessions, planDocs, available] = await Promise.all([
          store.listSessions({ since: now.getTime() - 22 * DAY_MS, limit: 40 }).catch((): SessionDoc[] => []),
          Promise.all(dates.map((d) => store.getPlan(d).catch(() => null))),
          env.loadAvailable([...new Set(exams.map((e) => e.exam))]),
        ]);
        const plans = planDocs.map((p, i) => (p ? { ...p, date: dates[i]! } : null)).filter((p): p is PlanDoc & { date: string } => p !== null);
        const stored = (plans.find((p) => p.date === today) ?? null) as StoredPlan | null;
        const yesterday = yesterdayStats(plans, today);
        const due = snapshotDue(pace, today);
        const fuState = due ? advanceFu(pace.ewma, yesterday) : { ewma: pace.ewma ?? null, fu: pace.fu ?? 1 };
        const ctx = buildPlanContext({ setup, tax, today, mastery: mastery as MasteryDoc | null, sessions, recentPlans: plans, pace, fu: fuState.fu, scheduleConfig, ...(available ? { available } : {}) }, now.getTime());
        if (!ctx) return live && setState({ kind: 'passed', exam: es.exam });
        const bundle = computeTodayPace(ctx);
        const res = todayPlan(ctx, { stored, sessions });
        const snap = due ? buildSnapshot({ ctx, bundle, tax, mastery: mastery as MasteryDoc | null, yesterday, fuState, prev: pace }) : null;
        const planWrites = env.getPlanWrites(today);
        const r = await commitDay({ store, today, plan: res.plan, stored, planWritesToday: planWrites, snapshot: snap });
        if (r.planWritten && stored) env.bumpPlanWrites(today);
        if (!snap && dirtyPace) await store.putState('pace', pace as Record<string, unknown>);
        writtenRef.current = r.planWritten ? res.plan : stored;
        const view: PlanView = {
          today,
          ctx,
          plan: res.plan,
          horizon: res.horizon,
          bundle,
          yesterday,
          nextMock: nextMock(ctx),
          parked: parkedItems(ctx, res.plan, bundle),
          profile: { ...profile, exams },
          reanchor: re.notice,
          tax,
        };
        viewRef.current = view;
        dirty.current = false;
        if (live) setState({ kind: 'ready', view });
      } catch (e) {
        if (live) setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      live = false;
    };
  }, [store, env, nonce, roadmapDefaults]);

  const refresh = useCallback(() => {
    void flush().then(() => setNonce((n) => n + 1));
  }, [flush]);

  const tick = useCallback(
    (taskId: string) => {
      const v = viewRef.current;
      if (!v) return;
      const tasks: Task[] = v.plan.tasks.map((t) => (t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t));
      const plan: StoredPlan = { ...v.plan, tasks };
      const next = { ...v, plan, horizon: [plan, ...v.horizon.slice(1)] };
      viewRef.current = next;
      dirty.current = true;
      setState({ kind: 'ready', view: next });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), TICK_DEBOUNCE_MS);
    },
    [flush],
  );

  const patchPace = useCallback(
    async (fn: (p: PaceState) => PaceState) => {
      const cur = readPaceState(await store.getState('pace').catch(() => null));
      await store.putState('pace', fn(cur) as Record<string, unknown>);
      setNonce((n) => n + 1);
    },
    [store],
  );

  const view = state.kind === 'ready' ? state.view : null;
  const patchProfile = useCallback(
    async (p: Partial<OnboardingProfile>) => {
      await saveOnboardingFields(store, toFields(p));
      setNonce((n) => n + 1);
    },
    [store],
  );

  return {
    loading: state.kind === 'loading',
    plan: view?.plan ?? null,
    pace: view?.bundle.pace ?? null,
    daysLeft: view?.ctx.daysLeft ?? null,
    examLabel: view ? examLabel(view.ctx.exam.exam) : state.kind === 'passed' ? examLabel(state.exam.exam) : null,
    status: view?.bundle.pace.status ?? null,
    refresh,
    tick,
    state,
    rollForward: rfDismissed ? null : rf,
    async acceptRollForward(date) {
      if (!rf?.next) return;
      const p = parseProfile(await store.getProfile());
      const exams = p.exams.map((e) => (e.exam === rf.entry.exam && e.session === rf.entry.session ? { ...e, session: rf.next!.session, date } : e));
      await patchProfile({ exams });
      setRfDismissed(true);
    },
    dismissRollForward: () => setRfDismissed(true),
    async unpark(item) {
      await patchPace((p) =>
        item.source === 'chosen'
          ? { ...p, dropped: (p.dropped ?? []).filter((c) => c !== item.chapter) }
          : { ...p, unskipped: [...new Set([...(p.unskipped ?? []), item.chapter])] },
      );
    },
    async parkChapters(ids) {
      await patchPace((p) => ({ ...p, dropped: [...new Set([...(p.dropped ?? []), ...ids])], unskipped: (p.unskipped ?? []).filter((c) => !ids.includes(c)) }));
    },
    async addMinutesPerDay(n) {
      if (!view) return;
      const m = { ...view.profile.minutesPerWeekday };
      for (let d = 0; d < 7; d++) if (d !== view.profile.offDay && (m[d] ?? 0) > 0) m[d] = (m[d] ?? 0) + n;
      await patchProfile({ minutesPerWeekday: m });
    },
    async raiseAmbition() {
      if (!view) return;
      const next = view.profile.ambition === 'comfortable' ? 'competitive' : 'top';
      await patchProfile({ ambition: next });
    },
  };
}

export function useReanchorNotice(t: TodayPlan): string | null {
  return t.state.kind === 'ready' ? t.state.view.reanchor : null;
}
