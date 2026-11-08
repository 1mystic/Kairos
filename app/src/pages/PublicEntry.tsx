import { Navigate } from 'react-router';

/** What `/` shows to visitors who are neither signed in nor guests. The landing page will replace this. */
export function PublicEntry() {
  return <Navigate to="/signin" replace />;
}
