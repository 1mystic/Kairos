import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import { Spinner } from '../components/ui';

/** Signed-in users with a profile only. Others go to /signin or /complete-profile. */
export function ProtectedRoute() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (!profile) return <Navigate to="/complete-profile" replace />;
  return <Outlet />;
}

/** For /signin, /signup, /forgot: bounce signed-in users onward. */
export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to={profile ? '/' : '/complete-profile'} replace />;
  return <Outlet />;
}
