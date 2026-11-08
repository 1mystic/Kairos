import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from './AuthProvider';
import { friendlyAuthError } from './errors';
import { validateEmail } from './validation';
import { AuthShell, Banner, Button, Field, FormError } from '../components/ui';

export function Forgot() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const err = validateEmail(email);
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e2) {
      setFormError(friendlyAuthError(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We will email you a link." footer={<Link className="font-semibold" to="/signin">Back to sign in</Link>}>
      {sent ? (
        <Banner role="status">If an account exists for {email.trim()}, a reset link is on its way. Check your spam folder too.</Banner>
      ) : (
        <form onSubmit={submit} noValidate className="stack-field">
          <FormError>{formError}</FormError>
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" block loading={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
    </AuthShell>
  );
}
