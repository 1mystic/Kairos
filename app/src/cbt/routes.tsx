import type { RouteObject } from 'react-router';
import { ExamRoute } from './ExamRoute';
import { MocksPage } from './MocksPage';
import { ResultPage } from './ResultPage';

/** Full-screen: mount OUTSIDE AppLayout (no app chrome). Guests may open it: do not wrap in a sign-in gate. */
export const cbtExamRoutes: RouteObject[] = [{ path: '/exam/:paperId', element: <ExamRoute /> }];

/** Normal app pages: mount INSIDE AppLayout. */
export const cbtPageRoutes: RouteObject[] = [
  { path: '/exam/:paperId/result/:mockId', element: <ResultPage /> },
  { path: '/mocks', element: <MocksPage /> },
];

export const cbtRoutes: RouteObject[] = [...cbtExamRoutes, ...cbtPageRoutes];
