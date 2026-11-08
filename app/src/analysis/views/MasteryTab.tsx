import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { masteryBySubject, attemptsFromEvents, type KairosEvent, type MasteryDoc } from '@kairos/core';
import { Card, Chip, EmptyState, LinkButton, ProgressBar, Section, Skeleton, Tabs } from '../../components/ui';
import { EXAMS, chapterMastery, masteryWords, topicMeta, type Taxonomy } from '../../practice/taxonomy';
import type { SessionDoc } from '../../store';
import { HBars } from '../charts/HBars';
import { LabelMix } from '../charts/LabelMix';
import { pct } from '../charts/primitives';
import { accuracyTrend, chapterHeatmap, difficultyBands, labelMixByWeek, studyTimeBySubject, subjectName, type ChapterRef } from '../compute';
import { chapterIndex, useSessionQuestions } from '../hooks';
import { Heatmap } from './Heatmap';

/** Mastery tab: subject cards with trend, chapter heatmap, mistake mix, accuracy by difficulty, study time. */
export function MasteryTab({ tax, mastery, sessions, exam: profileExam, now }: { tax: Taxonomy | null; mastery: MasteryDoc | null; sessions: SessionDoc[]; exam?: string; now: number }) {
  const [exam, setExam] = useState<string>(EXAMS.some((e) => e.id === profileExam) ? profileExam! : 'JEE_MAIN');
  const { subjects: chSubject } = useMemo(() => chapterIndex(tax), [tax]);
  const meta = useMemo(() => (tax ? topicMeta(tax) : {}), [tax]);
  const chAgg = useMemo(() => (tax ? chapterMastery(mastery, tax) : {}), [tax, mastery]);
  const subjAgg = useMemo(() => (mastery && tax ? masteryBySubject(mastery, meta) : {}), [mastery, tax, meta]);
  const trends = useMemo(() => accuracyTrend(sessions, chSubject, now), [sessions, chSubject, now]);
  const weeks = useMemo(() => labelMixByWeek(sessions, now), [sessions, now]);
  const time = useMemo(() => studyTimeBySubject(sessions, chSubject, now), [sessions, chSubject, now]);
  const rows = useMemo(() => {
    if (!tax) return [];
    return tax.subjects.flatMap((s) => s.chapters.filter((c) => c.exams?.[exam] !== false && c.exams?.[exam]).map((c): ChapterRef => ({ id: c.id, name: c.name, subject: s.id })));
  }, [tax, exam]);
  const cells = useMemo(() => chapterHeatmap({ chapters: rows, mastery: chAgg }), [rows, chAgg]);
  const recent = useMemo(() => sessions.filter((s) => now - (s.endedAt ?? s.startedAt) < 30 * 86_400_000), [sessions, now]);
  const { questions, loading: qLoading } = useSessionQuestions(recent);
  const bands = useMemo(() => {
    const out = [];
    for (const s of recent) {
      const ev = (s.events ?? []) as KairosEvent[];
      const ids = new Set((s.qids as string[] | undefined) ?? []);
      if (ev.length) out.push(...attemptsFromEvents(ev, [...questions.values()].filter((q) => ids.has(q.id))));
    }
    return difficultyBands(out);
  }, [recent, questions]);

  if (!tax) return <Card><p className="text-slate">The chapter list is not available offline yet. Open Practice once while online and this page will fill in.</p></Card>;
  if (!mastery || Object.keys(mastery).length === 0) {
    return (
      <EmptyState title="Your mastery map starts with one session" action={<LinkButton to="/practice">Practise a chapter</LinkButton>}>
        After a short practice session we can show what you know, chapter by chapter, and how sure we are.
      </EmptyState>
    );
  }
  const examSubjects = [...new Set(rows.map((r) => r.subject))];
  const hasLabels = weeks.some((w) => w.careless + w.conceptGap + w.timeSink > 0);
  const maxTime = Math.max(1, ...time.map((t) => t.ms));
  return (
    <div className="stack gap-section">
      <Tabs label="Exam" tabs={EXAMS.map((e) => ({ id: e.id, label: e.label }))} value={exam as (typeof EXAMS)[number]['id']} onChange={setExam} />
      <Section title="Subjects">
        <div className="grid-auto">
          {examSubjects.map((s) => {
            const agg = subjAgg[s];
            const words = masteryWords(agg);
            const tr = trends.find((t) => t.subject === s);
            return (
              <Card key={s}>
                <div className="stack gap-base">
                  <div className="flex items-baseline justify-between gap-s3">
                    <h3 className="text-h3">{subjectName(s)}</h3>
                    {words && <Chip tone={words.tone}>{words.text}</Chip>}
                  </div>
                  {agg && agg.n > 0 && agg.label !== 'not_enough_data' ? (
                    <>
                      <p className="tabular text-h1">{Math.round(100 / (1 + Math.exp(-agg.theta)))}%</p>
                      <ProgressBar value={1 / (1 + Math.exp(-agg.theta))} label={`${subjectName(s)} mastery`} />
                    </>
                  ) : <p className="text-slate">Not enough data yet. A few more answers in {subjectName(s)} and this fills in.</p>}
                  <p className="text-small text-slate">
                    {tr?.delta === null || !tr ? 'Not enough recent practice to show a trend.' : tr.delta === 0 ? 'Accuracy level with the 3 weeks before.' : `Accuracy ${tr.delta > 0 ? 'up' : 'down'} ${Math.abs(tr.delta)} points over the last 7 days, against the 23 before.`}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section title="Chapters by priority" aside={<span className="text-small text-slate">{cells.filter((c) => c.flagged).length} to focus on</span>}>
        <Card><Heatmap cells={cells} exam={exam} /></Card>
      </Section>

      <div className="grid grid-cols-1 gap-s6 lg:grid-cols-2">
        <Section title="What kind of mistakes">
          <Card>
            {hasLabels ? <LabelMix weeks={weeks} /> : <p className="text-slate">Mistake types appear after a few practice sessions where you review your answers.</p>}
          </Card>
        </Section>
        <Section title="Accuracy by difficulty" aside={<span className="text-small text-slate">last 30 days</span>}>
          <Card>
            {qLoading ? <Skeleton className="h-s8 w-full" /> : bands.some((b) => b.attempted > 0) ? (
              <HBars
                caption="Accuracy by question difficulty"
                summary={`Accuracy by difficulty: ${bands.map((b) => `${b.label} ${pct(b.accuracy)}`).join(', ')}.`}
                rows={bands.map((b) => ({ key: b.id, label: b.label, value: b.accuracy, text: b.accuracy === null ? 'No answers' : `${pct(b.accuracy)} of ${b.attempted}`, tone: b.id === 'easy' && b.accuracy !== null && b.accuracy < 0.7 ? 'accent' : 'primary' }))}
              />
            ) : <p className="text-slate">Needs the question bank. It fills in when you are online and have practised recently.</p>}
          </Card>
        </Section>
        <Section title="Study time by subject" aside={<span className="text-small text-slate">last 30 days</span>}>
          <Card>
            {time.length ? (
              <HBars
                caption="Minutes of practice by subject"
                summary={`Practice time: ${time.map((t) => `${subjectName(t.subject)} ${Math.round(t.ms / 60_000)} minutes`).join(', ')}.`}
                rows={time.map((t) => ({ key: t.subject, label: subjectName(t.subject), value: t.ms / maxTime, text: `${Math.round(t.ms / 60_000)} min` }))}
              />
            ) : <p className="text-slate">No practice time in the last 30 days.</p>}
          </Card>
        </Section>
      </div>
      <p className="text-small text-slate">Want the full picture of a mock? <Link to="/analysis?tab=mocks" className="font-semibold text-primary">See your mock reports</Link>.</p>
    </div>
  );
}
