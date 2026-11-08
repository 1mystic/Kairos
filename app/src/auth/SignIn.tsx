import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useStartGuest } from '../store/StoreProvider';
import { useAuth } from './AuthProvider';
import { friendlyAuthError } from './errors';
import { validateSignIn } from './validation';
import { AuthShell, Button, Divider, Field, FormError, Stack } from '../components/ui';

export function GoogleButton({ onError }: { onError(msg: string): void }) {
  const { signInWithGoogle } = useAuth();
  return (
    <Button variant="secondary" block onClick={() => signInWithGoogle().catch((e) => onError(friendlyAuthError(e)))}>
      Continue with Google
    </Button>
  );
}

export function OrDivider() {
  return <div className="row-inline text-small text-slate" role="separator"><span className="flex-1"><Divider /></span>or<span className="flex-1"><Divider /></span></div>;
}

export function SignIn() {
  const { signIn } = useAuth();
  const startGuest = useStartGuest();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateSignIn>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const v = validateSignIn({ email, password });
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Pick up where you left off."
      footer={<>New here? <Link className="font-semibold" to="/signup">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="stack-field">
        <FormError>{formError}</FormError>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="text-right text-small"><Link className="font-semibold" to="/forgot">Forgot password?</Link></div>
        <Button type="submit" block loading={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <OrDivider />
      <Stack gap="tight">
        <GoogleButton onError={setFormError} />
        <Button variant="ghost" block onClick={() => void startGuest().then(() => navigate('/', { replace: true }))}>Continue as guest</Button>
      </Stack>
      <p className="text-center text-small text-slate">No account needed. Your progress stays on this device.</p>
    </AuthShell>
  );
}
