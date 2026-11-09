import { DEFAULT_PHASES, type PhaseId, type ScheduleConfig } from '@kairos/core';

/** Same ranges as the firestore.rules contract for config/roadmap_defaults. */
export const RANGES = {
  taperDays: [0, 7],
  sprintDays: [5, 30],
  workDaysPerBuffer: [3, 14],
  mockMinCapacityMin: [60, 300],
  phase: [1, 400],
} as const;

/** Phases the student can set a "days left" start for. Taper always runs to exam day. */
export const EDITABLE_PHASES = ['build', 'strengthen', 'consolidate', 'exam_mode', 'final_sprint'] as const;
export type EditablePhase = (typeof EDITABLE_PHASES)[number];

export interface RoadmapConfig {
  taperDays: number;
  sprintDays: number;
  workDaysPerBuffer: number;
  mockMinCapacityMin: number;
  /** days-left thresholds: a phase starts when this many days (or fewer) remain, until the next phase begins */
  phases: Record<EditablePhase, number>;
}

export const DEFAULT_ROADMAP: RoadmapConfig = {
  taperDays: 2,
  sprintDays: 15,
  workDaysPerBuffer: 7,
  mockMinCapacityMin: 210,
  phases: Object.fromEntries(EDITABLE_PHASES.map((id) => [id, DEFAULT_PHASES.find((p) => p.id === id)!.minDays])) as Record<EditablePhase, number>,
};

export const PHASE_LABEL: Record<EditablePhase, string> = {
  build: 'Build',
  strengthen: 'Strengthen',
  consolidate: 'Consolidate',
  exam_mode: 'Exam mode',
  final_sprint: 'Final sprint',
};

const clamp = (x: unknown, [lo, hi]: readonly [number, number], d: number): number => {
  const n = typeof x === 'number' && Number.isFinite(x) ? Math.round(x) : d;
  return Math.min(hi, Math.max(lo, n));
};

export const clampField = (k: Exclude<keyof RoadmapConfig, 'phases'>, v: number): number => clamp(v, RANGES[k], DEFAULT_ROADMAP[k]);
export const clampPhase = (v: number): number => clamp(v, RANGES.phase, 1);

/** Every field clamped into its allowed range. Phase order is checked separately (see phaseErrors). */
export function clampRoadmap(c: Partial<RoadmapConfig> & { phases?: Partial<Record<EditablePhase, number>> }): RoadmapConfig {
  const phases = { ...DEFAULT_ROADMAP.phases };
  for (const id of EDITABLE_PHASES) phases[id] = clamp(c.phases?.[id], RANGES.phase, DEFAULT_ROADMAP.phases[id]);
  return {
    taperDays: clampField('taperDays', c.taperDays ?? DEFAULT_ROADMAP.taperDays),
    sprintDays: clampField('sprintDays', c.sprintDays ?? DEFAULT_ROADMAP.sprintDays),
    workDaysPerBuffer: clampField('workDaysPerBuffer', c.workDaysPerBuffer ?? DEFAULT_ROADMAP.workDaysPerBuffer),
    mockMinCapacityMin: clampField('mockMinCapacityMin', c.mockMinCapacityMin ?? DEFAULT_ROADMAP.mockMinCapacityMin),
    phases,
  };
}

/** Plain-words problems with the phase order: each phase must start earlier (more days left) than the next. */
export function phaseErrors(c: RoadmapConfig): string[] {
  const out: string[] = [];
  for (let i = 0; i + 1 < EDITABLE_PHASES.length; i++) {
    const a = EDITABLE_PHASES[i]!;
    const b = EDITABLE_PHASES[i + 1]!;
    if (c.phases[a] <= c.phases[b]) out.push(`${PHASE_LABEL[a]} must start earlier than ${PHASE_LABEL[b]}: give it more days left (more than ${c.phases[b]}).`);
  }
  return out;
}

export function validateRoadmap(c: RoadmapConfig): { config: RoadmapConfig; errors: string[] } {
  const config = clampRoadmap(c);
  return { config, errors: phaseErrors(config) };
}

/** Core schedule config for a roadmap (taper phase keeps its default threshold of 0). */
export function toScheduleConfig(c: RoadmapConfig): ScheduleConfig {
  return {
    taperDays: c.taperDays,
    sprintDays: c.sprintDays,
    workDaysPerBuffer: c.workDaysPerBuffer,
    mockMinCapacityMin: c.mockMinCapacityMin,
    phases: DEFAULT_PHASES.map((p) => (p.id === 'taper' ? p : { ...p, minDays: c.phases[p.id as EditablePhase] })),
  };
}

/** Wire form of config/roadmap_defaults (contract: phases is a map of PhaseId -> minDays). */
export function toDefaultsDoc(c: RoadmapConfig): { v: 1; taperDays: number; sprintDays: number; workDaysPerBuffer: number; mockMinCapacityMin: number; phases: Partial<Record<PhaseId, number>> } {
  return { v: 1, taperDays: c.taperDays, sprintDays: c.sprintDays, workDaysPerBuffer: c.workDaysPerBuffer, mockMinCapacityMin: c.mockMinCapacityMin, phases: { ...c.phases } };
}

/** Parse config/roadmap_defaults or a stored custom config. Out-of-range values are clamped; bad phase order falls back to the defaults. */
export function parseRoadmapConfig(raw: unknown): RoadmapConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const c = clampRoadmap({
    taperDays: r.taperDays as number,
    sprintDays: r.sprintDays as number,
    workDaysPerBuffer: r.workDaysPerBuffer as number,
    mockMinCapacityMin: r.mockMinCapacityMin as number,
    phases: (r.phases && typeof r.phases === 'object' ? r.phases : {}) as Partial<Record<EditablePhase, number>>,
  });
  return phaseErrors(c).length ? { ...c, phases: { ...DEFAULT_ROADMAP.phases } } : c;
}

export interface RoadmapState {
  v: 1;
  mode: 'default' | 'custom';
  config?: RoadmapConfig;
  updatedAt: number;
}

export function parseRoadmapState(raw: unknown): RoadmapState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const mode = r.mode === 'custom' ? 'custom' : 'default';
  const config = parseRoadmapConfig(r.config);
  return { v: 1, mode, ...(config ? { config } : {}), updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : 0 };
}

export interface EffectiveRoadmap {
  mode: 'default' | 'custom';
  /** who decides the numbers */
  source: 'custom' | 'admin' | 'core';
  config: RoadmapConfig;
  schedule: ScheduleConfig;
}

/** Custom config, else admin defaults, else core defaults. */
export function resolveRoadmap(state: RoadmapState | null, admin: RoadmapConfig | null): EffectiveRoadmap {
  if (state?.mode === 'custom' && state.config) return { mode: 'custom', source: 'custom', config: state.config, schedule: toScheduleConfig(state.config) };
  if (admin) return { mode: 'default', source: 'admin', config: admin, schedule: toScheduleConfig(admin) };
  return { mode: 'default', source: 'core', config: DEFAULT_ROADMAP, schedule: {} };
}
