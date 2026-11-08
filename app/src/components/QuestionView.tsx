import { useId, useMemo } from 'react';
import { escapeHtml, renderContentHtml, type ImageRef, type PublicQuestion, type Question } from '@kairos/core';
import 'katex/dist/katex.min.css';
import './QuestionView.css';
import { IMG_BASE, imageUrl } from '../bank/config';

const MAX_SRC_WIDTH = 960;

/** `<img>` markup for one declared image (srcset from the real generated variants). */
export function imageHtml(im: ImageRef, imgBase: string = IMG_BASE): string {
  const variants = [...im.variants].sort((a, b) => a - b);
  const src = [...variants].reverse().find((v) => v <= MAX_SRC_WIDTH) ?? variants[0]!;
  const srcset = variants.map((v) => `${imageUrl(im.id, v, imgBase)} ${v}w`).join(', ');
  return (
    `<figure class="kc-fig" style="margin:0.5rem 0"><img src="${imageUrl(im.id, src, imgBase)}" srcset="${srcset}" ` +
    `sizes="(max-width: 640px) 100vw, 640px" width="${im.w}" height="${im.h}" loading="lazy" ` +
    `decoding="async" alt="${escapeHtml(im.alt)}" style="max-width:100%;height:auto"></figure>`
  );
}

export function contentToHtml(markdown: string, images: readonly ImageRef[] = [], imgBase?: string): string {
  const byId = new Map(images.map((i) => [i.id, i]));
  return renderContentHtml(markdown, {
    imageHtml: (id, alt) => {
      const im = byId.get(id);
      return im ? imageHtml(im, imgBase) : `<span>${escapeHtml(alt)}</span>`;
    },
  });
}

export interface ContentHtmlProps {
  /** markdown: text + $math$ + `![alt](img:<id>)` */
  markdown: string;
  /** image metadata (question.images); undeclared ids render their alt text */
  images?: readonly ImageRef[];
  className?: string;
  as?: 'div' | 'span';
}

/** Renders any question markdown string (safe: escaped text, KaTeX trust:false). */
export function ContentHtml({ markdown, images, className = '', as: Tag = 'div' }: ContentHtmlProps) {
  const html = useMemo(() => contentToHtml(markdown, images), [markdown, images]);
  return <Tag className={`kc ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export interface QuestionViewProps {
  question: Question | PublicQuestion;
  showSolution?: boolean;
  /** selected option keys */
  selected?: readonly string[];
  /** called with the new full selection (SCQ: [key]; MSQ: toggled set) */
  onSelect?: (keys: string[]) => void;
  variant?: 'practice' | 'review';
}

const NO_OPTIONS = new Set(['NVQ', 'INT']);

export function QuestionView({
  question: q,
  showSolution = false,
  selected = [],
  onSelect,
  variant = 'practice',
}: QuestionViewProps) {
  const name = useId();
  const multi = q.type === 'MSQ';
  const options = NO_OPTIONS.has(q.type) ? [] : (q.options ?? []);
  const full = q as Question;
  const answer = full.answer;
  const correct = new Set(showSolution && answer && 'keys' in answer ? answer.keys : []);
  const interactive = variant === 'practice' && !!onSelect;
  const pad = variant === 'review' ? 'p-3' : 'p-4';

  const toggle = (key: string) => {
    if (!onSelect) return;
    if (!multi) onSelect([key]);
    else onSelect(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  return (
    <article className="space-y-4 text-ink" data-qid={q.id}>
      {q.passage ? (
        <ContentHtml
          markdown={q.passage}
          images={q.images}
          className="rounded-card border border-line bg-surface p-4 text-slate"
        />
      ) : null}
      <ContentHtml markdown={q.stem} images={q.images} className="text-base leading-relaxed" />

      {options.length > 0 && (
        <div
          role={multi ? 'group' : 'radiogroup'}
          aria-label={multi ? 'Select all that apply' : 'Choose one answer'}
          className="space-y-2"
        >
          {options.map((o) => {
            const on = selected.includes(o.key);
            const isCorrect = correct.has(o.key);
            return (
              <label
                key={o.key}
                className={`flex items-start gap-3 rounded-card border bg-surface ${pad} ${
                  interactive ? 'cursor-pointer hover:border-primary' : ''
                } ${on ? 'border-primary bg-primary-50' : isCorrect ? 'border-accent' : 'border-line'} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary`}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={name}
                  value={o.key}
                  checked={on}
                  disabled={!interactive}
                  onChange={() => toggle(o.key)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-7 w-7 shrink-0 place-items-center border text-sm font-medium ${
                    multi ? 'rounded-md' : 'rounded-full'
                  } ${on ? 'border-primary bg-primary text-surface' : 'border-line text-slate'}`}
                >
                  {o.key}
                </span>
                <ContentHtml markdown={o.text} images={q.images} className="min-w-0 flex-1 pt-0.5" />
                {isCorrect && <span className="shrink-0 rounded-md border border-accent px-2 py-0.5 text-xs font-medium text-accent-ink">Correct</span>}
              </label>
            );
          })}
        </div>
      )}

      {showSolution && (full.solution || (answer && !('keys' in answer))) && (
        <section aria-label="Solution" className="rounded-card border border-line bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate">Solution</h3>
          {answer && !('keys' in answer) && (
            <p className="mb-2 text-sm">
              Answer:{' '}
              <strong>
                {'value' in answer
                  ? `${answer.value}${answer.tol ? ` (±${answer.tol})` : ''}`
                  : `${answer.range[0]} to ${answer.range[1]}`}
              </strong>
            </p>
          )}
          {full.solution && <ContentHtml markdown={full.solution} images={q.images} />}
        </section>
      )}
    </article>
  );
}
