import { describe, expect, it } from 'vitest';
import {
  lazyAdminRoutes,
  lazyAnalysisRoutes,
  lazyCbtExamRoutes,
  lazyCbtPageRoutes,
  lazyDiagnosticRoutes,
  lazyDsaRoutes,
  lazyExamRoutes,
  lazyOnboardingRoutes,
  lazyPlanRoutes,
  lazyPracticeRoutes,
  lazyRoadmapRoutes,
  lazySavedRoutes,
} from './lazyRoutes';

const paths = (rs: { path?: string }[]) => rs.map((r) => r.path).sort();

/**
 * The lazy route table lists each feature's paths by hand (it must exist before the chunk loads). If a feature adds a
 * path to its `*Routes` array but not here, that URL silently shows the 404 page (this happened with /practice/today).
 * Each group below must list EXACTLY the paths of its real route module.
 */
describe('lazy route table stays in sync with the real route modules', () => {
  it('practice', async () => expect(paths(lazyPracticeRoutes)).toEqual(paths((await import('../practice/routes')).practiceRoutes)));
  it('analysis', async () => expect(paths(lazyAnalysisRoutes)).toEqual(paths((await import('../analysis/routes')).analysisRoutes)));
  it('diagnostic', async () => expect(paths(lazyDiagnosticRoutes)).toEqual(paths((await import('../diagnostic/routes')).diagnosticRoutes)));
  it('exams', async () => expect(paths(lazyExamRoutes)).toEqual(paths((await import('../exams/routes')).examRoutes)));
  it('dsa', async () => expect(paths(lazyDsaRoutes)).toEqual(paths((await import('../dsa/routes')).dsaRoutes)));
  it('onboarding', async () => expect(paths(lazyOnboardingRoutes)).toEqual(paths((await import('../onboarding/routes')).onboardingRoutes)));
  it('plan', async () => expect(paths(lazyPlanRoutes)).toEqual(paths((await import('../plan/routes')).planRoutes)));
  it('roadmap', async () => expect(paths(lazyRoadmapRoutes)).toEqual(paths((await import('../roadmap/routes')).roadmapRoutes)));
  it('saved', async () => expect(paths(lazySavedRoutes)).toEqual(paths((await import('../saved/routes')).savedRoutes)));
  it('admin', async () => expect(paths(lazyAdminRoutes)).toEqual(paths((await import('../admin/routes')).adminRoutes)));
  it('cbt pages', async () => expect(paths(lazyCbtPageRoutes)).toEqual(paths((await import('../cbt/routes')).cbtPageRoutes)));
  it('cbt exam runner', async () => expect(paths(lazyCbtExamRoutes)).toEqual(paths((await import('../cbt/routes')).cbtExamRoutes)));
});
