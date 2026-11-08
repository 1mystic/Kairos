import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute';
import { SignIn } from './auth/SignIn';
import { SignUp } from './auth/SignUp';
import { Forgot } from './auth/Forgot';
import { CompleteProfile } from './auth/CompleteProfile';
import { AppLayout, Home } from './pages/Home';
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
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
