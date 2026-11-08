import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinkButton, PageHeader, Button, ProgressBar, Page, Toast } from '../components/ui';
import { ArrowRightIcon } from '../components/icons';
import type { KvDb } from '../store/bankDb';
import { useBankEnv } from '../store/bankHooks';
import { canvasCropToWebp, type CropToWebp } from './crop';
import type { Rasterizer } from './pages';
import { usePages } from './pages';
import { runPipeline, type ParseProblem, type PipelineResult } from './pipeline';
import { copyText, renderPrompt } from './prompt';
import { ReviewView, type SaveOutcome } from './ReviewView';
import { DoneCard, HowItWorks, PagesPreview, PasteResult, PromptText, StepExam, StepPages, StepPaste, StepPrompt } from './steps';
import { chaptersForExam } from './taxonomy';
import { useReview } from './useReview';
import './upload.css';

const STEPS = ['Choose exam', 'Copy prompt', 'Add your pages', 'Paste the reply'] as const;
type View = 'steps' | 'review' | 'done';

export interface WizardProps {
  /** injectable for tests */
  pagesKv?: KvDb;
  rasterizer?: Rasterizer | (() => Promise<Rasterizer>);
  cropToWebp?: CropToWebp;
  now?: () => number;
  initialExam?: string;
}

export function Wizard({ pagesKv, rasterizer, cropToWebp = canvasCropToWebp, now = Date.now, initialExam }: WizardProps) {
  const { store, isGuest } = useBankEnv();
  const [view, setView] = useState<View>('steps');
  const [step, setStep] = useState(initialExam ? 2 : 1);
  const [exam, setExam] = useState<string | null>(initialExam ?? null);
  const [texts, setTexts] = useState<string[]>(['']);
  const [problems, setProblems] = useState<ParseProblem[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [parsed, setParsed] = useState<Extract<PipelineResult, { ok: true }> | null>(null);
  const [parsedKey, setParsedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pagesApi = usePages({ kv: pagesKv, rasterizer });
  const chapterIds = useMemo(() => (exam ? chaptersForExam(exam).map((c) => c.id) : []), [exam]);
  const review = useReview(chapterIds);
  const prompt = useMemo(() => (exam ? renderPrompt(exam) : ''), [exam]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => { window.scrollTo?.({ top: 0 }); }, [step, view]);

  const copy = useCallback(async () => {
    const ok = await copyText(prompt);
    setCopied(ok);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2500);
  }, [prompt]);

  const check = async () => {
    if (!exam) return;
    const key = `${exam}\n${texts.join('\n\u0000')}`;
    if (parsed && key === parsedKey) { setView('review'); return; }
    setChecking(true);
    try {
      const existing = await store.listQuestions().catch(() => []);
      const res = runPipeline(texts, { exam, chapterIds, existingIds: existing.map((q) => q.id), now: now() });
      if (!res.ok) { setProblems(res.problems); return; }
      if (res.questions.length === 0) {
        setProblems([{ block: 1, message: 'No new questions were found in this reply.', hint: res.skipped.length ? res.skipped.map((s) => s.message).join(' ') : 'Check that the reply contains a "questions" list.' }]);
        return;
      }
      setProblems(null);
      setParsed(res);
      setParsedKey(key);
      review.load(res.questions);
      setView('review');
    } finally {
      setChecking(false);
    }
  };

  const goStep = (n: number) => { if (n === 1 || exam) { setStep(n); setView('steps'); } };

  const reset = () => {
    setView('steps');
    setStep(2);
    setTexts(['']);
    setParsed(null);
    setParsedKey('');
    setProblems(null);
    setOutcome(null);
    review.load([]);
  };

  const onSaved = (o: SaveOutcome) => {
    setOutcome(o);
    setView('done');
    void pagesApi.clear();
  };

  const header = <PageHeader title="Upload your questions" subtitle="Turn any paper into private practice questions. Your pages never leave this device." />;

  if (view === 'done' && outcome) {
    return (
      <Page>
        {header}
        <div className="u-panes">
          <DoneCard
            saved={outcome.saved}
            selfCheck={outcome.selfCheck}
            guest={isGuest}
            onMore={reset}
            bankLink={<LinkButton to="/bank">See my questions<ArrowRightIcon width={20} height={20} /></LinkButton>}
          />
        </div>
      </Page>
    );
  }

  if (view === 'review' && exam && parsed) {
    return (
      <Page>
        <PageHeader title="Review your questions" subtitle={parsed.title ? `${parsed.title}. Check each question, fix what is flagged, then save.` : 'Check each question, fix what is flagged, then save.'} />
        <ReviewView
          review={review}
          store={store}
          exam={exam}
          pages={pagesApi.pages}
          cropToWebp={cropToWebp}
          skipped={parsed.skipped}
          notices={parsed.notices}
          now={now}
          onSaved={onSaved}
          onBack={() => { setView('steps'); setStep(4); }}
          onNeedPages={() => { setView('steps'); setStep(3); }}
        />
      </Page>
    );
  }

  const left =
    step === 1 ? <StepExam exam={exam} onPick={(id) => setExam(id)} />
    : step === 2 && exam ? <StepPrompt exam={exam} onCopy={() => void copy()} copied={copied} />
    : step === 3 ? <StepPages api={pagesApi} />
    : <StepPaste texts={texts} onTexts={setTexts} onCheck={() => void check()} checking={checking} />;
  const right =
    step === 1 ? <HowItWorks />
    : step === 2 ? <PromptText prompt={prompt} />
    : step === 3 ? <PagesPreview api={pagesApi} />
    : <PasteResult problems={problems} />;

  return (
    <Page>
      {header}
      <nav aria-label="Steps" className="stack gap-tight">
        <ol className="u-steps">
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <li key={label} className="contents">
                <button
                  type="button"
                  className="u-step"
                  aria-current={step === n ? 'step' : undefined}
                  data-done={n < step}
                  disabled={n > 1 && !exam}
                  onClick={() => goStep(n)}
                >
                  <span className="u-step-num" aria-hidden="true">{n}</span>
                  <span className="u-step-label">{label}</span>
                  <span className="sr-only">{`Step ${n}: ${label}`}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <ProgressBar value={step} max={STEPS.length} label={`Step ${step} of ${STEPS.length}`} />
      </nav>

      <div className="u-panes">
        <div className="stack gap-base">
          {left}
          <div className="row justify-between gap-base">
            <Button variant="ghost" disabled={step === 1} onClick={() => goStep(step - 1)}>Back</Button>
            {step < 4 && (
              <Button disabled={step === 1 && !exam} onClick={() => goStep(step + 1)}>
                {step === 3 && pagesApi.pages.length === 0 ? 'Skip for now' : 'Next'}
                <ArrowRightIcon width={20} height={20} />
              </Button>
            )}
          </div>
        </div>
        <div className="u-pane-sticky stack gap-base">{right}</div>
      </div>
      {copied && <Toast onClose={() => setCopied(false)}>Copied. Now paste it into your AI chat.</Toast>}
    </Page>
  );
}
