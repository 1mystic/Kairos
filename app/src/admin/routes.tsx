import type { RouteObject } from 'react-router';
import { AdminPage } from './AdminPage';

/** Mount inside AppLayout in App.tsx (reachable at /admin; not linked in the main nav). */
export const adminRoutes: RouteObject[] = [{ path: '/admin', element: <AdminPage /> }];
