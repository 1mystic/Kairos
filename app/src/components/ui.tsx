import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';

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
        <p id={msgId} className={`text-sm ${error ? 'text-bad' : 'text-slate'}`} role={error ? 'alert' : undefined}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-btn border border-bad p-3 text-sm text-bad">{children}</p>;
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
