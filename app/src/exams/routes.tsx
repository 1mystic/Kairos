import type { RouteObject } from 'react-router';
import { ManageExamsPage } from './ManageExams';

/** Mount inside the AppLayout route in App.tsx and add '/exams' to shell/lazyRoutes.tsx. */
export const examRoutes: RouteObject[] = [{ path: '/exams', element: <ManageExamsPage /> }];
