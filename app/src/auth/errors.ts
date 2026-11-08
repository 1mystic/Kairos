const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/user-not-found': 'We could not find an account with that email and password.',
  'auth/wrong-password': 'We could not find an account with that email and password.',
  'auth/invalid-credential': 'We could not find an account with that email and password.',
  'auth/invalid-login-credentials': 'We could not find an account with that email and password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Choose a password with at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-closed-by-user': 'The Google window was closed before finishing. Try again when ready.',
  'auth/cancelled-popup-request': 'The Google window was closed before finishing. Try again when ready.',
  'auth/account-exists-with-different-credential': 'This email is already registered with a different sign-in method.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled yet.',
  'auth/unauthorized-domain': 'This domain is not authorised for sign-in yet.',
  'permission-denied': 'We could not save your profile. Please try again.',
};

export function friendlyAuthError(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  if (MESSAGES[code]) return MESSAGES[code];
  if (err instanceof Error && !code) return err.message;
  return 'Something went wrong. Please try again.';
}
