import { describe, expect, it } from 'vitest';
import { mergeResults, runSim, summarize } from './harness';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const FULL = env.KAIROS_SIM_FULL === '1';

describe.skipIf(!FULL)('full validation sim (KAIROS_SIM_FULL=1): 1,000 students', () => {
  it('planner beats random and chapter-order practice', async () => {
    const days = Number(env.KAIROS_SIM_DAYS ?? 100);
    const students = Number(env.KAIROS_SIM_STUDENTS ?? 1000);
    const parts = [];
    // batches of 50, yielding to the event loop so the vitest worker stays responsive
    for (let first = 0; first < students; first += 50) {
      parts.push(runSim({ students: Math.min(50, students - first), firstStudent: first, days, seed: 2026 }));
      await new Promise((r) => setTimeout(r, 0));
    }
    const res = summarize(mergeResults(parts));
    console.log(JSON.stringify(res, null, 2));
    expect(res.passes).toBe(true);
  }, 3_600_000);
});
