import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import type { PublicQuestion, Question } from '@kairos/core';
import { useStore, type MockDoc } from '../store';
import { Button, EmptyState, LinkButton, Page, PageHeader, PageSkeleton, Tabs } from '../components/ui';
import { MockReport } from '../analysis';
import { MockResultSummary } from './MockResultSummary';
import { MockReview } from './MockReview';
import { useExamData } from './loader';
import { readAnalysis } from './model';
import { exitFullscreen } from './fullscreen';
import './result.css';

type Tab = 'summary' | 'answers' | 'report';

/** `/exam/:paperId/result/:mockId` */
export function ResultPage() {
  const { mockId = '' } = useParams();
  const store = useStore();
  const [tab, setTab] = useState<Tab>('summary');
  // arriving here always means the exam is over: normal page, top of the page, full screen off
  useEffect(() => {
    exitFullscreen();
    try {
      window.scrollTo(0, 0);
    } catch {
      /* jsdom */
    }
    const h = document.querySelector<HTMLElement>('main h1');
    h?.setAttribute('tabindex', '-1');
    h?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  }, [mockId]);
  const go = (t: Tab) => {
    setTab(t);
    try {
      window.scrollTo(0, 0);
    } catch {
      /* jsdom */
    }
  };
  const [mock, setMock] = useState<MockDoc | null | undefined>();
  useEffect(() => {
    let live = true;
    store.listMocks().then(
      (all) => live && setMock(all.find((m) => m.id === mockId) ?? null),
      () => live && setMock(null),
    );
    return () => {
      live = false;
    };
  }, [store, mockId]);
  const exam = useExamData(mock ? mock.paperId : null);
  const [answers, setAnswers] = useState<ReadonlyMap<string, Question> | null>(null);
  useEffect(() => {
    let live = true;
    void exam.data?.loadAnswers().then((m) => live && setAnswers(m));
    return () => {
      live = false;
    };
  }, [exam.data]);
  const questions = useMemo<ReadonlyMap<string, Question | PublicQuestion> | undefined>(() => {
    if (answers) return answers;
    return exam.data ? new Map(exam.data.model.questions.map((q) => [q.id, q])) : undefined;
  }, [answers, exam.data]);

  if (mock === undefined) {
    return <PageSkeleton />;
  }
  if (mock === null) {
    return (
      <Page>
        <PageHeader title="Mock result" actions={<LinkButton variant="secondary" to="/mocks">All mock tests</LinkButton>} />
        <EmptyState title="We could not find that attempt" action={<LinkButton to="/mocks">See your mock tests</LinkButton>}>
          It may have been saved on another device.
        </EmptyState>
      </Page>
    );
  }
  const a = readAnalysis(mock);
  return (
    <Page>
      <PageHeader title={a?.title ?? 'Mock result'} subtitle={mock.submittedAt ? new Date(mock.submittedAt).toLocaleString() : undefined} />
      <div className="stack-section">
        <nav aria-label="Next steps" className="result-bar" data-testid="result-actions">
          <div className="result-actions">
            <Button onClick={() => go('report')}>View full report</Button>
            <Button variant="secondary" onClick={() => go('answers')}>Review answers</Button>
            <LinkButton variant="secondary" to={`/exam/${mock.paperId}`}>Retake</LinkButton>
            <LinkButton variant="ghost" to="/mocks">All mocks</LinkButton>
          </div>
        </nav>
        <Tabs
          label="Result views"
          value={tab}
          onChange={(id) => setTab(id as Tab)}
          tabs={[
            { id: 'summary', label: 'Summary' },
            { id: 'answers', label: 'Answers' },
            { id: 'report', label: 'Full report' },
          ]}
        />
        {tab === 'summary' && <MockResultSummary mock={mock} />}
        {tab === 'answers' && <MockReview mock={mock} questions={questions} exam={exam.data?.model.exam} />}
        {tab === 'report' && <MockReport mock={mock} questions={questions as never} />}
      </div>
    </Page>
  );
}
