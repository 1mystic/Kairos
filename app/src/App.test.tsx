import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthContext, type AuthContextValue } from './auth/AuthProvider';
import { AppRoutes } from './App';
import { SignIn } from './auth/SignIn';
import { SignUp } from './auth/SignUp';
import userEvent from '@testing-library/user-event';
import { validateSignUp, validateSignIn } from './auth/validation';
import { friendlyAuthError } from './auth/errors';
import { StoreProvider } from './store/StoreProvider';
import { NudgeProvider } from './store/NudgeProvider';
import { createMemoryLocalDb } from './store/localDb';
import { fakeFs } from './store/testUtils';

vi.mock('./lib/firebase', () => ({ firebaseConfigError: null, getServices: () => ({}) }));

const base: AuthContextValue = {
  user: null, profile: null, loading: false,
  signIn: vi.fn(), signInWithGoogle: vi.fn(), signUp: vi.fn(), completeProfile: vi.fn(),
  resetPassword: vi.fn(), resendVerification: vi.fn(), signOut: vi.fn(),
};

function renderAt(path: string, ctx: Partial<AuthContextValue> = {}) {
  return render(
    <AuthContext.Provider value={{ ...base, ...ctx }}>
      <StoreProvider localDb={createMemoryLocalDb()} fsAdapter={fakeFs().adapter}>
        <MemoryRouter initialEntries={[path]}><NudgeProvider><AppRoutes /></NudgeProvider></MemoryRouter>
      </StoreProvider>
    </AuthContext.Provider>,
  );
}

beforeEach(() => localStorage.clear());

describe('protected route', () => {
  it('sends signed-out visitors from / to sign in (public entry)', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });
  it('lets a guest reach home, practice and settings after Continue as guest', async () => {
    renderAt('/signin');
    await userEvent.click(screen.getByRole('button', { name: 'Continue as guest' }));
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText(/saved on this device only/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /Practice/ }));
    expect(await screen.findByText('Coming soon')).toBeInTheDocument();
  });
  it('guest without the flag is not let in to /practice', () => {
    renderAt('/practice');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });
  it('redirects unauthenticated users to sign in', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });
  it('sends users without a profile to complete-profile', () => {
    renderAt('/', { user: { uid: 'u', email: 'a@b.co', displayName: 'A' } as never });
    expect(screen.getByRole('heading', { name: 'One last thing' })).toBeInTheDocument();
  });
  it('shows home for a signed-in user with a profile', () => {
    renderAt('/', {
      user: { uid: 'u', email: 'a@b.co', emailVerified: true } as never,
      profile: { displayName: 'Asha Rao', isMinor: true, consent: { status: 'pending' } } as never,
    });
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByText(/parents and guardians/)).toBeInTheDocument();
  });
  it('shows loading while auth resolves', () => {
    renderAt('/', { loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});

describe('validation', () => {
  it('validates sign up', () => {
    const e = validateSignUp({ name: '', email: 'x', password: 'short', dob: '' });
    expect(Object.keys(e).sort()).toEqual(['dob', 'email', 'name', 'password']);
    expect(validateSignUp({ name: 'A', email: 'a@b.co', password: 'longenough', dob: '2005-05-05' })).toEqual({});
    expect(validateSignUp({ name: 'A', email: 'a@b.co', password: 'longenough', dob: '2999-05-05' }).dob).toBeDefined();
  });
  it('validates sign in', () => {
    expect(validateSignIn({ email: '', password: '' })).toHaveProperty('email');
  });
  it('maps firebase errors', () => {
    expect(friendlyAuthError({ code: 'auth/wrong-password' })).toMatch(/could not find/);
    expect(friendlyAuthError({ code: 'auth/nope' })).toMatch(/Something went wrong/);
  });
});

describe('forms', () => {
  it('sign in blocks empty submit and does not call signIn', async () => {
    const signIn = vi.fn();
    render(<AuthContext.Provider value={{ ...base, signIn }}><StoreProvider localDb={createMemoryLocalDb()} fsAdapter={fakeFs().adapter}><MemoryRouter><SignIn /></MemoryRouter></StoreProvider></AuthContext.Provider>);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
  it('sign up requires date of birth', async () => {
    const signUp = vi.fn();
    render(<AuthContext.Provider value={{ ...base, signUp }}><MemoryRouter><SignUp /></MemoryRouter></AuthContext.Provider>);
    await userEvent.type(screen.getByLabelText('Name'), 'Asha');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Date of birth is required.')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
});
