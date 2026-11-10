import type { ReactNode } from 'react';
import { daysLeft, type ExamCalendar } from '@kairos/core';
import { CalendarIcon, CheckIcon } from '../components/icons';
import { Card, Chip, Field } from '../components/ui';
import { useExamCalendar } from '../config';
import { EXAM_LABELS } from '../plan/syllabus';
import { EXAMS, isInterviewExam } from '../practice/taxonomy';
import { entriesFor, prettyDate } from './calendarData';
import { defaultDateFor, newExamDraft, tomorrow, type ExamDraft } from './draft';

/** One option card. `radio` for single choices, `checkbox` for multi-select (the native input carries the role and the keyboard). */
export function Choice({ on, name, onSelect, title, children, chip, type = 'radio', disabled }: { on: boolean; name: string; onSelect(): void; title: string; children?: ReactNode; chip?: ReactNode; type?: 'radio' | 'checkbox'; disabled?: boolean }) {
  return (
    <label className={`opt opt-live${on ? ' opt-on' : ''}`}>
      <input type={type} name={name} checked={on} onChange={onSelect} disabled={disabled} className="sr-only" />
      <span className="stack min-w-0 flex-1 gap-s1">
        <span className="row gap-tight"><span className="text-body font-semibold">{title}</span>{chip}</span>
        {children && <span className="text-small text-slate">{children}</span>}
      </span>
      {on && <CheckIcon width={20} height={20} className="shrink-0 text-primary" />}
    </label>
  );
}

export const ENTRANCE_EXAMS = EXAMS.filter((e) => e.kind === 'exam');
export const INTERVIEW_EXAMS = EXAMS.filter((e) => e.kind === 'interview');

/**
 * Multi-select exam cards in two groups. `selected` is in pick order (the first one is the primary / active exam).
 * `exclude` hides exams that are already taken (the "Add an exam" flow).
 */
export function ExamCards({ selected, onToggle, exclude = [] }: { selected: readonly string[]; onToggle(id: string): void; exclude?: readonly string[] }) {
  const groups = [
    { key: 'entrance', title: 'Entrance exams', list: ENTRANCE_EXAMS },
    { key: 'interview', title: 'Interview prep', list: INTERVIEW_EXAMS },
  ];
  return (
    <div className="stack gap-section">
      {groups.map((g) => {
        const list = g.list.filter((e) => !exclude.includes(e.id));
        if (list.length === 0) return null;
        return (
          <fieldset key={g.key} className="stack gap-tight">
            <legend className="mb-s2 text-small font-semibold">{g.title}</legend>
            <div className="grid-auto">
              {list.map((e) => {
                const idx = selected.indexOf(e.id);
                return (
                  <Choice key={e.id} type="checkbox" name={`exam-${g.key}`} on={idx >= 0} onSelect={() => onToggle(e.id)} title={e.label} chip={idx === 0 && selected.length > 1 ? <Chip tone="primary">Main</Chip> : undefined}>
                    {g.key === 'interview' ? 'No official date. Add a target date if you have one.' : undefined}
                  </Choice>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <p className="text-small text-slate">Pick every exam you are preparing for. You can switch between them any time.</p>
    </div>
  );
}

/** The sitting / date block for one picked exam: session picker or own date (calendar exams), optional target date (interview tracks). */
export function SittingBlock({ value, onChange, today, error }: { value: ExamDraft; onChange(v: ExamDraft): void; today: string; error: string | undefined }) {
  const { calendar } = useExamCalendar();
  const label = EXAM_LABELS[value.exam] ?? value.exam;
  const n = !value.none && value.date && !error ? daysLeft(value.date, today) : null;
  const days = n !== null && (
    <p className="row gap-tight text-body" aria-live="polite">
      <CalendarIcon width={20} height={20} className="text-primary" /> <strong className="tabular">{n}</strong> days to go
    </p>
  );

  if (isInterviewExam(value.exam)) {
    return (
      <div className="stack gap-base" role="group" aria-label={`${label} target date`}>
        <fieldset className="stack gap-tight">
          <legend className="mb-s2 text-small font-semibold">Target date (when is your interview?)</legend>
          <Choice name={`${value.exam}-date`} on={!!value.none} onSelect={() => onChange({ ...value, none: true })} title="No date yet">We plan steady daily practice from what you know so far.</Choice>
          <Choice name={`${value.exam}-date`} on={!value.none} onSelect={() => onChange({ ...value, none: false, sel: 0 })} title="I have a date">Kairos counts back from it, like for an exam.</Choice>
        </fieldset>
        {!value.none && (
          <Field label="Target date" type="date" value={value.date} min={tomorrow(today)} onChange={(e) => onChange({ ...value, date: e.target.value })} {...(error ? { error } : { hint: 'You can change this any time.' })} />
        )}
        {days}
      </div>
    );
  }

  const entries = entriesFor(value.exam, calendar);
  const entry = entries.find((e) => e.session === value.sel);
  const name = `${value.exam}-session`;
  return (
    <div className="stack gap-base" role="group" aria-label={`${label} sitting`}>
      <fieldset className="stack gap-tight">
        <legend className="mb-s2 text-small font-semibold">Which sitting?</legend>
        {entries.map((e) => (
          <Choice
            key={e.id}
            name={name}
            on={value.sel === e.session}
            onSelect={() => onChange({ ...value, sel: e.session, date: defaultDateFor(value.exam, e.session, calendar) || value.date })}
            title={`${label}${entries.length > 1 ? ` Session ${e.session}` : ''}`}
            chip={<Chip tone={e.status === 'official' ? 'primary' : 'accent'}>{e.status === 'official' ? 'Official date' : 'Expected'}</Chip>}
          >
            {e.date ? prettyDate(e.date, true) : `${e.window ? `Exam window ${prettyDate(e.window.start)} to ${prettyDate(e.window.end)}. ` : ''}Date not announced yet. Enter the date you expect below; we update it when it is official.`}
          </Choice>
        ))}
        <Choice name={name} on={value.sel === 0} onSelect={() => onChange({ ...value, sel: 0 })} title="My own date">Use this if your exam is not listed.</Choice>
      </fieldset>
      {(value.sel === 0 || !entry?.date) && (
        <Field
          label={value.sel === 0 ? 'Exam date' : 'Expected exam date'}
          type="date"
          value={value.date}
          min={tomorrow(today)}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          {...(error ? { error } : { hint: 'You can change this any time.' })}
        />
      )}
      {days}
    </div>
  );
}

/** Toggle one exam in a pick list: adds it with its default sitting, or removes it. Pure, so it is easy to test. */
export function togglePick(picks: readonly ExamDraft[], exam: string, calendar?: ExamCalendar, max = 7): ExamDraft[] {
  if (picks.some((p) => p.exam === exam)) return picks.filter((p) => p.exam !== exam);
  if (picks.length >= max) return [...picks];
  return [...picks, newExamDraft(exam, calendar)];
}

/** Step 1 body (also the "Add an exam" body): cards, then one sitting block per picked exam. */
export function ExamSelector({ picks, onChange, today, errors, exclude, calendar }: { picks: readonly ExamDraft[]; onChange(next: ExamDraft[]): void; today: string; errors: Record<string, string>; exclude?: readonly string[]; calendar?: ExamCalendar }) {
  const cal = useExamCalendar().calendar;
  return (
    <div className="stack gap-section">
      <ExamCards selected={picks.map((p) => p.exam)} exclude={exclude ?? []} onToggle={(id) => onChange(togglePick(picks, id, calendar ?? cal))} />
      {picks.length === 0 && <p className="text-small text-slate" role="status">Choose at least one exam to continue.</p>}
      {picks.map((p, i) => (
        <Card key={p.exam} as="section" aria-label={`${EXAM_LABELS[p.exam] ?? p.exam} date`}>
          <div className="stack gap-base">
            <div className="row justify-between gap-s3">
              <h3 className="text-h3">{EXAM_LABELS[p.exam] ?? p.exam}</h3>
              {i === 0 ? (picks.length > 1 ? <Chip tone="primary">Main exam</Chip> : null) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([p, ...picks.filter((x) => x.exam !== p.exam)])}>Make main exam</button>
              )}
            </div>
            <SittingBlock value={p} onChange={(v) => onChange(picks.map((x) => (x.exam === p.exam ? v : x)))} today={today} error={errors[p.exam]} />
          </div>
        </Card>
      ))}
    </div>
  );
}
