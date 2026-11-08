import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from './AuthProvider';
import { friendlyAuthError } from './errors';
import { validateSignIn } from './validation';
import { AuthShell, Field, FormError } from '../components/ui';

export function GoogleButton({ onError }: { onError(msg: string): void }) {
  const { signInWithGoogle } = useAuth();
  return (
    <button type="button" className="btn btn-secondary w-full" onClick={() => signInWithGoogle().catch((e) => onError(friendlyAuthError(e)))}>
      Continue with Google
    </button>
  );
}

export function SignIn() {
  const { signIn } = useAuth();
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
      footer={<>New here? <Link className="text-primary underline" to="/signup">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError>{formError}</FormError>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="text-right text-sm"><Link className="text-primary underline" to="/forgot">Forgot password?</Link></div>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="flex items-center gap-3 text-sm text-slate"><hr className="flex-1 border-line" />or<hr className="flex-1 border-line" /></div>
      <GoogleButton onError={setFormError} />
    </AuthShell>
  );
}
