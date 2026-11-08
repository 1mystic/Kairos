import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { Question } from '@kairos/core';
import { useManifest } from '../bank/hooks';
import { Banner, Button, EmptyState, LinkButton, Page, Skeleton, Stack } from '../components/ui';
import { useSignInNudge, useStore } from '../store';
import { userBankSource } from '../store/bank';
import { BankContext } from '../store/bankHooks';
import { getSessionBuffer, isResumable, type BufferedSession } from './buffer';
import { commitSession } from './finish';
import { buildQueue, RECENCY_DAYS, seenIds, thetaFor, type Band } from './queue';
import { SessionRunner } from './SessionRunner';
import { bankShardSource, mergeSources, type QuestionSource } from './sources';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'resume'; saved: BufferedSession; pool: Question[] }
  | { kind: 'run'; questions: Question[]; base: RunBase; initial: BufferedSession | null; repeats: number }
  | { kind: 'saving' };
type RunBase = Parameters<typeof SessionRunner>[0]['base'];

const DAY = 86_400_000;
const newId = () => `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function SessionScreen() {
  const { exam = '', chapter = '' } = useParams();
  const [sp] = useSearchParams();
  const store = useStore();
  const { nudge } = useSignInNudge();
  const navigate = useNavigate();
  const manifest = useManifest();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const buffer = getSessionBuffer();
  const started = useRef(false);

  const chapters = chapter === 'mixed' ? (sp.get('chapters') ?? '').split(',').filter(Boolean) : [chapter];
  const size = Number(sp.get('size')) || 10;
  const mode = sp.get('mode') === 'timed' ? 'timed' : 'relaxed';
  const bands = new Set((sp.get('bands') ?? '').split(',').filter((b): b is Band => b === 'E' || b === 'M' || b === 'H'));
  const unseen = sp.get('unseen') === '1';
  const chapterKey = chapters.join(',');
  const myParam = sp.get('my');
  const my: 'only' | '1' | undefined = myParam === 'only' ? 'only' : myParam === '1' ? '1' : undefined;
  const selfCheck = sp.get('selfcheck') === '1';
  const bank = useContext(BankContext)?.store ?? null;
  const mineKey = `${my ?? ''}${selfCheck ? 's' : ''}`;

  const mineMeta = { ...(my ? { my } : {}), ...(my && selfCheck ? { selfCheck } : {}) };

  const start = useCallback(
    async (pool: Question[]) => {
      const now = Date.now();
      const sessions = await store.listSessions(unseen ? {} : { since: now - RECENCY_DAYS * DAY }).catch(() => []);
      const mastery = (await store.getState('mastery').catch(() => null)) as Record<string, { θ: number; n: number }> | null;
      const seed = Math.floor(Math.random() * 2 ** 32);
      const q = buildQueue(pool, { size, seed, seen: seenIds(sessions), theta: thetaFor(pool, mastery), bands, selfCheck });
      if (q.questions.length === 0) return setPhase({ kind: 'empty' });
      const base: RunBase = { id: newId(), startedAt: now, exam, chapter, chapters, mode, size, seed, ...mineMeta };
      setPhase({ kind: 'run', questions: q.questions, base, initial: null, repeats: q.repeats });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, exam, chapterKey, size, mode, unseen, sp.get('bands'), mineKey],
  );

  useEffect(() => {
    if (!manifest.data || started.current) return;
    started.current = true;
    const files = manifest.data.manifest.files;
    const refs =
      my === 'only'
        ? []
        : chapters
            .map((c) => files.find((f) => f.kind === 'shard' && f.exam === exam && f.chapter === c))
            .filter((f): f is NonNullable<typeof f> => !!f && !!f.subject && !!f.chapter);
    const sources: QuestionSource[] = refs.map((f) => bankShardSource({ exam, subject: f.subject!, chapter: f.chapter! }));
    if (my && bank) {
      const own = (chapter?: string) => userBankSource(bank, { includeSelfCheck: selfCheck, exam, chapter });
      // mixed/own: one source per chapter, or every chapter when none are named
      if (chapters.length > 0 && chapter === 'mixed') sources.push(...chapters.map((c) => own(c)));
      else if (chapter !== 'mixed') sources.push(own(chapter));
      else sources.push(own());
    }
    if (sources.length === 0) return setPhase({ kind: 'empty' });
    const source = mergeSources(`practice:${exam}/${chapterKey}${my ? `/my-${my}` : ''}`, chapterKey, sources);
    (async () => {
      try {
        const pool = await source.load();
        const saved = await buffer.load().catch(() => null);
        if (isResumable(saved, Date.now()) && saved.exam === exam && saved.chapters.join(',') === chapterKey && (saved.my ?? '') === (my ?? ''))
          return setPhase({ kind: 'resume', saved, pool });
        await start(pool);
      } catch (e) {
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, [manifest.data, exam, chapterKey, buffer, start, bank, mineKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const resume = (saved: BufferedSession, pool: Question[]) => {
    const byId = new Map(pool.map((q) => [q.id, q]));
    const questions = saved.qids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
    if (questions.length !== saved.qids.length) return void discardAndStart(pool);
    const base: RunBase = { id: saved.id, startedAt: saved.startedAt, exam: saved.exam, chapter: saved.chapter, chapters: saved.chapters, mode: saved.mode, size: saved.size, seed: saved.seed, ...(saved.my ? { my: saved.my } : {}), ...(saved.selfCheck ? { selfCheck: true } : {}) };
    setPhase({ kind: 'run', questions, base, initial: saved, repeats: 0 });
  };
  const discardAndStart = async (pool: Question[]) => {
    await buffer.clear().catch(() => {});
    setPhase({ kind: 'loading' });
    await start(pool);
  };

  const finish = async (
    run: { questions: Question[]; base: RunBase },
    r: { events: Parameters<typeof commitSession>[2]['events']; reasons: Record<string, string>; endedAt: number },
  ) => {
    setPhase({ kind: 'saving' });
    const { base } = run;
    try {
      await commitSession(
        store,
        {
          id: base.id,
          startedAt: base.startedAt,
          endedAt: r.endedAt,
          exam: base.exam,
          chapter: base.chapter,
          chapters: base.chapters,
          mode: base.mode,
          ...(base.my ? { my: base.my } : {}),
          ...(base.selfCheck ? { selfCheck: true } : {}),
        },
        { events: r.events, questions: run.questions, reasons: r.reasons },
      );
      await buffer.clear().catch(() => {});
      nudge('first_session');
      navigate(`/practice/summary/${base.id}`, { replace: true });
    } catch (e) {
      // the buffer is kept, so nothing is lost; the student can retry
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const back = (
    <LinkButton to="/practice" variant="secondary">
      Back to chapters
    </LinkButton>
  );

  if (manifest.error) return <Page width="reading"><EmptyState title="Could not load questions" action={back}>Check your connection and try again.</EmptyState></Page>;
  switch (phase.kind) {
    case 'loading':
      return (
        <Page width="reading">
          <Stack gap="base">
            <Skeleton className="h-s5 w-full" />
            <Skeleton className="h-s8 w-full" />
          </Stack>
        </Page>
      );
    case 'saving':
      return (
        <Page width="reading">
          <EmptyState title="Saving your session">Just a moment.</EmptyState>
        </Page>
      );
    case 'error':
      return <Page width="reading"><EmptyState title="Something went wrong" action={back}>{phase.message}</EmptyState></Page>;
    case 'empty':
      return <Page width="reading"><EmptyState title="No questions to practise here" action={back}>This chapter has no questions yet, or none match your filters.</EmptyState></Page>;
    case 'resume':
      return (
        <Page width="reading">
          <Banner
            actions={
              <>
                <Button onClick={() => resume(phase.saved, phase.pool)}>Resume session</Button>
                <Button variant="secondary" onClick={() => void discardAndStart(phase.pool)}>Start fresh</Button>
              </>
            }
          >
            You have an unfinished session ({phase.saved.index} of {phase.saved.qids.length} done).
          </Banner>
        </Page>
      );
    case 'run':
      return (
        <Page width="app">
          {phase.repeats > 0 && (
            <Banner>Only a few new questions are left here, so {phase.repeats} repeat from the last three weeks.</Banner>
          )}
          <SessionRunner
            key={phase.base.id}
            questions={phase.questions}
            base={phase.base}
            initial={phase.initial}
            buffer={buffer}
            onFinish={(r) => void finish(phase, r)}
          />
        </Page>
      );
  }
}
