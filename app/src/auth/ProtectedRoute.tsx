import { useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import { useGuest } from '../store/StoreProvider';
import { Button, Page, PageHeader, Spinner } from '../components/ui';
import { safeReturnPath } from './validation';

/** Shown when a signed-in account's profile could not be loaded (offline, blip). Never treated as "new account". */
export function ProfileRetry() {
  const { reloadProfile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Page width="reading">
      <PageHeader title="We could not load your account" />
      <p className="text-slate">This is usually a connection problem. Your progress is safe. Check your internet and try again.</p>
      <div className="row-actions">
        <Button loading={busy} onClick={() => { setBusy(true); void (reloadProfile?.() ?? Promise.resolve()).finally(() => setBusy(false)); }}>Try again</Button>
        <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
      </div>
    </Page>
  );
}

/** A signed-in user with a profile, or a guest. Others go to /signin or /complete-profile. */
export function ProtectedRoute() {
  const { user, profile, loading, profileError } = useAuth();
  const { isGuest } = useGuest();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (user) {
    if (profile) return <Outlet />;
    return profileError ? <ProfileRetry /> : <Navigate to="/complete-profile" replace />;
  }
  if (isGuest) return <Outlet />;
  return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
}

/** `/`: the app for signed-in users and guests, otherwise `fallback` (the public entry). */
export function HomeGate({ app, fallback }: { app: ReactNode; fallback: ReactNode }) {
  const { user, profile, loading, profileError } = useAuth();
  const { isGuest } = useGuest();
  if (loading) return <Spinner />;
  if (user && !profile) return profileError ? <ProfileRetry /> : <Navigate to="/complete-profile" replace />;
  return <>{user || isGuest ? app : fallback}</>;
}

/** For /signin, /signup, /forgot: bounce signed-in users onward (back to where they came from). Guests may visit (to sign in). */
export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (user) {
    const from = safeReturnPath((location.state as { from?: unknown } | null)?.from);
    return <Navigate to={profile ? (from ?? '/') : '/complete-profile'} replace />;
  }
  return <Outlet />;
}
