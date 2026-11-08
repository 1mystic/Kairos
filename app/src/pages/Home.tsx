import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Logo } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { CalendarIcon, ClockIcon, InfoIcon, TargetIcon, UserIcon } from '../components/icons';
import { useGuest } from '../store/StoreProvider';
import { useSignInNudge } from '../store/NudgeProvider';

function AccountMenu() {
  const { user, profile } = useAuth();
  const { isGuest, signOutToGuest } = useGuest();
  const [open, setOpen] = useState(false);
  const label = isGuest ? 'Guest' : (profile?.displayName ?? user?.email ?? 'Account');
  return (
    <div className="relative">
      <button type="button" className="btn btn-secondary max-w-40" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <UserIcon width={18} height={18} className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 z-10 mt-2 w-60 space-y-1 !p-2">
          <p className="truncate px-3 py-2 text-sm text-slate">{isGuest ? 'Saved on this device only' : user?.email}</p>
          {isGuest && <Link role="menuitem" to="/signin" className="btn btn-primary w-full" onClick={() => setOpen(false)}>Sign in to save progress</Link>}
          <Link role="menuitem" to="/settings" className="btn btn-secondary w-full" onClick={() => setOpen(false)}>Settings</Link>
          {!isGuest && <button role="menuitem" type="button" className="btn btn-secondary w-full" onClick={() => void signOutToGuest()}>Sign out</button>}
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
          <Link to="/" aria-label="Kairos home"><Logo className="h-7" /></Link>
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

function GuestBanner() {
  const { bannerVisible, dismissBanner } = useSignInNudge();
  if (!bannerVisible) return null;
  return (
    <aside role="note" className="card flex flex-wrap items-center gap-3 !p-4">
      <InfoIcon className="shrink-0 text-primary" />
      <p className="min-w-48 flex-1 text-sm">Your progress is saved on this device only. Sign in to keep it safe.</p>
      <div className="flex gap-2">
        <Link to="/signin" className="btn btn-primary">Sign in</Link>
        <button type="button" className="btn btn-secondary" onClick={dismissBanner}>Not now</button>
      </div>
    </aside>
  );
}

const TILES = [
  { to: '/practice', title: 'Practice', body: 'A few questions, at your pace.', icon: TargetIcon },
  { to: '/exam/sample_jee_mini_v1', title: 'Sample mock (JEE mini)', body: 'A short timed paper to get the feel.', icon: ClockIcon },
  { to: '/onboarding', title: 'Set exam date', body: 'So we can plan backwards from it.', icon: CalendarIcon },
];

export function Home() {
  const { profile } = useAuth();
  const { isGuest } = useGuest();
  const first = isGuest ? undefined : profile?.displayName.split(' ')[0];
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {isGuest && <GuestBanner />}
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
          <span className="rounded-btn bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-ink">Placeholder data</span>
        </div>
        <p className="text-sm text-slate">Set your exam date to see your countdown.</p>
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
      <section aria-label="Quick start" className="grid gap-3 sm:grid-cols-3">
        {TILES.map(({ to, title, body, icon: I }) => (
          <Link key={to} to={to} className="tile">
            <I className="text-primary" />
            <span className="font-semibold">{title}</span>
            <span className="text-sm text-slate">{body}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

