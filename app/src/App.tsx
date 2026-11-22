import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { HomeGate, ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute';
import { SignIn } from './auth/SignIn';
import { SignUp } from './auth/SignUp';
import { Forgot } from './auth/Forgot';
import { CompleteProfile } from './auth/CompleteProfile';
import { AppLayout } from './pages/AppLayout';
import { Home } from './pages/Home';
import { Privacy, Terms } from './pages/Legal';
import { PublicEntry } from './pages/PublicEntry';
import { Settings } from './pages/Settings';
import { uploadRoutes } from './upload/routes';
import {
  lazyAdminRoutes, lazyAnalysisRoutes, lazyCbtExamRoutes, lazyDsaRoutes, lazyExamRoutes, lazyCbtPageRoutes, lazyDiagnosticRoutes,
  lazyOnboardingRoutes, lazyPlanRoutes, lazyPracticeRoutes, lazyRoadmapRoutes, lazySavedRoutes,
} from './shell/lazyRoutes';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { NotFound } from './shell/NotFound';
import { PublicShell } from './shell/PublicShell';
import { EmptyState, Page, PageHeader } from './components/ui';
import { AlertIcon } from './components/icons';
import { ScrollToTop } from './lib/ScrollToTop';
import { StoreProvider } from './store/StoreProvider';
import { NudgeProvider } from './store/NudgeProvider';
import { firebaseConfigError } from './lib/firebase';

/** Feature route groups mounted inside AppLayout (guests and signed-in users). Heavy ones are code-split in shell/lazyRoutes. */
const appLayoutRoutes = [
  ...lazyPracticeRoutes,
  ...lazySavedRoutes,
  ...lazyAnalysisRoutes,
  ...lazyDsaRoutes,
  ...lazyExamRoutes,
  ...lazyDiagnosticRoutes,
  ...uploadRoutes,
  ...lazyCbtPageRoutes,
  ...lazyOnboardingRoutes,
  ...lazyRoadmapRoutes,
  ...lazyAdminRoutes,
  ...lazyPlanRoutes,
];

export function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary resetKey={pathname}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot" element={<Forgot />} />
          </Route>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/" element={<HomeGate app={<AppLayout />} fallback={<PublicEntry />} />}>
            <Route index element={<Home />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {appLayoutRoutes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
              <Route path="/settings" element={<Settings />} />
            </Route>
            {/* Full-screen exam runner: no app chrome. Guests allowed (ProtectedRoute admits them). */}
            {lazyCbtExamRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
          </Route>
          {/* 404: app chrome for signed-in users and guests, plain shell for visitors */}
          <Route path="*" element={<HomeGate app={<AppLayout />} fallback={<PublicShell />} />}>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export function App() {
  if (firebaseConfigError) {
    return (
      <Page width="reading">
        <PageHeader title="Firebase is not configured" />
        <EmptyState icon={AlertIcon} title="Setup needed">{firebaseConfigError}</EmptyState>
      </Page>
    );
  }
  return (
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <NudgeProvider>
            <AppRoutes />
          </NudgeProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
