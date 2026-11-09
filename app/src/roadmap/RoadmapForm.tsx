import { useEffect, useId, useState } from 'react';
import { buildSchedule, countByKind, type ScheduleDay } from '@kairos/core';
import { Button, Card, CardGrid, Input, Stat } from '../components/ui';
import { AlertIcon } from '../components/icons';
import { DEFAULT_MINUTES } from '../onboarding/profileModel';
import { clampField, clampPhase, EDITABLE_PHASES, PHASE_LABEL, phaseErrors, RANGES, toScheduleConfig, type EditablePhase, type RoadmapConfig } from './model';

/** Number control that lets you type freely and clamps into [min, max] on blur / Enter / the - and + buttons. */
export function Stepper({ label, hint, value, min, max, unit, onChange }: { label: string; hint?: string; value: number; min: number; max: number; unit?: string; onChange(n: number): void }) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: number) => {
    const n = Math.min(max, Math.max(min, Number.isFinite(raw) ? Math.round(raw) : value));
    setText(String(n));
    if (n !== value) onChange(n);
  };
  return (
    <div className="stack gap-tight">
      <label htmlFor={id} className="text-body font-semibold">{label}</label>
      <div className="row gap-tight">
        <Button variant="secondary" size="sm" aria-label={`${label}: one less`} disabled={value <= min} onClick={() => commit(value - 1)}>−</Button>
        <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={text} className="w-s8 text-center tabular" onChange={(e) => setText(e.target.value)} onBlur={() => commit(Number(text))} onKeyDown={(e) => e.key === 'Enter' && commit(Number(text))} />
        <Button variant="secondary" size="sm" aria-label={`${label}: one more`} disabled={value >= max} onClick={() => commit(value + 1)}>+</Button>
        {unit && <span className="text-small text-slate">{unit}</span>}
      </div>
      <span className="text-small text-slate">{hint ?? `Between ${min} and ${max}.`}</span>
    </div>
  );
}

const PHASE_HINT: Record<EditablePhase, string> = {
  build: 'Learn new chapters at a relaxed pace.',
  strengthen: 'Mostly your weak spots, with a mock every week.',
  consolidate: 'Mixed practice and a mock every few days.',
  exam_mode: 'Full-paper practice, no new chapters.',
  final_sprint: 'Daily mocks and revision.',
};

/** Friendly controls for every roadmap setting. Values are always clamped; phase order problems are shown, not hidden. */
export function RoadmapForm({ value, onChange }: { value: RoadmapConfig; onChange(c: RoadmapConfig): void }) {
  const set = (p: Partial<RoadmapConfig>) => onChange({ ...value, ...p });
  const errors = phaseErrors(value);
  return (
    <div className="stack gap-section">
      <Card>
        <div className="stack gap-loose">
          <h2 className="text-h3">The last stretch</h2>
          <Stepper label="Final sprint starts" unit="days before the exam" hint="Daily mocks and revision in these last days. 5 to 30." value={value.sprintDays} min={RANGES.sprintDays[0]} max={RANGES.sprintDays[1]} onChange={(n) => set({ sprintDays: clampField('sprintDays', n) })} />
          <Stepper label="Taper" unit="days of light revision" hint="Only your own mistakes, no new pressure. 0 to 7." value={value.taperDays} min={RANGES.taperDays[0]} max={RANGES.taperDays[1]} onChange={(n) => set({ taperDays: clampField('taperDays', n) })} />
        </div>
      </Card>
      <Card>
        <div className="stack gap-loose">
          <h2 className="text-h3">Rhythm</h2>
          <Stepper label="A buffer day every" unit="work days" hint="A light day to catch up. 3 to 14." value={value.workDaysPerBuffer} min={RANGES.workDaysPerBuffer[0]} max={RANGES.workDaysPerBuffer[1]} onChange={(n) => set({ workDaysPerBuffer: clampField('workDaysPerBuffer', n) })} />
          <Stepper label="Mock days need at least" unit="free minutes" hint="Days with less time than this never get a mock. 60 to 300." value={value.mockMinCapacityMin} min={RANGES.mockMinCapacityMin[0]} max={RANGES.mockMinCapacityMin[1]} onChange={(n) => set({ mockMinCapacityMin: clampField('mockMinCapacityMin', n) })} />
        </div>
      </Card>
      <Card>
        <div className="stack gap-loose">
          <div className="stack-text">
            <h2 className="text-h3">Phase lengths</h2>
            <p className="text-small text-slate">Each phase starts when this many days are left. Earlier phases need more days.</p>
          </div>
          {EDITABLE_PHASES.map((id) => (
            <Stepper key={id} label={`${PHASE_LABEL[id]} starts at`} unit="days left" hint={PHASE_HINT[id]} value={value.phases[id]} min={RANGES.phase[0]} max={RANGES.phase[1]} onChange={(n) => set({ phases: { ...value.phases, [id]: clampPhase(n) } })} />
          ))}
          {errors.length > 0 && (
            <ul role="alert" className="stack gap-tight text-small text-status-bad">
              {errors.map((e) => <li key={e} className="row gap-tight"><AlertIcon width={16} height={16} className="shrink-0" />{e}</li>)}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

export interface PhaseSpan { id: string; label: string; days: number }

export function phaseSpans(schedule: readonly ScheduleDay[]): PhaseSpan[] {
  const rows: PhaseSpan[] = [];
  for (const d of schedule) {
    const last = rows[rows.length - 1];
    if (last && last.id === d.phase) last.days++;
    else rows.push({ id: d.phase, label: d.phase.replace('_', ' '), days: 1 });
  }
  return rows;
}

const TONE: Record<string, 0 | 1 | 2> = { build: 0, strengthen: 0, consolidate: 0, exam_mode: 1, final_sprint: 2, taper: 2 };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Live preview: phase timeline and day counts from core buildSchedule. */
export function SchedulePreview({ config, examDate, today, minutesPerWeekday = DEFAULT_MINUTES, offDay = 0, note }: { config: RoadmapConfig; examDate: string; today: string; minutesPerWeekday?: Record<number, number>; offDay?: number | null; note?: string }) {
  let schedule: ScheduleDay[] = [];
  try {
    schedule = buildSchedule({ today, examDate, minutesPerWeekday, offDay, config: toScheduleConfig(config) });
  } catch {
    /* invalid date: empty preview */
  }
  const spans = phaseSpans(schedule);
  const c = countByKind(schedule);
  return (
    <Card tone="primary" as="section" aria-label="Schedule preview">
      <div className="stack gap-loose">
        <div className="stack-text">
          <h2 className="text-h3">Your schedule, live</h2>
          <p className="text-small text-slate tabular">{schedule.length} days to the exam, planned backwards. {note}</p>
        </div>
        {spans.length > 0 && (
          <>
            <div className="pl-tl" role="img" aria-label={spans.map((p) => `${cap(p.label)} ${p.days} days`).join(', ')}>
              {spans.map((p) => <span key={p.id} className="pl-seg" data-tone={TONE[p.id] ?? 0} style={{ flexGrow: p.days }} />)}
            </div>
            <ul className="row gap-loose text-small text-slate">
              {spans.map((p) => <li key={p.id}>{cap(p.label)} · {p.days} days</li>)}
            </ul>
          </>
        )}
        <CardGrid dense gap="tight">
          <Stat label="Work days" value={c.work} />
          <Stat label="Mocks" value={c.mock + c.sprint_mock} />
          <Stat label="Buffer days" value={c.buffer} />
          <Stat label="Taper days" value={c.taper} />
        </CardGrid>
      </div>
    </Card>
  );
}
