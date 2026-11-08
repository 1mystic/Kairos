/**
 * Dev/e2e-only mount of the CBT routes, used until the orchestrator mounts `cbtRoutes` in App.tsx.
 * Open /src/cbt/_harness.html?path=/exam/sample_jee_mini_v1 (the MemoryRouter starts at `path`).
 */
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useRoutes } from 'react-router';
import '../index.css';
import { AuthContext, type AuthContextValue } from '../auth/AuthProvider';
import { StoreProvider } from '../store/StoreProvider';
import { NudgeProvider } from '../store/NudgeProvider';
import { cbtRoutes } from './routes';

const auth = {
  user: null, profile: null, loading: false,
  signIn: async () => {}, signInWithGoogle: async () => {}, signUp: async () => {}, completeProfile: async () => {},
  resetPassword: async () => {}, resendVerification: async () => {}, signOut: async () => {},
} as unknown as AuthContextValue;

function Routes() {
  return useRoutes(cbtRoutes);
}

localStorage.setItem('kairos-guest', '1');
const path = new URLSearchParams(location.search).get('path') ?? '/mocks';
createRoot(document.getElementById('root')!).render(
  <AuthContext.Provider value={auth}>
    <StoreProvider>
      <MemoryRouter initialEntries={[path]}>
        <NudgeProvider><Routes /></NudgeProvider>
      </MemoryRouter>
    </StoreProvider>
  </AuthContext.Provider>,
);
