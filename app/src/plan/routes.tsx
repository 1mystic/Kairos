import type { RouteObject } from 'react-router';
import { DayPage, PlanPage } from './PlanScreens';

/** Mount inside the authenticated/guest AppLayout route in App.tsx. */
export const planRoutes: RouteObject[] = [
  { path: '/plan', element: <PlanPage /> },
  { path: '/plan/:date', element: <DayPage /> },
];
