import { useContext, useEffect, useState } from 'react';
import { MAX_QUESTIONS } from '@kairos/core';
import { BankContext } from '../store/bankHooks';
import { loadTaxonomy } from '../practice/taxonomy';
import { useStore } from '../store';
import type { MasteryLike } from './data';
import type { DashboardBundle } from './types';

const DAY = 86_400_000;
/** How far back we read sessions (one doc each). Older history is not shown on the dashboard. */
export const HISTORY_DAYS = 120;
/** Newest sessions read for the dashboard (one billed read each). */
export const HISTORY_SESSION_LIMIT = 200;

export interface DashboardState { loading: boolean; bundle: DashboardBundle | null; error: boolean }

/** Loads sessions, mocks, mastery, profile and pace log once (plus best-effort taxonomy names and bank usage). */
export function useDashboardData(now: () => number = Date.now): DashboardState {
  const store = useStore();
  const bank = useContext(BankContext);
  const [state, setState] = useState<DashboardState>({ loading: true, bundle: null, error: false });
  useEffect(() => {
    let live = true;
    (async () => {
      const [sessions, mocks, mastery, profile, paceLog] = await Promise.all([
        store.listSessions({ since: now() - HISTORY_DAYS * DAY, limit: HISTORY_SESSION_LIMIT }),
        store.listMocks(),
        store.getState('mastery'),
        store.getProfile(),
        store.listPaceLog().catch(() => []),
      ]);
      const [names, uploadsAndUsage] = await Promise.all([
        loadTaxonomy().then((t) => Object.fromEntries(t.subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name])))).catch(() => ({})),
        bank ? bank.store.listQuestions().then((qs) => ({ qs })).catch(() => null) : Promise.resolve(null),
      ]);
      const qs = uploadsAndUsage?.qs ?? null;
      const byDay = new Map<number, number>();
      for (const q of qs ?? []) {
        const d = new Date(q.created_at);
        d.setHours(0, 0, 0, 0);
        byDay.set(d.getTime(), (byDay.get(d.getTime()) ?? 0) + 1);
      }
      const bundle: DashboardBundle = {
        sessions, mocks, mastery: mastery as MasteryLike | null, profile, paceLog, names,
        uploads: [...byDay].map(([at, count]) => ({ at: at + 12 * 3_600_000, count })),
        usage: qs ? { questions: qs.length, limit: MAX_QUESTIONS } : null,
        band: null, workRemainingMin: null,
      };
      if (live) setState({ loading: false, bundle, error: false });
    })().catch(() => { if (live) setState({ loading: false, bundle: null, error: true }); });
    return () => { live = false; };
  }, [store, bank, now]);
  return state;
}
