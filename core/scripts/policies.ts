/** Name -> policy registry for the study scripts (baselines, planner, planner variants / ablations). */
import { allPolicies, plannerPolicy, type Policy } from '../src/sim';
import type { UncertaintySignal } from '../src/plan/planner';

const SIGNALS: UncertaintySignal[] = ['examWeight', 'weakness', 'infoGain', 'forgetting'];

/**
 * planner                  product planner (heuristic priority, Elo)
 * planner_learned          + learned recall model for mastery and item targeting
 * planner_unc              uncertainty-aware priority (Phase E), Elo
 * planner_unc_learned      uncertainty-aware priority + learned recall model
 * planner_unc_no_<signal>  ablation: one signal of the uncertainty priority switched off
 * planner_unc_no_backlog   ablation: carry-over of skipped work disabled
 */
export function policyByName(name: string): Policy {
  const base = allPolicies().find((p) => p.name === name);
  if (base) return base;
  if (name === 'planner_learned') return plannerPolicy({ name, recall: 'learned', config: { recallModel: 'learned' } });
  if (name === 'planner_unc') return plannerPolicy({ name, config: { priorityMode: 'uncertainty' } });
  if (name === 'planner_unc_learned') return plannerPolicy({ name, recall: 'learned', config: { priorityMode: 'uncertainty', recallModel: 'learned' } });
  if (name === 'planner_unc_no_backlog') return plannerPolicy({ name, config: { priorityMode: 'uncertainty', carryCap: 0 } });
  const sig = SIGNALS.find((s) => name === `planner_unc_no_${s}`);
  if (sig) return plannerPolicy({ name, config: { priorityMode: 'uncertainty', signals: { [sig]: false } } });
  throw new Error(`unknown policy ${name}`);
}
