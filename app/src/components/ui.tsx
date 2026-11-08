import {
  Children, Fragment, useEffect, useId, useLayoutEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router';
import { AlertIcon, ArrowRightIcon, CheckIcon, ChevronDownIcon, CloseIcon, InfoIcon, TargetIcon } from './icons';

/* ------------------------------------------------------------------ layout primitives */

export type Gap = 'tight' | 'base' | 'loose' | 'section';

/** Page wrapper: one gutter, one max width per layout type, one rhythm between blocks (32px). */
export function Page({ width = 'app', children, className = '' }: { width?: 'app' | 'reading' | 'form'; children: ReactNode; className?: string }) {
  return <main className={`page page-${width} ${className}`}>{children}</main>;
}

/** Every page starts with this: h1 (28px) + optional subtitle left, actions right (full-width stacked on phones), 32px to the first block. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <h1 className="text-h1">{title}</h1>
        {subtitle && <p className="text-body text-slate">{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  );
}

/** Titled block of a page (h2, 22px). Content sits 16px under the heading; blocks are 32px apart. */
export function Section({ title, aside, children, label }: { title?: string; aside?: ReactNode; children: ReactNode; label?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={title ? id : undefined} aria-label={title ? undefined : label} className="stack-card">
      {title && (
        <div className="row-between">
          <h2 id={id} className="text-h2">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stack({ gap = 'base', children, className = '' }: { gap?: Gap; children: ReactNode; className?: string }) {
  return <div className={`stack gap-${gap} ${className}`}>{children}</div>;
}

export function Inline({ gap = 'tight', children, className = '' }: { gap?: Gap; children: ReactNode; className?: string }) {
  return <div className={`row gap-${gap} ${className}`}>{children}</div>;
}

/** The only divider: a 1px tinted rule. Prefer whitespace. */
export function Divider() {
  return <hr />;
}

/** Wide-screen dashboard: 6-column grid. Children opt in with className dash-hero (4 cols, 3 rows from lg), dash-third, dash-half. */
export function DashboardGrid({ children }: { children: ReactNode }) {
  return <div className="dash">{children}</div>;
}

export interface SideNavItem { id: string; label: string; soon?: boolean }

/** Sticky left nav (hidden below 1024px, where sections simply stack). Pass `onSelect` for in-page tabs, omit it for #anchor links. */
export function StickySideNav({ items, active, onSelect, label }: { items: readonly SideNavItem[]; active?: string; onSelect?(id: string): void; label: string }) {
  return (
    <nav aria-label={label} className="sidenav">
      {items.map((it) =>
        it.soon ? (
          <span key={it.id} className="nav-item" aria-disabled="true">{it.label}<span className="ml-auto"><Chip>soon</Chip></span></span>
        ) : onSelect ? (
          <button key={it.id} type="button" className="nav-item justify-start" aria-current={active === it.id ? 'page' : undefined} onClick={() => onSelect(it.id)}>{it.label}</button>
        ) : (
          <a key={it.id} href={`#${it.id}`} className="nav-item justify-start" aria-current={active === it.id ? 'page' : undefined}>{it.label}</a>
        ),
      )}
    </nav>
  );
}

export type ColumnRatio = 'main-side' | 'side-main';

/**
 * The two named page column ratios. `main-side` = 2fr / 1fr (content + aside, e.g. upload steps + preview),
 * `side-main` = 1fr / 2fr (nav + content, e.g. settings). Tops align; the side stays sticky under `--sticky-top`.
 * `side` is hidden below 1024px when `sideFrom="lg"` (sticky navs), otherwise it stacks under the main column.
 */
export function Columns({ ratio = 'main-side', side, sideFrom = 'always', sticky = true, children }: { ratio?: ColumnRatio; side: ReactNode; sideFrom?: 'always' | 'lg'; sticky?: boolean; children: ReactNode }) {
  return (
    <div className={`cols cols-${ratio}`}>
      <div className="cols-main">{children}</div>
      <aside className={`cols-side${sideFrom === 'lg' ? ' cols-side-lg' : ''}${sticky ? ' cols-sticky' : ''}`}>{side}</aside>
    </div>
  );
}

/** Sticky nav (left, 1fr) + main content (right, 2fr) from 1024px; on smaller screens the nav is hidden and sections stack. */
export function TwoColumnPage({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return <Columns ratio="side-main" side={nav} sideFrom="lg">{children}</Columns>;
}

/**
 * Paired columns template (landing sections, hero, any text + media pair). Both columns share ONE width ratio
 * (`equal` 1fr/1fr by default, or the named 2fr/1fr, 1fr/2fr), ONE vertical alignment (`center`, or `stretch` when both are cards),
 * the same gap, and `reverse` swaps the sides without changing widths. Stacks below 1024px in DOM order.
 */
export function TwoPane({ ratio = 'equal', align = 'center', reverse, children, className = '' }: { ratio?: 'equal' | ColumnRatio; align?: 'center' | 'stretch'; reverse?: boolean; children: ReactNode; className?: string }) {
  return <div className={`twopane twopane-${ratio} twopane-${align}${reverse ? ' twopane-reverse' : ''} ${className}`.trim()}>{children}</div>;
}

/**
 * Equal-width, equal-height cards in a row. `cols` is the maximum (1 | 2 | 3 | 4); columns drop with the CONTAINER width
 * (2 from 576px, 3 from 832px, 4 from 1024px), and an orphan card spans the rest of the last row (pure CSS, one rule set).
 * `dense` is for tile grids inside a card (2 columns always, 4 from 448px; use with `gap="tight"`).
 * `cols="auto"` for lists of unknown length of small tiles. Use this instead of raw grid-cols / flex-wrap in pages.
 */
export function CardGrid({ cols = 3, gap = 'grid', dense, as: Tag = 'div', children, className = '', ...rest }: { cols?: 1 | 2 | 3 | 4 | 'auto'; gap?: 'grid' | 'tight'; dense?: boolean; as?: 'div' | 'ul' | 'ol'; children: ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <div className="cg-box">
      <Tag className={`cg ${cols === 'auto' ? 'cg-auto' : `cg-${cols}`}${gap === 'tight' ? ' cg-tight' : ''}${dense ? ' cg-dense' : ''} ${className}`.trim()} {...rest}>{children}</Tag>
    </div>
  );
}

/** 12-column span grid for cards that choose their own width (dashboard). `spanClass(6)` / `spanClass(12)` on children; `narrow` forces one column. */
export function SpanGrid({ narrow, children, className = '', ...rest }: { narrow?: boolean; children: ReactNode; className?: string } & Record<string, unknown>) {
  return <div className={`spangrid${narrow ? ' spangrid-narrow' : ''} ${className}`.trim()} {...rest}>{children}</div>;
}
export const spanClass = (n: 6 | 12) => (n === 6 ? 'span-6' : 'span-12');

/** Titled card of rows (h2 22px). On desktop, sections with active={false} are hidden (tabbed); on mobile all stack. */
export function SettingsSection({ id, title, description, active = true, children }: { id: string; title: string; description?: string; active?: boolean; children: ReactNode }) {
  return (
    <Card as="section" id={id} aria-labelledby={`${id}-h`} className="sec" data-active={active}>
      <div className="stack-card">
        <div className="stack-text">
          <h2 id={`${id}-h`} className="text-h2">{title}</h2>
          {description && <p className="text-small text-slate">{description}</p>}
        </div>
        {Children.toArray(children).map((c, i) => (
          <Fragment key={i}>{i > 0 && <Divider />}{c}</Fragment>
        ))}
      </div>
    </Card>
  );
}

/**
 * THE row anatomy: optional lead icon | title + description | trailing meta/controls. 56px min height, 16px gaps.
 * Used by settings, activity, review and list screens so rows never differ in height or padding.
 */
export function ListRow({ lead, title, description, children, className = '', titleClass = 'text-body font-semibold' }: { lead?: ReactNode; title: ReactNode; description?: ReactNode; children?: ReactNode; className?: string; titleClass?: string }) {
  return (
    <div className={`lrow ${className}`.trim()}>
      {lead && <span className="lrow-lead">{lead}</span>}
      <div className="lrow-body">
        <p className={titleClass}>{title}</p>
        {description && <p className="text-small text-slate">{description}</p>}
      </div>
      {children && <div className="lrow-trail">{children}</div>}
    </div>
  );
}

/** One settings row: label + description left, control right (stacks on phones). A ListRow. */
export function SettingRow({ label, description, children }: { label: string; description?: ReactNode; children?: ReactNode }) {
  return <ListRow title={label} description={description} className="lrow-setting">{children}</ListRow>;
}

/* ------------------------------------------------------------------ brand + status */

export function Spinner() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center text-slate">
      <span className="row gap-s3"><span className="text-primary"><BtnSpinner /></span> Loading…</span>
    </div>
  );
}

export function Logo({ className = 'h-8' }: { className?: string }) {
  return <img src="/logo.svg" alt="Kairos" className={className} />;
}

/** Mark + "Kairos" wordmark in live text (theme-aware ink: readable on every tint, unlike the raster/svg wordmark). */
export function Brand({ className = '' }: { className?: string }) {
  return <span className={`row-inline ${className}`.trim()}><LogoMark /><span className="text-h3 font-bold text-ink">Kairos</span></span>;
}

export function LogoMark({ className = 'size-s6' }: { className?: string }) {
  return <img src="/logo-mark.svg" alt="" aria-hidden="true" className={className} />;
}

/* ------------------------------------------------------------------ buttons */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';
const btnClass = (variant: Variant, size: Size, block?: boolean, extra = '') =>
  `btn btn-${variant}${size === 'md' ? '' : ` btn-${size}`}${block ? ' btn-block' : ''} ${extra}`.trim();

function BtnSpinner() {
  return (
    <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3a9 9 0 0 1 9 9" />
    </svg>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** shows a spinner and disables the button; the label stays for screen readers */
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', block, loading, disabled, className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={btnClass(variant, size, block, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <BtnSpinner />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'primary', size = 'md', block, className = '', ...rest }: LinkProps & { variant?: Variant; size?: Size; block?: boolean }) {
  return <Link className={btnClass(variant, size, block, className)} {...rest} />;
}

export function IconButton({ label, children, variant = 'secondary', className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }) {
  return (
    <button type={type} aria-label={label} className={`btn btn-${variant} btn-icon ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ fields */

type Invalid = { invalid?: boolean };

export function Input({ invalid, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & Invalid) {
  return <input className={`field-input ${className}`.trim()} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({ invalid, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return <textarea className={`field-input ${className}`.trim()} aria-invalid={invalid || undefined} {...rest} />;
}

interface SelItem { kind: 'option' | 'group'; value: string; label: string; disabled?: boolean }

function readItems(sel: HTMLSelectElement): SelItem[] {
  const out: SelItem[] = [];
  for (const c of Array.from(sel.children)) {
    if (c instanceof HTMLOptGroupElement) {
      out.push({ kind: 'group', value: '', label: c.label });
      for (const o of Array.from(c.children)) if (o instanceof HTMLOptionElement) out.push({ kind: 'option', value: o.value, label: o.text, disabled: o.disabled || c.disabled });
    } else if (c instanceof HTMLOptionElement) out.push({ kind: 'option', value: c.value, label: c.text, disabled: c.disabled });
  }
  return out;
}

/**
 * Custom dropdown with the exact `<select>` API (value / defaultValue / onChange(e) / children `<option>` + `<optgroup>`).
 * A visually hidden native select stays in the DOM as the source of truth (forms, tests, label association); the visible
 * control is a flat tinted combobox button + listbox popover: arrows, Home/End, type-ahead, Enter/Space, Esc, Tab, outside
 * click, flips above near the viewport bottom, 44px rows. Same UI on touch (decision: no native fallback, so phones and
 * desktops look and behave alike; rows are 44px and the list scrolls).
 */
export function Select({ invalid, className = '', children, triggerLabel, onChange, onFocus, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Invalid & { triggerLabel?: string }) {
  const native = useRef<HTMLSelectElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLSpanElement>(null);
  const listId = useId();
  const nameId = `${listId}-name`;
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [items, setItems] = useState<SelItem[]>([]);
  const [active, setActive] = useState(-1);
  const [text, setText] = useState('');
  const typed = useRef({ s: '', t: 0 });
  const name = triggerLabel ?? (rest['aria-label'] as string | undefined);

  // runs after every render on purpose: the native select is the source of truth for the displayed text
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = native.current;
    if (el) setText(el.selectedOptions[0]?.text ?? '');
  });

  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus(); };
  const openList = (at?: 'first' | 'last') => {
    const el = native.current;
    if (!el || rest.disabled) return;
    const its = readItems(el);
    setItems(its);
    const sel = its.findIndex((i) => i.kind === 'option' && i.value === el.value);
    const first = its.findIndex((i) => i.kind === 'option' && !i.disabled);
    const last = its.map((i) => i.kind === 'option' && !i.disabled).lastIndexOf(true);
    setActive(at === 'first' ? first : at === 'last' ? last : sel >= 0 ? sel : first);
    const r = btn.current?.getBoundingClientRect();
    if (r) { const below = window.innerHeight - r.bottom; setUp(below < 300 && r.top > below); }
    setOpen(true);
  };
  const choose = (i: number) => {
    const it = items[i];
    const el = native.current;
    if (!it || it.kind !== 'option' || it.disabled || !el) return;
    if (el.value !== it.value) { el.value = it.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
    close();
  };
  const step = (from: number, d: 1 | -1) => {
    for (let i = from + d; i >= 0 && i < items.length; i += d) if (items[i]!.kind === 'option' && !items[i]!.disabled) return i;
    return from;
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, listId]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') { e.preventDefault(); openList(); }
      else if (k === 'Home') { e.preventDefault(); openList('first'); }
      else if (k === 'End') { e.preventDefault(); openList('last'); }
      return;
    }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (k === 'Tab') setOpen(false);
    else if (k === 'ArrowDown') { e.preventDefault(); setActive((a) => step(a, 1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive((a) => step(a, -1)); }
    else if (k === 'Home') { e.preventDefault(); setActive(step(-1, 1)); }
    else if (k === 'End') { e.preventDefault(); setActive(step(items.length, -1)); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(active); }
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      typed.current = { s: now - typed.current.t > 600 ? k.toLowerCase() : typed.current.s + k.toLowerCase(), t: now };
      const q = typed.current.s;
      const order = [...items.keys()];
      const from = q.length === 1 ? active + 1 : active;
      const hit = [...order.slice(from), ...order.slice(0, from)].find((i) => items[i]!.kind === 'option' && !items[i]!.disabled && items[i]!.label.toLowerCase().startsWith(q));
      if (hit !== undefined) setActive(hit);
    }
  };

  return (
    <span className="sel" ref={root}>
      <select
        ref={native}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onChange}
        onFocus={(e) => { btn.current?.focus(); onFocus?.(e); }}
        {...rest}
      >{children}</select>
      <button
        ref={btn}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-labelledby={name ? nameId : undefined}
        aria-describedby={rest['aria-describedby']}
        disabled={rest.disabled}
        className={`field-input sel-trigger ${className}`.trim()}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKey}
      >
        {name && <span id={nameId} className="sr-only">{name}: {text}</span>}
        <span className="sel-value" aria-hidden={name ? true : undefined}>{text}</span>
        <ChevronDownIcon className="shrink-0 text-slate" />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={name} className={`sel-list${up ? ' sel-up' : ''}`} onMouseDown={(e) => e.preventDefault()}>
          {items.map((it, i) =>
            it.kind === 'group' ? (
              <li key={i} role="presentation" className="sel-group">{it.label}</li>
            ) : (
              <li
                key={i}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={it.value === native.current?.value}
                aria-disabled={it.disabled || undefined}
                data-active={i === active}
                className="sel-opt"
                onMouseMove={() => { if (!it.disabled && active !== i) setActive(i); }}
                onClick={() => choose(i)}
              >
                <span className="min-w-0">{it.label}</span>
                {it.value === native.current?.value && <CheckIcon width={20} height={20} className="shrink-0 text-primary" />}
              </li>
            ),
          )}
        </ul>
      )}
    </span>
  );
}

interface FieldChrome { label: string; error?: string; hint?: string }

function FieldShell({ label, error, hint, id, children }: FieldChrome & { id: string; children: ReactNode }) {
  const msgId = `${id}-msg`;
  return (
    <div className="stack-label">
      <label htmlFor={id} className="text-small font-semibold">{label}</label>
      {children}
      {(error || hint) && (
        <p id={msgId} className={`flex items-start gap-s2 text-small ${error ? 'text-accent-ink' : 'text-slate'}`} role={error ? 'alert' : undefined}>
          {error && <AlertIcon width={16} height={16} className="mt-s1 shrink-0" />}
          <span>{error ?? hint}</span>
        </p>
      )}
    </div>
  );
}

/** Label + filled input + hint/error (accent-ink text with an icon). */
export function Field({ label, error, hint, ...props }: FieldChrome & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <Input id={id} invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} {...props} />
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, children, ...props }: FieldChrome & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <Select id={id} triggerLabel={label} invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} {...props}>{children}</Select>
    </FieldShell>
  );
}

export function TextareaField({ label, error, hint, ...props }: FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <Textarea id={id} invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} {...props} />
    </FieldShell>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="banner banner-accent">
      <AlertIcon width={20} height={20} className="shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ surfaces */

/**
 * Flex-column surface with ONE padding (16 / 24 from md). Never add p-* / gap-* to a Card: use `footer` to pin an action to
 * the bottom edge so cards in a row end on the same line. Titles: `<h3 className="text-h3">`.
 */
export function Card({ tone = 'default', children, footer, className = '', as: Tag = 'div', ...rest }: { tone?: 'default' | 'primary'; children: ReactNode; footer?: ReactNode; className?: string; as?: 'div' | 'section' | 'aside' | 'article' } & Record<string, unknown>) {
  return (
    <Tag className={`card${tone === 'primary' ? ' card-primary' : ''} ${className}`.trim()} {...rest}>
      {children}
      {footer && <div className="card-footer">{footer}</div>}
    </Tag>
  );
}

/** Clickable card with an icon. Renders a link when `to` is set, a button when `onClick`, a muted block when `soon`. */
export function Tile({ title, body, icon: I, to, onClick, soon }: { title: string; body?: string; icon?: (p: { className?: string }) => ReactNode; to?: string; onClick?: () => void; soon?: boolean }) {
  const inner = (
    <>
      {I && <span className="tile-icon"><I /></span>}
      <span className="row justify-between gap-s2">
        <span className="text-body font-semibold">{title}</span>
        {soon ? <Chip>soon</Chip> : <ArrowRightIcon width={20} height={20} className="text-primary" />}
      </span>
      {body && <span className="text-small text-slate">{body}</span>}
    </>
  );
  if (soon || (!to && !onClick)) return <div className="tile tile-muted">{inner}</div>;
  if (to) return <Link to={to} className="tile">{inner}</Link>;
  return <button type="button" className="tile text-left" onClick={onClick}>{inner}</button>;
}

export function Chip({ tone = 'neutral', icon, children }: { tone?: 'neutral' | 'primary' | 'accent'; icon?: ReactNode; children: ReactNode }) {
  return <span className={`chip${tone === 'neutral' ? '' : ` chip-${tone}`}`}>{icon}{children}</span>;
}
export const Pill = Chip;

/** Segmented control. Arrow keys move selection. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly { id: T; label: string }[]; value: T; onChange(id: T): void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + tabs.length) % tabs.length;
    onChange(tabs[n]!.id);
    refs.current[n]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="tabs">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          type="button"
          className="tab"
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => move(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ overlays */

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Dialog / bottom sheet. Traps focus, Esc and scrim click close, restores focus. */
export function Modal({ title, children, onClose, dismissLabel = 'Close' }: { title: string; children: ReactNode; onClose(): void; dismissLabel?: string }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; prev?.focus?.(); };
  }, []);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className="sheet stack gap-base" onKeyDown={onKey}>
        <div className="flex items-start justify-between gap-s3">
          <h2 id={id} className="text-h2">{title}</h2>
          <IconButton label={dismissLabel} variant="ghost" onClick={onClose}><CloseIcon /></IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
export const Sheet = Modal;

/** Small dismissable message pinned to the bottom of the screen. */
export function Toast({ children, onClose }: { children: ReactNode; onClose(): void }) {
  return (
    <div role="status" className="toast">
      <InfoIcon className="mt-s1 shrink-0 text-accent" width={20} height={20} />
      <p className="min-w-0 flex-1">{children}</p>
      <button type="button" aria-label="Dismiss" className="shrink-0" onClick={onClose}><CloseIcon width={20} height={20} /></button>
    </div>
  );
}
export const Notice = Toast;

/** Soft tinted strip for page-level messages. */
export function Banner({ tone = 'primary', icon, children, actions, role = 'note' }: { tone?: 'primary' | 'accent'; icon?: ReactNode; children: ReactNode; actions?: ReactNode; role?: string }) {
  return (
    <aside role={role} className={`banner${tone === 'accent' ? ' banner-accent' : ''}`}>
      {icon ?? <InfoIcon className="shrink-0" />}
      <div className="min-w-0 flex-1 basis-48">{children}</div>
      {actions && <div className="row gap-tight">{actions}</div>}
    </aside>
  );
}

export function ProgressBar({ value, max = 1, label }: { value: number; max?: number; label: string }) {
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="progress">
      <span style={{ transform: `scaleX(${frac})` }} />
    </div>
  );
}

export function Skeleton({ className = 'h-s5 w-full' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Card-shaped placeholders in the same CardGrid the loaded content uses, so nothing jumps. */
export function SkeletonCards({ count = 3, cols = 3 }: { count?: number; cols?: 1 | 2 | 3 | 4 }) {
  return (
    <CardGrid cols={cols} aria-busy="true">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="skeleton-card" />)}
    </CardGrid>
  );
}

/** Row-shaped placeholders (lists). */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="stack-card" aria-busy="true">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="skeleton-row" />)}
    </div>
  );
}

/** Full-page loading state: a real PageHeader-sized title block plus card placeholders. */
export function PageSkeleton({ width = 'app', cards = 3, cols = 3 }: { width?: 'app' | 'reading' | 'form'; cards?: number; cols?: 1 | 2 | 3 | 4 }) {
  return (
    <Page width={width}>
      <div className="page-head"><div className="page-head-text"><Skeleton className="h-s7 w-64 max-w-full" /><Skeleton className="h-s5 w-96 max-w-full" /></div></div>
      <SkeletonCards count={cards} cols={cols} />
    </Page>
  );
}

/** Empty / error block: one tinted surface, centred, 64px icon, title (h2), one sentence, one action. */
export function EmptyState({ icon: I = TargetIcon, title, children, action }: { icon?: (p: { className?: string }) => ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon"><I /></span>
      <h2 className="text-h2">{title}</h2>
      {children && <p className="max-w-form text-slate">{children}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stack-text">
      <span className="text-caption font-semibold uppercase tracking-wide text-slate">{label}</span>
      <span className="text-h1 tabular">{value}</span>
      {hint && <span className="text-small text-slate">{hint}</span>}
    </div>
  );
}

/** Done / not-done word + icon status line (no green/red). */
export function StatusLine({ done, children }: { done: boolean; children: ReactNode }) {
  return <span className={`row gap-tight text-small ${done ? 'text-primary' : 'text-accent-ink'}`}>{done ? <CheckIcon width={16} height={16} /> : <AlertIcon width={16} height={16} />}{children}</span>;
}

/* ------------------------------------------------------------------ auth shell */

const PITCH = ['A plan counted back from your exam date', 'Practice on a real exam-style screen', 'Free to start. No sign-in needed'];

/** Auth page: calm centred form; two panes from 1024px with the brand panel on the right in primary-50. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth">
      <main className="auth-main">
        <div className="auth-col">
          <Link to="/" aria-label="Kairos home" className="self-start lg:hidden"><Brand /></Link>
          <header className="stack-text">
            <h1 className="text-h1">{title}</h1>
            {subtitle && <p className="text-body text-slate">{subtitle}</p>}
          </header>
          {children}
          {footer && <p className="text-center text-small text-slate">{footer}</p>}
        </div>
      </main>
      <aside className="auth-brand" aria-hidden="true">
        <div className="auth-col auth-brand-col">
          <Link to="/" tabIndex={-1}><Brand /></Link>
          <p className="auth-headline text-display font-bold">The right question, at the right time.</p>
          <ul className="stack-card">
            {PITCH.map((p) => (
              <li key={p} className="row-inline text-body font-medium"><span className="tile-icon !mb-0 !bg-surface"><CheckIcon /></span>{p}</li>
            ))}
          </ul>
          <p className="text-small text-slate">JEE Main · NEET UG · IAT</p>
        </div>
      </aside>
    </div>
  );
}
