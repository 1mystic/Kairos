import { useEffect, useState } from 'react';
import type { MasteryDoc, ScoreBand } from '@kairos/core';
import { loadTaxonomy, isExamId, type Taxonomy } from '../practice/taxonomy';
import { useStore, type UserStore } from '../store';
import { toYmd } from '../lib/profile';
import { blueprintsForExam, loadExamBank } from './examBank';
import { loadChapterWeights, prepareBank, subjectAliases } from './mockPlan';
import {
  SIMS_DESKTOP,
  SIMS_MOBILE,
  cacheFresh,
  confidenceOf,
  dataStats,
  maxOf,
  readCache,
  runPredict,
  targetFor,
  thetaTable,
  writeCache,
  type KV,
  type PredictConfidence,
  type PredictInput,
} from './predicted';

export interface PredictedScore {
  loading: boolean;
  band: { p25: number; p50: number; p75: number; mean: number } | null;
  confidence: PredictConfidence;
  target?: number;
  updatedAt: number | null;
  /** max marks of the paper (bar scale) */
  max?: number;
  /** practice attempts the estimate rests on */
  attempts?: number;
  exam?: string;
}

export interface PredictDeps {
  kv?: KV;
  now?: () => number;
  /** default: Web Worker when available, else the main thread after idle */
  predict?(i: PredictInput): Promise<ScoreBand>;
  loadBank?: typeof loadExamBank;
  loadBlueprints?: typeof blueprintsForExam;
  loadTaxonomy?: () => Promise<Taxonomy | null>;
  mobile?: boolean;
}

const idle = (fn: () => void) => {
  const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 4000 });
  else setTimeout(fn, 200);
};

/** Worker when the platform has one (keeps the UI smooth on phones), else idle main-thread. */
export function defaultPredict(i: PredictInput): Promise<ScoreBand> {
  if (typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      let w: Worker;
      try {
        w = new Worker(new URL('./predictWorker.ts', import.meta.url), { type: 'module' });
      } catch {
        return idle(() => resolve(runPredict(i)));
      }
      w.onmessage = (e: MessageEvent<{ ok: boolean; band?: ScoreBand; error?: string }>) => {
        w.terminate();
        if (e.data.ok && e.data.band) resolve(e.data.band);
        else reject(new Error(e.data.error ?? 'predict failed'));
      };
      w.onerror = () => {
        w.terminate();
        idle(() => resolve(runPredict(i)));
      };
      w.postMessage(i);
    });
  }
  return new Promise((resolve) => idle(() => resolve(runPredict(i))));
}

const isMobile = () => typeof window !== 'undefined' && (window.matchMedia?.('(max-width: 768px)').matches ?? false);

const EMPTY: PredictedScore = { loading: false, band: null, confidence: 'not_enough_data', updatedAt: null };

/**
 * Predicted score band (5.10), computed on app open at most once a day: cached in localStorage
 * `kairos-predicted` with its date, recomputed early only if mastery changed materially or the exam changed.
 * The cheap data-sufficiency check runs first, so a new student never triggers the bank download.
 */
export function usePredictedScore(deps: PredictDeps = {}): PredictedScore {
  const store = useStore();
  return usePredictedScoreFor(store, deps);
}

export function usePredictedScoreFor(store: UserStore, deps: PredictDeps = {}): PredictedScore {
  const [s, setS] = useState<PredictedScore>({ ...EMPTY, loading: true });
  useEffect(() => {
    let live = true;
    const kv: KV = deps.kv ?? localStorage;
    const now = deps.now ?? Date.now;
    (async () => {
      try {
        const [profile, doc] = await Promise.all([store.getProfile().catch(() => null), store.getState('mastery').catch(() => null)]);
        const mastery = doc as MasteryDoc | null;
        const exam = isExamId(profile?.exam) ? profile.exam : 'JEE_MAIN';
        const ambition = (profile as { ambition?: string } | null)?.ambition;
        const stats = dataStats(mastery);
        const confidence = confidenceOf(mastery);
        if (confidence === 'not_enough_data' || !mastery) {
          if (live) setS({ ...EMPTY, loading: false, attempts: stats.attempts, exam });
          return;
        }
        const today = toYmd(new Date(now()));
        const cached = readCache(kv);
        if (cacheFresh(cached, today, exam, stats)) {
          if (live) setS({ loading: false, band: cached.band, confidence, target: targetFor(ambition, cached.max), updatedAt: cached.updatedAt, max: cached.max, attempts: stats.attempts, exam });
          return;
        }
        await new Promise<void>((r) => idle(r)); // lazily: never competes with first paint
        if (!live) return;
        const [{ blueprints }, bank, tax] = await Promise.all([
          (deps.loadBlueprints ?? blueprintsForExam)(exam),
          (deps.loadBank ?? loadExamBank)(exam, () => {}),
          (deps.loadTaxonomy ?? (() => loadTaxonomy().catch(() => null)))(),
        ]);
        const blueprint = blueprints[0];
        if (!blueprint) throw new Error('no blueprint');
        const { prepared } = prepareBank(bank.questions, blueprint, subjectAliases(tax));
        const { weights } = await loadChapterWeights(blueprint, bank.version, bank.questions);
        const input: PredictInput = {
          blueprint,
          bank: prepared,
          table: thetaTable(mastery, tax, prepared),
          weights,
          sims: (deps.mobile ?? isMobile()) ? SIMS_MOBILE : SIMS_DESKTOP,
          seed: Number(today.replaceAll('-', '')),
        };
        const band = await (deps.predict ?? defaultPredict)(input);
        const max = maxOf(blueprint);
        const c = { v: 1 as const, date: today, exam, blueprintId: blueprint.id, band, confidence, max, topics: stats.topics, attempts: stats.attempts, updatedAt: now() };
        writeCache(kv, c);
        if (live) setS({ loading: false, band, confidence, target: targetFor(ambition, max), updatedAt: c.updatedAt, max, attempts: stats.attempts, exam });
      } catch {
        // a missing bank or blueprint just means no band; never an error screen on Home
        if (live) setS({ ...EMPTY, loading: false });
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);
  return s;
}
