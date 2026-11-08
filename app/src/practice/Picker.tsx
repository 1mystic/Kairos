import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Aggregate, Manifest, UserQuestion } from '@kairos/core';
import { useManifest } from '../bank/hooks';
import { Button, Card, Chip, EmptyState, Input, LinkButton, Page, PageHeader, Section, Skeleton, Tabs } from '../components/ui';
import { useStore } from '../store';
import { BankContext } from '../store/bankHooks';
import { getSessionBuffer, isResumable } from './buffer';
import { SESSION_SIZES, type Band } from './queue';
import {
  EXAMS,
  buildChapterRows,
  chapterMastery,
  loadTaxonomy,
  masteryWords,
  weakFirst,
  type ExamId,
  type Taxonomy,
} from './taxonomy';

export interface PickerViewProps {
  tax: Taxonomy;
  manifest: Manifest;
  /** chapter id -> mastery aggregate (empty when the student has no data yet) */
  mastery?: Record<string, Aggregate>;
  initialExam?: ExamId;
  resumeLink?: { to: string; label: string } | null;
  /** the student's own uploaded questions (section shows only when there is at least one) */
  myQuestions?: readonly Pick<UserQuestion, 'id' | 'exam' | 'status' | 'dropped' | 'pending_figures' | 'tax'>[];
}

/** Own questions that can be practised for this exam, counted per chapter. */
export function countMine(
  qs: NonNullable<PickerViewProps['myQuestions']>,
  exam: string,
  selfCheck: boolean,
): { total: number; byChapter: Map<string, number>; selfCheckCount: number } {
  const byChapter = new Map<string, number>();
  let total = 0;
  let selfCheckCount = 0;
  for (const q of qs) {
    if (q.exam !== exam || q.dropped || (q.pending_figures?.length ?? 0) > 0) continue;
    const needs = q.status === 'needs_answer';
    if (needs) selfCheckCount++;
    if (needs && !selfCheck) continue;
    total++;
    const c = q.tax?.chapter;
    if (c) byChapter.set(c, (byChapter.get(c) ?? 0) + 1);
  }
  return { total, byChapter, selfCheckCount };
}

const BANDS: { id: Band; label: string }[] = [
  { id: 'E', label: 'Easy' },
  { id: 'M', label: 'Medium' },
  { id: 'H', label: 'Hard' },
];

/** Toggle button that reads as a chip (44px tall for touch). */
function Toggle({ on, onClick, children }: { on: boolean; onClick(): void; children: string }) {
  return (
    <Button size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={onClick}>
      {children}
    </Button>
  );
}

export function PickerView({ tax, manifest, mastery = {}, initialExam = 'JEE_MAIN', resumeLink, myQuestions = [] }: PickerViewProps) {
  const [exam, setExam] = useState<ExamId>(initialExam);
  const [query, setQuery] = useState('');
  const [bands, setBands] = useState<Band[]>([]);
  const [unseen, setUnseen] = useState(false);
  const [weak, setWeak] = useState(false);
  const [size, setSize] = useState<number>(10);
  const [mode, setMode] = useState<'timed' | 'relaxed'>('relaxed');
  const [mix, setMix] = useState<string[]>([]);
  const [selfCheck, setSelfCheck] = useState(false);

  const subjects = useMemo(() => buildChapterRows(tax, manifest, exam), [tax, manifest, exam]);
  const q = query.trim().toLowerCase();

  const params = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ size: String(size), mode, ...extra });
    if (bands.length) p.set('bands', bands.join(','));
    if (unseen) p.set('unseen', '1');
    return p.toString();
  };
  const toggleBand = (b: Band) => setBands((x) => (x.includes(b) ? x.filter((y) => y !== b) : [...x, b]));
  const toggleMix = (id: string) => setMix((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));

  const mine = useMemo(() => countMine(myQuestions, exam, selfCheck), [myQuestions, exam, selfCheck]);
  const chapterNames = useMemo(() => new Map(tax.subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const))), [tax]);
  const myParams = (extra: Record<string, string> = {}) => params({ my: 'only', ...(selfCheck ? { selfcheck: '1' } : {}), ...extra });
  const hasMine = myQuestions.some((x) => x.exam === exam && !x.dropped);

  const allWithQuestions = subjects.flatMap((s) => s.chapters.filter((c) => c.count > 0).map((c) => c.id));
  const mixIds = mix.filter((id) => allWithQuestions.includes(id));
  const mixChapters = mixIds.length ? mixIds : allWithQuestions;

  return (
    <Page width="app">
      <PageHeader title="Practice" subtitle="Pick a chapter, or mix a few. We choose questions that suit you right now." />
      {resumeLink && (
        <Card tone="primary">
          <div className="row justify-between gap-s4">
            <span>You have an unfinished session.</span>
            <LinkButton to={resumeLink.to}>{resumeLink.label}</LinkButton>
          </div>
        </Card>
      )}

      <Tabs
        label="Exam"
        tabs={EXAMS.map((e) => ({ id: e.id, label: e.label }))}
        value={exam}
        onChange={(id) => {
          setExam(id);
          setMix([]);
        }}
      />

      <Card>
        <div className="stack gap-s4">
          <div className="grid gap-s4 md:grid-cols-2 xl:grid-cols-3">
            <div className="stack gap-s2">
              <span className="text-small font-semibold">Questions per session</span>
              <div className="row gap-s2" role="group" aria-label="Session size">
                {SESSION_SIZES.map((n) => (
                  <Toggle key={n} on={size === n} onClick={() => setSize(n)}>
                    {String(n)}
                  </Toggle>
                ))}
              </div>
            </div>
            <div className="stack gap-s2">
              <span className="text-small font-semibold">Mode</span>
              <div className="row gap-s2" role="group" aria-label="Mode">
                <Toggle on={mode === 'relaxed'} onClick={() => setMode('relaxed')}>Relaxed</Toggle>
                <Toggle on={mode === 'timed'} onClick={() => setMode('timed')}>Timed</Toggle>
              </div>
              <span className="text-caption text-slate">
                {mode === 'timed' ? 'Each question has a countdown. No pausing.' : 'Pause whenever you need.'}
              </span>
            </div>
            <div className="stack gap-s2">
              <span className="text-small font-semibold">Difficulty</span>
              <div className="row gap-s2" role="group" aria-label="Difficulty">
                {BANDS.map((b) => (
                  <Toggle key={b.id} on={bands.includes(b.id)} onClick={() => toggleBand(b.id)}>{b.label}</Toggle>
                ))}
              </div>
            </div>
          </div>
          <div className="row gap-s4">
            <div className="min-w-0 flex-1 basis-48">
              <Input
                type="search"
                aria-label="Search chapters"
                placeholder="Search chapters"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="row gap-s2">
              <Toggle on={unseen} onClick={() => setUnseen(!unseen)}>Only unseen</Toggle>
              <Toggle on={weak} onClick={() => setWeak(!weak)}>Weak first</Toggle>
            </div>
          </div>
        </div>
      </Card>

      <Card tone="primary">
        <div className="row justify-between gap-s4">
          <div className="stack gap-s1">
            <span className="text-h3">Mixed practice</span>
            <span className="text-small text-slate">
              {mixIds.length
                ? `${mixIds.length} chapter${mixIds.length === 1 ? '' : 's'} chosen`
                : 'Random across every chapter with questions. Tick chapters below to choose your own.'}
            </span>
          </div>
          {mixChapters.length > 0 ? (
            <LinkButton to={`/practice/${exam}/mixed?${params({ chapters: mixChapters.join(',') })}`}>
              Start mixed practice
            </LinkButton>
          ) : (
            <Chip>No questions yet</Chip>
          )}
        </div>
      </Card>

      {hasMine && (
        <Section
          title="My questions"
          aside={<span className="text-small text-slate tabular">{mine.total} ready to practise</span>}
        >
          <Card>
            <div className="stack gap-s4">
              <div className="row justify-between gap-s4">
                <p className="min-w-0 flex-1 basis-48 text-small text-slate">
                  Questions you uploaded. Ones with an answer behave like any other and update your mastery.
                </p>
                {mine.total > 0 ? (
                  <LinkButton to={`/practice/${exam}/mixed?${myParams()}`}>Practise my questions</LinkButton>
                ) : (
                  <Chip>Nothing ready yet</Chip>
                )}
              </div>
              {mine.selfCheckCount > 0 && (
                <div className="stack gap-s2">
                  <label className="row min-h-s7 items-start gap-s2 text-small">
                    <input type="checkbox" checked={selfCheck} onChange={() => setSelfCheck(!selfCheck)} className="mt-s1 size-s5 shrink-0 accent-primary" />
                    <span className="min-w-0">Include questions without answers (self-check)</span>
                  </label>
                  <span className="text-caption text-slate">
                    {mine.selfCheckCount} without an answer key. You grade them yourself and they never change your mastery.
                  </span>
                </div>
              )}
              {mine.byChapter.size > 0 && (
                <ul className="grid gap-s3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {[...mine.byChapter].map(([id, n]) => (
                    <li key={id} className="rounded-card bg-surface-2 p-s4">
                      <Link to={`/practice/${exam}/${id}?${myParams()}`} className="stack min-h-s7 gap-s1 text-ink no-underline">
                        <span className="text-body font-semibold">{chapterNames.get(id) ?? id}</span>
                        <span className="text-small text-slate tabular">
                          {n} of your question{n === 1 ? '' : 's'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </Section>
      )}

      {subjects.map((s) => {
        let rows = s.chapters.filter((c) => !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
        if (weak) rows = weakFirst(rows, mastery);
        if (rows.length === 0) return null;
        return (
          <Section key={s.id} title={s.name} aside={<span className="text-small text-slate tabular">{rows.length} chapters</span>}>
            <ul className="grid gap-s3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {rows.map((c) => {
                const words = masteryWords(mastery[c.id]);
                const has = c.count > 0;
                return (
                  <li key={c.id} className={`stack gap-s2 rounded-card bg-surface-2 p-s4 ${has ? '' : 'opacity-70'}`}>
                    {has ? (
                      <Link
                        to={`/practice/${exam}/${c.id}?${params()}`}
                        className="stack min-h-s7 gap-s1 text-ink no-underline"
                      >
                        <span className="text-body font-semibold">{c.name}</span>
                        <span className="text-small text-slate tabular">
                          {c.count} question{c.count === 1 ? '' : 's'}
                        </span>
                      </Link>
                    ) : (
                      <div className="stack min-h-s7 gap-s1">
                        <span className="text-body font-semibold text-slate">{c.name}</span>
                        <span className="text-small text-slate">No questions yet</span>
                      </div>
                    )}
                    <div className="row justify-between gap-s2">
                      {words ? <Chip tone={words.tone}>{words.text}</Chip> : <span />}
                      {has && (
                        <label className="row min-h-s7 gap-s2 text-small text-slate">
                          <input
                            type="checkbox"
                            checked={mix.includes(c.id)}
                            onChange={() => toggleMix(c.id)}
                            className="size-s5 accent-primary"
                          />
                          Add to mix
                        </label>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
      {subjects.every((s) => !s.chapters.some((c) => !q || c.name.toLowerCase().includes(q))) && (
        <EmptyState title="No chapters match">Try a different search.</EmptyState>
      )}
    </Page>
  );
}

export function PracticePicker() {
  const m = useManifest();
  const store = useStore();
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [err, setErr] = useState(false);
  const [doc, setDoc] = useState<Record<string, never> | null>(null);
  const [resume, setResume] = useState<PickerViewProps['resumeLink']>(null);
  const bank = useContext(BankContext)?.store ?? null;
  const [mine, setMine] = useState<UserQuestion[]>([]);

  useEffect(() => {
    loadTaxonomy().then(setTax, () => setErr(true));
    store.getState('mastery').then((d) => setDoc(d as Record<string, never> | null), () => {});
    getSessionBuffer()
      .load()
      .then((s) => {
        if (isResumable(s, Date.now()))
          setResume({ to: `/practice/${s.exam}/${s.chapter}?${s.chapter === 'mixed' ? `chapters=${s.chapters.join(',')}&` : ''}size=${s.size}&mode=${s.mode}${s.my ? `&my=${s.my}${s.selfCheck ? '&selfcheck=1' : ''}` : ''}`, label: 'Resume session' });
      })
      .catch(() => {});
  }, [store]);
  useEffect(() => {
    if (bank) bank.listQuestions().then(setMine, () => {});
  }, [bank]);

  const mastery = useMemo(() => (tax ? chapterMastery(doc, tax) : {}), [tax, doc]);

  if (m.error || err)
    return (
      <Page width="reading">
        <EmptyState title="Could not load chapters">Check your connection. Questions you have already opened still work offline.</EmptyState>
      </Page>
    );
  if (!m.data || !tax)
    return (
      <Page width="app">
        <Skeleton className="h-s7 w-full" />
        <Skeleton className="h-s8 w-full" />
      </Page>
    );
  return <PickerView tax={tax} manifest={m.data.manifest} mastery={mastery} resumeLink={resume} myQuestions={mine} />;
}
