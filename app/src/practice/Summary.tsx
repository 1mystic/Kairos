import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { KairosEvent, Question, SessionSummary } from '@kairos/core';
import { getLatestVersion, getQuestionsByIds } from '../bank/client';
import { QuestionView } from '../components/QuestionView';
import { CheckIcon, CloseIcon } from '../components/icons';
import { Button, Card, Chip, EmptyState, LinkButton, Page, PageHeader, Section, Skeleton, Stat } from '../components/ui';
import { useStore, type SessionDoc } from '../store';
import { LABEL_WORDS, buildReview, correctAnswerText, takeaway, type ReviewRow } from './finish';

const fmt = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

/** Flat accuracy ring: indigo arc on a neutral track. */
export function AccuracyRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="size-full max-w-48" role="img" aria-label={`Accuracy ${Math.round(value * 100)} percent`}>
      <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-surface-3" />
      <circle
        cx="64" cy="64" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
        className="stroke-primary" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
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

export function SummaryView({ session, questions }: SummaryViewProps) {
  const [reviewing, setReviewing] = useState(false);
  const summary = session.summary as unknown as SessionSummary;
  const rows = buildReview((session.events ?? []) as KairosEvent[], questions, (session.reasons ?? {}) as Record<string, string>);
  const wrong = rows.filter((r) => r.outcome === 'wrong');
  const chapter = String(session.chapter ?? 'mixed');
  const again =
    chapter === 'mixed'
      ? `/practice/${session.exam}/mixed?chapters=${((session.chapters as string[]) ?? []).join(',')}`
      : `/practice/${session.exam}/${chapter}`;

  if (reviewing)
    return (
      <Page width="reading">
        <PageHeader title="Review mistakes" subtitle={`${wrong.length} to look at`} actions={<Button variant="secondary" onClick={() => setReviewing(false)}>Back to summary</Button>} />
        {wrong.length === 0 && <EmptyState title="Nothing to review">No wrong answers in this session.</EmptyState>}
        {wrong.map((r, i) => (
          <Card key={r.q.id}>
            <div className="stack gap-s4">
              <Chip tone="accent">Mistake {i + 1} of {wrong.length}</Chip>
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
      </Page>
    );

  return (
    <Page width="app">
      <PageHeader title="Session summary" subtitle={takeaway(summary)} />
      <div className="grid gap-s6 xl:grid-cols-3">
        <div className="stack gap-s6 xl:col-span-1">
          <Card tone="primary">
            <div className="grid grid-cols-2 items-center gap-s4">
              <div className="grid place-items-center"><AccuracyRing value={summary.accuracy} /></div>
              <div className="stack gap-s4">
                <Stat label="Correct" value={`${summary.correct}/${summary.n}`} />
                <Stat label="Time" value={fmt(summary.totalTimeMs)} hint={`${fmt(summary.avgTimeMs)} per question`} />
              </div>
            </div>
          </Card>
          <div className="stack gap-s3">
            {wrong.length > 0 && <Button onClick={() => setReviewing(true)}>Review mistakes ({wrong.length})</Button>}
            <LinkButton to={again} variant={wrong.length > 0 ? 'secondary' : 'primary'}>Practice this chapter again</LinkButton>
            <LinkButton to="/practice" variant="ghost">Back to chapters</LinkButton>
          </div>
        </div>
        <div className="xl:col-span-2">
          <Section title="Question by question">
            <ul className="stack gap-s3">
              {rows.map((r, i) => <RowItem key={r.q.id} r={r} n={i + 1} />)}
            </ul>
          </Section>
        </div>
      </div>
    </Page>
  );
}

function RowItem({ r, n }: { r: ReviewRow; n: number }) {
  const ok = r.outcome === 'correct';
  return (
    <li className={`stack gap-s2 rounded-card p-s4 ${ok ? 'bg-primary-50' : 'bg-accent-50'}`}>
      <div className="row justify-between gap-s3">
        <span className="row gap-s2 font-semibold">
          {ok ? <CheckIcon width={20} height={20} className="text-primary" /> : <CloseIcon width={20} height={20} className="text-accent-ink" />}
          Question {n}: {ok ? 'correct' : r.outcome === 'skipped' ? 'skipped' : 'not quite'}
        </span>
        <span className="text-small text-slate tabular">{fmt(r.attempt.timeMs)}</span>
      </div>
      <p className="text-small text-slate">
        Your answer: {r.given || 'none'}
        {!ok && <> · Correct answer: {correctAnswerText(r.q)}</>}
      </p>
      {r.labels.length > 0 && (
        <div className="row gap-s2">
          {r.labels.map((l) => <Chip key={l} tone={ok ? 'primary' : 'accent'}>{LABEL_WORDS[l]}</Chip>)}
        </div>
      )}
    </li>
  );
}

export function SummaryScreen() {
  const { sessionId = '' } = useParams();
  const store = useStore();
  const [state, setState] = useState<{ session: SessionDoc; questions: Question[] } | 'missing' | 'error' | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const session = (await store.listSessions()).find((s) => s.id === sessionId);
        if (!session || !session.summary) return live && setState('missing');
        const version = await getLatestVersion();
        const ids = Array.isArray(session.qids) ? (session.qids as string[]) : [];
        const questions = await getQuestionsByIds(version, String(session.exam), ids);
        if (live) setState({ session, questions });
      } catch {
        if (live) setState('error');
      }
    })();
    return () => { live = false; };
  }, [store, sessionId]);

  const back = <LinkButton to="/practice" variant="secondary">Back to chapters</LinkButton>;
  if (state === null) return <Page width="app"><Skeleton className="h-s8 w-full" /></Page>;
  if (state === 'missing') return <Page width="reading"><EmptyState title="Session not found" action={back}>It may be on another device.</EmptyState></Page>;
  if (state === 'error') return <Page width="reading"><EmptyState title="Could not load the summary" action={back}>Check your connection and try again.</EmptyState></Page>;
  return <SummaryView session={state.session} questions={state.questions} />;
}
