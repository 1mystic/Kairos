import type { RouteObject } from 'react-router';
import { OnboardingPage } from './Onboarding';

/** Mount inside the authenticated/guest AppLayout route in App.tsx (replaces the /onboarding placeholder). */
export const onboardingRoutes: RouteObject[] = [{ path: '/onboarding', element: <OnboardingPage /> }];
