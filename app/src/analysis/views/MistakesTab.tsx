import { useMemo } from 'react';
import { Link } from 'react-router';
import type { BehaviourLabel, MasteryDoc } from '@kairos/core';
import { Card, CardGrid, EmptyState, LinkButton, ListRow, Section, SkeletonRows } from '../../components/ui';
import { LABEL_WORDS } from '../../practice/finish';
import type { Taxonomy } from '../../practice/taxonomy';
import { topicMeta } from '../../practice/taxonomy';
import type { SessionDoc } from '../../store';
import { mmss } from '../charts/primitives';
import { mistakeExamples, topMistakes } from '../compute';
import { chapterIndex, useSessionQuestions } from '../hooks';

const EXPLAIN: Partial<Record<BehaviourLabel, string>> = {
  concept_gap: 'The idea is not there yet. Re-read it, then try a few easy ones before hard ones.',
  silly_mistake: 'You know these. A quick re-read of the question and a units check will win marks back.',
  guess_careless: 'Quick answers that missed. If you are under 40% sure, skipping can be the better move.',
  time_sink: 'Long stretches that ended wrong. Set a 3-minute limit and come back later.',
  overthinking: 'You had it right, then changed it. Trust the first answer unless you spot a real error.',
  strategy: 'Easy questions left blank. Look at every question once before skipping.',
};

/** Mistakes tab: repeated errors by type, where they cluster, example questions, and a deep link to practise them. */
export function MistakesTab({ mastery, tax, sessions, exam }: { mastery: MasteryDoc | null; tax: Taxonomy | null; sessions: SessionDoc[]; exam?: string }) {
  const meta = useMemo(() => (tax ? topicMeta(tax) : {}), [tax]);
  const { names } = useMemo(() => chapterIndex(tax), [tax]);
  const groups = useMemo(() => topMistakes(mastery, (t) => meta[t]?.chapter).slice(0, 4), [mastery, meta]);
  const recent = useMemo(() => [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 15), [sessions]);
  const { questions, loading } = useSessionQuestions(recent);
  const examples = useMemo(() => mistakeExamples(recent, questions), [recent, questions]);
  if (groups.length === 0) {
    return (
      <EmptyState title="No repeated mistakes yet" action={<LinkButton to="/practice">Practise a chapter</LinkButton>}>
        When you review your wrong answers after a session, the patterns show up here, with a way to practise them.
      </EmptyState>
    );
  }
  return (
    <Section title="Your most repeated mistakes">
      <CardGrid cols={2}>
        {groups.map((g) => {
          const top = g.chapters[0]!;
          const ex = examples.get(g.label) ?? [];
          const e = exam ?? 'JEE_MAIN';
          return (
            <Card key={g.label} footer={<Link to={`/practice/${e}/${top.chapter}`} className="inline-flex min-h-s7 items-center font-semibold text-primary">Practise these in {names[top.chapter] ?? top.chapter}</Link>}>
              <div className="stack-card">
                <div className="row-between">
                  <h3 className="text-h3">{LABEL_WORDS[g.label]}</h3>
                  <span className="tabular text-small text-slate">{g.count} times</span>
                </div>
                <p className="text-small">{EXPLAIN[g.label]}</p>
                <p className="text-small text-slate">Mostly in {g.chapters.slice(0, 3).map((c) => `${names[c.chapter] ?? c.chapter} (${c.count})`).join(', ')}.</p>
                {loading ? <SkeletonRows count={1} /> : ex.length > 0 && (
                  <ul className="stack-label">
                    {ex.map((x) => (
                      <li key={x.qid}>
                        <ListRow
                          title={x.stem}
                          titleClass="text-small"
                          description={`${x.chapter ? (names[x.chapter] ?? x.chapter) : 'Question'} · ${mmss(x.timeMs)}`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </CardGrid>
    </Section>
  );
}
