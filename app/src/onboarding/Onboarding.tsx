import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { daysLeft, type MasteryDoc } from '@kairos/core';
import { AlertIcon, ClockIcon } from '../components/icons';
import { Banner, Button, Card, Chip, Page, PageHeader, ProgressBar, SelectField, Skeleton, Stat, SkeletonRows, PageSkeleton, Tabs } from '../components/ui';
import { buildPreview, rhoWords, type PlanPreview } from './preview';
import { fmtMin } from '../plan/format';
import { StatusChip } from '../plan/PlanScreens';
import '../plan/plan.css';
import { EXAM_LABELS, chaptersForExam } from '../plan/syllabus';
import { loadTaxonomy, type Taxonomy } from '../practice/taxonomy';
import { useSignInNudge, useStore } from '../store';
import { AddExamPage } from '../exams/AddExam';
import { reportOnboarded } from '../telemetry';
import { RoadmapChoice, type RoadmapMode } from '../roadmap/RoadmapChoice';
import { customStart, useRoadmap } from '../roadmap/useRoadmap';
import { prettyDate, WEEKDAYS } from './calendarData';
import { Choice, ExamSelector } from './ExamChooser';
import {
  DRAFT_KEY, draftFromProfile, emptyDraft, examErrors, examsOk, pickIds, readDraft, sameEveryDay, toExamSel, toProfiles, weekendsHeavier,
  type Draft,
} from './draft';
import { planDate, toFields, saveOnboardingFields, type OnboardingProfile } from './profileModel';
import { notifyProfileChanged, useOnboardingProfile } from './useOnboardingProfile';
import { readPaceFor, withPaceFor } from '../plan/keys';

const STEPS = ['Your exams', 'Time each day', 'Chapters done', 'Ambition', 'Your plan'] as const;

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
    return raw ? readDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ step 1 */

function StepExam({ d, set, today }: { d: Draft; set(p: Partial<Draft>): void; today: string }) {
  return (
    <ExamSelector picks={d.picks} onChange={(picks) => set({ picks, preview: null })} today={today} errors={examErrors(d, today)} />
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
  const exams = pickIds(d);
  const subjects = useMemo(() => {
    if (!tax) return [];
    const ids = new Set<string>();
    const byId = new Map<string, { id: string; name: string }>();
    for (const e of exams) for (const c of chaptersForExam(tax, e)) { ids.add(c.id); byId.set(c.id, c); }
    return tax.subjects.map((s) => ({ id: s.id, name: s.name, chapters: s.chapters.filter((c) => ids.has(c.id)) })).filter((s) => s.chapters.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tax, exams.join(',')]);
  if (!tax) return <SkeletonRows count={2} />;
  if (subjects.length === 0)
    return <p className="text-slate" role="status">Chapters for your exams are coming soon, so there is nothing to tick yet. Continue; your practice will show where you stand.</p>;
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
  const [sp] = useSearchParams();
  const { nudge } = useSignInNudge();
  const { loading, profile, onboarded } = useOnboardingProfile();
  if (loading) return <PageSkeleton width="form" cards={2} cols={1} />;
  // "Add an exam" from the switcher / manage page: only the exam picker, for exams not chosen yet
  if (sp.get('add') === '1' && onboarded) return <AddExamPage {...(props.today ? { today: props.today } : {})} onDone={() => (props.onDone ? props.onDone() : nav('/exams'))} />;
  return <Wizard key={onboarded ? 'edit' : 'new'} {...props} profile={profile} edit={onboarded} store={store} nudge={nudge} go={() => (props.onDone ? props.onDone() : nav('/plan'))} />;
}

function Wizard({ taxonomy, today: todayProp, profile, edit, store, nudge, go }: OnboardingProps & { profile: OnboardingProfile; edit: boolean; store: ReturnType<typeof useStore>; nudge(k: 'exam_date_set'): void; go(): void }) {
  const today = todayProp ?? planDate(new Date());
  const roadmap = useRoadmap();
  const [rmMode, setRmMode] = useState<RoadmapMode | null>(null);
  const rmChosen: RoadmapMode = rmMode ?? roadmap.mode;
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => (edit ? draftFromProfile(profile) : loadDraft() ?? emptyDraft()));
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
  const examOk = examsOk(d, today);
  /** the plan is built for ONE exam: the one shown in "Plan for" (default: the main exam) */
  const shown = d.picks.find((x) => x.exam === d.preview) ?? d.picks[0] ?? null;
  const shownSel = shown ? toExamSel(shown) : null;
  const setup = useMemo(
    () => ({ exams: shownSel ? [shownSel] : [], ambition: d.ambition, minutesPerWeekday: d.minutes, offDay: d.offDay, chaptersDone: d.done }),
    [shownSel, d.ambition, d.minutes, d.offDay, d.done],
  );
  const preview = useMemo(() => (examOk && shownSel && tax && step === 4 ? buildPreview({ setup, tax, mastery, today, scheduleConfig: roadmap.schedule }) : null), [examOk, shownSel, tax, step, setup, mastery, today, roadmap.schedule]);
  const main = d.picks[0];
  const mainSel = main ? toExamSel(main) : null;
  const days = examOk && mainSel ? daysLeft(mainSel.date, today) : null;
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
      // ONE profile write: every exam profile, the active one (the main exam) and its packed exam/examDate
      const fields = toFields({ profiles: toProfiles(d), examId: d.picks[0]!.exam, ambition: d.ambition, minutesPerWeekday: minutes, offDay: d.offDay, chaptersDone: d.done, onboarded: true });
      await saveOnboardingFields(store, fields);
      notifyProfileChanged();
      if (!edit) { try { reportOnboarded(); } catch { /* telemetry never blocks */ } }
      if (d.behind === 'drop' && preview?.bundle.behind && shown) {
        const cur = ((await store.getState('pace').catch(() => null)) ?? {}) as Record<string, unknown>;
        const owner = d.picks[0]!.exam;
        const prevState = readPaceFor(cur, shown.exam, owner) ?? {};
        const prev = Array.isArray(prevState.dropped) ? (prevState.dropped as string[]) : [];
        const next = { ...prevState, dropped: [...new Set([...prev, ...preview.bundle.behind.dropChapters.map((c) => c.id)])] };
        await store.putState('pace', withPaceFor(cur, shown.exam, next, owner));
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
  const firstError = Object.entries(errs)[0];
  return (
    <Page>
      <PageHeader title={edit ? 'Your plan setup' : 'Set up your plan'} subtitle={edit ? 'Change anything and we will rebuild your plan.' : 'Five short steps. Choose your exams, and we plan each day for you.'} />
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
              {!examOk && <Banner tone="accent" icon={<AlertIcon className="shrink-0" />}>{firstError ? firstError[1] : 'Choose at least one exam.'} <button type="button" className="font-semibold underline" onClick={() => setStep(0)}>Fix your exams</button></Banner>}
              {d.picks.length > 1 && shown && (
                <Tabs<string> label="Plan for" value={shown.exam} onChange={(id) => set({ preview: id })} tabs={d.picks.map((x) => ({ id: x.exam, label: EXAM_LABELS[x.exam] ?? x.exam }))} />
              )}
              {shown && !shownSel ? (
                <Card tone="primary" as="section" aria-labelledby="steady-h">
                  <div className="stack gap-tight">
                    <h2 id="steady-h" className="text-h2">Steady practice for {EXAM_LABELS[shown.exam] ?? shown.exam}</h2>
                    <p className="text-slate">With no date, there is no countdown to plan backwards from. Each day Kairos suggests a session that fits your time, built from what you know and what is new. Add a target date any time and you get a full plan.</p>
                  </div>
                </Card>
              ) : preview ? <PlanPreviewCard preview={preview} choice={d.behind} onChoice={(behind) => set({ behind })} /> : examOk && <Skeleton className="h-s8 w-full" />}
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
              <Stat label="Days to go" value={days ?? '–'} hint={main ? `${EXAM_LABELS[main.exam] ?? main.exam}${mainSel && examOk ? `, ${prettyDate(mainSel.date)}` : main.none ? ', no date yet' : ''}${d.picks.length > 1 ? ` (+${d.picks.length - 1} more)` : ''}` : 'Choose your exams'} />
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
