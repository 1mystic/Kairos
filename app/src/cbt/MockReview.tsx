import { useState } from 'react';
import type { PublicQuestion, Question, Response } from '@kairos/core';
import type { MockDoc } from '../store';
import { Button, Card, Chip, Section } from '../components/ui';
import { QuestionView } from '../components/QuestionView';
import { describeResponse, readAnalysis } from './model';

const VERDICT: Record<string, string> = { correct: 'Correct', wrong: 'Wrong', blank: 'Not answered', partial: 'Partly correct' };

function correctText(q: Question | PublicQuestion | undefined): string {
  const a = (q as Question | undefined)?.answer;
  if (!a) return 'Not available yet';
  if ('keys' in a) return a.keys.join(', ');
  if ('range' in a) return `${a.range[0]} to ${a.range[1]}`;
  return String(a.value);
}

/** Per-question review: your answer vs correct, with the solution on demand. */
export function MockReview({ mock, questions }: { mock: MockDoc; questions: ReadonlyMap<string, Question | PublicQuestion> | undefined }) {
  const a = readAnalysis(mock);
  const responses = (mock.responses as { qid: string; answer: Response | null }[] | undefined) ?? [];
  const [open, setOpen] = useState<string | null>(null);
  if (!a) return null;
  return (
    <Section title="Review your answers">
      <div className="grid gap-s4 grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] items-start">
        {a.questions.map((o, i) => {
          const q = questions?.get(o.qid);
          const mine = responses[i]?.answer ?? null;
          const keys = mine && 'keys' in mine ? mine.keys : [];
          const showing = open === o.qid;
          return (
            <Card key={o.qid} as="article" data-testid="review-item">
              <div className="stack gap-base">
                <div className="flex flex-wrap items-center justify-between gap-s2">
                  <h3 className="text-h3">Q{i + 1}{" "}<span className="text-small text-slate">{o.subject} · Section {o.sectionId}</span></h3>
                  <div className="row gap-tight">
                    {o.verdict && <Chip tone={o.verdict === 'correct' ? 'primary' : 'neutral'}>{VERDICT[o.verdict]}</Chip>}
                    {o.marks !== undefined && <span className="tabular text-small">{o.marks > 0 ? `+${o.marks}` : o.marks}</span>}
                  </div>
                </div>
                <dl className="grid gap-s2 text-small sm:grid-cols-2">
                  <div><dt className="text-slate">Your answer</dt><dd className="font-semibold">{describeResponse(mine)}</dd></div>
                  <div><dt className="text-slate">Correct answer</dt><dd className="font-semibold">{correctText(q)}</dd></div>
                </dl>
                {q && (
                  <>
                    <Button variant="ghost" size="sm" className="self-start" onClick={() => setOpen(showing ? null : o.qid)} aria-expanded={showing}>
                      {showing ? 'Hide solution' : 'Show solution'}
                    </Button>
                    {showing && <QuestionView question={q} variant="review" showSolution selected={keys} />}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
