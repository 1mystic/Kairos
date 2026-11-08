import { useState } from 'react';
import { Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Logo } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';

function AccountMenu() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const label = profile?.displayName ?? user?.email ?? 'Account';
  return (
    <div className="relative">
      <button type="button" className="btn btn-secondary max-w-40" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-10 mt-2 w-56 card !p-2">
          <p className="truncate px-3 py-2 text-sm text-slate">{user?.email}</p>
          <button role="menuitem" type="button" className="btn btn-secondary w-full" onClick={() => void signOut()}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, resendVerification } = useAuth();
  const [resent, setResent] = useState(false);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Logo className="h-7" />
          <div className="flex items-center gap-2"><ThemeToggle /><AccountMenu /></div>
        </div>
      </header>
      {user && !user.emailVerified && (
        <div role="status" className="border-b border-line bg-primary-50 px-4 py-2 text-center text-sm">
          Please verify your email. We sent a link to {user.email}.{' '}
          {resent ? 'Sent again.' : (
            <button type="button" className="text-primary underline" onClick={() => void resendVerification().then(() => setResent(true))}>Resend</button>
          )}
        </div>
      )}
      <Outlet />
    </div>
  );
}

export function Home() {
  const { profile } = useAuth();
  const first = profile?.displayName.split(' ')[0];
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {profile?.isMinor && profile.consent.status === 'pending' && (
        <aside className="card border-accent" role="note">
          <h2 className="text-lg">A note for parents and guardians</h2>
          <p className="mt-1 text-slate">Since you are under 18, we will soon ask a parent or guardian to confirm consent. There is nothing to do right now, and you can keep using Kairos.</p>
        </aside>
      )}
      <h1 className="text-2xl">Hi{first ? `, ${first}` : ''}.</h1>
      <section className="card space-y-4" aria-labelledby="today-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="today-h" className="text-lg">Today</h2>
          <span className="text-sm text-slate">Set your exam date to see your countdown.</span>
        </div>
        <dl className="space-y-3 tabular">
          {[
            ['Yesterday', 'Nothing yet. Your first day starts here.'],
            ['Today', 'Your plan will appear once you tell us your exam date.'],
            ['Next mock', 'Scheduled after your plan is set.'],
            ['Predicted', 'Needs a few sessions to estimate.'],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6rem_1fr] gap-2 text-sm">
              <dt className="text-slate">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
