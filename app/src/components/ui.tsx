import {
  Children, Fragment, useEffect, useId, useRef,
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

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-s4">
      <div className="min-w-0 space-y-s1">
        <h1 className="text-h1">{title}</h1>
        {subtitle && <p className="text-body text-slate">{subtitle}</p>}
      </div>
      {actions && <div className="row gap-tight">{actions}</div>}
    </header>
  );
}

/** Titled block of a page. Content sits 16px under the heading. */
export function Section({ title, aside, children, label }: { title?: string; aside?: ReactNode; children: ReactNode; label?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={title ? id : undefined} aria-label={title ? undefined : label} className="stack gap-base">
      {title && (
        <div className="flex items-baseline justify-between gap-s4">
          <h2 id={id} className="text-h3">{title}</h2>
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

/** Two-column page body: sticky nav on the left from 1024px, main content on the right. */
export function TwoColumnPage({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="twocol">
      {nav}
      <div className="twocol-main">{children}</div>
    </div>
  );
}

/** Titled card of rows. On desktop, sections with active={false} are hidden (tabbed); on mobile all stack. */
export function SettingsSection({ id, title, description, active = true, children }: { id: string; title: string; description?: string; active?: boolean; children: ReactNode }) {
  return (
    <Card as="section" id={id} aria-labelledby={`${id}-h`} className="sec" data-active={active}>
      <div className="stack gap-loose">
        <div className="stack gap-s1">
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

/** One row: label + description left, control right (stacks on phones). */
export function SettingRow({ label, description, children }: { label: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="setting">
      <div className="stack gap-s1">
        <p className="text-body font-semibold">{label}</p>
        {description && <p className="text-small text-slate">{description}</p>}
      </div>
      {children && <div className="row gap-tight">{children}</div>}
    </div>
  );
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

export function Select({ invalid, className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return (
    <span className="relative block">
      <select className={`field-input ${className}`.trim()} aria-invalid={invalid || undefined} {...rest}>{children}</select>
      <ChevronDownIcon className="pointer-events-none absolute right-s4 top-1/2 -translate-y-1/2 text-slate" />
    </span>
  );
}

interface FieldChrome { label: string; error?: string; hint?: string }

function FieldShell({ label, error, hint, id, children }: FieldChrome & { id: string; children: ReactNode }) {
  const msgId = `${id}-msg`;
  return (
    <div className="stack gap-tight">
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
      <Select id={id} invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} {...props}>{children}</Select>
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

export function Card({ tone = 'default', children, className = '', as: Tag = 'div', ...rest }: { tone?: 'default' | 'primary'; children: ReactNode; className?: string; as?: 'div' | 'section' | 'aside' | 'article' } & Record<string, unknown>) {
  return <Tag className={`card${tone === 'primary' ? ' card-primary' : ''} ${className}`.trim()} {...rest}>{children}</Tag>;
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

export function EmptyState({ icon: I = TargetIcon, title, children, action }: { icon?: (p: { className?: string }) => ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="stack items-center gap-base py-s7 text-center">
      <span className="tile-icon !size-s8 !rounded-pill"><I /></span>
      <h2 className="text-h2">{title}</h2>
      {children && <p className="max-w-form text-slate">{children}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stack gap-s1">
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
        <Link to="/" aria-label="Kairos home" className="self-start lg:hidden"><Logo /></Link>
        <header className="stack gap-tight">
          <h1 className="text-h1">{title}</h1>
          {subtitle && <p className="text-body text-slate">{subtitle}</p>}
        </header>
        {children}
        {footer && <p className="text-center text-small text-slate">{footer}</p>}
      </main>
      <aside className="auth-brand" aria-hidden="true">
        <Link to="/" tabIndex={-1}><Logo /></Link>
        <div className="stack gap-loose">
          <p className="text-display font-bold">The right question, at the right time.</p>
          <ul className="stack gap-base">
            {PITCH.map((p) => (
              <li key={p} className="row gap-s3 text-body font-medium"><span className="tile-icon !mb-0 !bg-surface"><CheckIcon /></span>{p}</li>
            ))}
          </ul>
        </div>
        <p className="text-small text-slate">JEE Main · NEET UG · IAT</p>
      </aside>
    </div>
  );
}
