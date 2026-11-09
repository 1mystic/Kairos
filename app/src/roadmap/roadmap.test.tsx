import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { buildSchedule, countByKind } from '@kairos/core';
import { LocalStore, createMemoryLocalDb } from '../store';
import { fakeFs } from '../store/testUtils';
import { Harness, TAX } from '../plan/harness.test-util';
import { setConfigEnv } from '../config';
import { DEFAULT_ROADMAP, clampRoadmap, parseRoadmapConfig, parseRoadmapState, phaseErrors, resolveRoadmap, toDefaultsDoc, toScheduleConfig, validateRoadmap, type RoadmapConfig } from './model';
import { Stepper, RoadmapForm } from './RoadmapForm';
import { RoadmapPage } from './RoadmapPage';
import { toggleDateSource } from './ExamPlanSettings';
import { useRoadmap } from './useRoadmap';
import { useState } from 'react';

const custom: RoadmapConfig = { ...DEFAULT_ROADMAP, sprintDays: 25, taperDays: 4, workDaysPerBuffer: 5 };

describe('roadmap model', () => {
  it('clamps every field into the contract ranges', () => {
    const c = clampRoadmap({ taperDays: 50, sprintDays: 1, workDaysPerBuffer: 100, mockMinCapacityMin: 5, phases: { build: 9999, strengthen: -4 } });
    expect(c).toMatchObject({ taperDays: 7, sprintDays: 5, workDaysPerBuffer: 14, mockMinCapacityMin: 60 });
    expect(c.phases.build).toBe(400);
    expect(c.phases.strengthen).toBe(1);
  });
  it('requires phases to be monotonic', () => {
    expect(phaseErrors(DEFAULT_ROADMAP)).toEqual([]);
    const bad = { ...DEFAULT_ROADMAP, phases: { ...DEFAULT_ROADMAP.phases, strengthen: 130 } };
    expect(phaseErrors(bad)[0]).toMatch(/Build must start earlier than Strengthen/);
    expect(validateRoadmap(bad).errors).toHaveLength(1);
    expect(parseRoadmapConfig({ ...toDefaultsDoc(bad) })!.phases).toEqual(DEFAULT_ROADMAP.phases);
  });
  it('maps to a core schedule config that changes the schedule', () => {
    const base = { today: '2026-11-08', examDate: '2027-02-16', minutesPerWeekday: { 0: 240, 1: 240, 2: 240, 3: 240, 4: 240, 5: 240, 6: 240 }, offDay: null };
    const a = countByKind(buildSchedule(base));
    const b = countByKind(buildSchedule({ ...base, config: toScheduleConfig(custom) }));
    expect(b.taper).toBe(4);
    expect(b.taper).not.toBe(a.taper);
  });
  it('useRoadmap precedence: custom, else admin defaults, else core defaults', () => {
    const admin = { ...DEFAULT_ROADMAP, sprintDays: 20 };
    const st = parseRoadmapState({ v: 1, mode: 'custom', config: custom, updatedAt: 1 });
    expect(resolveRoadmap(st, admin)).toMatchObject({ source: 'custom', config: custom });
    expect(resolveRoadmap(parseRoadmapState({ v: 1, mode: 'default', config: custom, updatedAt: 1 }), admin)).toMatchObject({ source: 'admin' });
    expect(resolveRoadmap(null, admin).schedule.sprintDays).toBe(20);
    expect(resolveRoadmap(null, null)).toMatchObject({ source: 'core', schedule: {} });
  });
  it('toggles the date source between calendar session and own date', () => {
    const cal = [{ id: 'a', exam: 'JEE_MAIN', session: 2, date: '2027-04-04', status: 'official' as const }];
    expect(toggleDateSource([{ exam: 'JEE_MAIN', session: 1, date: '2027-01-22' }], cal)).toEqual([{ exam: 'JEE_MAIN', session: 0, date: '2027-01-22' }]);
    expect(toggleDateSource([{ exam: 'JEE_MAIN', session: 0, date: '2027-04-04' }], cal)).toEqual([{ exam: 'JEE_MAIN', session: 2, date: '2027-04-04' }]);
    expect(toggleDateSource([], cal)).toBeNull();
  });
});

describe('roadmap form', () => {
  it('stepper clamps on blur', async () => {
    let v = 15;
    const { rerender } = render(<Stepper label="Final sprint" value={v} min={5} max={30} onChange={(n) => { v = n; }} />);
    const input = screen.getByLabelText('Final sprint');
    await userEvent.clear(input);
    await userEvent.type(input, '99');
    await userEvent.tab();
    expect(v).toBe(30);
    rerender(<Stepper label="Final sprint" value={v} min={5} max={30} onChange={() => {}} />);
    expect(screen.getByLabelText('Final sprint')).toHaveValue(30);
  });
  it('shows a monotonic-phase error and keeps values clamped', async () => {
    function F() {
      const [c, setC] = useState(DEFAULT_ROADMAP);
      return <RoadmapForm value={c} onChange={setC} />;
    }
    render(<F />);
    const input = screen.getByLabelText('Strengthen starts at');
    await userEvent.clear(input);
    await userEvent.type(input, '500');
    await userEvent.tab();
    expect(input).toHaveValue(400);
    expect(screen.getByRole('alert')).toHaveTextContent(/Build must start earlier/);
  });
});

describe('roadmap persistence', () => {
  it('useRoadmap saves with ONE write to users/{uid}/state/roadmap (signed in)', async () => {
    setConfigEnv({ fetchDoc: async () => null, storage: null });
    const f = fakeFs({ 'users/u1': { displayName: 'A' } });
    const sets: string[] = [];
    const adapter = { ...f.adapter, set: async (p: string, d: Record<string, unknown>) => { sets.push(p); return f.adapter.set(p, d); } };
    function P() {
      const r = useRoadmap();
      return <button onClick={() => void r.save('custom', custom)}>save {r.mode}</button>;
    }
    render(<Harness fsAdapter={adapter} uid="u1"><P /></Harness>);
    await userEvent.click(await screen.findByRole('button', { name: 'save default' }));
    await waitFor(() => expect(sets).toEqual(['users/u1/state/roadmap']));
    expect(f.docs.get('users/u1/state/roadmap')).toMatchObject({ v: 1, mode: 'custom', config: custom });
    expect(typeof f.docs.get('users/u1/state/roadmap')?.updatedAt).toBe('number');
  });

  it('the page saves a custom roadmap once and blocks invalid phase order', async () => {
    setConfigEnv({ fetchDoc: async () => null, storage: null });
    const db = createMemoryLocalDb();
    await new LocalStore(db).saveProfile({ kind: 'guest', displayName: 'G', createdAt: 1, exam: 'JEE_MAIN.0', examDate: '2027-02-16', onboarded: true });
    render(<Harness localDb={db}><RoadmapPage taxonomy={TAX} today="2026-11-08" /></Harness>);
    await userEvent.click(await screen.findByRole('radio', { name: /Custom roadmap/ }));
    const input = await screen.findByLabelText('A buffer day every');
    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.tab();
    await userEvent.click(screen.getByRole('button', { name: 'Save roadmap' }));
    await waitFor(async () => expect(await new LocalStore(db).getState('roadmap')).toMatchObject({ mode: 'custom', config: { workDaysPerBuffer: 5 } }));
    expect(screen.getByRole('img', { name: /Build|Strengthen|Consolidate|Exam mode|Final sprint|Taper/i })).toBeInTheDocument();
    const ph = screen.getByLabelText('Build starts at');
    await userEvent.clear(ph);
    await userEvent.type(ph, '10');
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Save roadmap' })).toBeDisabled();
  });
});
