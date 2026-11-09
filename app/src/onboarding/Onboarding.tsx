import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { daysLeft, type MasteryDoc } from '@kairos/core';
import { AlertIcon, CalendarIcon, CheckIcon, ClockIcon } from '../components/icons';
import { Banner, Button, Card, Chip, Field, Page, PageHeader, ProgressBar, SelectField, Skeleton, Stat, SkeletonRows, PageSkeleton } from '../components/ui';
import { buildPreview, rhoWords, type PlanPreview } from './preview';
import { fmtMin } from '../plan/format';
import { StatusChip } from '../plan/PlanScreens';
import '../plan/plan.css';
import { EXAM_LABELS, chaptersForExam } from '../plan/syllabus';
import { EXAMS, loadTaxonomy, type Taxonomy } from '../practice/taxonomy';
import { useSignInNudge, useStore } from '../store';
import { useExamCalendar } from '../config';
import { reportOnboarded } from '../telemetry';
import { RoadmapChoice, type RoadmapMode } from '../roadmap/RoadmapChoice';
import { customStart, useRoadmap } from '../roadmap/useRoadmap';
import { entriesFor, prettyDate, WEEKDAYS } from './calendarData';
import {
  DRAFT_KEY, defaultDateFor, draftFromProfile, emptyDraft, examErrors, newExamDraft, sameEveryDay, toExamSels, weekendsHeavier, tomorrow,
  type Draft, type ExamDraft,
} from './draft';
import { planDate, toFields, saveOnboardingFields, type OnboardingProfile } from './profileModel';
import { useOnboardingProfile } from './useOnboardingProfile';

const STEPS = ['Exam and date', 'Time each day', 'Chapters done', 'Ambition', 'Your plan'] as const;

export interface OnboardingProps {
  /** inject for tests */
  taxonomy?: Taxonomy;
  today?: string;
  /** called after the profile is saved (default: navigate to /plan) */
  onDone?(): void;
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? ({ ...emptyDraft(), ...(JSON.parse(raw) as Partial<Draft>) }) : null;
  } catch {
    return null;
  }
}

function Choice({ on, name, onSelect, title, children, chip }: { on: boolean; name: string; onSelect(): void; title: string; children?: ReactNode; chip?: ReactNode }) {
  return (
    <label className={`opt opt-live${on ? ' opt-on' : ''}`}>
      <input type="radio" name={name} checked={on} onChange={onSelect} className="sr-only" />
      <span className="stack min-w-0 flex-1 gap-s1">
        <span className="row gap-tight"><span className="text-body font-semibold">{title}</span>{chip}</span>
        {children && <span className="text-small text-slate">{children}</span>}
      </span>
      {on && <CheckIcon width={20} height={20} className="shrink-0 text-primary" />}
    </label>
  );
}

/* ------------------------------------------------------------------ step 1 */

function ExamPicker({ value, onChange, today, error, label }: { value: ExamDraft; onChange(v: ExamDraft): void; today: string; error: string | undefined; label: string }) {
  const { calendar } = useExamCalendar();
  const entries = entriesFor(value.exam, calendar);
  const entry = entries.find((e) => e.session === value.sel);
  const n = value.date && !error ? daysLeft(value.date, today) : null;
  return (
    <div className="stack gap-base">
      <fieldset className="stack gap-tight">
        <legend className="mb-s2 text-small font-semibold">{label}</legend>
        <div className="grid-auto">
          {EXAMS.map((e) => (
            <Choice key={e.id} name={`${label}-exam`} on={value.exam === e.id} onSelect={() => onChange(newExamDraft(e.id, calendar))} title={e.label} />
          ))}
        </div>
      </fieldset>
      <fieldset className="stack gap-tight">
        <legend className="mb-s2 text-small font-semibold">Which sitting?</legend>
        {entries.map((e) => (
          <Choice
            key={e.id}
            name={`${label}-session`}
            on={value.sel === e.session}
            onSelect={() => onChange({ ...value, sel: e.session, date: defaultDateFor(value.exam, e.session, calendar) || value.date })}
            title={`${EXAM_LABELS[value.exam] ?? value.exam}${entries.length > 1 ? ` Session ${e.session}` : ''}`}
            chip={<Chip tone={e.status === 'official' ? 'primary' : 'accent'}>{e.status === 'official' ? 'Official date' : 'Expected'}</Chip>}
          >
            {e.date ? prettyDate(e.date, true) : `${e.window ? `Exam window ${prettyDate(e.window.start)} to ${prettyDate(e.window.end)}. ` : ''}Date not announced yet. Enter the date you expect below; we update it when it is official.`}
          </Choice>
        ))}
        <Choice name={`${label}-session`} on={value.sel === 0} onSelect={() => onChange({ ...value, sel: 0 })} title="My own date">Use this if your exam is not listed.</Choice>
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
      {n !== null && (
        <p className="row gap-tight text-body" aria-live="polite">
          <CalendarIcon width={20} height={20} className="text-primary" /> <strong className="tabular">{n}</strong> days to go
        </p>
      )}
    </div>
  );
}

function StepExam({ d, set, today }: { d: Draft; set(p: Partial<Draft>): void; today: string }) {
  const { calendar } = useExamCalendar();
  const errs = examErrors(d, today);
  return (
    <div className="stack gap-section">
      <ExamPicker label="Which exam" value={d.first} onChange={(first) => set({ first })} today={today} error={errs.first} />
      {d.second ? (
        <Card>
          <div className="stack gap-base">
            <ExamPicker label="Second exam" value={d.second} onChange={(second) => set({ second })} today={today} error={errs.second} />
            <div><Button variant="ghost" onClick={() => set({ second: null })}>Remove second exam</Button></div>
          </div>
        </Card>
      ) : (
        <div><Button variant="secondary" onClick={() => set({ second: newExamDraft(d.first.exam === 'NEET_UG' ? 'JEE_MAIN' : 'NEET_UG', calendar) })}>Preparing for another exam too?</Button></div>
      )}
      {d.second && <p className="text-small text-slate">The nearer exam sets your phases. The other one adds only the chapters the first does not cover.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ step 2 */

function StepTime({ d, set }: { d: Draft; set(p: Partial<Draft>): void }) {
  const total = Object.entries(d.minutes).reduce((a, [k, m]) => a + (Number(k) === d.offDay ? 0 : m), 0);
  return (
    <div className="stack gap-section">
      <div className="row gap-tight">
        <Button variant="secondary" size="sm" onClick={() => set({ minutes: sameEveryDay(d.minutes, d.offDay) })}>Same every day</Button>
        <Button variant="secondary" size="sm" onClick={() => set({ minutes: weekendsHeavier(d.minutes, d.offDay) })}>Weekends heavier</Button>
      </div>
      <div className="ob-days">
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
          const off = d.offDay === wd;
          const v = d.minutes[wd] ?? 0;
          return (
            <div key={wd} className="stack gap-s1">
              <div className="row justify-between gap-s2">
                <label htmlFor={`min-${wd}`} className="text-small font-semibold">{WEEKDAYS[wd]}</label>
                <span className="text-small tabular text-slate">{off ? 'Off day' : fmtMin(v)}</span>
              </div>
              <input
                id={`min-${wd}`}
                type="range"
                className="ob-range"
                min={0}
                max={480}
                step={15}
                value={v}
                disabled={off}
                aria-valuetext={off ? 'Off day' : fmtMin(v)}
                onChange={(e) => set({ minutes: { ...d.minutes, [wd]: Number(e.target.value) } })}
              />
            </div>
          );
        })}
      </div>
      <SelectField label="Weekly off-day" hint="Nothing is planned on your off-day, except in the final 15 days where a full mock is worth it." value={d.offDay === null ? 'none' : String(d.offDay)} onChange={(e) => set({ offDay: e.target.value === 'none' ? null : Number(e.target.value) })}>
        <option value="none">No off-day</option>
        {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
      </SelectField>
      <p className="text-body tabular">About <strong>{fmtMin(total)}</strong> a week. We never plan more than you say.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ step 3 */

function StepChapters({ d, set, tax }: { d: Draft; set(p: Partial<Draft>): void; tax: Taxonomy | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const exams = [d.first.exam, ...(d.second ? [d.second.exam] : [])];
  const subjects = useMemo(() => {
    if (!tax) return [];
    const ids = new Set<string>();
    const byId = new Map<string, { id: string; name: string }>();
    for (const e of exams) for (const c of chaptersForExam(tax, e)) { ids.add(c.id); byId.set(c.id, c); }
    return tax.subjects.map((s) => ({ id: s.id, name: s.name, chapters: s.chapters.filter((c) => ids.has(c.id)) })).filter((s) => s.chapters.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tax, exams.join(',')]);
  if (!tax) return <SkeletonRows count={2} />;
  const done = new Set(d.done);
  const toggle = (ids: string[], on: boolean) => set({ done: on ? [...new Set([...d.done, ...ids])] : d.done.filter((x) => !ids.includes(x)) });
  return (
    <div className="stack gap-section">
      <p className="text-slate">Tick the chapters you have already covered, even roughly. This only tells us where to start; your practice shows the rest.</p>
      <fieldset className="stack gap-tight">
        <legend className="mb-s2 text-small font-semibold">How are you preparing?</legend>
        <div className="grid-auto">
          <Choice name="support" on={d.support === 'coaching'} onSelect={() => set({ support: 'coaching' })} title="Coaching" />
          <Choice name="support" on={d.support === 'self'} onSelect={() => set({ support: 'self' })} title="Self-study" />
        </div>
        <p className="text-small text-slate">Just for context. It does not change your plan.</p>
      </fieldset>
      {subjects.map((s) => {
        const ids = s.chapters.map((c) => c.id);
        const n = ids.filter((i) => done.has(i)).length;
        const all = n === ids.length;
        const isOpen = open === s.id || subjects.length === 1;
        return (
          <Card key={s.id} as="section" aria-label={s.name}>
            <div className="stack gap-base">
              <div className="row justify-between gap-s3">
                <button type="button" className="row min-h-s7 gap-s3 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                  <h3 className="text-h3">{s.name}</h3>
                  <Chip tone={n > 0 ? 'primary' : 'neutral'}>{n} of {ids.length}</Chip>
                </button>
                <Button size="sm" variant="secondary" onClick={() => toggle(ids, !all)}>{all ? `Clear all in ${s.name}` : `Select all in ${s.name}`}</Button>
              </div>
              {isOpen && (
                <div className="grid-auto">
                  {s.chapters.map((c) => (
                    <label key={c.id} className={`opt opt-live${done.has(c.id) ? ' opt-on' : ''}`}>
                      <input type="checkbox" className="ob-check" checked={done.has(c.id)} onChange={(e) => toggle([c.id], e.target.checked)} />
                      <span className="text-small">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ step 4 */

const AMBITIONS = [
  { id: 'comfortable', title: 'Comfortable', body: 'Solid on the basics and a calm schedule. Good if you want a decent score without burning out.' },
  { id: 'competitive', title: 'Competitive', body: 'Strong in every chapter, with real mock practice. A balanced push for a good rank.' },
  { id: 'top', title: 'Top rank', body: 'Deep mastery everywhere and the heaviest practice load. It asks the most of your time.' },
] as const;

function StepAmbition({ d, set }: { d: Draft; set(p: Partial<Draft>): void }) {
  return (
    <div className="stack gap-base">
      {AMBITIONS.map((a) => (
        <Choice key={a.id} name="ambition" on={d.ambition === a.id} onSelect={() => set({ ambition: a.id })} title={a.title}>{a.body}</Choice>
      ))}
      <p className="text-small text-slate">You can change this later. We only ever suggest raising it; we never add load without asking.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ step 5 */

export function PlanPreviewCard({ preview, choice, onChoice }: { preview: PlanPreview; choice: Draft['behind']; onChoice(c: Draft['behind']): void }) {
  const { bundle, counts } = preview;
  const behind = bundle.behind;
  return (
    <Card tone="primary" as="section" aria-labelledby="preview-h">
      <div className="stack gap-loose">
        <div className="stack gap-s1">
          <h2 id="preview-h" className="text-h2">Here is your plan</h2>
          <p className="text-slate tabular"><strong>{preview.daysLeft}</strong> days to {preview.examLabel}, planned backwards from exam day.</p>
        </div>
        {preview.warning && <Banner tone="accent" icon={<AlertIcon className="shrink-0" />}>{preview.warning}</Banner>}
        <div className="stack gap-tight">
          <div className="pl-tl" role="img" aria-label={preview.phases.map((p) => `${p.label} ${p.days} days`).join(', ')}>
            {preview.phases.map((p) => <span key={p.id} className="pl-seg" data-tone={p.tone} style={{ flexGrow: p.days }} />)}
          </div>
          <ul className="pl-legend text-small text-slate tabular">
            {preview.phases.map((p) => <li key={p.id}>{p.label} · {p.days} days</li>)}
          </ul>
        </div>
        <div className="grid-auto">
          <Stat label="Work days" value={counts.work} />
          <Stat label="Mock days" value={counts.mock + counts.sprint} hint="Daily mocks in the last 15 days" />
          <Stat label="Buffer days" value={counts.buffer} hint="Light review, spare time to catch up" />
          <Stat label="Taper days" value={counts.taper} hint="Only your own mistakes" />
        </div>
        <div className="stack gap-tight">
          <div className="row gap-tight"><StatusChip status={bundle.pace.status} /><span className="text-small text-slate tabular">{fmtMin(preview.weeklyMin)} a week</span></div>
          <p>{rhoWords(bundle.pace.status, bundle.pace.rho)}</p>
        </div>
        {behind && (
          <fieldset className="stack gap-tight">
            <legend className="mb-s2 text-body font-semibold">Two ways to fix it. You choose.</legend>
            <Choice name="behind" on={choice === 'add'} onSelect={() => onChoice('add')} title={`Add ${behind.addMinutesPerDay} min a day`}>
              About {Math.round(behind.addPercent * 100)}% more on study days, built up by at most 15% a day (around {behind.rampDays} days).
            </Choice>
            <Choice name="behind" on={choice === 'drop'} onSelect={() => onChoice('drop')} title={`Park ${behind.dropChapters.length} lower-weight chapter${behind.dropChapters.length === 1 ? '' : 's'}`}>
              Costs about {behind.dropMarksCost.toFixed(1)} marks. {behind.dropReachesTarget ? 'That brings you back on track.' : 'You would still be a little behind.'} You can bring them back later.
            </Choice>
            <div><Button variant="ghost" size="sm" onClick={() => onChoice(null)}>Decide later</Button></div>
            <p className="text-small text-slate">Nothing changes unless you pick one.</p>
          </fieldset>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ the page */

export function OnboardingPage(props: OnboardingProps = {}) {
  const store = useStore();
  const nav = useNavigate();
  const { nudge } = useSignInNudge();
  const { loading, profile, onboarded } = useOnboardingProfile();
  if (loading) return <PageSkeleton width="form" cards={2} cols={1} />;
  return <Wizard key={onboarded ? 'edit' : 'new'} {...props} profile={profile} edit={onboarded} store={store} nudge={nudge} go={() => (props.onDone ? props.onDone() : nav('/plan'))} />;
}

function Wizard({ taxonomy, today: todayProp, profile, edit, store, nudge, go }: OnboardingProps & { profile: OnboardingProfile; edit: boolean; store: ReturnType<typeof useStore>; nudge(k: 'exam_date_set'): void; go(): void }) {
  const today = todayProp ?? planDate(new Date());
  const { calendar } = useExamCalendar();
  const roadmap = useRoadmap();
  const [rmMode, setRmMode] = useState<RoadmapMode | null>(null);
  const rmChosen: RoadmapMode = rmMode ?? roadmap.mode;
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => (edit ? draftFromProfile(profile) : loadDraft() ?? emptyDraft(calendar)));
  const [tax, setTax] = useState<Taxonomy | null>(taxonomy ?? null);
  const [mastery, setMastery] = useState<MasteryDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  useEffect(() => {
    if (taxonomy) return;
    let live = true;
    loadTaxonomy().then((t) => live && setTax(t), () => live && setErr('We could not load the chapter list. Check your connection and reload.'));
    return () => { live = false; };
  }, [taxonomy]);
  useEffect(() => {
    let live = true;
    store.getState('mastery').then((m) => live && setMastery(m as MasteryDoc | null), () => {});
    return () => { live = false; };
  }, [store]);

  const set = (p: Partial<Draft>) => {
    setD((cur) => {
      const next = { ...cur, ...p };
      if (p.offDay !== undefined && p.offDay !== null) next.minutes = { ...next.minutes, [p.offDay]: 0 };
      if (!edit) try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };
  const errs = examErrors(d, today);
  const examOk = Object.keys(errs).length === 0;
  const setup = useMemo(
    () => ({ exams: toExamSels(d), ambition: d.ambition, minutesPerWeekday: d.minutes, offDay: d.offDay, chaptersDone: d.done }),
    [d],
  );
  const preview = useMemo(() => (examOk && tax && step === 4 ? buildPreview({ setup, tax, mastery, today, scheduleConfig: roadmap.schedule }) : null), [examOk, tax, step, setup, mastery, today, roadmap.schedule]);
  const days = examOk ? daysLeft(d.first.date, today) : null;
  const weekly = Object.entries(d.minutes).reduce((a, [k, m]) => a + (Number(k) === d.offDay ? 0 : m), 0);

  const goTo = (n: number) => {
    if (n > 0 && !examOk) return setStep(0);
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  };

  const save = async () => {
    if (!examOk) return setStep(0);
    setSaving(true);
    setErr(undefined);
    try {
      let minutes = d.minutes;
      if (d.behind === 'add' && preview?.bundle.behind) {
        const add = preview.bundle.behind.addMinutesPerDay;
        minutes = Object.fromEntries(Object.entries(minutes).map(([k, m]) => [k, Number(k) === d.offDay || m <= 0 ? m : Math.min(600, m + add)]));
      }
      const fields = toFields({ exams: toExamSels(d), ambition: d.ambition, minutesPerWeekday: minutes, offDay: d.offDay, chaptersDone: d.done, onboarded: true });
      await saveOnboardingFields(store, fields);
      if (!edit) { try { reportOnboarded(); } catch { /* telemetry never blocks */ } }
      if (d.behind === 'drop' && preview?.bundle.behind) {
        const cur = ((await store.getState('pace').catch(() => null)) ?? {}) as Record<string, unknown>;
        const prev = Array.isArray(cur.dropped) ? (cur.dropped as string[]) : [];
        await store.putState('pace', { ...cur, dropped: [...new Set([...prev, ...preview.bundle.behind.dropChapters.map((c) => c.id)])] });
      }
      if (rmChosen !== roadmap.mode) await roadmap.save(rmChosen, rmChosen === 'custom' ? customStart(roadmap) : undefined);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      nudge('exam_date_set');
      if (rmChosen === 'custom') nav('/roadmap');
      else go();
    } catch {
      setErr('We could not save that. Your answers are still here; try again.');
    } finally {
      setSaving(false);
    }
  };

  const last = step === STEPS.length - 1;
  return (
    <Page>
      <PageHeader title={edit ? 'Your plan setup' : 'Set up your plan'} subtitle={edit ? 'Change anything and we will rebuild your plan.' : 'Five short steps. We count back from your exam date and plan each day for you.'} />
      <div className="ob">
        <nav aria-label="Steps" className="ob-steps">
          {STEPS.map((s, i) => (
            <button key={s} type="button" className="nav-item justify-start" aria-current={i === step ? 'step' : undefined} onClick={() => goTo(i)}>
              <span className="tabular text-slate">{i + 1}</span> {s}
            </button>
          ))}
        </nav>
        <div className="stack gap-section min-w-0">
          <div className="stack gap-tight lg:hidden">
            <p className="text-small font-semibold tabular">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
            <ProgressBar label="Setup progress" value={step + 1} max={STEPS.length} />
          </div>
          <h2 className="text-h2 hidden lg:block">{STEPS[step]}</h2>
          {step === 0 && <StepExam d={d} set={set} today={today} />}
          {step === 1 && <StepTime d={d} set={set} />}
          {step === 2 && <StepChapters d={d} set={set} tax={tax} />}
          {step === 3 && <StepAmbition d={d} set={set} />}
          {step === 4 && (
            <div className="stack gap-section">
              {!examOk && <Banner tone="accent" icon={<AlertIcon className="shrink-0" />}>{errs.first ?? errs.second} <button type="button" className="font-semibold underline" onClick={() => setStep(0)}>Fix the date</button></Banner>}
              {preview ? <PlanPreviewCard preview={preview} choice={d.behind} onChoice={(behind) => set({ behind })} /> : examOk && <Skeleton className="h-s8 w-full" />}
              <Card>
                <div className="stack gap-base">
                  <h2 className="text-h3">Your roadmap</h2>
                  <RoadmapChoice value={rmChosen} onChange={setRmMode} name="ob-roadmap" />
                  {rmChosen === 'custom' && <p className="text-small text-slate">After saving you can set the final sprint, buffer days and phase lengths yourself.</p>}
                </div>
              </Card>
            </div>
          )}
          {err && <Banner tone="bad" role="alert" icon={<AlertIcon className="shrink-0" />}>{err}</Banner>}
          <div className="row justify-between gap-s3">
            <Button variant="secondary" onClick={() => goTo(step - 1)} disabled={step === 0}>Back</Button>
            {last ? (
              <Button loading={saving} disabled={!examOk} onClick={() => void save()}>{edit ? 'Update my plan' : 'Start my plan'}</Button>
            ) : (
              <Button onClick={() => goTo(step + 1)} disabled={step === 0 && !examOk}>Next</Button>
            )}
          </div>
        </div>
        <aside className="ob-aside" aria-label="Your setup so far">
          <Card>
            <div className="stack gap-loose">
              <Stat label="Days to go" value={days ?? '–'} hint={examOk ? `${EXAM_LABELS[d.first.exam] ?? d.first.exam}, ${prettyDate(d.first.date)}` : 'Pick your exam date'} />
              <Stat label="Time a week" value={fmtMin(weekly)} />
              <Stat label="Chapters done" value={d.done.length} />
            </div>
          </Card>
          <p className="row gap-tight text-small text-slate"><ClockIcon width={16} height={16} /> Saved on this device as you go.</p>
        </aside>
      </div>
    </Page>
  );
}

