import type { RouteObject } from 'react-router';
import { SavedPage } from './SavedPage';

/** Mount inside the AppLayout route (guests and signed-in users). */
export const savedRoutes: RouteObject[] = [
  { path: '/saved', element: <SavedPage /> },
];
