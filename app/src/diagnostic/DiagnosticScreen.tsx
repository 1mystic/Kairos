import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Manifest, Question } from '@kairos/core';
import { getLatestVersion, getManifest } from '../bank/client';
import { CheckIcon } from '../components/icons';
import { Banner, Button, Card, Chip, EmptyState, LinkButton, Page, PageHeader, ProgressBar, Skeleton, Stack, Tabs } from '../components/ui';
import { EXAMS, buildChapterRows, isExamId, loadTaxonomy, type ExamId, type SubjectRows, type Taxonomy } from '../practice/taxonomy';
import { isGuestProfile, useSignInNudge, useStore, type UserStore } from '../store';
import { DiagnosticRunner, type DiagFinish } from './DiagnosticRunner';
import { getDiagBuffer, isDiagResumable, type DiagBuffer } from './diagnosticBuffer';
import { commitDiagnostic, buildResult, estimateMinutes, newDiagId, usableChapters, type DiagBuffered, type DiagnosticResult } from './diagnosticCore';
import { loadExamBank } from './examBank';

export interface DiagDeps {
  loadSetup(): Promise<{ tax: Taxonomy; manifest: Manifest }>;
  loadBank(exam: string, onProgress: (done: number, total: number) => void): Promise<{ questions: Question[] }>;
  buffer: DiagBuffer;
  clock?: () => number;
  timeBudgetS?: number;
}

const defaultDeps = (): DiagDeps => ({
  loadSetup: async () => ({ tax: await loadTaxonomy(), manifest: await getManifest(await getLatestVersion()) }),
  loadBank: loadExamBank,
  buffer: getDiagBuffer(),
});

type Phase =
  | { kind: 'setup' }
  | { kind: 'intro' }
  | { kind: 'bank'; done: number; total: number }
  | { kind: 'run'; bank: Question[]; chapters: string[]; base: { id: string; startedAt: number; exam: string }; initial: DiagBuffered | null }
  | { kind: 'saving' }
  | { kind: 'results'; result: DiagnosticResult; names: Record<string, string>; masteryError: boolean }
  | { kind: 'error'; message: string; retry?: () => void };

/** `/diagnostic` */
export function DiagnosticScreen() {
  const store = useStore();
  const { nudge } = useSignInNudge();
  const deps = useMemo(defaultDeps, []);
  return <DiagnosticView store={store} deps={deps} onSaved={() => nudge('first_session')} />;
}

export function DiagnosticView({ store, deps, onSaved }: { store: UserStore; deps: DiagDeps; onSaved?: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  const [setup, setSetup] = useState<{ tax: Taxonomy; manifest: Manifest } | null>(null);
  const [exam, setExam] = useState<ExamId>('JEE_MAIN');
  const [done, setDone] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [saved, setSaved] = useState<DiagBuffered | null>(null);
  const init = useRef(false);

  useEffect(() => {
    if (init.current) return;
    init.current = true;
    (async () => {
      try {
        const [s, profile, buf] = await Promise.all([
          deps.loadSetup(),
          store.getProfile().catch(() => null),
          deps.buffer.load().catch(() => null),
        ]);
        const p = profile && !isGuestProfile(profile) ? profile : null;
        const ex = profile?.exam;
        if (isExamId(ex)) setExam(ex);
        setDone(p?.chaptersDone ?? []);
        if (isDiagResumable(buf, (deps.clock ?? Date.now)())) {
          setSaved(buf);
          if (isExamId(buf.exam)) setExam(buf.exam);
        }
        setSetup(s);
        setPhase({ kind: 'intro' });
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [deps, store]);

  const rows: SubjectRows[] = useMemo(() => (setup ? buildChapterRows(setup.tax, setup.manifest, exam) : []), [setup, exam]);
  const usable = useMemo(() => new Set(rows.flatMap((s) => s.chapters.filter((c) => c.count > 0).map((c) => c.id))), [rows]);
  // prefill from onboarding (chaptersDone), until the student touches the list
  const selection = useMemo(() => picked ?? new Set(done.filter((c) => usable.has(c))), [picked, done, usable]);

  const start = async (resume: DiagBuffered | null) => {
    const chapters = resume ? resume.chapters : [...selection];
    const ex = resume ? resume.exam : exam;
    setPhase({ kind: 'bank', done: 0, total: 1 });
    try {
      const { questions } = await deps.loadBank(ex, (d, t) => setPhase({ kind: 'bank', done: d, total: t }));
      const use = usableChapters(questions, chapters);
      if (use.length === 0) {
        setPhase({ kind: 'error', message: 'None of these chapters has questions with answers yet. Pick others, or come back after the next question update.' });
        return;
      }
      if (!resume) await deps.buffer.clear().catch(() => {});
      const now = (deps.clock ?? Date.now)();
      const base = resume ? { id: resume.id, startedAt: resume.startedAt, exam: resume.exam } : { id: newDiagId(), startedAt: now, exam: ex };
      setPhase({ kind: 'run', bank: questions, chapters: use, base, initial: resume });
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const finish = useCallback(
    async (run: Extract<Phase, { kind: 'run' }>, r: DiagFinish) => {
      setPhase({ kind: 'saving' });
      try {
        const { masteryError } = await commitDiagnostic(
          store,
          { id: run.base.id, startedAt: run.base.startedAt, endedAt: r.endedAt, exam: run.base.exam, chapters: run.chapters },
          { events: r.events, questions: r.questions },
        );
        await deps.buffer.clear().catch(() => {});
        onSaved?.();
        const nm = Object.fromEntries(
          (setup ? buildChapterRows(setup.tax, setup.manifest, run.base.exam) : []).flatMap((s) => s.chapters.map((c) => [c.id, c.name])),
        );
        setPhase({ kind: 'results', result: buildResult(run.chapters, run.bank, r.answered, r.activeMs), names: nm, masteryError: !!masteryError });
      } catch (e) {
        // the buffer is kept, so a refresh resumes and can save again
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e), retry: () => void finish(run, r) });
      }
    },
    [store, deps.buffer, onSaved, setup],
  );

  switch (phase.kind) {
    case 'setup':
      return (
        <Page width="reading">
          <Stack gap="base">
            <Skeleton className="h-s5 w-full" />
            <Skeleton className="h-s8 w-full" />
          </Stack>
        </Page>
      );
    case 'error':
      return (
        <Page width="reading">
          <EmptyState
            title="Something went wrong"
            action={phase.retry ? <Button onClick={phase.retry}>Try again</Button> : <LinkButton to="/practice" variant="secondary">Back to practice</LinkButton>}
          >
            {phase.message}
          </EmptyState>
        </Page>
      );
    case 'saving':
      return (
        <Page width="reading">
          <EmptyState title="Saving your starting point">Just a moment.</EmptyState>
        </Page>
      );
    case 'bank':
      return (
        <Page width="reading">
          <Card>
            <div className="stack gap-s4">
              <h2 className="text-h2">Getting your questions ready</h2>
              <ProgressBar value={phase.done} max={Math.max(1, phase.total)} label="Loading questions" />
              <p className="text-small text-slate tabular">{phase.done} of {phase.total} chapters loaded. They stay on this device after the first time.</p>
            </div>
          </Card>
        </Page>
      );
    case 'run': {
      const run = phase;
      return (
        <Page width="app">
          <DiagnosticRunner
            key={run.base.id}
            bank={run.bank}
            chapters={run.chapters}
            base={run.base}
            initial={run.initial}
            buffer={deps.buffer}
            clock={deps.clock}
            timeBudgetS={deps.timeBudgetS}
            onFinish={(r) => void finish(run, r)}
          />
        </Page>
      );
    }
    case 'results':
      return <Results result={phase.result} names={phase.names} masteryError={phase.masteryError} />;
    case 'intro':
      break;
  }

  const count = selection.size;
  const toggle = (id: string) => {
    const n = new Set(selection);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setPicked(n);
  };
  return (
    <Page width="app">
      <PageHeader title="Find your starting point" subtitle="A short, adaptive check on the chapters you have studied. No grade, no pressure." />
      {saved && (
        <Banner
          actions={
            <>
              <Button onClick={() => void start(saved)}>Resume</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void deps.buffer.clear().catch(() => {});
                  setSaved(null);
                }}
              >
                Start fresh
              </Button>
            </>
          }
        >
          You have an unfinished diagnostic ({saved.answered.length} answered).
        </Banner>
      )}
      <div className="grid gap-s6 lg:grid-cols-3">
        <div className="stack gap-s5 lg:col-span-2">
          <Tabs<ExamId>
            label="Exam"
            value={exam}
            onChange={(e) => {
              setExam(e);
              setPicked(null);
            }}
            tabs={EXAMS.map((e) => ({ id: e.id, label: e.label }))}
          />
          <p className="text-slate">Tick the chapters you have already studied. We only ask about those.</p>
          {rows.length === 0 && <EmptyState title="No chapters yet">There are no questions for this exam yet.</EmptyState>}
          {rows.map((s) => (
            <section key={s.id} className="stack gap-s3" aria-label={s.name}>
              <h2 className="text-h3">{s.name}</h2>
              <div className="grid-auto">
                {s.chapters.map((c) => {
                  const on = selection.has(c.id);
                  const off = c.count === 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={off}
                      onClick={() => toggle(c.id)}
                      className={`row min-h-s7 justify-between gap-s3 rounded-btn px-s4 py-s2 text-left text-small ${
                        on ? 'bg-primary-50 font-semibold text-primary' : 'bg-surface-3'
                      } ${off ? 'opacity-60' : ''}`}
                    >
                      <span className="min-w-0">
                        {c.name}
                        <span className="block text-caption font-normal text-slate">{off ? 'No questions yet' : `${c.count} questions`}</span>
                      </span>
                      {on && <CheckIcon width={20} height={20} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <aside className="order-first lg:order-last lg:col-span-1 lg:sticky lg:top-s6 lg:self-start">
          <Card tone="primary">
            <div className="stack gap-s4">
              <h2 className="text-h2">What to expect</h2>
              <ul className="stack gap-s3 text-small">
                <li>About {estimateMinutes(count || 1)} minutes, at most 40.</li>
                <li>Two questions per chapter, chosen as you go.</li>
                <li>No answers shown until the end. Pause whenever you like.</li>
                <li>Only the chapters you tick. Unsure? Skip the question.</li>
              </ul>
              <Button size="lg" block disabled={count === 0} onClick={() => void start(null)}>
                {count === 0 ? 'Pick at least one chapter' : `Start with ${count} chapter${count === 1 ? '' : 's'}`}
              </Button>
              <p className="text-caption text-slate">Works without signing in. Your answers stay on this device until you sign in.</p>
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  );
}

function ChapterList({ rows, names }: { rows: DiagnosticResult['chapters']; names: Record<string, string> }) {
  return (
    <ul className="stack gap-s2">
      {rows.map((c) => (
        <li key={c.chapter} className="row justify-between gap-s3 rounded-btn bg-surface-3 px-s4 py-s3">
          <span className="min-w-0 text-small font-semibold">{names[c.chapter] ?? c.chapter}</span>
          <Chip tone={c.n > 0 ? 'primary' : 'neutral'}>
            {c.n > 0 ? `Rough read: ${c.correct} of ${c.n} right` : 'No read yet'}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

function Results({ result, names, masteryError }: { result: DiagnosticResult; names: Record<string, string>; masteryError: boolean }) {
  const mins = Math.max(1, Math.round(result.activeMs / 60_000));
  return (
    <Page width="app">
      <PageHeader title="Your starting point is set" subtitle="This is a first look, not a grade. It sharpens every time you practise." />
      {masteryError && (
        <Banner tone="accent">Your answers are saved, but we could not update your progress profile. Practising will rebuild it.</Banner>
      )}
      <Banner>
        Each chapter had about two questions, so every read here is rough. "Needs attention" only means where to look first, not a verdict on a chapter.
      </Banner>
      <div className="grid gap-s6 lg:grid-cols-3">
        <div className="stack gap-s5 lg:col-span-2">
          <div className="grid-auto">
            <Card>
              <div className="stack gap-s3">
                <h2 className="text-h3">Looks stronger</h2>
                {result.strongest.length === 0 ? (
                  <p className="text-small text-slate">Nothing stands out yet. That is normal after a short check.</p>
                ) : (
                  <ChapterList rows={result.strongest} names={names} />
                )}
              </div>
            </Card>
            <Card>
              <div className="stack gap-s3">
                <h2 className="text-h3">Needs attention</h2>
                {result.needsAttention.length === 0 ? (
                  <p className="text-small text-slate">Nothing stands out yet. That is normal after a short check.</p>
                ) : (
                  <ChapterList rows={result.needsAttention} names={names} />
                )}
              </div>
            </Card>
          </div>
          <Card>
            <div className="stack gap-s3">
              <h2 className="text-h3">All chapters</h2>
              <ChapterList rows={result.chapters} names={names} />
            </div>
          </Card>
        </div>
        <aside className="lg:col-span-1">
          <Card tone="primary">
            <div className="stack gap-s4">
              <div className="stack gap-s1">
                <span className="text-h1 tabular">{result.answered - result.skipped}</span>
                <span className="text-small text-slate">
                  questions answered{result.skipped > 0 ? `, ${result.skipped} skipped` : ''} in about {mins} min
                </span>
              </div>
              <LinkButton to="/practice" size="lg" block>Start practising</LinkButton>
              <LinkButton to="/onboarding" variant="secondary" size="lg" block>Set exam date</LinkButton>
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  );
}
