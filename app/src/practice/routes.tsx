import type { RouteObject } from 'react-router';
import { PracticePicker } from './Picker';
import { SessionScreen } from './SessionScreen';
import { SummaryScreen } from './Summary';

/** Mount inside the authenticated/guest AppLayout route in App.tsx. */
export const practiceRoutes: RouteObject[] = [
  { path: '/practice', element: <PracticePicker /> },
  { path: '/practice/summary/:sessionId', element: <SummaryScreen /> },
  { path: '/practice/:exam/:chapter', element: <SessionScreen /> },
];
