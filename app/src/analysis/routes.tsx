import type { RouteObject } from 'react-router';
import { AnalysisPage, MockReportPage } from './views/pages';

/** Mount inside the AppLayout route (guests allowed). */
export const analysisRoutes: RouteObject[] = [
  { path: '/analysis', element: <AnalysisPage /> },
  { path: '/analysis/mock/:mockId', element: <MockReportPage /> },
];
