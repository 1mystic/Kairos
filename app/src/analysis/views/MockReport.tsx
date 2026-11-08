import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { masteryByChapter, type MasteryDoc } from '@kairos/core';
import { Banner, Card, Chip, EmptyState, LinkButton, Skeleton, Stat } from '../../components/ui';
import { ClockIcon } from '../../components/icons';
import { readAnalysis } from '../../cbt/model';
import { loadTaxonomy, topicMeta, type Taxonomy } from '../../practice/taxonomy';
import { useStore, type MockDoc } from '../../store';
import { LineChart } from '../charts/LineChart';
import { QuadrantPlot } from '../charts/QuadrantPlot';
import { TimeBars } from '../charts/TimeBars';
import { WaterfallChart } from '../charts/WaterfallChart';
import { clock, mmss, pct } from '../charts/primitives';
import {
  attemptAccuracyQuadrant, chapterHeatmap, fatigueCurve, fixList, marksText, markWaterfall, rowsOf, subjectName, timeMap, vsTop,
  type Benchmarks, type ChapterEvidence, type ChapterRef, type FixItem, type QMap, type QuadrantId, type WaterfallBar,
} from '../compute';
import { useMockQuestions } from '../hooks';
import { Heatmap } from './Heatmap';

export interface MockReportProps {
  mock: MockDoc;
  /** the paper's questions; loaded from the bank when omitted */
  questions?: QMap;
  /** overrides, mostly for tests; otherwise read from the store / bank */
  mastery?: MasteryDoc | null;
  taxonomy?: Taxonomy | null;
  /** all attempts (for the trend); read from the store when omitted */
  history?: MockDoc[];
  benchmarks?: Benchmarks | null;
}

function Part({ n, title, wide, children }: { n: number; title: string; wide?: boolean; children: ReactNode }) {
  return (
    <Card as="section" className={`min-w-0 ${wide ? 'lg:col-span-2' : ''}`} aria-label={`Part ${n}: ${title}`}>
      <div className="stack gap-loose">
        <div className="flex items-center gap-s3">
          <span className="grid size-s6 shrink-0 place-items-center rounded-pill bg-primary-50 text-small font-semibold tabular text-primary" aria-hidden="true">{n}</span>
          <h2 className="text-h2">{title}</h2>
        </div>
        {children}
      </div>
    </Card>
  );
}

const QUAD_NAME: Record<QuadrantId, string> = { steady: 'Working well', careless: 'Fast, but slips', cautious: 'Careful, attempts few', untouched: 'Start here' };

/**
 * The 8-part mock report (docs/04). Renders from the stored MockDoc alone; questions, taxonomy, mastery and the other
 * attempts are filled in from the bank and store when not passed, and each part degrades calmly without them.
 */
export function MockReport(props: MockReportProps) {
  const { mock } = props;
  const store = useStore();
  const loaded = useMockQuestions(props.questions ? null : mock);
  const questions = props.questions ?? loaded;
  const [tax, setTax] = useState<Taxonomy | null | undefined>(props.taxonomy);
  const [mastery, setMastery] = useState<MasteryDoc | null | undefined>(props.mastery);
  const [history, setHistory] = useState<MockDoc[] | undefined>(props.history);
  useEffect(() => {
    let live = true;
    if (props.taxonomy === undefined) void loadTaxonomy().then((t) => live && setTax(t), () => live && setTax(null));
    if (props.mastery === undefined) void store.getState('mastery').then((m) => live && setMastery(m as MasteryDoc | null), () => live && setMastery(null));
    if (props.history === undefined) void store.listMocks().then((m) => live && setHistory(m), () => live && setHistory([]));
    return () => { live = false; };
  }, [store, props.taxonomy, props.mastery, props.history]);

  const a = readAnalysis(mock);
  const [sel, setSel] = useState<WaterfallBar | null>(null);
  const r = useMemo(() => rowsOf(mock, questions), [mock, questions]);
  const wf = useMemo(() => markWaterfall(mock, questions), [mock, questions]);
  const names = useMemo(() => {
    const n: Record<string, string> = {};
    for (const s of tax?.subjects ?? []) for (const c of s.chapters) n[c.id] = c.name;
    return n;
  }, [tax]);
  const quad = useMemo(() => attemptAccuracyQuadrant(mock, questions, (c) => names[c] ?? c), [mock, questions, names]);
  const tm = useMemo(() => timeMap(mock, questions), [mock, questions]);
  const fat = useMemo(() => fatigueCurve(mock, questions), [mock, questions]);
  const heat = useMemo(() => {
    if (!tax || !r) return null;
    const exam = a?.exam ?? 'JEE_MAIN';
    const inPaper = new Set(r.rows.map((x) => x.chapter).filter((c): c is string => !!c));
    const chapters: ChapterRef[] = tax.subjects.flatMap((s) =>
      s.chapters.filter((c) => c.exams?.[exam] !== false && (inPaper.size === 0 || inPaper.has(c.id))).map((c) => ({ id: c.id, name: c.name, subject: s.id })));
    const evidence: Record<string, ChapterEvidence> = {};
    for (const x of r.rows) {
      if (!x.chapter) continue;
      const e = (evidence[x.chapter] ??= { correct: 0, wrong: 0, blank: 0, marksLost: 0 });
      if (x.verdict === 'correct') e.correct++; else if (x.verdict === 'wrong') e.wrong++; else e.blank++;
      e.marksLost += x.maxMarks - Math.max(x.marks, 0);
    }
    return chapterHeatmap({ chapters, mastery: mastery ? masteryByChapter(mastery, topicMeta(tax)) : {}, evidence });
  }, [tax, r, a, mastery]);
  const fix: FixItem[] = useMemo(() => fixList({ mock, questions, waterfall: wf, heat: heat ?? [], fatigue: fat }), [mock, questions, wf, heat, fat]);
  const top = useMemo(() => vsTop(mock, props.benchmarks), [mock, props.benchmarks]);

  if (!a) return <Card><p className="text-slate">This attempt has no analysis to show.</p></Card>;
  if (!r || !r.graded || !wf) {
    return (
      <EmptyState icon={ClockIcon} title="Your report is waiting for marking" action={<LinkButton variant="secondary" to="/mocks">Back to mock tests</LinkButton>}>
        Marking for this paper is not available on this device yet. The full report appears as soon as your score does.
      </EmptyState>
    );
  }
  const exam = a.exam;
  const nameOf = (qid: string) => {
    const row = r.rows.find((x) => x.qid === qid);
    const idx = r.rows.findIndex((x) => x.qid === qid) + 1;
    return `Q${idx}${row?.chapter ? ` · ${names[row.chapter] ?? row.chapter}` : ''} · ${subjectName(row?.subject ?? '')}`;
  };
  const prev = (history ?? []).filter((m) => m.id !== mock.id && (m.submittedAt ?? 0) < (mock.submittedAt ?? Infinity) && readAnalysis(m) && !readAnalysis(m)!.pending)
    .sort((x, y) => (x.submittedAt ?? 0) - (y.submittedAt ?? 0));
  const attempts = [...prev, mock];
  const pcts = attempts.map((m) => {
    const s = m.score as { marks?: number; max?: number } | null;
    return s && typeof s.marks === 'number' && s.max ? Math.max(0, s.marks / s.max) : null;
  });
  const lastPrev = pcts.length > 1 ? (pcts[pcts.length - 2] ?? null) : null;
  const curPct = pcts[pcts.length - 1] ?? null;
  const lost = wf.max - wf.actual;
  const parts = wf.bars.filter((b) => b.kind === 'loss' && b.marks > 0).sort((x, y) => y.marks - x.marks).slice(0, 3);
  const lostLine = lost > 0
    ? `You left ${marksText(lost)} marks on the table: ${parts.map((b) => `${marksText(b.marks)} from ${b.label.toLowerCase()}`).join(', ')}${parts.length < wf.bars.filter((b) => b.kind === 'loss' && b.marks > 0).length ? ' and the rest from other gaps' : ''}.`
    : 'You scored every mark available. Nothing to fix here.';
  const lostTime = a.durationMs - a.usedMs;

  return (
    <div className="grid grid-cols-1 gap-s6 lg:grid-cols-2" data-testid="mock-report">
      <Part n={1} title="Score and trend" wide>
        <div className="grid grid-cols-1 gap-s6 md:grid-cols-2 lg:grid-cols-4">
          <Stat label="Score" value={<span className="tabular">{marksText(wf.actual)} / {marksText(wf.max)}</span>} hint={curPct === null ? undefined : `${pct(curPct)} of the paper`} />
          <Stat label="Percentile" value="—" hint="Available with all-India mocks" />
          <Stat label="Rank band" value="—" hint="Available with all-India mocks" />
          <Stat label="Time used" value={clock(a.usedMs / 60_000)} hint={lostTime > 60_000 ? `${Math.round(lostTime / 60_000)} min left unused` : 'Nearly all of the 3 hours'} />
        </div>
        {attempts.length >= 2 ? (
          <div className="stack gap-tight">
            <p className="text-body">
              {lastPrev !== null && curPct !== null
                ? `${curPct >= lastPrev ? 'Up' : 'Down'} ${Math.abs(Math.round((curPct - lastPrev) * 100))} points on your previous mock (${pct(lastPrev)} then, ${pct(curPct)} now).`
                : 'Your attempts so far.'}
            </p>
            <LineChart
              points={pcts.map((p, i) => ({ x: i, y: p }))}
              xDomain={[0, Math.max(1, attempts.length - 1)]} yDomain={[0, 1]}
              xTicks={attempts.map((_, i) => ({ v: i, label: i === attempts.length - 1 ? 'This' : `#${i + 1}` }))}
              yTicks={[0, 0.5, 1].map((v) => ({ v, label: pct(v) }))}
              summary={`Score as a share of the paper across ${attempts.length} mock attempts: ${pcts.map((p) => pct(p)).join(', ')}.`}
              table={{ caption: 'Score by attempt', head: ['Attempt', 'Score'], rows: attempts.map((_, i) => [i === attempts.length - 1 ? 'This attempt' : `Attempt ${i + 1}`, pct(pcts[i])]) }}
              endLabel={pct(curPct)} height={160}
            />
          </div>
        ) : (
          <p className="text-slate">This is your first graded mock, so there is no trend yet. After the next one you will see how you moved.</p>
        )}
      </Part>

      <Part n={2} title="Where the marks went">
        <p className="text-body">{lostLine}</p>
        <WaterfallChart w={wf} selected={sel?.id} onSelect={(b) => setSel(sel?.id === b.id ? null : b)} />
        {sel ? (
          <Card tone="primary" role="region" aria-label={`${sel.label} questions`}>
            <div className="stack gap-tight">
              <h3 className="text-h3">{sel.label}: {marksText(sel.marks)} marks</h3>
              <p className="text-small">{sel.hint}</p>
              <ul className="stack gap-s1 text-small">{sel.qids.map((q) => <li key={q}>{nameOf(q)}</li>)}</ul>
            </div>
          </Card>
        ) : (
          <p className="text-small text-slate">Tap a row to see which questions are behind it.</p>
        )}
        <Banner tone="accent" icon={<ClockIcon className="shrink-0" />}>
          <p><strong>Potential score {marksText(wf.potential)}</strong>, {marksText(wf.recoverable.total)} more than you scored. That is {marksText(wf.recoverable.silly)} from silly mistakes, {marksText(wf.recoverable.skippedEasy)} from easy questions you skipped, {marksText(wf.recoverable.unsaved)} from unsaved answers and {marksText(wf.recoverable.negativesAvoided)} in negative marks avoided.</p>
        </Banner>
        {wf.withDifficulty < wf.total && <p className="text-small text-slate">Difficulty data was missing for {wf.total - wf.withDifficulty} questions, so some silly mistakes may sit under concept gaps.</p>}
      </Part>

      <Part n={3} title="Attempts and accuracy">
        {quad && quad.subjects.length > 0 ? (
          <>
            <QuadrantPlot cells={quad.subjects} />
            <ul className="stack gap-s2">
              {quad.subjects.map((c) => (
                <li key={c.key} className="stack gap-s1 rounded-btn bg-surface p-s3">
                  <div className="flex flex-wrap items-baseline justify-between gap-s2">
                    <span className="font-semibold">{c.label}</span>
                    <span className="tabular text-small text-slate">attempted {pct(c.attemptRate)} · accuracy {pct(c.accuracy)}</span>
                  </div>
                  <p className="text-small"><Chip tone={c.quadrant === 'steady' || c.quadrant === 'cautious' ? 'primary' : 'accent'}>{QUAD_NAME[c.quadrant]}</Chip> {c.advice}</p>
                </li>
              ))}
            </ul>
            {quad.chapters.some((c) => !c.thin) && (
              <p className="text-small text-slate">By chapter: {(['untouched', 'careless', 'cautious', 'steady'] as QuadrantId[]).map((q) => ({ q, list: quad.chapters.filter((c) => !c.thin && c.quadrant === q) })).filter((x) => x.list.length).map((x) => `${QUAD_NAME[x.q]}: ${x.list.map((c) => c.label).join(', ')}`).join('. ')}.</p>
            )}
          </>
        ) : <p className="text-slate">Nothing attempted, so there is nothing to compare yet.</p>}
      </Part>

      <Part n={4} title="Where the 3 hours went">
        {tm && tm.totalMs > 0 ? (
          <>
            <TimeBars tm={tm} />
            {tm.slowest.length > 0 ? (
              <div className="stack gap-s1">
                <p className="text-small font-semibold">Questions that ran long against their usual time</p>
                <ul className="stack gap-s1 text-small">
                  {tm.slowest.map((q) => <li key={q.qid} className="tabular">{nameOf(q.qid)}: {mmss(q.timeMs)} against about {mmss(q.medianMs!)}</li>)}
                </ul>
              </div>
            ) : <p className="text-small text-slate">{tm.perQuestion.some((q) => q.medianMs !== null) ? 'No question ran far past its usual time.' : 'Usual times were not available for this paper, so time per question is not compared.'}</p>}
          </>
        ) : <p className="text-slate">No question time was recorded for this attempt.</p>}
      </Part>

      <Part n={5} title="Stamina over the paper">
        {fat ? (
          <>
            <p className="text-body">{fat.text}</p>
            <div className="stack gap-s2">
              <p className="text-small font-semibold">Accuracy</p>
              <LineChart
                points={fat.points.map((p) => ({ x: p.centreMin, y: p.accuracy }))}
                xDomain={[0, a.usedMs / 60_000]} yDomain={[0, 1]}
                xTicks={[0, 60, 120, 180].filter((m) => m <= a.usedMs / 60_000 + 1).map((m) => ({ v: m, label: clock(m) }))}
                yTicks={[0, 0.5, 1].map((v) => ({ v, label: pct(v) }))}
                markX={fat.trend === 'unknown' ? undefined : a.usedMs / 60_000 - fat.last.spanMin} markLabel={fat.trend === 'unknown' ? undefined : 'last stretch'}
                summary={`Accuracy over the paper in 30-minute windows. ${fat.text}`}
                table={{ caption: 'Accuracy per window', head: ['Window', 'Answers', 'Accuracy'], rows: fat.points.map((p) => [`${clock(p.fromMin)} to ${clock(p.toMin)}`, p.answers, pct(p.accuracy)]) }}
                tone={fat.trend === 'dropped' ? 'accent' : 'primary'} height={170}
              />
              <p className="text-small font-semibold">Pace, answers per hour</p>
              <LineChart
                points={fat.points.map((p) => ({ x: p.centreMin, y: p.perHour }))}
                xDomain={[0, a.usedMs / 60_000]} yDomain={[0, Math.max(10, Math.ceil(Math.max(...fat.points.map((p) => p.perHour)) / 10) * 10)]}
                xTicks={[0, 60, 120, 180].filter((m) => m <= a.usedMs / 60_000 + 1).map((m) => ({ v: m, label: clock(m) }))}
                yTicks={[0, Math.max(10, Math.ceil(Math.max(...fat.points.map((p) => p.perHour)) / 10) * 10)].map((v) => ({ v, label: String(v) }))}
                summary="Answers per hour in 30-minute windows."
                table={{ caption: 'Answers per hour per window', head: ['Window', 'Answers per hour'], rows: fat.points.map((p) => [`${clock(p.fromMin)} to ${clock(p.toMin)}`, Math.round(p.perHour)]) }}
                height={140}
              />
            </div>
          </>
        ) : <p className="text-slate">Not enough answers to draw a curve.</p>}
      </Part>

      <Part n={6} title="Chapters by weight and mastery" wide>
        {tax === undefined ? <Skeleton className="h-s8 w-full" /> : tax === null ? (
          <p className="text-slate">The chapter list is not available offline yet. Open this report once while online and it will be kept.</p>
        ) : (
          <Heatmap cells={heat ?? []} exam={exam} empty="Chapter data for this paper is not available yet." />
        )}
      </Part>

      <Part n={7} title="Against the top 10%">
        {top ? (
          <div className="stack gap-tight">
            <p className="text-body">The top 10% scored {marksText(top.top.marks)} of {marksText(top.top.max)} on this paper: {top.marksGap > 0 ? `${marksText(top.marksGap)} marks ahead of you.` : 'you are at or above that line.'}</p>
            <ul className="stack gap-s1 text-small">{top.subjectGaps.map((g) => <li key={g.subject} className="tabular">{subjectName(g.subject)}: you {marksText(g.you)}, top 10% {marksText(g.top)}</li>)}</ul>
          </div>
        ) : (
          <Banner>
            <p>Benchmarks arrive with all-India mocks. Until then we compare you only with your own earlier attempts, so nothing here is estimated.</p>
          </Banner>
        )}
      </Part>

      <Part n={8} title="What to fix first">
        {fix.length > 0 ? (
          <ol className="stack gap-s2">
            {fix.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-s3 rounded-btn bg-surface p-s3">
                <div className="flex min-w-0 flex-1 basis-60 gap-s3">
                  <span className="tabular font-semibold text-primary">{i + 1}</span>
                  <div className="stack gap-s1">
                    <p className="text-body">{f.text}</p>
                    <p className="text-small text-slate">{f.marksAtStake > 0 ? `About ${marksText(f.marksAtStake)} marks at stake` : 'Worth fixing before the next mock'}</p>
                  </div>
                </div>
                <Link to={f.link} className="inline-flex min-h-s7 items-center font-semibold text-primary">{f.link.startsWith('/practice') ? 'Practise' : f.link === '/mocks' ? 'Mock tests' : 'Review'}</Link>
              </li>
            ))}
          </ol>
        ) : <p className="text-slate">Nothing stands out to fix on this paper. Keep your routine going.</p>}
        <p className="text-small text-slate">These feed your daily plan, so the next sessions already lean toward them.</p>
      </Part>
    </div>
  );
}
