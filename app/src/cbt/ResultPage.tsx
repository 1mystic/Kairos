import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { PublicQuestion, Question } from '@kairos/core';
import { useStore, type MockDoc } from '../store';
import { EmptyState, LinkButton, Page, PageHeader, Skeleton } from '../components/ui';
import { MockResultSummary } from './MockResultSummary';
import { MockReview } from './MockReview';
import { useExamData } from './loader';
import { readAnalysis } from './model';

/** `/exam/:paperId/result/:mockId` */
export function ResultPage() {
  const { mockId = '' } = useParams();
  const store = useStore();
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
    return <Page><Skeleton className="h-s8 w-full" /></Page>;
  }
  if (mock === null) {
    return (
      <Page>
        <EmptyState title="We could not find that attempt" action={<LinkButton to="/mocks">See your mock tests</LinkButton>}>
          It may have been saved on another device.
        </EmptyState>
      </Page>
    );
  }
  const a = readAnalysis(mock);
  return (
    <Page>
      <div className="stack gap-section">
        <PageHeader
          title={a?.title ?? 'Mock result'}
          subtitle={mock.submittedAt ? new Date(mock.submittedAt).toLocaleString() : undefined}
          actions={<LinkButton variant="secondary" to="/mocks">All mock tests</LinkButton>}
        />
        <MockResultSummary mock={mock} />
        <MockReview mock={mock} questions={questions} />
        <Link to="/" className="text-primary">Back to home</Link>
      </div>
    </Page>
  );
}
