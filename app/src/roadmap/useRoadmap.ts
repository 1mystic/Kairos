import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoadmapDefaults } from '../config';
import { useStore } from '../store';
import { DEFAULT_ROADMAP, parseRoadmapState, resolveRoadmap, type EffectiveRoadmap, type RoadmapConfig, type RoadmapState } from './model';

const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export interface RoadmapApi extends EffectiveRoadmap {
  loading: boolean;
  state: RoadmapState | null;
  /** admin defaults (null when none published) */
  adminDefaults: RoadmapConfig | null;
  /** ONE write to state/roadmap */
  save(mode: 'default' | 'custom', config?: RoadmapConfig): Promise<void>;
}

/** The effective roadmap: the student's custom config, else admin defaults, else core defaults. */
export function useRoadmap(): RoadmapApi {
  const store = useStore();
  const { defaults } = useRoadmapDefaults();
  const [raw, setRaw] = useState<{ loading: boolean; state: RoadmapState | null }>({ loading: true, state: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    subs.add(bump);
    return () => void subs.delete(bump);
  }, []);
  useEffect(() => {
    let live = true;
    store.getState('roadmap').then(
      (d) => live && setRaw({ loading: false, state: parseRoadmapState(d) }),
      () => live && setRaw({ loading: false, state: null }),
    );
    return () => {
      live = false;
    };
  }, [store, tick]);

  const save = useCallback(
    async (mode: 'default' | 'custom', config?: RoadmapConfig) => {
      const cfg = config ?? raw.state?.config;
      const doc = { v: 1, mode, ...(cfg ? { config: cfg } : {}), updatedAt: Date.now() };
      await store.putState('roadmap', doc);
      notify();
    },
    [store, raw.state],
  );

  const eff = useMemo(() => resolveRoadmap(raw.state, defaults), [raw.state, defaults]);
  return { ...eff, loading: raw.loading, state: raw.state, adminDefaults: defaults, save };
}

/** Starting point when a student switches to a custom roadmap. */
export const customStart = (api: Pick<RoadmapApi, 'state' | 'adminDefaults'>): RoadmapConfig => api.state?.config ?? api.adminDefaults ?? DEFAULT_ROADMAP;
