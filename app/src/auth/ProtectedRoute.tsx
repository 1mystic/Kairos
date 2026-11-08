import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import { useGuest } from '../store/StoreProvider';
import { Spinner } from '../components/ui';

/** A signed-in user with a profile, or a guest. Others go to /signin or /complete-profile. */
export function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const { isGuest } = useGuest();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (user) return profile ? <Outlet /> : <Navigate to="/complete-profile" replace />;
  if (isGuest) return <Outlet />;
  return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
}

/** `/`: the app for signed-in users and guests, otherwise `fallback` (the public entry). */
export function HomeGate({ app, fallback }: { app: ReactNode; fallback: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const { isGuest } = useGuest();
  if (loading) return <Spinner />;
  if (user && !profile) return <Navigate to="/complete-profile" replace />;
  return <>{user || isGuest ? app : fallback}</>;
}

/** For /signin, /signup, /forgot: bounce signed-in users onward. Guests may visit (to sign in). */
export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to={profile ? '/' : '/complete-profile'} replace />;
  return <Outlet />;
}
