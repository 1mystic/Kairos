import { useMemo, useState } from 'react';
import { MAX_IMAGES, MAX_QUESTIONS, MAX_NEW_PER_DAY, type UserQuestion } from '@kairos/core';
import { Banner, Button, Card, Chip, EmptyState, Field, LinkButton, Page, PageHeader, ProgressBar, SelectField, SkeletonRows, Tabs, CardGrid } from '../components/ui';
import { ArrowRightIcon, CheckIcon, InfoIcon, UploadIcon } from '../components/icons';
import { deleteQuestionsAndOrphans } from '../store/bank';
import { useBankEnv, useUserQuestions } from '../store/bankHooks';
import { IssueChip } from './QuestionCard';
import { UserQuestionPreview, useMediaUrls } from './UserQuestionPreview';
import { chapterName } from './taxonomy';
import { EXAMS, examLabel } from './taxonomy';
import './upload.css';

type StatusFilter = 'all' | 'ready' | 'self';
const PAGE = 20;

const plain = (md: string) => md.replace(/\$\$?[^$]*\$\$?/g, ' ◊ ').replace(/!\[[^\]]*\]\([^)]*\)/g, '[figure]').replace(/\s+/g, ' ').trim();

function Row({ q, selected, open, urls, onToggle, onOpen }: { q: UserQuestion; selected: boolean; open: boolean; urls: ReadonlyMap<string, string>; onToggle(): void; onOpen(): void }) {
  return (
    <Card as="article" aria-label={`Question ${q.n}`} className="u-bank-row">
      <div className="u-qhead">
        <label className="u-check"><input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select question ${q.n}`} /></label>
        <div className="row-inline min-w-0 flex-1">
          <Chip>{examLabel(q.exam)}</Chip>
          {q.tax?.chapter && <Chip tone="primary">{chapterName(q.tax.chapter)}</Chip>}
          {q.status === 'needs_answer' && <IssueChip chip={{ code: 'needs_answer', label: 'Self-check only', level: 'warn', title: 'No answer was provided. No score, no mastery update.' }} />}
          {q.images.length > 0 && <Chip>{q.images.length} figure{q.images.length === 1 ? '' : 's'}</Chip>}
        </div>
        <Button size="sm" variant="secondary" aria-expanded={open} onClick={onOpen}>{open ? 'Hide' : 'Preview'}</Button>
      </div>
      {open ? <UserQuestionPreview question={q} urls={urls} /> : <p className="line-clamp-2 text-slate">{plain(q.stem)}</p>}
    </Card>
  );
}

export function BankPage() {
  const { store } = useBankEnv();
  const { questions, usage, loading, error, reload } = useUserQuestions();
  const [exam, setExam] = useState('');
  const [chapter, setChapter] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const chapters = useMemo(() => [...new Set(questions.filter((q) => !exam || q.exam === exam).map((q) => q.tax?.chapter).filter((c): c is string => !!c))], [questions, exam]);
  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) =>
      (!exam || q.exam === exam) &&
      (!chapter || q.tax?.chapter === chapter) &&
      (status === 'all' || (status === 'self' ? q.status === 'needs_answer' : q.status === 'user_ok')) &&
      (!s || q.stem.toLowerCase().includes(s) || (q.options ?? []).some((o) => o.text.toLowerCase().includes(s))),
    );
  }, [questions, exam, chapter, status, search]);
  const page = visible.slice(0, shown);
  const open = useMemo(() => page.filter((q) => q.id === openId), [page, openId]);
  const urls = useMediaUrls(open, undefined);

  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const remove = async (ids: string[]) => {
    setBusy(true);
    setFailed(null);
    try {
      await deleteQuestionsAndOrphans(store, ids);
      setSelected(new Set());
      await reload();
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'Could not delete. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <PageHeader
      title="My questions"
      subtitle="Questions you uploaded. Only you can see them."
      actions={<LinkButton to="/upload"><UploadIcon width={20} height={20} />Upload more</LinkButton>}
    />
  );

  if (loading)
    return (
      <Page>
        {header}
        <SkeletonRows count={3} />
      </Page>
    );

  if (questions.length === 0)
    return (
      <Page>
        {header}
        {error && <Banner tone="bad" role="alert">{error}</Banner>}
        <EmptyState
          icon={UploadIcon}
          title="Bring your own papers"
          action={<LinkButton to="/upload" size="lg">Upload your questions<ArrowRightIcon width={20} height={20} /></LinkButton>}
        >
          Coaching tests, school papers, a friend&rsquo;s worksheet. Paste them through our prompt and they become practice questions that count in your plan, privately. Your pages never leave your device.
        </EmptyState>
      </Page>
    );

  return (
    <Page>
      {header}
      {error && <Banner tone="bad" role="alert">{error}</Banner>}
      {failed && <Banner tone="bad" role="alert">{failed}</Banner>}

      <Card className="u-meter" aria-label="Usage">
        <CardGrid cols={2}>
          <div className="stack-label">
            <div className="row-between"><span className="text-small font-semibold">Questions</span><span className="text-small text-slate tabular">{usage.questions} / {MAX_QUESTIONS}</span></div>
            <ProgressBar value={usage.questions} max={MAX_QUESTIONS} label="Questions used" />
          </div>
          <div className="stack-label">
            <div className="row-between"><span className="text-small font-semibold">Images</span><span className="text-small text-slate tabular">{usage.images} / {MAX_IMAGES}</span></div>
            <ProgressBar value={usage.images} max={MAX_IMAGES} label="Images used" />
          </div>
        </CardGrid>
        <p className="row-inline text-small text-slate"><InfoIcon width={16} height={16} className="shrink-0" />{Math.max(0, MAX_NEW_PER_DAY - usage.addedToday)} of {MAX_NEW_PER_DAY} new questions left today.</p>
      </Card>

      <div className="u-filters">
        <Field label="Search" type="search" value={search} onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }} placeholder="Words in a question" />
        <SelectField label="Exam" value={exam} onChange={(e) => { setExam(e.target.value); setChapter(''); setShown(PAGE); }}>
          <option value="">All exams</option>
          {EXAMS.filter((e) => questions.some((q) => q.exam === e.id)).map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </SelectField>
        <SelectField label="Chapter" value={chapter} onChange={(e) => { setChapter(e.target.value); setShown(PAGE); }}>
          <option value="">All chapters</option>
          {chapters.map((c) => <option key={c} value={c}>{chapterName(c)}</option>)}
        </SelectField>
      </div>
      <div className="row-between">
        <Tabs<StatusFilter> label="Status" value={status} onChange={(s) => { setStatus(s); setShown(PAGE); }} tabs={[{ id: 'all', label: 'All' }, { id: 'ready', label: 'With answer' }, { id: 'self', label: 'Self-check' }]} />
        <div className="row-actions">
          <span className="text-small text-slate">{visible.length} shown</span>
          <Button size="sm" variant="danger-ghost" disabled={selected.size === 0} loading={busy} onClick={() => void remove([...selected])}>Delete {selected.size || ''} selected</Button>
        </div>
      </div>

      <div className="stack-grid">
        {page.map((q) => (
          <Row key={q.id} q={q} selected={selected.has(q.id)} open={openId === q.id} urls={urls} onToggle={() => toggle(q.id)} onOpen={() => setOpenId(openId === q.id ? null : q.id)} />
        ))}
        {visible.length === 0 && <p className="text-slate">No questions match these filters.</p>}
        {visible.length > shown && <div className="row justify-center"><Button variant="secondary" onClick={() => setShown(shown + PAGE)}>Show more ({visible.length - shown} left)</Button></div>}
      </div>
      <p className="row-inline text-small text-slate"><CheckIcon width={16} height={16} className="shrink-0" />Questions marked self-check have no answer, so they never change your score or mastery.</p>
    </Page>
  );
}
