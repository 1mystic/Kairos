import { useId, useMemo } from 'react';
import { escapeHtml, renderContentHtml, type ImageRef, type PublicQuestion, type Question } from '@kairos/core';
import 'katex/dist/katex.min.css';
import './QuestionView.css';
import { CheckIcon, CloseIcon } from './icons';
import { IMG_BASE, imageUrl } from '../bank/config';
import { isUserQuestion, useUserImageMap } from './useUserImages';

const MAX_SRC_WIDTH = 960;

/** `<img>` markup for one declared image (srcset from the real generated variants). */
export function imageHtml(im: ImageRef, imgBase: string = IMG_BASE): string {
  const variants = [...im.variants].sort((a, b) => a - b);
  const src = [...variants].reverse().find((v) => v <= MAX_SRC_WIDTH) ?? variants[0]!;
  const srcset = variants.map((v) => `${imageUrl(im.id, v, imgBase)} ${v}w`).join(', ');
  return (
    `<figure class="kc-fig"><img src="${imageUrl(im.id, src, imgBase)}" srcset="${srcset}" ` +
    `sizes="(max-width: 640px) 100vw, 640px" width="${im.w}" height="${im.h}" loading="lazy" ` +
    `decoding="async" alt="${escapeHtml(im.alt)}"></figure>`
  );
}

/** Only inline image data/blob URLs: user images never become arbitrary URLs. */
const SAFE_USER_URL = /^(data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+|blob:[^\s"'<>]+)$/;

/** `<img>` for a user image: single resolved URL (data/blob), declared size, same white card. */
export function userImageHtml(im: ImageRef, url: string): string {
  return (
    `<figure class="kc-fig"><img src="${escapeHtml(url)}" width="${im.w}" height="${im.h}" loading="lazy" ` +
    `decoding="async" alt="${escapeHtml(im.alt)}"></figure>`
  );
}

export type ImageResolver = (id: string) => string | undefined;

export function contentToHtml(
  markdown: string,
  images: readonly ImageRef[] = [],
  imgBase?: string,
  resolve?: ImageResolver,
  /** user content: images not found by the resolver render their alt text instead of a CDN url */
  strict = false,
): string {
  const byId = new Map(images.map((i) => [i.id, i]));
  return renderContentHtml(markdown, {
    imageHtml: (id, alt) => {
      const im = byId.get(id);
      if (!im) return `<span>${escapeHtml(alt)}</span>`;
      const url = resolve?.(id);
      if (url && SAFE_USER_URL.test(url)) return userImageHtml(im, url);
      // user media not loaded (or missing): alt text, never a dead CDN link
      if (strict) return `<span class="kc-alt">${escapeHtml(im.alt)}</span>`;
      return imageHtml(im, imgBase);
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
  /** id -> data/blob URL for user images; ids it resolves skip the CDN srcset */
  imageResolver?: ImageResolver;
  /** convenience: the same as imageResolver, from a plain map */
  userImages?: Record<string, string>;
  /** unresolved images show alt text (set for user questions) */
  strictImages?: boolean;
}

/** Renders any question markdown string (safe: escaped text, KaTeX trust:false). */
export function ContentHtml({ markdown, images, className = '', as: Tag = 'div', imageResolver, userImages, strictImages }: ContentHtmlProps) {
  const html = useMemo(
    () => contentToHtml(markdown, images, undefined, imageResolver ?? (userImages ? (id) => userImages[id] : undefined), strictImages),
    [markdown, images, imageResolver, userImages, strictImages],
  );
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
  /** resolves `img:<id>` for user images; default: loaded automatically for user questions */
  imageResolver?: ImageResolver;
  userImages?: Record<string, string>;
}

const NO_OPTIONS = new Set(['NVQ', 'INT']);

export function QuestionView({
  question: q,
  showSolution = false,
  selected = [],
  onSelect,
  variant = 'practice',
  imageResolver,
  userImages,
}: QuestionViewProps) {
  const name = useId();
  const user = isUserQuestion(q);
  const auto = useUserImageMap(q, user && !imageResolver && !userImages);
  const imgs = userImages ?? auto;
  const img = { imageResolver, userImages: imageResolver ? undefined : imgs, strictImages: user };
  const multi = q.type === 'MSQ';
  const options = NO_OPTIONS.has(q.type) ? [] : (q.options ?? []);
  const full = q as Question;
  const answer = full.answer;
  const correct = new Set(showSolution && answer && 'keys' in answer ? answer.keys : []);
  const interactive = variant === 'practice' && !!onSelect;

  const toggle = (key: string) => {
    if (!onSelect) return;
    if (!multi) onSelect([key]);
    else onSelect(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  return (
    <article className="stack-card text-ink" data-qid={q.id}>
      {q.passage ? (
        <ContentHtml
          markdown={q.passage}
          images={q.images} {...img}
          className="card text-slate"
        />
      ) : null}
      <ContentHtml markdown={q.stem} images={q.images} {...img} className="text-body leading-relaxed" />

      {options.length > 0 && (
        <div
          role={multi ? 'group' : 'radiogroup'}
          aria-label={multi ? 'Select all that apply' : 'Choose one answer'}
          className="stack-label"
        >
          {options.map((o) => {
            const on = selected.includes(o.key);
            const isCorrect = correct.has(o.key);
            const isWrong = on && correct.size > 0 && !isCorrect;
            return (
              <label
                key={o.key}
                className={`opt${variant === 'review' ? ' opt-review' : ''}${interactive ? ' opt-live' : ''}${on ? ' opt-on' : ''}${isCorrect ? ' opt-right' : isWrong ? ' opt-wrong' : ''}`}
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
                <span aria-hidden="true" className={`opt-key${multi ? ' opt-key-sq' : ''}`}>{o.key}</span>
                <ContentHtml markdown={o.text} images={q.images} {...img} className="min-w-0 flex-1" />
                {isCorrect && <span className="chip chip-good shrink-0"><CheckIcon width={14} height={14} />Correct</span>}
                {isWrong && <span className="chip chip-bad shrink-0"><CloseIcon width={14} height={14} />Not quite</span>}
              </label>
            );
          })}
        </div>
      )}

      {showSolution && (full.solution || (answer && !('keys' in answer))) && (
        <section aria-label="Solution" className="card">
          <h3 className="text-h3">Solution</h3>
          {answer && !('keys' in answer) && (
            <p className="text-small">
              Answer:{' '}
              <strong>
                {'value' in answer
                  ? `${answer.value}${answer.tol ? ` (±${answer.tol})` : ''}`
                  : `${answer.range[0]} to ${answer.range[1]}`}
              </strong>
            </p>
          )}
          {full.solution && <ContentHtml markdown={full.solution} images={q.images} {...img} />}
        </section>
      )}
    </article>
  );
}
