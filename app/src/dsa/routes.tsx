import type { RouteObject } from 'react-router';
import { DsaHub } from './DsaHub';
import { ProblemPage } from './ProblemPage';
import { TrackPage } from './TrackPage';

/** Mount inside the AppLayout route in App.tsx (guests and signed-in users). Paths are distinct segments: no precedence clashes. */
export const dsaRoutes: RouteObject[] = [
  { path: '/dsa', element: <DsaHub /> },
  { path: '/dsa/t/:track', element: <TrackPage /> },
  { path: '/dsa/p/:slug', element: <ProblemPage /> },
];
