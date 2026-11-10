import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { PageSkeleton, Spinner } from '../components/ui';

/**
 * Code-split a feature's `*Routes` array. The module is fetched on first visit to any of its paths, so the
 * landing / auth / home chunk stays small. The paths are listed here (not read from the module) because the
 * route table must exist before the chunk loads. If a path is not in the loaded module nothing renders.
 */
function lazyGroup(
  load: () => Promise<RouteObject[]>,
  paths: string[],
  fallback: ReactNode = <PageSkeleton />,
): RouteObject[] {
  let cache: Promise<RouteObject[]> | null = null;
  const once = () => (cache ??= load().catch((e) => { cache = null; throw e; }));
  return paths.map((path) => {
    const C: ComponentType = lazy(async () => {
      const routes = await once();
      const el = routes.find((r) => r.path === path)?.element ?? null;
      return { default: () => <>{el}</> };
    });
    return { path, element: <Suspense fallback={fallback}><C /></Suspense> };
  });
}

export const lazyPracticeRoutes = lazyGroup(
  () => import('../practice/routes').then((m) => m.practiceRoutes),
  ['/practice', '/practice/today', '/practice/summary/:sessionId', '/practice/:exam/:chapter'],
);
export const lazyDsaRoutes = lazyGroup(
  () => import('../dsa/routes').then((m) => m.dsaRoutes),
  ['/dsa', '/dsa/t/:track', '/dsa/p/:slug'],
);
export const lazyExamRoutes = lazyGroup(
  () => import('../exams/routes').then((m) => m.examRoutes),
  ['/exams'],
);
export const lazyAnalysisRoutes = lazyGroup(
  () => import('../analysis/routes').then((m) => m.analysisRoutes),
  ['/analysis', '/analysis/mock/:mockId'],
);
export const lazyDiagnosticRoutes = lazyGroup(
  () => import('../diagnostic/routes').then((m) => m.diagnosticRoutes),
  ['/diagnostic', '/mocks/new'],
);
export const lazyOnboardingRoutes = lazyGroup(
  () => import('../onboarding/routes').then((m) => m.onboardingRoutes),
  ['/onboarding'],
);
export const lazyPlanRoutes = lazyGroup(
  () => import('../plan/routes').then((m) => m.planRoutes),
  ['/plan', '/plan/:date'],
);
export const lazyRoadmapRoutes = lazyGroup(
  () => import('../roadmap/routes').then((m) => m.roadmapRoutes),
  ['/roadmap'],
);
export const lazyAdminRoutes = lazyGroup(
  () => import('../admin/routes').then((m) => m.adminRoutes),
  ['/admin'],
);
/** Mocks list and mock result (inside AppLayout). */
export const lazyCbtPageRoutes = lazyGroup(
  () => import('../cbt/routes').then((m) => m.cbtPageRoutes),
  ['/exam/:paperId/result/:mockId', '/mocks'],
);
/** Full-screen exam runner (outside AppLayout). */
export const lazyCbtExamRoutes = lazyGroup(
  () => import('../cbt/routes').then((m) => m.cbtExamRoutes),
  ['/exam/:paperId'],
  <Spinner />,
);
