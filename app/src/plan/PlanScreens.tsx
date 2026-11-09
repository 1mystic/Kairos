import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Task } from '@kairos/core';
import { AlertIcon, CalendarIcon, CheckIcon, ClockIcon, SparkIcon } from '../components/icons';
import { Banner, Button, Card, Chip, EmptyState, Field, LinkButton, Modal, Page, PageHeader, ProgressBar, Section, PageSkeleton } from '../components/ui';
import { prettyDate, shortDate } from '../onboarding/calendarData';
import { planDate } from '../onboarding/profileModel';
import { useStore } from '../store';
import type { PlanDoc } from '../store/types';
import { addDays } from '@kairos/core';
import { taskLink, type StoredPlan } from './engine';
import { examLabel } from './syllabus';
import { STATUS_WORDS, fmtMin, groupTasks, taskMeta, taskTitle, todayLine } from './format';
import './plan.css';
import { useTodayPlan, type PlanView, type RollForward, type TodayPlan } from './usePlan';

const STATUS_ICON = { ahead: SparkIcon, on_track: CheckIcon, slightly_behind: ClockIcon, behind: AlertIcon } as const;

export function StatusChip({ status }: { status: keyof typeof STATUS_WORDS }) {
  const I = STATUS_ICON[status];
  return (
    <Chip tone={STATUS_WORDS[status].tone} icon={<I width={16} height={16} />}>
      {STATUS_WORDS[status].label}
    </Chip>
  );
}

/* ------------------------------------------------------------------ roll forward */

export function RollForwardModal({ rf, onAccept, onDismiss }: { rf: RollForward; onAccept(date: string): Promise<void>; onDismiss(): void }) {
  const [date, setDate] = useState(rf.next?.date ?? rf.next?.window?.start ?? '');
  const [err, setErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const today = planDate(new Date());
  const go = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today) return setErr('Pick a date after today.');
    setBusy(true);
    try {
      await onAccept(date);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`${rf.label} has passed`} onClose={onDismiss} dismissLabel="Not now">
      <p className="text-slate">
        {rf.next ? `Aim for ${rf.nextLabel}? ` : 'Pick a new date to aim for. '}
        Your progress carries over; only the countdown starts again.
      </p>
      <Field label={rf.next?.date ? `${rf.nextLabel} date` : `When do you expect ${rf.nextLabel}?`} type="date" value={date} min={addDays(today, 1)} onChange={(e) => { setDate(e.target.value); setErr(undefined); }} {...(err ? { error: err } : {})} />
      <div className="stack gap-tight sm:flex-row-reverse">
        <Button loading={busy} onClick={() => void go()}>{rf.next ? `Yes, aim for ${rf.nextLabel}` : 'Set new date'}</Button>
        <Button variant="secondary" onClick={onDismiss}>Not now</Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ today card */

export function TodayCard({ view }: { view: PlanView }) {
  const { ctx, bundle, yesterday, plan } = view;
  const { pace } = bundle;
  const rho = Number.isFinite(pace.rho) ? pace.rho.toFixed(2) : 'n/a';
  const nm = view.nextMock;
  return (
    <Card tone="primary" as="section" aria-labelledby="today-h">
      <div className="stack gap-loose">
        <div className="pl-hero">
          <div className="stack gap-s1">
            <h2 id="today-h" className="text-small font-semibold text-slate">Today</h2>
            <span className="text-display font-bold tabular">{ctx.daysLeft}</span>
            <span className="text-body">
              {ctx.daysLeft === 1 ? 'day' : 'days'} to {examLabel(ctx.exam.exam)} ({prettyDate(ctx.exam.date).slice(0, -5)})
            </span>
          </div>
          <div className="stack gap-base">
            <div className="row gap-tight">
              <StatusChip status={pace.status} />
              <Chip>ρ {rho}</Chip>
              <Chip>{bundle.bufferDaysLeft} buffer day{bundle.bufferDaysLeft === 1 ? '' : 's'} left</Chip>
            </div>
            <ProgressBar label={`Pace ${rho}`} value={Math.min(pace.rho, 1.5)} max={1.5} />
          </div>
        </div>
        <dl className="pl-lines tabular">
          <Line k="Yesterday" v={yesterday ? `${fmtMin(yesterday.done)} of ${fmtMin(yesterday.planned)} done` : 'Nothing planned yesterday. Today is a fresh start.'} />
          <Line k="Today" v={todayLine({ plan, ctx })} />
          <Line k="Next mock" v={nm ? `${shortDate(nm.date)} · full ${examLabel(ctx.exam.exam)} pattern` : 'No mock scheduled yet.'} />
          <Line k="Predicted" v="Your score band appears after your first mock." />
        </dl>
      </div>
    </Card>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="pl-line">
      <dt className="text-small font-semibold text-slate">{k}</dt>
      <dd className="text-body">{v}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ tasks */

function TaskRow({ t, view, onTick, readOnly }: { t: Task; view: PlanView; onTick?(id: string): void; readOnly?: boolean }) {
  const done = t.status === 'done';
  const link = taskLink(t, view.ctx.syllabus.examOf, view.ctx.exam.exam);
  const title = taskTitle(t, view.ctx.syllabus.names);
  return (
    <li className="pl-task" data-done={done}>
      {readOnly ? (
        <span className="pl-check" role="img" aria-label={done ? 'Done' : 'Not done'} aria-checked={done}>{done ? <CheckIcon width={20} height={20} /> : null}</span>
      ) : (
        <button type="button" role="checkbox" aria-checked={done} aria-label={`${title}: mark ${done ? 'not done' : 'done'}`} className="pl-check" onClick={() => onTick?.(t.id)}>
          {done && <CheckIcon width={20} height={20} />}
        </button>
      )}
      <div className="pl-task-main">
        <span className="text-body font-semibold">{title}</span>
        <span className="text-small text-slate tabular">{taskMeta(t)}</span>
        {t.carried_from && <span><Chip tone="accent">Carried from {shortDate(t.carried_from)}</Chip></span>}
      </div>
      {!readOnly && !done && link && <LinkButton to={link} size="sm" variant="secondary">Start</LinkButton>}
      {done && <StatusDone />}
    </li>
  );
}
const StatusDone = () => <span className="row gap-tight text-small text-status-good"><CheckIcon width={16} height={16} />Done</span>;

export function TaskList({ view, onTick, readOnly }: { view: PlanView; onTick?(id: string): void; readOnly?: boolean }) {
  const groups = groupTasks(view.plan.tasks);
  if (groups.length === 0)
    return <p className="text-slate">{view.plan.warnings[0] ?? 'Nothing planned for this day.'}</p>;
  return (
    <div className="stack gap-loose">
      {groups.map((g) => (
        <div key={g.id} className="stack gap-tight">
          <h3 className="text-small font-semibold text-slate">{g.label}</h3>
          <ul className="stack gap-tight">{g.tasks.map((t) => <TaskRow key={t.id} t={t} view={view} {...(onTick ? { onTick } : {})} {...(readOnly ? { readOnly } : {})} />)}</ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ week */

const KIND_WORD = { work: 'Work', mock: 'Mock', buffer: 'Buffer', off: 'Rest', taper: 'Taper', sprint_mock: 'Sprint mock' } as const;

export function WeekStrip({ view }: { view: PlanView }) {
  return (
    <ul className="pl-week" aria-label="Next 7 days">
      {view.horizon.map((d) => (
        <li key={d.date}>
          <Link to={d.date === view.today ? '/plan' : `/plan/${d.date}`} className="pl-day" data-today={d.date === view.today} data-kind={d.dayKind} aria-label={`${shortDate(d.date)}: ${KIND_WORD[d.dayKind]}`}>
            <span className="text-small font-semibold">{shortDate(d.date)}</span>
            <span className="text-caption">{KIND_WORD[d.dayKind]} · {phaseLabel(d.phase)}</span>
            <span className="text-caption tabular">{d.plannedMin > 0 ? fmtMin(d.plannedMin) : d.dayKind === 'off' ? 'Rest' : '–'}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
const phaseLabel = (id: string) => id.replace('_', ' ').replace(/^./, (c) => c.toUpperCase());

/* ------------------------------------------------------------------ pace panel */

export function PacePanel({ t, view }: { t: TodayPlan; view: PlanView }) {
  const { pace, behind, bufferDates, bufferDaysLeft } = view.bundle;
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (k: string, f: () => Promise<void>) => {
    setBusy(k);
    try { await f(); } finally { setBusy(null); }
  };
  return (
    <Card as="section" aria-labelledby="pace-h">
      <div className="stack gap-base">
        <div className="row justify-between gap-s2">
          <h2 id="pace-h" className="text-h3">Pace</h2>
          <StatusChip status={pace.status} />
        </div>
        {pace.status === 'ahead' && (
          <>
            <p>You are ahead of pace. Nothing changes unless you say so.</p>
            {view.profile.ambition !== 'top' && (
              <div><Button variant="secondary" loading={busy === 'amb'} onClick={() => void run('amb', t.raiseAmbition)}>Aim a little higher</Button></div>
            )}
          </>
        )}
        {pace.status === 'on_track' && <p>On track. Keep today's plan and the rest follows.</p>}
        {pace.status === 'slightly_behind' && (
          <p>
            You are slightly behind.{' '}
            {bufferDates.length > 0
              ? `We will use ${bufferDates.length} buffer day${bufferDates.length === 1 ? '' : 's'} (${bufferDates.map(shortDate).join(', ')}) to catch up; ${bufferDaysLeft - bufferDates.length} left after that.`
              : 'No buffer days are left to spend, so a little extra time on a few days would help.'}
          </p>
        )}
        {pace.status === 'behind' && behind && (
          <>
            <p>You are behind, and that is fixable. Here are two ways; nothing changes until you choose.</p>
            <div className="pl-choices">
              <div className="pl-choice">
                <p className="text-body font-semibold">Add {behind.addMinutesPerDay} min a day</p>
                <p className="text-small text-slate">About {Math.round(behind.addPercent * 100)}% more on your study days. We raise the load by at most 15% a day, so it takes around {behind.rampDays} days to get there.</p>
                <div><Button size="sm" loading={busy === 'add'} onClick={() => void run('add', () => t.addMinutesPerDay(behind.addMinutesPerDay))}>Add the time</Button></div>
              </div>
              <div className="pl-choice">
                <p className="text-body font-semibold">Park {behind.dropChapters.length} lower-weight chapter{behind.dropChapters.length === 1 ? '' : 's'}</p>
                <p className="text-small text-slate">
                  Costs about {behind.dropMarksCost.toFixed(1)} marks.{' '}
                  {behind.dropReachesTarget ? 'That gets you back on track.' : 'You would still be a little behind.'} You can bring any back later.
                </p>
                <div><Button size="sm" variant="secondary" loading={busy === 'drop'} onClick={() => void run('drop', () => t.parkChapters(behind.dropChapters.map((c) => c.id)))}>Park them</Button></div>
              </div>
            </div>
          </>
        )}
        <p className="text-small text-slate tabular">Work left {fmtMin(pace.W)} · time available {fmtMin(pace.A)}</p>
      </div>
    </Card>
  );
}

export function ParkedCard({ t, view }: { t: TodayPlan; view: PlanView }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (view.parked.length === 0) return null;
  const total = view.parked.reduce((a, p) => a + p.marksCost, 0);
  return (
    <Card as="section" aria-labelledby="park-h">
      <div className="stack gap-base">
        <h2 id="park-h" className="text-h3">Parked for now</h2>
        <p className="text-small text-slate">We parked {view.parked.length} low-weight chapter{view.parked.length === 1 ? '' : 's'} to protect your time. Cost: about {total.toFixed(1)} marks. Tap to bring one back.</p>
        <ul className="stack gap-tight">
          {view.parked.map((p) => (
            <li key={`${p.source}-${p.chapter}`} className="pl-row">
              <span className="min-w-0 flex-1 basis-40"><span className="block text-body font-semibold">{p.name}</span><span className="text-small text-slate">about {p.marksCost.toFixed(1)} marks</span></span>
              <Button size="sm" variant="secondary" loading={busy === p.chapter} onClick={() => { setBusy(p.chapter); void t.unpark(p).finally(() => setBusy(null)); }}>Bring back</Button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ page */

function NoExam() {
  return (
    <Page width="reading" className="page-center">
      <EmptyState icon={CalendarIcon} title="When is your exam?" action={<LinkButton to="/onboarding">Set your exam date</LinkButton>}>
        Tell us the date and how much time you have. We count backwards from it and plan each day for you.
      </EmptyState>
    </Page>
  );
}

function Passed({ label }: { label: string }) {
  return (
    <Page width="reading" className="page-center">
      <EmptyState icon={CalendarIcon} title="That exam date has passed" action={<LinkButton to="/onboarding">Set a new date</LinkButton>}>
        {label} is behind you. Your progress is saved; pick the next exam and we will plan from there.
      </EmptyState>
    </Page>
  );
}

function PlanSkeleton() {
  return (
    <PageSkeleton cards={3} cols={3} />
  );
}

export function PlanPage() {
  const t = useTodayPlan();
  const [noticeGone, setNoticeGone] = useState(false);
  const { state } = t;
  const rfModal = t.rollForward ? <RollForwardModal rf={t.rollForward} onAccept={t.acceptRollForward} onDismiss={t.dismissRollForward} /> : null;
  if (state.kind === 'loading') return <PlanSkeleton />;
  if (state.kind === 'none') return <NoExam />;
  if (state.kind === 'passed') return <>{rfModal}<Passed label={t.examLabel ?? 'Your exam'} /></>;
  if (state.kind === 'error')
    return (
      <Page width="reading" className="page-center">
        <EmptyState icon={AlertIcon} title="We could not build your plan" action={<Button onClick={t.refresh}>Try again</Button>}>{state.message}</EmptyState>
      </Page>
    );
  const view = state.view;
  const note = view.plan.backlogNote;
  return (
    <Page>
      {rfModal}
      <PageHeader title="Your plan" subtitle={`${t.examLabel} · ${view.plan.phase.replace('_', ' ')} phase`} actions={<LinkButton to="/onboarding" variant="secondary">Edit setup</LinkButton>} />
      {view.reanchor && !noticeGone && (
        <Banner icon={<CalendarIcon className="shrink-0 text-primary" />} actions={<Button size="sm" variant="ghost" onClick={() => setNoticeGone(true)}>Got it</Button>}>{view.reanchor}</Banner>
      )}
      <TodayCard view={view} />
      {view.plan.warnings.length > 0 && view.plan.tasks.length > 0 && <Banner>{view.plan.warnings[0]}</Banner>}
      {note && note !== 'Nothing is backed up.' && <Banner tone="accent" icon={<AlertIcon className="shrink-0" />}>{note}</Banner>}
      <div className="pl-grid">
        <Section title="Today's tasks" aside={<span className="text-small text-slate tabular">{view.plan.tasks.filter((x) => x.status === 'done').length}/{view.plan.tasks.length} done</span>}>
          <Card><TaskList view={view} onTick={t.tick} /></Card>
        </Section>
        <div className="stack gap-section">
          <PacePanel t={t} view={view} />
          <Section title="This week"><WeekStrip view={view} /></Section>
          <ParkedCard t={t} view={view} />
        </div>
      </div>
    </Page>
  );
}

/** `/plan/:date`: a past or upcoming day, read-only. */
export function DayPage() {
  const { date = '' } = useParams();
  const t = useTodayPlan();
  const store = useStore();
  const [stored, setStored] = useState<{ date: string; doc: PlanDoc | null } | undefined>();
  useEffect(() => {
    let live = true;
    store.getPlan(date).then((doc) => live && setStored({ date, doc }), () => live && setStored({ date, doc: null }));
    return () => { live = false; };
  }, [store, date]);
  if (t.state.kind === 'loading' || stored?.date !== date) return <PlanSkeleton />;
  if (t.state.kind === 'none') return <NoExam />;
  if (t.state.kind === 'error')
    return (
      <Page width="reading" className="page-center">
        <EmptyState icon={AlertIcon} title="We could not build your plan" action={<Button onClick={t.refresh}>Try again</Button>}>{t.state.message}</EmptyState>
      </Page>
    );
  if (t.state.kind !== 'ready') return <Passed label={t.examLabel ?? 'Your exam'} />;
  const view = t.state.view;
  const doc = stored.doc as StoredPlan | null;
  const preview = view.horizon.find((d) => d.date === date);
  const plan = doc ?? preview ?? null;
  const future = date > view.today;
  return (
    <Page>
      <PageHeader title={prettyDate(date, true)} subtitle={future ? 'A preview. It will change as you practise.' : 'Read-only.'} actions={<LinkButton to="/plan" variant="secondary">Back to today</LinkButton>} />
      {plan ? (
        <Card>
          <TaskList view={{ ...view, plan: plan as StoredPlan }} readOnly />
        </Card>
      ) : (
        <EmptyState icon={CalendarIcon} title="No plan for this day">{future ? 'Plans are made a week ahead.' : 'You did not open Kairos that day, so nothing was planned.'}</EmptyState>
      )}
    </Page>
  );
}
