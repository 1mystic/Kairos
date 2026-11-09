import { useContext, useEffect, useRef, useState, type RefObject } from 'react';
import { useParams } from 'react-router';
import type { BehaviourLabel, KairosEvent, Question, SessionSummary } from '@kairos/core';
import { getLatestVersion, getQuestionsByIds } from '../bank/client';
import { QuestionView } from '../components/QuestionView';
import { CheckIcon, CloseIcon } from '../components/icons';
import { Button, Card, Chip, EmptyState, LinkButton, Page, PageHeader, PageSkeleton, Section, Stat, Tabs } from '../components/ui';
import { useStore, type SessionDoc } from '../store';
import { toPracticeQuestion } from '../store/bank';
import { BankContext } from '../store/bankHooks';
import './summary.css';
import { isMarked } from './recorder';
import { LABEL_WORDS, buildReview, correctAnswerText, isMine, takeaway, type ReviewRow } from './finish';

const fmt = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

/** Flat accuracy ring: green at or above the practice target, saffron in the middle, red when low (the % is always printed). */
export function AccuracyRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="size-full max-w-48" role="img" aria-label={`Accuracy ${Math.round(value * 100)} percent`}>
      <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-surface-3" />
      <circle
        cx="64" cy="64" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
        className={value >= 0.65 ? 'stroke-good' : value >= 0.4 ? 'stroke-accent' : 'stroke-bad'} strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="72" textAnchor="middle" className="fill-ink text-h2 font-semibold tabular">{Math.round(value * 100)}%</text>
    </svg>
  );
}

export interface SummaryViewProps {
  session: SessionDoc;
  questions: Question[];
}

type Filter = 'all' | 'wrong' | 'skipped' | 'flagged' | 'slow';

/** Plain one-line stem for the log row (no markdown, no TeX noise). */
export function snippet(stem: string, max = 120): string {
  const t = stem
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[$*_#`{}\\^]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** True once `el` has scrolled out of view. Stays false where IntersectionObserver is missing (jsdom, old browsers). */
function useScrolledPast(el: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const node = el.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) setPast(!last.isIntersecting);
    });
    io.observe(node);
    return () => io.disconnect();
  }, [el]);
  return past;
}

/** On arrival: top of page, focus on the heading so screen readers start at the story. */
export function useArrival(dep: unknown) {
  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      /* jsdom */
    }
    const h = document.querySelector<HTMLElement>('main h1');
    if (h) {
      h.tabIndex = -1;
      h.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    }
  }, [dep]);
}

const pluralLabel = (n: number, l: BehaviourLabel) => `${n} ${LABEL_WORDS[l].toLowerCase()}`;

export function SummaryView({ session, questions }: SummaryViewProps) {
  const [reviewing, setReviewing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const headRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledPast(headRef);
  useArrival(reviewing);
  const summary = session.summary as unknown as SessionSummary;
  const events = (session.events ?? []) as KairosEvent[];
  const rows = buildReview(events, questions, (session.reasons ?? {}) as Record<string, string>);
  const wrong = rows.filter((r) => r.outcome === 'wrong');
  const chapter = String(session.chapter ?? 'mixed');
  const stats = summary as unknown as { selfChecked?: number; selfRight?: number; fromMine?: number };
  const selfChecked = stats.selfChecked ?? 0;
  const fromMine = stats.fromMine ?? 0;
  const my = session.my === 'only' || session.my === '1' ? String(session.my) : '';
  const tail = my ? `my=${my}${session.selfCheck ? '&selfcheck=1' : ''}` : '';
  const again =
    chapter === 'mixed'
      ? `/practice/${session.exam}/mixed?chapters=${((session.chapters as string[]) ?? []).join(',')}${tail ? `&${tail}` : ''}`
      : `/practice/${session.exam}/${chapter}${tail ? `?${tail}` : ''}`;

  const flaggedIds = new Set(rows.filter((r) => isMarked(events, r.q.id)).map((r) => r.q.id));
  const isSlow = (r: ReviewRow) => r.labels.includes('time_sink') || (r.attempt.medianTimeMs > 0 && r.attempt.timeMs > 1.5 * r.attempt.medianTimeMs);
  const counts: Record<Filter, number> = {
    all: rows.length,
    wrong: wrong.length,
    skipped: rows.filter((r) => r.outcome === 'skipped').length,
    flagged: flaggedIds.size,
    slow: rows.filter(isSlow).length,
  };
  const shown = rows
    .map((r, i) => ({ r, n: i + 1 }))
    .filter(({ r }) => (filter === 'wrong' ? r.outcome === 'wrong' : filter === 'skipped' ? r.outcome === 'skipped' : filter === 'flagged' ? flaggedIds.has(r.q.id) : filter === 'slow' ? isSlow(r) : true));

  if (reviewing)
    return (
      <Page width="reading">
        <PageHeader title="Review mistakes" subtitle={`${wrong.length} to look at`} actions={<Button variant="secondary" onClick={() => setReviewing(false)}>Back to summary</Button>} />
        {wrong.length === 0 && <EmptyState title="Nothing to review">No wrong answers in this session.</EmptyState>}
        <div className="stack-grid">
          {wrong.map((r, i) => (
            <Card key={r.q.id}>
              <div className="stack-card">
                <Chip tone="bad">Mistake {i + 1} of {wrong.length}</Chip>
                <QuestionView
                  question={r.q}
                  variant="review"
                  showSolution
                  selected={r.q.type === 'NVQ' || r.q.type === 'INT' ? [] : r.given ? r.given.split(',') : []}
                />
                <p className="text-small text-slate">
                  Your answer: {r.given || 'none'}. Correct answer: {correctAnswerText(r.q)}.
                </p>
              </div>
            </Card>
          ))}
          {wrong.length > 0 && <Button variant="secondary" onClick={() => setReviewing(false)}>Back to summary</Button>}
        </div>
      </Page>
    );

  const labelNotes = (Object.entries(summary.labels ?? {}) as [BehaviourLabel, number][])
    .filter(([l, n]) => n > 0 && LABEL_WORDS[l])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([l, n]) => pluralLabel(n, l));
  const pct = `${Math.round(summary.accuracy * 100)}%`;
  const reviewBtn = wrong.length > 0 && <Button onClick={() => setReviewing(true)}>Review mistakes ({wrong.length})</Button>;

  return (
    <Page width="app">
      <>
        <div ref={headRef} className="sum-head" data-testid="summary-head">
          <PageHeader title="Session summary" subtitle={summary.n === 0 && selfChecked > 0 ? 'Self-check session logged. These questions do not change your mastery.' : takeaway(summary)} />
          <Card tone="primary">
            <div className="sum-score">
              <div className="grid place-items-center"><AccuracyRing value={summary.accuracy} /></div>
              <div className="stack-card">
                <div className="sum-stats">
                  <Stat label="Score" value={`${summary.correct}/${summary.n}`} />
                  <Stat label="Accuracy" value={pct} />
                  <Stat label="Time" value={fmt(summary.totalTimeMs)} hint={`${fmt(summary.avgTimeMs)} per question`} />
                </div>
                {labelNotes.length > 0 && <p className="text-small text-slate">What stood out: {labelNotes.join(', ')}.</p>}
              </div>
            </div>
          </Card>
          {fromMine > 0 && (
            <Card>
              <div className="stack-text">
                <span className="text-h3">From your questions</span>
                <p className="text-small text-slate">
                  {fromMine} question{fromMine === 1 ? '' : 's'} in this session came from your uploads.
                  {selfChecked > 0 && <> Self-checked: {stats.selfRight ?? 0} of {selfChecked} marked right. Those are not part of your accuracy or mastery.</>}
                </p>
              </div>
            </Card>
          )}
        </div>

        <nav aria-label="Next steps" className={`sum-bar${scrolled ? '' : ' sum-bar-flow'}`} data-testid="summary-actions" data-stuck={scrolled ? 'true' : 'false'}>
          {scrolled && (
            <div className="sum-mini" data-testid="summary-mini">
              <span className="sum-mini-score tabular">{summary.correct}/{summary.n} · {pct}</span>
              <span className="sum-mini-actions">
                {wrong.length > 0 && <Button size="sm" onClick={() => setReviewing(true)}>Review ({wrong.length})</Button>}
                <Button size="sm" variant="secondary" onClick={() => window.scrollTo?.({ top: 0, behavior: 'smooth' })}>Summary ↑</Button>
              </span>
            </div>
          )}
          {!scrolled && (
            <div className="sum-actions">
              {reviewBtn}
              <LinkButton to={again} variant={wrong.length > 0 ? 'secondary' : 'primary'}>Practise this chapter again</LinkButton>
              <LinkButton to="/practice" variant="secondary">Back to chapters</LinkButton>
              <LinkButton to="/mocks" variant="ghost">Take a mock</LinkButton>
            </div>
          )}
        </nav>

        <Section title="Question by question" aside={<Chip>{rows.length} questions</Chip>}>
          <div className="stack-card">
            <Tabs
              label="Filter questions"
              value={filter}
              onChange={(id) => setFilter(id as Filter)}
              tabs={[
                { id: 'all', label: `All ${counts.all}` },
                { id: 'wrong', label: `Wrong ${counts.wrong}` },
                { id: 'skipped', label: `Skipped ${counts.skipped}` },
                { id: 'flagged', label: `Flagged ${counts.flagged}` },
                { id: 'slow', label: `Slow ${counts.slow}` },
              ]}
            />
            {shown.length === 0 ? (
              <p className="text-slate" role="status">Nothing here. Try another filter.</p>
            ) : (
              <ul className="slog" aria-label="Questions">
                {shown.map(({ r, n }) => <RowItem key={r.q.id} r={r} n={n} flagged={flaggedIds.has(r.q.id)} />)}
              </ul>
            )}
          </div>
        </Section>
      </>
    </Page>
  );
}

function RowItem({ r, n, flagged }: { r: ReviewRow; n: number; flagged: boolean }) {
  const [open, setOpen] = useState(false);
  const ok = r.outcome === 'correct';
  const verdict = ok ? 'correct' : r.outcome === 'skipped' ? 'skipped' : 'not quite';
  return (
    <li className={`slog-row ${ok ? 'slog-row-ok' : 'slog-row-bad'}`} data-testid="log-row">
      <button type="button" className="slog-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="slog-status">
          {ok ? <CheckIcon width={20} height={20} className="text-status-good" /> : <CloseIcon width={20} height={20} className={r.outcome === 'skipped' ? 'text-status-warn' : 'text-status-bad'} />}
          <span>Question {n}: {verdict}</span>
        </span>
        <span className="slog-stem text-small">{snippet(r.q.stem)}</span>
        <span className="slog-cell text-small"><span className="slog-cell-label">Your answer</span><span>{r.given || 'none'}</span></span>
        <span className="slog-cell text-small"><span className="slog-cell-label">Correct answer</span><span>{correctAnswerText(r.q)}</span></span>
        <span className="slog-cell text-small tabular"><span className="slog-cell-label">Time</span><span>{fmt(r.attempt.timeMs)}</span></span>
        <span className="slog-chips">
          {isMine(r.q) && <Chip>Your question</Chip>}
          {flagged && <Chip>Flagged</Chip>}
          {r.labels.map((l) => <Chip key={l} tone={ok ? 'good' : 'bad'}>{LABEL_WORDS[l]}</Chip>)}
          <span className="text-small text-slate">{open ? 'Hide solution' : 'Show solution'}</span>
        </span>
      </button>
      {open && (
        <div className="slog-body">
          <QuestionView question={r.q} variant="review" showSolution selected={r.q.type === 'NVQ' || r.q.type === 'INT' ? [] : r.given ? r.given.split(',') : []} />
        </div>
      )}
    </li>
  );
}

export function SummaryScreen() {
  const { sessionId = '' } = useParams();
  const store = useStore();
  const bank = useContext(BankContext)?.store ?? null;
  const [attempt, setTry] = useState(0);
  const [state, setState] = useState<{ session: SessionDoc; questions: Question[] } | 'missing' | 'error' | null>(null);

  useEffect(() => {
    let live = true;
    setState(null);
    (async () => {
      try {
        const session = (await store.listSessions()).find((s) => s.id === sessionId);
        if (!session || !session.summary) return live && setState('missing');
        const version = await getLatestVersion();
        const ids = Array.isArray(session.qids) ? (session.qids as string[]) : [];
        const bankQs = await getQuestionsByIds(version, String(session.exam), ids.filter((id) => !id.startsWith('u_')));
        const own = ids.some((id) => id.startsWith('u_')) && bank ? await bank.listQuestions().catch(() => []) : [];
        const byId = new Map([...bankQs, ...own.map(toPracticeQuestion)].map((q) => [q.id, q]));
        const questions = ids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
        if (live) setState({ session, questions });
      } catch {
        if (live) setState('error');
      }
    })();
    return () => { live = false; };
  }, [store, bank, sessionId, attempt]);

  const back = <LinkButton to="/practice" variant="secondary">Back to chapters</LinkButton>;
  if (state === null) return <PageSkeleton cards={2} cols={1} />;
  if (state === 'missing') return <Page width="reading"><EmptyState title="Session not found" action={back}>It may be on another device.</EmptyState></Page>;
  if (state === 'error') return <Page width="reading"><EmptyState title="Could not load the summary" action={<><Button onClick={() => setTry((t) => t + 1)}>Try again</Button> {back}</>}>Check your connection, then try again. Your session is saved on this device.</EmptyState></Page>;
  return <SummaryView session={state.session} questions={state.questions} />;
}
