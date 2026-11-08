import type { RouteObject } from 'react-router';
import { DiagnosticScreen } from './DiagnosticScreen';
import { NewMockScreen } from './NewMockScreen';

/** Mount inside the authenticated/guest AppLayout route in App.tsx. */
export const diagnosticRoutes: RouteObject[] = [
  { path: '/diagnostic', element: <DiagnosticScreen /> },
  { path: '/mocks/new', element: <NewMockScreen /> },
];
