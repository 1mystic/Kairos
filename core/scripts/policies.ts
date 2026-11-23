/** Name -> policy registry for the study scripts (baselines, planner, planner variants / ablations). */
import { allPolicies, plannerPolicy, type Policy } from '../src/sim';

export function policyByName(name: string): Policy {
  const base = allPolicies().find((p) => p.name === name);
  if (base) return base;
  if (name === 'planner') return plannerPolicy();
  throw new Error(`unknown policy ${name}`);
}
