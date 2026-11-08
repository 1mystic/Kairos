import { countByKind, DEFAULT_PHASES, type MasteryDoc, type PhaseId } from '@kairos/core';
import { buildPlanContext, computeTodayPace, examState, type PaceBundle, type PlanSetup } from '../plan/engine';
import { examLabel } from '../plan/syllabus';
import type { Taxonomy } from '../practice/taxonomy';

export interface PhaseRow {
  id: PhaseId;
  label: string;
  days: number;
  tone: 0 | 1 | 2;
}

export interface PlanPreview {
  daysLeft: number;
  exam: string;
  examLabel: string;
  phases: PhaseRow[];
  startPhase: string;
  counts: { work: number; mock: number; buffer: number; taper: number; sprint: number; off: number };
  bundle: PaceBundle;
  /** plain-words runway warning, or null */
  warning: string | null;
  chapters: number;
  /** extra chapters only the second exam needs */
  extraChapters: number;
  weeklyMin: number;
}

const TONE: Record<PhaseId, 0 | 1 | 2> = { build: 0, strengthen: 0, consolidate: 0, exam_mode: 1, final_sprint: 2, taper: 2 };

export function rhoWords(status: PaceBundle['pace']['status'], rho: number): string {
  const r = Number.isFinite(rho) ? rho.toFixed(2) : 'very high';
  switch (status) {
    case 'ahead':
      return `You have more time than the work needs (ρ ${r}). You could aim higher; nothing changes unless you choose.`;
    case 'on_track':
      return `The time you have matches the work (ρ ${r}). A steady pace gets you there.`;
    case 'slightly_behind':
      return `A little tight (ρ ${r}). We would spend a few buffer days to catch up.`;
    default:
      return `More work than time at this pace (ρ ${r}). That is fixable; pick one of the two ways below.`;
  }
}

/** The "Here's your plan" numbers: reverse schedule, pace and runway warning for the entered answers. Pure. */
export function buildPreview(input: { setup: PlanSetup; tax: Taxonomy; mastery?: MasteryDoc | null; today: string; dropped?: string[] }): PlanPreview | null {
  const st = examState(input.setup, input.today);
  if (st.kind !== 'ok') return null;
  const ctx = buildPlanContext({
    setup: input.setup,
    tax: input.tax,
    today: input.today,
    mastery: input.mastery ?? null,
    sessions: [],
    recentPlans: [],
    pace: { dropped: input.dropped ?? [] },
    fu: 1,
  });
  if (!ctx) return null;
  const c = countByKind(ctx.schedule);
  const rows: PhaseRow[] = [];
  for (const d of ctx.schedule) {
    const last = rows[rows.length - 1];
    if (last && last.id === d.phase) last.days++;
    else rows.push({ id: d.phase, label: DEFAULT_PHASES.find((p) => p.id === d.phase)?.label ?? d.phase, days: 1, tone: TONE[d.phase] });
  }
  const start = ctx.schedule[0] ? rows[0]!.label : 'Taper';
  const full = ctx.daysLeft >= 121;
  let warning: string | null = null;
  if (!full) {
    warning = `Only ${ctx.daysLeft} days left: we start in ${start}.`;
    if (ctx.daysLeft < 16) warning += ' There is no room for new chapters, so we focus on what you already know and on full mocks.';
    else if (ctx.daysLeft < 31) warning += ' Early chapters will be light; we spend the time on your weak spots and practice papers.';
  }
  const weeklyMin = Object.entries(input.setup.minutesPerWeekday).reduce((a, [d, m]) => a + (Number(d) === input.setup.offDay ? 0 : m), 0);
  const primaryChapters = ctx.syllabus.chapters.length;
  const extra = ctx.others.length ? primaryChapters - Object.values(ctx.syllabus.examOf).filter((e) => e === ctx.exam.exam).length : 0;
  return {
    daysLeft: ctx.daysLeft,
    exam: ctx.exam.exam,
    examLabel: examLabel(ctx.exam.exam),
    phases: rows,
    startPhase: start,
    counts: { work: c.work, mock: c.mock, buffer: c.buffer, taper: c.taper, sprint: c.sprint_mock, off: c.off },
    bundle: computeTodayPace(ctx),
    warning,
    chapters: primaryChapters,
    extraChapters: extra,
    weeklyMin,
  };
}
