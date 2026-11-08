import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Banner, Button, Card, Chip, Textarea } from '../components/ui';
import { AlertIcon, CheckIcon, LockIcon, UploadIcon } from '../components/icons';
import { useObjectUrl } from './CropTool';
import type { PagesApi, PageImage } from './pages';
import type { ParseProblem } from './pipeline';
import { EXAMS, chaptersForExam, examLabel } from './taxonomy';

export function Privacy() {
  return (
    <p className="flex items-start gap-s2 text-small text-slate">
      <LockIcon width={16} height={16} className="mt-s1 shrink-0" />
      Your pages stay on this device. Only the questions you choose to save are stored.
    </p>
  );
}

/* ---------------------------------------------------------------- 1 */

export function StepExam({ exam, onPick }: { exam: string | null; onPick(id: string): void }) {
  return (
    <Card className="stack gap-base">
      <h2 className="text-h2">Which exam is this paper for?</h2>
      <p className="text-slate">We use it to give the AI the right list of chapters, so each question lands in the right place.</p>
      <div className="u-exam" role="group" aria-label="Exam">
        {EXAMS.map((e) => (
          <button key={e.id} type="button" className="u-exam-opt" aria-pressed={exam === e.id} onClick={() => onPick(e.id)}>
            <span className="text-body font-semibold">{e.label}</span>
            <span className="u-sub">{e.blurb} · {chaptersForExam(e.id).length} chapters</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export function HowItWorks() {
  return (
    <Card tone="primary" className="stack gap-base">
      <h2 className="text-h2">How it works</h2>
      <ol className="u-steps-list">
        <li>Copy our prompt and give it, with your paper, to any AI chat (ChatGPT, Gemini, Claude).</li>
        <li>Paste the reply back here. We check the maths, the answers and the figures.</li>
        <li>Fix anything flagged, then save. Your questions work in practice, mocks and your plan.</li>
      </ol>
      <Privacy />
    </Card>
  );
}

/* ---------------------------------------------------------------- 2 */

export function StepPrompt({ exam, onCopy, copied }: { exam: string; onCopy(): void; copied: boolean }) {
  return (
    <Card className="stack gap-base">
      <h2 className="text-h2">Copy the prompt for {examLabel(exam)}</h2>
      <ol className="u-steps-list" aria-label="How to use the prompt">
        <li><span><strong>Copy this prompt.</strong></span></li>
        <li><span><strong>Open ChatGPT, Gemini or Claude</strong>, paste it, and attach your paper pages or PDF and the answer key.</span></li>
        <li><span><strong>Copy the whole reply</strong> and paste it here. If it stops, type &ldquo;continue&rdquo; and paste the next block too.</span></li>
      </ol>
      <Button size="lg" block onClick={onCopy}>
        {copied ? <CheckIcon width={20} height={20} /> : null}
        {copied ? 'Copied' : 'Copy prompt'}
      </Button>
      <div className="stack gap-tight">
        <h3 className="text-h3">Tips</h3>
        <ul className="stack gap-tight list-disc pl-s5 text-small text-slate">
          <li>Send the pages in order, and include the answer key. Without a key, questions are saved for self-check only.</li>
          <li>Expect about 25 questions per reply. Type &ldquo;continue&rdquo; for the rest.</li>
          <li>Proofread: AI can misread a symbol. You will check every question in the next steps.</li>
        </ul>
      </div>
      <Privacy />
    </Card>
  );
}

export function PromptText({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="stack gap-base">
      <div className="row justify-between gap-base">
        <h3 className="text-h3">Full prompt</h3>
        <Button size="sm" variant="secondary" className="lg:hidden" aria-expanded={open} aria-controls="u-prompt-text" onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show full text'}
        </Button>
      </div>
      <pre id="u-prompt-text" className={`u-prompt ${open ? '' : 'hidden lg:block'}`} tabIndex={0} aria-label="Full prompt text">{prompt}</pre>
    </Card>
  );
}

/* ---------------------------------------------------------------- 3 */

function Thumb({ page }: { page: PageImage }) {
  const url = useObjectUrl(page.thumb);
  return (
    <li className="u-thumb">
      {url ? <img src={url} alt={`Page ${page.n}`} width={page.w} height={page.h} loading="lazy" /> : <div style={{ aspectRatio: `${page.w} / ${page.h}` }} />}
      <span className="u-thumb-n">{page.n}</span>
    </li>
  );
}

export function StepPages({ api }: { api: PagesApi }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    if (list && list.length) void api.addFiles([...list]);
    if (input.current) input.current.value = '';
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files);
  };
  return (
    <Card className="stack gap-base">
      <div className="row gap-tight">
        <h2 className="text-h2">Add your pages</h2>
        <Chip>Optional</Chip>
      </div>
      <p className="text-slate">Needed only to cut out figures (diagrams, graphs, structures). Skip this if your questions have none.</p>
      <label
        className="u-drop"
        data-over={over}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <span className="tile-icon !mb-0"><UploadIcon /></span>
        <span className="text-body font-semibold">Drop PDF or photos here, or choose files</span>
        <span className="text-small text-slate">Pages are numbered in the order you add them. This is the page number the AI refers to.</span>
        <input ref={input} type="file" multiple accept="application/pdf,image/*" className="sr-only" aria-label="Choose PDF or image files" onChange={(e) => take(e.target.files)} />
        <span className="btn btn-secondary" aria-hidden="true">Choose files</span>
      </label>
      {api.busy && <p role="status" className="text-small text-slate">{api.progress ?? 'Working…'}</p>}
      {api.errors.map((e) => (
        <p key={e} role="alert" className="row gap-tight text-small text-accent-ink"><AlertIcon width={16} height={16} className="shrink-0" />{e}</p>
      ))}
      <Privacy />
    </Card>
  );
}

export function PagesPreview({ api }: { api: PagesApi }) {
  return (
    <Card className="stack gap-base">
      <div className="row justify-between gap-base">
        <h3 className="text-h3">{api.pages.length === 0 ? 'Your pages' : `${api.pages.length} page${api.pages.length === 1 ? '' : 's'}`}</h3>
        {api.pages.length > 0 && <Button size="sm" variant="ghost" onClick={() => void api.clear()}>Remove all</Button>}
      </div>
      {api.pages.length === 0 ? (
        <p className="text-slate">Page thumbnails will appear here. They stay in this browser and are never uploaded.</p>
      ) : (
        <ol className="u-thumbs" aria-label="Pages">
          {api.pages.map((p) => <Thumb key={p.n} page={p} />)}
        </ol>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- 4 */

export interface StepPasteProps {
  texts: string[];
  onTexts(t: string[]): void;
  onCheck(): void;
  checking: boolean;
}

export function StepPaste({ texts, onTexts, onCheck, checking }: StepPasteProps) {
  const file = useRef<HTMLInputElement>(null);
  const set = (i: number, v: string) => onTexts(texts.map((t, j) => (j === i ? v : t)));
  const readFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const read = await Promise.all([...list].map((f) => f.text()));
    const kept = texts.filter((t) => t.trim());
    onTexts([...kept, ...read]);
    if (file.current) file.current.value = '';
  };
  return (
    <Card className="stack gap-base">
      <h2 className="text-h2">Paste the AI&rsquo;s reply</h2>
      <p className="text-slate">Paste the whole reply, even with text around the JSON. If the AI needed several replies, add each as another block.</p>
      {texts.map((t, i) => (
        <div key={i} className="stack gap-tight">
          <label htmlFor={`u-paste-${i}`} className="text-small font-semibold">{texts.length > 1 ? `Reply block ${i + 1}` : 'AI reply'}</label>
          <Textarea id={`u-paste-${i}`} className="u-paste" value={t} placeholder={'```json\n{ "prompt_version": 2, … }\n```'} onChange={(e) => set(i, e.target.value)} spellCheck={false} />
        </div>
      ))}
      <div className="row gap-tight">
        <Button variant="secondary" onClick={() => onTexts([...texts, ''])}>Add another block</Button>
        <Button variant="secondary" onClick={() => file.current?.click()}>Choose .json file</Button>
        <input ref={file} type="file" accept=".json,application/json,text/plain" multiple className="sr-only" aria-label="Choose .json file" onChange={(e) => void readFiles(e.target.files)} />
      </div>
      <Button size="lg" block loading={checking} disabled={!texts.some((t) => t.trim())} onClick={onCheck}>Check my questions</Button>
    </Card>
  );
}

export function PasteResult({ problems }: { problems: ParseProblem[] | null }) {
  if (!problems)
    return (
      <Card className="stack gap-base">
        <h3 className="text-h3">What happens next</h3>
        <ol className="u-steps-list">
          <li>We read the reply and check every question.</li>
          <li>You review each one next to a live preview, fix anything flagged and crop figures.</li>
          <li>You save the good ones to your private bank.</li>
        </ol>
      </Card>
    );
  return (
    <Card className="stack gap-base" aria-label="Problems found">
      <h3 className="text-h3">We could not read this yet</h3>
      <ul className="stack gap-base">
        {problems.map((p, i) => (
          <li key={i} className="u-problem">
            <span className="text-small font-semibold">
              Block {p.block}{p.line ? `, line ${p.line}${p.col ? `, col ${p.col}` : ''}` : ''}
            </span>
            <span className="text-small text-slate">{p.message}</span>
            <span className="text-small">{p.hint}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function DoneCard({ saved, selfCheck, guest, onMore, bankLink }: { saved: number; selfCheck: number; guest: boolean; onMore(): void; bankLink: ReactNode }) {
  return (
    <Card tone="primary" className="stack gap-base">
      <span className="tile-icon !bg-surface"><CheckIcon /></span>
      <h2 className="text-h2">Saved {saved} question{saved === 1 ? '' : 's'} to your bank</h2>
      {selfCheck > 0 && <p className="text-slate">{selfCheck} {selfCheck === 1 ? 'has' : 'have'} no answer, so {selfCheck === 1 ? 'it is' : 'they are'} labelled &ldquo;self-check only&rdquo;. No score, no mastery change.</p>}
      {guest && (
        <Banner role="note">
          Saved on this device. Sign in to keep your questions safe across devices.{' '}
          <Link to="/signin" className="font-semibold underline">Sign in</Link>
        </Banner>
      )}
      <div className="row gap-tight">
        {bankLink}
        <Button variant="secondary" onClick={onMore}>Upload more</Button>
      </div>
    </Card>
  );
}
