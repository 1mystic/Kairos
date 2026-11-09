import { useState } from 'react';
import type { PublicQuestion, Question, Response } from '@kairos/core';
import type { MockDoc } from '../store';
import { Button, Chip, Section, Tabs } from '../components/ui';
import { CheckIcon, CloseIcon } from '../components/icons';
import { QuestionView } from '../components/QuestionView';
import { describeResponse, formatClock, readAnalysis } from './model';

const VERDICT: Record<string, string> = { correct: 'Correct', wrong: 'Wrong', blank: 'Not answered', partial: 'Partly correct' };

function correctText(q: Question | PublicQuestion | undefined): string {
  const a = (q as Question | undefined)?.answer;
  if (!a) return 'Not available yet';
  if ('keys' in a) return a.keys.join(', ');
  if ('range' in a) return `${a.range[0]} to ${a.range[1]}`;
  return String(a.value);
}

type Filter = 'all' | 'wrong' | 'skipped';

/** Per-question review as full-width rows (same anatomy as the practice log): your answer vs correct, solution on demand. */
export function MockReview({ mock, questions }: { mock: MockDoc; questions: ReadonlyMap<string, Question | PublicQuestion> | undefined }) {
  const a = readAnalysis(mock);
  const responses = (mock.responses as { qid: string; answer: Response | null }[] | undefined) ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  if (!a) return null;
  const rows = a.questions.map((o, i) => ({ o, i }));
  const count = (f: Filter) => rows.filter(({ o }) => (f === 'wrong' ? o.verdict === 'wrong' : f === 'skipped' ? o.verdict === 'blank' : true)).length;
  const shown = rows.filter(({ o }) => (filter === 'wrong' ? o.verdict === 'wrong' : filter === 'skipped' ? o.verdict === 'blank' : true));
  return (
    <Section title="Review your answers">
      <div className="stack-section">
        <Tabs
          label="Filter answers"
          value={filter}
          onChange={(id) => setFilter(id as Filter)}
          tabs={[
            { id: 'all', label: `All ${count('all')}` },
            { id: 'wrong', label: `Wrong ${count('wrong')}` },
            { id: 'skipped', label: `Skipped ${count('skipped')}` },
          ]}
        />
        {shown.length === 0 && <p className="text-slate" role="status">Nothing here. Try another filter.</p>}
        <ul className="mock-log">
          {shown.map(({ o, i }) => {
            const q = questions?.get(o.qid);
            const mine = responses[i]?.answer ?? null;
            const keys = mine && 'keys' in mine ? mine.keys : [];
            const showing = open === o.qid;
            const good = o.verdict === 'correct';
            return (
              <li key={o.qid} data-testid="review-item" className={`mock-row${good ? ' mock-row-ok' : o.verdict === 'wrong' ? ' mock-row-bad' : ''}`}>
                <div className="mock-row-head">
                  <span className="mock-row-id">Q{i + 1} <span className="text-small text-slate">{o.subject} · Section {o.sectionId}</span></span>
                  <span className="mock-cell"><span className="mock-cell-label">Your answer</span><b>{describeResponse(mine)}</b></span>
                  <span className="mock-cell"><span className="mock-cell-label">Correct answer</span><b>{correctText(q)}</b></span>
                  <span className="mock-cell"><span className="mock-cell-label">Time</span><b className="tabular">{formatClock(o.timeMs)}</b></span>
                  <span className="row-inline">
                    {o.verdict && <Chip tone={good ? 'good' : o.verdict === 'wrong' ? 'bad' : 'neutral'} icon={good ? <CheckIcon width={14} height={14} /> : o.verdict === 'wrong' ? <CloseIcon width={14} height={14} /> : undefined}>{VERDICT[o.verdict]}</Chip>}
                    {o.marks !== undefined && <span className="tabular text-small">{o.marks > 0 ? `+${o.marks}` : o.marks}</span>}
                  </span>
                  {q && (
                    <Button variant="ghost" size="sm" onClick={() => setOpen(showing ? null : o.qid)} aria-expanded={showing}>
                      {showing ? 'Hide solution' : 'Show solution'}
                    </Button>
                  )}
                </div>
                {q && showing && <div className="mock-row-body"><QuestionView question={q} variant="review" showSolution selected={keys} /></div>}
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
