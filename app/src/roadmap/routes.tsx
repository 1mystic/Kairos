import type { RouteObject } from 'react-router';
import { RoadmapPage } from './RoadmapPage';

/** Mount inside the authenticated/guest AppLayout route in App.tsx. */
export const roadmapRoutes: RouteObject[] = [{ path: '/roadmap', element: <RoadmapPage /> }];
