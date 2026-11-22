import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, type SVGProps } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { friendlyAuthError } from '../auth/errors';
import { Banner, LogoMark } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  CalendarIcon, ChartIcon, CodeIcon, HomeIcon, LogOutIcon, MockIcon, PlanIcon, PracticeIcon, SettingsIcon, UploadIcon, UserIcon,
} from '../components/icons';
import { ExamSwitcher } from '../exams/ExamSwitcher';
import { useActiveExam } from '../exams/useActiveExam';
import { useGuest } from '../store/StoreProvider';
import { SITE_NAME } from '../shell/useDocumentTitle';

type IconC = ComponentType<SVGProps<SVGSVGElement>>;
interface NavEntry { to: string; label: string; icon: IconC; tab?: boolean; /** extra path prefixes that keep this entry active */ also?: string[] }

/** Every built route. `tab` entries go in the mobile tab bar (4 slots); the rest are in the sidebar and, on phones, the account menu. */
export const NAV: NavEntry[] = [
  { to: '/', label: 'Home', icon: HomeIcon, tab: true },
  { to: '/practice', label: 'Practice', icon: PracticeIcon, tab: true },
  { to: '/mocks', label: 'Mocks', icon: MockIcon, tab: true, also: ['/exam'] },
  { to: '/dsa', label: 'DSA', icon: CodeIcon },
  { to: '/upload', label: 'Upload', icon: UploadIcon },
  { to: '/analysis', label: 'Analysis', icon: ChartIcon },
  { to: '/plan', label: 'Plan', icon: PlanIcon },
  { to: '/roadmap', label: 'Roadmap', icon: CalendarIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, tab: true },
];

function isActive(entry: NavEntry, pathname: string): boolean {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  return entry.to === '/' ? pathname === '/' : under(entry.to) || !!entry.also?.some(under);
}

function NavItem({ entry, className, children }: { entry: NavEntry; className: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <Link to={entry.to} className={className} aria-current={isActive(entry, pathname) ? 'page' : undefined} title={entry.label} aria-label={entry.label}>
      {children}
    </Link>
  );
}

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
  const [pos, setPos] = useState<CSSProperties | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  /** The sidebar scrolls, so an absolutely placed menu is clipped at its edge: in the sidebar, pin it to the viewport above the button. */
  const toggle = () => {
    if (!open && up && box.current) {
      const r = box.current.getBoundingClientRect();
      const rail = box.current.closest('.sidebar')?.getBoundingClientRect();
      const left = rail ? rail.left + 12 : r.left;
      setPos({ position: 'fixed', left, bottom: window.innerHeight - r.top + 8, width: Math.max(240, (rail ? rail.width - 24 : r.width)) });
    }
    setOpen(!open);
  };
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
      <button type="button" aria-label={up ? `Account: ${label}` : undefined} className="btn btn-secondary max-w-48" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <UserIcon width={20} height={20} className="shrink-0" />
        <span className={up ? 'side-only-wide truncate' : 'truncate'}>{label}</span>
      </button>
      {open && (
        <div role="menu" className={up ? 'menu' : 'menu right-0 mt-s2'} style={up ? pos : undefined}>
          <p className="menu-note truncate text-small text-slate">{isGuest ? 'Saved on this device only' : user?.email}</p>
          {isGuest && <Link role="menuitem" to="/signin" className="menu-item text-primary" onClick={() => setOpen(false)}><UserIcon width={20} height={20} />Sign in to save progress</Link>}
          {up ? null : NAV.filter((n) => !n.tab).map(({ to, label, icon: I }) => (
            <Link key={to} role="menuitem" to={to} className="menu-item" onClick={() => setOpen(false)}><I width={20} height={20} />{label}</Link>
          ))}
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
      {NAV.map((entry) => (
        <NavItem key={entry.to} entry={entry} className="nav-item"><entry.icon /><span className="nav-label">{entry.label}</span></NavItem>
      ))}
    </nav>
  );
}

function TabBar() {
  return (
    <nav aria-label="Main" className="tabbar">
      {NAV.filter((n) => n.tab).map((entry) => (
        <NavItem key={entry.to} entry={entry} className="tabbar-item"><entry.icon />{entry.label}</NavItem>
      ))}
    </nav>
  );
}

/**
 * The page area. Switching the active exam remounts the page (new key), so every screen re-reads the profile and follows the new
 * exam without a reload. A running exam or practice session is never remounted: its URL keeps the key fixed.
 */
function ExamKeyedOutlet() {
  const { activeExam } = useActiveExam();
  const { pathname } = useLocation();
  const prev = useRef<string | null>(null);
  const [gen, setGen] = useState(0);
  // only a real switch (one exam to another) remounts; the first load of the profile does not
  useEffect(() => {
    if (!activeExam) return;
    if (prev.current && prev.current !== activeExam) setGen((g) => g + 1);
    prev.current = activeExam;
  }, [activeExam]);
  const running = pathname.startsWith('/exam/') || /^\/practice\/[^/]+\/[^/]+/.test(pathname) || pathname.startsWith('/practice/today');
  return <Outlet key={running ? 'running' : `exam-${gen}`} />;
}

/** App chrome: top bar + bottom tab bar on mobile, slim left sidebar from 1024px. */
export function AppLayout() {
  const { user, resendVerification } = useAuth();
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState('');
  const wide = useWide();
  const { pathname } = useLocation();
  const main = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  // Move focus to the page heading (or the content area) after navigating, for keyboard and screen-reader users.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const target = main.current?.querySelector<HTMLElement>('h1') ?? main.current;
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [pathname]);
  // Pages set their own title with useDocumentTitle; this is the fallback for those that do not.
  useEffect(() => { if (!document.title) document.title = SITE_NAME; }, [pathname]);
  const skip = (e: ReactMouseEvent<HTMLAnchorElement>) => { e.preventDefault(); main.current?.focus(); };
  return (
    <div className={`shell${wide ? ' shell-wide' : ''}`}>
      <a href="#main" onClick={skip} className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-s3 focus:top-s3 focus:z-50">Skip to content</a>
      {wide ? (
        <aside className="sidebar">
          <Link to="/" aria-label="Kairos home" className="brand"><LogoMark /><span className="brand-text"><span className="text-h3 font-bold">Kairos</span><span className="text-caption text-slate">The right question, at the right time</span></span></Link>
          <ExamSwitcher variant="sidebar" />
          <SidebarNav />
          <div className="mt-auto stack items-center gap-tight xl:flex-row xl:justify-between"><AccountMenu up /><ThemeToggle /></div>
        </aside>
      ) : (
        <header className="topbar">
          <Link to="/" aria-label="Kairos home" className="row-inline"><LogoMark /><span className="text-h3 font-bold text-ink">Kairos</span></Link>
          <div className="row-inline"><ExamSwitcher variant="topbar" /><ThemeToggle /><AccountMenu /></div>
        </header>
      )}
      <div className="shell-main" id="main" tabIndex={-1} ref={main}>
        {user && !user.emailVerified && (
          <div className="page page-app page-lead">
            <Banner role="status" actions={resent ? undefined : <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setResendError(''); resendVerification().then(() => setResent(true), (e) => setResendError(friendlyAuthError(e))); }}>Resend</button>}>
              Please verify your email. We sent a link to {user.email}. {resent && 'Sent again.'}
              {resendError && <span role="alert" className="block text-small text-status-bad">{resendError}</span>}
            </Banner>
          </div>
        )}
        <ExamKeyedOutlet />
      </div>
      {!wide && <TabBar />}
    </div>
  );
}
