import { BrowserRouter, Route, Routes } from 'react-router';
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
import { practiceRoutes } from './practice/routes';
import { cbtExamRoutes, cbtPageRoutes } from './cbt/routes';
import { uploadRoutes } from './upload/routes';
import { diagnosticRoutes } from './diagnostic/routes';
import { analysisRoutes } from './analysis/routes';
import { onboardingRoutes } from './onboarding/routes';
import { planRoutes } from './plan/routes';
import { adminRoutes } from './admin/routes';
import { roadmapRoutes } from './roadmap/routes';
import { ScrollToTop } from './lib/ScrollToTop';
import { StoreProvider } from './store/StoreProvider';
import { NudgeProvider } from './store/NudgeProvider';
import { firebaseConfigError } from './lib/firebase';

export function AppRoutes() {
  return (
    <>
    <ScrollToTop />
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
          {practiceRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {analysisRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {diagnosticRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {uploadRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {cbtPageRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {onboardingRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {roadmapRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {adminRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          {planRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          <Route path="/settings" element={<Settings />} />
        </Route>
        {/* Full-screen exam runner: no app chrome. Guests allowed (ProtectedRoute admits them). */}
        {cbtExamRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>
    </Routes>
    </>
  );
}

export function App() {
  if (firebaseConfigError) {
    return (
      <main className="mx-auto max-w-reading stack gap-base p-s6">
        <h1 className="text-h1">Firebase is not configured</h1>
        <p className="text-slate">{firebaseConfigError}</p>
      </main>
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
