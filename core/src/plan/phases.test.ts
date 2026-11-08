import { describe, expect, it } from 'vitest';
import { DEFAULT_PHASES, phaseFor, phasesFromSignup, type PhaseDef } from './phases';

describe('phases', () => {
  it.each([
    [200, 'build'], [121, 'build'], [120, 'strengthen'], [61, 'strengthen'], [60, 'consolidate'], [31, 'consolidate'],
    [30, 'exam_mode'], [16, 'exam_mode'], [15, 'final_sprint'], [3, 'final_sprint'], [2, 'taper'], [0, 'taper'], [-4, 'taper'],
  ])('%i days left -> %s', (d, id) => expect(phaseFor(d).id).toBe(id));

  it('mixes sum to 100', () => {
    for (const p of DEFAULT_PHASES) expect(p.mix.new + p.mix.weak + p.mix.review + p.mix.mixed).toBe(100);
  });
  it('short runways start mid-table', () => {
    expect(phasesFromSignup(40)[0]?.id).toBe('consolidate');
    expect(phasesFromSignup(10)[0]?.id).toBe('final_sprint');
    expect(phasesFromSignup(10).map((p) => p.id)).toEqual(['final_sprint', 'taper']);
    expect(phasesFromSignup(500)).toHaveLength(6);
  });
  it('thresholds are configurable', () => {
    const cfg: PhaseDef[] = DEFAULT_PHASES.map((p) => (p.id === 'build' ? { ...p, minDays: 200 } : p));
    expect(phaseFor(150, cfg).id).toBe('strengthen');
    expect(phaseFor(200, cfg).id).toBe('build');
  });
});
