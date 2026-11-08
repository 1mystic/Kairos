import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertIcon, CloseIcon, InfoIcon } from './icons';

export function Spinner() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center text-slate">
      Loading…
    </div>
  );
}

export function Logo({ className = 'h-8' }: { className?: string }) {
  return <img src="/logo.svg" alt="Kairos" className={className} />;
}

export function Field({ label, error, hint, ...props }: { label: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? msgId : undefined}
        {...props}
      />
      {(error || hint) && (
        <p id={msgId} className={`flex items-start gap-1.5 text-sm ${error ? 'text-accent-ink' : 'text-slate'}`} role={error ? 'alert' : undefined}>
          {error && <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />}
          <span>{error ?? hint}</span>
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-btn border border-accent bg-accent-50 p-3 text-sm text-accent-ink">
      <AlertIcon width={18} height={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <Link to="/" aria-label="Kairos home"><Logo /></Link>
      <div className="card space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl">{title}</h1>
          {subtitle && <p className="text-slate">{subtitle}</p>}
        </header>
        {children}
      </div>
      {footer && <p className="text-center text-sm text-slate">{footer}</p>}
    </main>
  );
}

/** Centered dialog. Always has a way out (Escape, backdrop, and the dismiss button). */
export function Modal({ title, children, onClose, dismissLabel = 'Close' }: { title: string; children: ReactNode; onClose(): void; dismissLabel?: string }) {
  const id = useId();
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-4 sm:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="card w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={id} className="text-lg">{title}</h2>
          <button type="button" aria-label={dismissLabel} className="text-slate" onClick={onClose}><CloseIcon width={18} height={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Small dismissable message pinned to the bottom of the screen. */
export function Notice({ children, onClose }: { children: ReactNode; onClose(): void }) {
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-card border border-line bg-surface p-4 text-sm shadow-sm">
      <InfoIcon className="mt-0.5 shrink-0 text-primary" />
      <p className="flex-1">{children}</p>
      <button type="button" aria-label="Dismiss" className="text-slate" onClick={onClose}><CloseIcon width={18} height={18} /></button>
    </div>
  );
}
