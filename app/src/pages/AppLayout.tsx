import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Banner, Chip, LogoMark } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  ChartIcon, HomeIcon, LogOutIcon, MockIcon, PlanIcon, PracticeIcon, SettingsIcon, UploadIcon, UserIcon,
} from '../components/icons';
import { useGuest } from '../store/StoreProvider';

type IconC = ComponentType<SVGProps<SVGSVGElement>>;
interface NavEntry { to: string; label: string; icon: IconC; built: boolean; tab?: boolean }

/** `built: false` entries are shown muted with a "soon" pill and are not links. */
export const NAV: NavEntry[] = [
  { to: '/', label: 'Home', icon: HomeIcon, built: true, tab: true },
  { to: '/practice', label: 'Practice', icon: PracticeIcon, built: true, tab: true },
  { to: '/mocks', label: 'Mocks', icon: MockIcon, built: true, tab: true },
  { to: '/upload', label: 'Upload', icon: UploadIcon, built: true },
  { to: '/analysis', label: 'Analysis', icon: ChartIcon, built: true },
  { to: '/plan', label: 'Plan', icon: PlanIcon, built: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, built: true, tab: true },
];

function useWide(): boolean {
  const q = '(min-width: 1024px)';
  const get = () => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return wide;
}

function AccountMenu({ up }: { up?: boolean }) {
  const { user, profile } = useAuth();
  const { isGuest, signOutToGuest } = useGuest();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const label = isGuest ? 'Guest' : (profile?.displayName ?? user?.email ?? 'Account');
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="relative" ref={box}>
      <button type="button" aria-label={up ? `Account: ${label}` : undefined} className="btn btn-secondary max-w-48" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <UserIcon width={20} height={20} className="shrink-0" />
        <span className={up ? 'side-only-wide truncate' : 'truncate'}>{label}</span>
      </button>
      {open && (
        <div role="menu" className={`menu ${up ? 'bottom-full left-0 mb-s2' : 'right-0 mt-s2'}`}>
          <p className="menu-note truncate text-small text-slate">{isGuest ? 'Saved on this device only' : user?.email}</p>
          {isGuest && <Link role="menuitem" to="/signin" className="menu-item text-primary" onClick={() => setOpen(false)}><UserIcon width={20} height={20} />Sign in to save progress</Link>}
          <Link role="menuitem" to="/settings" className="menu-item" onClick={() => setOpen(false)}><SettingsIcon width={20} height={20} />Settings</Link>
          {!isGuest && <button role="menuitem" type="button" className="menu-item" onClick={() => void signOutToGuest()}><LogOutIcon width={20} height={20} />Sign out</button>}
        </div>
      )}
    </div>
  );
}

function SidebarNav() {
  return (
    <nav aria-label="Main" className="stack-text">
      {NAV.map(({ to, label, icon: I, built }) =>
        built ? (
          <NavLink key={to} to={to} end={to === '/'} className="nav-item" title={label} aria-label={label}><I /><span className="nav-label">{label}</span></NavLink>
        ) : (
          <span key={to} className="nav-item" aria-disabled="true" title={`${label} (soon)`}><I /><span className="nav-label">{label}</span><span className="side-only-wide ml-auto"><Chip>soon</Chip></span></span>
        ),
      )}
    </nav>
  );
}

function TabBar() {
  return (
    <nav aria-label="Main" className="tabbar">
      {NAV.filter((n) => n.tab).map(({ to, label, icon: I, built }) =>
        built ? (
          <NavLink key={to} to={to} end={to === '/'} className="tabbar-item"><I />{label}</NavLink>
        ) : (
          <span key={to} className="tabbar-item" aria-disabled="true"><I />{label}</span>
        ),
      )}
    </nav>
  );
}

/** App chrome: top bar + bottom tab bar on mobile, slim left sidebar from 1024px. */
export function AppLayout() {
  const { user, resendVerification } = useAuth();
  const [resent, setResent] = useState(false);
  const wide = useWide();
  return (
    <div className={`shell${wide ? ' shell-wide' : ''}`}>
      {wide ? (
        <aside className="sidebar">
          <Link to="/" aria-label="Kairos home" className="brand"><LogoMark /><span className="brand-text"><span className="text-h3 font-bold">Kairos</span><span className="text-caption text-slate">The right question, at the right time</span></span></Link>
          <SidebarNav />
          <div className="mt-auto stack items-center gap-tight xl:flex-row xl:justify-between"><AccountMenu up /><ThemeToggle /></div>
        </aside>
      ) : (
        <header className="topbar">
          <Link to="/" aria-label="Kairos home" className="row-inline"><LogoMark /><span className="text-h3 font-bold text-ink">Kairos</span></Link>
          <div className="row-inline"><ThemeToggle /><AccountMenu /></div>
        </header>
      )}
      <div className="shell-main">
        {user && !user.emailVerified && (
          <div className="page page-app page-lead">
            <Banner role="status" actions={resent ? undefined : <button type="button" className="btn btn-ghost btn-sm" onClick={() => void resendVerification().then(() => setResent(true))}>Resend</button>}>
              Please verify your email. We sent a link to {user.email}. {resent && 'Sent again.'}
            </Banner>
          </div>
        )}
        <Outlet />
      </div>
      {!wide && <TabBar />}
    </div>
  );
}
