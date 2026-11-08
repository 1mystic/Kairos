import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAuth } from './AuthProvider';
import { friendlyAuthError } from './errors';
import { validateSignUp } from './validation';
import { AuthShell, Button, Field, FormError } from '../components/ui';
import { GoogleButton, OrDivider } from './SignIn';

export function SignUp() {
  const { signUp } = useAuth();
  const [v, setV] = useState({ name: '', email: '', password: '', dob: '' });
  const [errors, setErrors] = useState<ReturnType<typeof validateSignUp>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const errs = validateSignUp(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await signUp(v);
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Takes a minute. We will set up your plan next."
      footer={<>Already have an account? <Link className="font-semibold" to="/signin">Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate className="stack gap-base">
        <FormError>{formError}</FormError>
        <Field label="Name" autoComplete="name" value={v.name} onChange={set('name')} error={errors.name} />
        <Field label="Email" type="email" autoComplete="email" value={v.email} onChange={set('email')} error={errors.email} />
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." value={v.password} onChange={set('password')} error={errors.password} />
        <Field label="Date of birth" type="date" autoComplete="bday" hint="We ask so we can look after students under 18 properly." value={v.dob} onChange={set('dob')} error={errors.dob} />
        <Button type="submit" block loading={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
      <OrDivider />
      <GoogleButton onError={setFormError} />
    </AuthShell>
  );
}
