import type { PaceStatus, Task } from '@kairos/core';
import type { PlanView } from './usePlan';
import { subjectLabel } from './syllabus';

export function fmtMin(m: number): string {
  const r = Math.round(m);
  if (r < 60) return `${r} min`;
  const h = Math.floor(r / 60);
  const mm = r % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

export const STATUS_WORDS: Record<PaceStatus, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  ahead: { label: 'Ahead', tone: 'good' },
  on_track: { label: 'On track', tone: 'good' },
  slightly_behind: { label: 'Slightly behind', tone: 'warn' },
  behind: { label: 'Behind', tone: 'bad' },
};

export type GroupId = 'mock' | 'warmup' | 'weak' | 'practice' | 'review' | 'check';
export const GROUP_LABEL: Record<GroupId, string> = {
  mock: 'Mock',
  check: 'Check-in',
  warmup: 'Warm-up',
  weak: 'Hardest first',
  practice: 'Mixed practice',
  review: 'Light review',
};
const ORDER: GroupId[] = ['mock', 'check', 'warmup', 'weak', 'practice', 'review'];

export function groupOf(t: Task): GroupId {
  if (t.kind === 'mock' || t.topic === 'mock_analysis') return 'mock';
  if (t.kind === 'diagnostic') return 'check';
  if (t.warmup) return 'warmup';
  if (t.kind === 'fsrs_due' || t.kind === 'light_review' || t.kind === 'review' || t.bucket === 'review') return 'review';
  if (t.bucket === 'weak') return 'weak';
  return 'practice';
}

export function groupTasks(tasks: readonly Task[]): Array<{ id: GroupId; label: string; tasks: Task[] }> {
  return ORDER.map((id) => ({ id, label: GROUP_LABEL[id], tasks: tasks.filter((t) => groupOf(t) === id) })).filter((g) => g.tasks.length > 0);
}

export function taskTitle(t: Task, names: Record<string, string>): string {
  if (t.kind === 'mock') return 'Full mock test';
  if (t.topic === 'mock_analysis') return 'Review your mock';
  if (t.kind === 'diagnostic') return 'Quick check-in quiz';
  return names[t.chapter] ?? t.chapter;
}

export function taskMeta(t: Task): string {
  if (t.items <= 0) return `about ${fmtMin(t.est_min)}`;
  return `${t.items} question${t.items === 1 ? '' : 's'} · about ${fmtMin(t.est_min)}${t.subject ? ` · ${subjectLabel(t.subject)}` : ''}`;
}

export function todayLine(v: Pick<PlanView, 'plan' | 'ctx'>): string {
  const p = v.plan;
  if (p.tasks.length === 0) return p.warnings[0] ?? 'Nothing planned today.';
  const q = p.tasks.reduce((a, t) => a + (t.kind === 'mock' ? 0 : t.items), 0);
  const names = p.tasks.filter((t) => t.items > 0 && t.kind !== 'mock').slice(0, 3).map((t) => v.ctx.syllabus.names[t.chapter] ?? t.chapter);
  const head = p.tasks.some((t) => t.kind === 'mock') ? `Full mock${q ? ` + ${q} questions` : ''}` : `${q} questions`;
  return `${head} · about ${fmtMin(p.plannedMin)}${names.length ? ` · ${names.join(', ')}` : ''}`;
}
