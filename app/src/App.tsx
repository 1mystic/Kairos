import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { HomeGate, ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute';
import { SignIn } from './auth/SignIn';
import { SignUp } from './auth/SignUp';
import { Forgot } from './auth/Forgot';
import { CompleteProfile } from './auth/CompleteProfile';
import { AppLayout, Home } from './pages/Home';
import { Placeholder } from './pages/Placeholder';
import { PublicEntry } from './pages/PublicEntry';
import { Settings } from './pages/Settings';
import { StoreProvider } from './store/StoreProvider';
import { NudgeProvider } from './store/NudgeProvider';
import { firebaseConfigError } from './lib/firebase';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot" element={<Forgot />} />
      </Route>
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/" element={<HomeGate app={<AppLayout />} fallback={<PublicEntry />} />}>
        <Route index element={<Home />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/practice" element={<Placeholder title="Practice" />} />
          <Route path="/onboarding" element={<Placeholder title="Set your exam date">Exam date and daily time setup is on its way.</Placeholder>} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/exam/:paperId" element={<Placeholder title="Exam" />} />
      </Route>
    </Routes>
  );
}

export function App() {
  if (firebaseConfigError) {
    return (
      <main className="mx-auto max-w-xl space-y-3 p-8">
        <h1 className="text-2xl">Firebase is not configured</h1>
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
