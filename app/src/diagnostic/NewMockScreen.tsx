import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Blueprint, Manifest, MasteryDoc, Question } from '@kairos/core';
import { ArrowRightIcon } from '../components/icons';
import { Banner, Button, Card, Chip, LinkButton, Page, PageHeader, ProgressBar, Section, Select, Stack, Tabs } from '../components/ui';
import { EXAMS, isExamId, loadTaxonomy, type ExamId, type Taxonomy } from '../practice/taxonomy';
import { useStore, type MockDoc, type SessionDoc, type UserStore } from '../store';
import { blueprintsForExam, loadExamBank } from './examBank';
import { getGeneratedStore, paperCode, paperIdForSeed, type GeneratedPaperRecord, type GeneratedStore } from './generatedStore';
import {
  TYPE_WORDS,
  WEAK_TILT,
  buildHistory,
  capacityShortfalls,
  generateMock,
  loadChapterWeights,
  miniBlueprint,
  planWeak,
  prepareBank,
  subjectAliases,
  summarizeBlueprint,
} from './mockPlan';

export interface MockDeps {
  loadTaxonomy(): Promise<Taxonomy | null>;
  loadBank(exam: string, onProgress: (done: number, total: number) => void): Promise<{ version: number; manifest?: Manifest; questions: Question[] }>;
  loadBlueprints(exam: string): Promise<{ version: number; blueprints: Blueprint[] }>;
  generated: GeneratedStore;
  now?: () => number;
  random?: () => number;
}

const defaultDeps = (): MockDeps => ({
  loadTaxonomy: () => loadTaxonomy().catch(() => null),
  loadBank: loadExamBank,
  loadBlueprints: blueprintsForExam,
  generated: getGeneratedStore(),
});

const SUBJECT_FALLBACK: Record<string, string> = { PHY: 'Physics', CHE: 'Chemistry', MAT: 'Mathematics', BIO: 'Biology', BOT: 'Botany', ZOO: 'Zoology' };

/** `/mocks/new` */
export function NewMockScreen() {
  const store = useStore();
  const deps = useMemo(defaultDeps, []);
  return <NewMockView store={store} deps={deps} />;
}

type Gen =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; record: GeneratedPaperRecord; notes: string[] };

export function NewMockView({ store, deps }: { store: UserStore; deps: MockDeps }) {
  const navigate = useNavigate();
  const now = deps.now ?? Date.now;
  const rand = deps.random ?? Math.random;
  const [exam, setExam] = useState<ExamId>('JEE_MAIN');
  const [length, setLength] = useState<'full' | 'mini'>('full');
  const [tilt, setTilt] = useState<'weak' | 'balanced'>('weak');
  const [tax, setTax] = useState<Taxonomy | null>(null);
  const [bank, setBank] = useState<{ version: number; questions: Question[] } | null>(null);
  const [progress, setProgress] = useState<[number, number]>([0, 1]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [bpId, setBpId] = useState('');
  const [mastery, setMastery] = useState<MasteryDoc | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [mocks, setMocks] = useState<MockDoc[]>([]);
  const [past, setPast] = useState<GeneratedPaperRecord[]>([]);
  const [weights, setWeights] = useState<{ weights: Record<string, number>; source: 'file' | 'equal' } | null>(null);
  const [seed, setSeed] = useState(0);
  const [gen, setGen] = useState<Gen>({ kind: 'idle' });
  const profileDone = useRef(false);

  // profile exam, taxonomy, user state: once
  useEffect(() => {
    let live = true;
    (async () => {
      const [t, profile, m, ss, mm, pp] = await Promise.all([
        deps.loadTaxonomy().catch(() => null),
        store.getProfile().catch(() => null),
        store.getState('mastery').catch(() => null),
        store.listSessions().catch(() => []),
        store.listMocks().catch(() => []),
        deps.generated.list().catch(() => []),
      ]);
      if (!live) return;
      setTax(t);
      setMastery(m as MasteryDoc | null);
      setSessions(ss);
      setMocks(mm);
      setPast(pp);
      const taken = new Set(pp.map((p) => p.paperId));
      let s = Math.floor(rand() * 0xfffe) + 1;
      while (taken.has(paperIdForSeed(s))) s = (s % 0xfffe) + 1;
      setSeed(s);
      if (isExamId(profile?.exam)) setExam(profile.exam);
      profileDone.current = true;
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, deps]);

  // bank + blueprints for the chosen exam
  useEffect(() => {
    if (!profileDone.current && seed === 0) return;
    let live = true;
    setBank(null);
    setLoadError(null);
    setProgress([0, 1]);
    setGen({ kind: 'idle' });
    (async () => {
      try {
        const [b, bp] = await Promise.all([deps.loadBank(exam, (d, t) => live && setProgress([d, Math.max(1, t)])), deps.loadBlueprints(exam)]);
        if (!live) return;
        setBank({ version: b.version, questions: b.questions });
        setBlueprints(bp.blueprints);
        setBpId((cur) => (bp.blueprints.some((x) => x.id === cur) ? cur : (bp.blueprints[0]?.id ?? '')));
      } catch (e) {
        if (live) setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, seed === 0, deps]);

  const blueprint = blueprints.find((b) => b.id === bpId) ?? blueprints[0];
  const aliases = useMemo(() => subjectAliases(tax), [tax]);
  const weak = useMemo(() => (bank && tilt === 'weak' ? planWeak(mastery, tax, bank.questions) : null), [bank, tilt, mastery, tax]);
  const prepared = useMemo(() => (bank && blueprint ? prepareBank(bank.questions, blueprint, aliases).prepared : []), [bank, blueprint, aliases]);
  const shortfalls = useMemo(() => (blueprint ? capacityShortfalls(blueprint, prepared) : []), [blueprint, prepared]);
  const used = useMemo(() => (blueprint ? (length === 'mini' ? miniBlueprint(blueprint, prepared) : blueprint) : null), [blueprint, length, prepared]);
  const summary = useMemo(() => (used ? summarizeBlueprint(used) : null), [used]);

  useEffect(() => {
    if (!bank || !blueprint) return;
    let live = true;
    void loadChapterWeights(blueprint, bank.version, bank.questions).then((w) => live && setWeights(w));
    return () => {
      live = false;
    };
  }, [bank, blueprint]);

  const subjectName = (code: string) => tax?.subjects.find((s) => s.id === code)?.name ?? SUBJECT_FALLBACK[code] ?? code;
  const chapterName = (id: string) => tax?.subjects.flatMap((s) => s.chapters).find((c) => c.id === id)?.name ?? id;
  const tooThinFull = length === 'full' && shortfalls.length > 0;
  const tooThinMini = length === 'mini' && (summary?.total ?? 0) < 3;
  const code = paperCode(seed || 1);

  const generate = () => {
    if (!bank || !blueprint || !used) return;
    setGen({ kind: 'working' });
    // let the spinner paint before the (synchronous) selection runs
    setTimeout(() => {
      void (async () => {
        try {
          const w = weights ?? (await loadChapterWeights(blueprint, bank.version, bank.questions));
          const out = generateMock({
            blueprint: used,
            bank: bank.questions,
            weights: w.weights,
            history: buildHistory(sessions, mocks),
            weak: tilt === 'weak' ? weak : null,
            aliases,
            seed,
            now: now(),
          });
          if (!out.ok) {
            setGen({
              kind: 'failed',
              message:
                length === 'full'
                  ? 'The bank does not have enough different questions to fill every section of a full paper yet.'
                  : 'The bank does not have enough different questions for even a short paper yet.',
            });
            return;
          }
          const record: GeneratedPaperRecord = {
            paperId: paperIdForSeed(seed),
            seed,
            exam,
            blueprintId: blueprint.id,
            blueprint: used,
            title: `${EXAMS.find((e) => e.id === exam)?.label ?? exam} mock #${code}${length === 'mini' ? ' (mini)' : ''}`,
            mini: length === 'mini',
            paper: out.paper,
            answers: out.result.answers,
            createdAt: now(),
            weakShare: tilt === 'weak' ? out.weakShare : 0,
          };
          await deps.generated.put(record);
          setPast(await deps.generated.list().catch(() => []));
          if (out.notes.length) setGen({ kind: 'ready', record, notes: out.notes });
          else navigate(`/exam/${record.paperId}`);
        } catch (e) {
          setGen({ kind: 'failed', message: e instanceof Error ? e.message : String(e) });
        }
      })();
    }, 0);
  };

  const newSeed = () => {
    const taken = new Set(past.map((p) => p.paperId));
    let s = Math.floor(rand() * 0xfffe) + 1;
    while (taken.has(paperIdForSeed(s))) s = (s % 0xfffe) + 1;
    setSeed(s);
    setGen({ kind: 'idle' });
  };

  const remove = async (id: string) => {
    await deps.generated.remove(id).catch(() => {});
    setPast(await deps.generated.list().catch(() => []));
  };

  const loading = !bank && !loadError;
  const weakCount = used && weak ? Math.round(WEAK_TILT * (summary?.total ?? 0)) : 0;

  return (
    <Page width="app">
      <PageHeader title="Make me a mock" subtitle="A fresh paper with the real exam's structure, built from questions you have not met lately." />
      <div className="grid gap-s6 lg:grid-cols-3">
        <div className="stack gap-s5 lg:col-span-2">
          <Card>
            <div className="stack gap-s5">
              <div className="stack gap-s2">
                <span className="text-small font-semibold">Exam</span>
                <Tabs<ExamId> label="Exam" value={exam} onChange={setExam} tabs={EXAMS.map((e) => ({ id: e.id, label: e.label }))} />
              </div>
              {blueprints.length > 1 && (
                <div className="stack gap-s2">
                  <label htmlFor="bp" className="text-small font-semibold">Paper format</label>
                  <Select id="bp" value={bpId} onChange={(e) => setBpId(e.target.value)}>
                    {blueprints.map((b) => (
                      <option key={b.id} value={b.id}>{b.id}</option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="stack gap-s2">
                <span className="text-small font-semibold">Length</span>
                <Tabs<'full' | 'mini'>
                  label="Length"
                  value={length}
                  onChange={setLength}
                  tabs={[
                    { id: 'full', label: 'Full length' },
                    { id: 'mini', label: 'Mini' },
                  ]}
                />
              </div>
              <div className="stack gap-s2">
                <span className="text-small font-semibold">Question mix</span>
                <Tabs<'weak' | 'balanced'>
                  label="Question mix"
                  value={tilt}
                  onChange={setTilt}
                  tabs={[
                    { id: 'weak', label: 'Tilt to my weak chapters' },
                    { id: 'balanced', label: 'Balanced' },
                  ]}
                />
                <p className="text-small text-slate">
                  Question counts always match the real exam. Tilting moves about a quarter of the questions to chapters that need more work.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack gap-s4">
              <h2 className="text-h2">Structure</h2>
              {loading || !summary ? (
                <p className="text-slate">Loading the exam format.</p>
              ) : summary.total === 0 ? (
                <p className="text-slate">Nothing to show yet.</p>
              ) : (
                <div className="grid-auto">
                  {summary.subjects.map((s) => (
                    <div key={s.code} className="stack gap-s2 rounded-card bg-surface-3 p-s4">
                      <div className="row justify-between gap-s2">
                        <h3 className="text-body font-semibold">{subjectName(s.code)}</h3>
                        <span className="text-small text-slate tabular">{s.count} questions</span>
                      </div>
                      <ul className="stack gap-s1 text-small text-slate">
                        {s.sections.map((x) => (
                          <li key={x.id}>
                            Section {x.id}: {x.count} {TYPE_WORDS[x.type]}, +{x.correct}
                            {x.wrong !== 0 ? ` / ${x.wrong}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="stack gap-s3">
              <h2 className="text-h2">Chapter mix</h2>
              {tilt === 'balanced' || !weak || weak.chapters.length === 0 ? (
                <p className="text-slate">
                  Chapters follow the exam's usual spread{weights?.source === 'equal' ? ' (equal across chapters until multi-year weights are published)' : ''}.
                </p>
              ) : (
                <>
                  <p className="text-slate">
                    About {Math.round(WEAK_TILT * 100)}% ({weakCount} questions) come from these chapters. The rest follow the usual spread.
                    {weak.unseen.length > 0 && ' Chapters you have not tried yet are included, because we do not know your level there.'}
                  </p>
                  <div className="row gap-s2">
                    {weak.chapters.map((c) => (
                      <Chip key={c} tone={weak.unseen.includes(c) ? 'neutral' : 'accent'}>
                        {chapterName(c)}
                        {weak.unseen.includes(c) ? ' (new)' : ''}
                      </Chip>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        <aside className="lg:col-span-1 lg:sticky lg:top-s6 lg:self-start">
          <Card tone="primary">
            <div className="stack gap-s4">
              <div className="stack gap-s1">
                <span className="text-caption font-semibold uppercase tracking-wide text-slate">Paper number</span>
                <div className="row justify-between gap-s3">
                  <span className="text-h1 tabular">#{code}</span>
                  <Button variant="ghost" size="sm" onClick={newSeed} disabled={gen.kind === 'working'}>New number</Button>
                </div>
                <span className="text-small text-slate">The same number gives the same paper.</span>
              </div>
              {summary && summary.total > 0 && (
                <div className="grid grid-cols-3 gap-s3">
                  <div className="stack"><span className="text-h2 tabular">{summary.total}</span><span className="text-caption text-slate">questions</span></div>
                  <div className="stack"><span className="text-h2 tabular">{summary.marks}</span><span className="text-caption text-slate">marks</span></div>
                  <div className="stack"><span className="text-h2 tabular">{summary.durationMin}</span><span className="text-caption text-slate">minutes</span></div>
                </div>
              )}
              {loading && (
                <div className="stack gap-s2">
                  <ProgressBar value={progress[0]} max={progress[1]} label="Loading questions" />
                  <span className="text-small text-slate tabular">Loading questions, {progress[0]} of {progress[1]}</span>
                </div>
              )}
              {loadError && <Banner tone="accent">Could not load the question bank. Check your connection and try again. ({loadError})</Banner>}

              {tooThinFull && (
                <Banner tone="accent" actions={<Button size="sm" variant="secondary" onClick={() => setLength('mini')}>Make a mini paper</Button>}>
                  This bank has few questions for{' '}
                  {shortfalls.map((f) => `${subjectName(f.subject)} section ${f.section} (${f.have} of ${f.need})`).join(', ')}, so a full paper is not possible yet.
                </Banner>
              )}
              {tooThinMini && !tooThinFull && (
                <Banner tone="accent">There are not enough questions for even a mini paper in this exam yet. Practice chapters in the meantime.</Banner>
              )}
              {length === 'mini' && !tooThinMini && blueprint && shortfalls.length > 0 && (
                <Banner>A mini paper fits what the bank holds today. Some sections are shorter than usual.</Banner>
              )}
              {gen.kind === 'failed' && (
                <Banner
                  tone="accent"
                  role="alert"
                  actions={length === 'full' ? <Button size="sm" variant="secondary" onClick={() => { setLength('mini'); setGen({ kind: 'idle' }); }}>Try a mini paper</Button> : undefined}
                >
                  {gen.message}
                </Banner>
              )}
              {gen.kind === 'ready' && (
                <Stack gap="tight">
                  {gen.notes.map((n) => (
                    <Banner key={n}>{n}</Banner>
                  ))}
                  <LinkButton to={`/exam/${gen.record.paperId}`} size="lg" block>
                    Start the exam <ArrowRightIcon width={20} height={20} />
                  </LinkButton>
                </Stack>
              )}
              {gen.kind !== 'ready' && (
                <Button
                  size="lg"
                  block
                  loading={gen.kind === 'working'}
                  disabled={loading || !!loadError || tooThinFull || tooThinMini || !blueprint || seed === 0}
                  onClick={generate}
                >
                  Generate
                </Button>
              )}
            </div>
          </Card>
        </aside>
      </div>

      <Section title="Your generated papers" aside={<span className="text-small text-slate">Saved on this device</span>}>
        {past.length === 0 ? (
          <p className="text-slate">Papers you generate appear here, so you can take them again.</p>
        ) : (
          <div className="grid-auto">
            {past.map((p) => (
              <Card key={p.paperId}>
                <div className="stack gap-s3">
                  <div className="stack gap-s1">
                    <h3 className="text-h3">Paper #{paperCode(p.paperId)}</h3>
                    <span className="text-small text-slate">
                      {EXAMS.find((e) => e.id === p.exam)?.label ?? p.exam}
                      {p.mini ? ', mini' : ''} · {p.paper.length} questions · {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    {!!p.weakShare && <span className="text-small text-slate">{Math.round(p.weakShare * 100)}% from chapters to strengthen</span>}
                  </div>
                  <div className="row gap-s2">
                    <LinkButton to={`/exam/${p.paperId}`} variant="secondary">Re-take</LinkButton>
                    <Button variant="ghost" onClick={() => void remove(p.paperId)} aria-label={`Remove paper ${paperCode(p.paperId)}`}>Remove</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </Page>
  );
}
