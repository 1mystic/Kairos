import type { RecallModel } from '@kairos/core';

/** Feature flags, all OFF by default. On via build env (VITE_FLAG_<UPPER_SNAKE>=1) or localStorage `kairos.flag.<name>` = '1'. */
export type FlagName = 'learnedRecall' | 'uncertaintyPlanner';

const ENV_KEY: Record<FlagName, string> = {
  learnedRecall: 'VITE_FLAG_LEARNED_RECALL',
  uncertaintyPlanner: 'VITE_FLAG_UNCERTAINTY_PLANNER',
};

export function isFlagOn(name: FlagName): boolean {
  try {
    const env = import.meta.env as Record<string, unknown> | undefined;
    if (env?.[ENV_KEY[name]] === '1') return true;
  } catch {
    /* no env */
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(`kairos.flag.${name}`) === '1') return true;
  } catch {
    /* storage blocked */
  }
  return false;
}

/** Recall model for practice picking and the planner: Elo unless `learnedRecall` is on. */
export function recallModel(): RecallModel {
  return isFlagOn('learnedRecall') ? 'learned' : 'elo';
}
