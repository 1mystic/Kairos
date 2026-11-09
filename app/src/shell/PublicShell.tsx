import { Link, Outlet } from 'react-router';
import { LinkButton, LogoMark } from '../components/ui';

/** Plain chrome for visitors (not signed in, not guest) on routes like the 404 page. */
export function PublicShell() {
  return (
    <>
      <header className="topbar">
        <Link to="/" aria-label="Kairos home" className="row-inline"><LogoMark /><span className="text-h3 font-bold text-ink">Kairos</span></Link>
        <LinkButton to="/signin" variant="ghost" size="sm">Sign in</LinkButton>
      </header>
      <Outlet />
    </>
  );
}
