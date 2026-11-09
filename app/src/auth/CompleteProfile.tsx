import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from './AuthProvider';
import { friendlyAuthError } from './errors';
import { validateDob } from './validation';
import { AuthShell, Button, Field, FormError, Spinner } from '../components/ui';
import { ProfileRetry } from './ProtectedRoute';

export function CompleteProfile() {
  const { user, profile, loading, profileError, completeProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.displayName ?? '');
  const [dob, setDob] = useState('');
  const [errors, setErrors] = useState<{ name?: string; dob?: string }>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/signin" replace />;
  if (profile) return <Navigate to="/" replace />;
  if (profileError) return <ProfileRetry />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const errs: { name?: string; dob?: string } = {};
    if (!name.trim()) errs.name = 'Enter your name.';
    else if (name.trim().length > 80) errs.name = 'Name can be at most 80 characters.';
    const d = validateDob(dob);
    if (d) errs.dob = d;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await completeProfile({ displayName: name, dob });
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="One last thing"
      subtitle="We need your date of birth to finish setting up your account."
      footer={<button type="button" className="text-link" onClick={() => void signOut()}>Sign out</button>}
    >
      <form onSubmit={submit} noValidate className="stack-field">
        <FormError>{formError}</FormError>
        <Field label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Field label="Date of birth" type="date" autoComplete="bday" hint="We ask so we can look after students under 18 properly." value={dob} onChange={(e) => setDob(e.target.value)} error={errors.dob} />
        <Button type="submit" block loading={busy}>{busy ? 'Saving…' : 'Continue'}</Button>
      </form>
    </AuthShell>
  );
}
