import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  signInWithRedirect,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getServices } from '../lib/firebase';
import { buildNewProfile, type ProfileInput, type UserProfile } from '../lib/profile';
import { reportSignup } from '../telemetry';
import { friendlyAuthError } from './errors';

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  /** true until auth state and (if signed in) the profile lookup have resolved */
  loading: boolean;
  /** the profile lookup failed (offline / transient): do NOT treat the account as new; offer a retry */
  profileError?: boolean;
  /** friendly message when a Google redirect sign-in came back with an error (shown by the Google button) */
  redirectError?: string;
  reloadProfile?(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signUp(input: { name: string; email: string; password: string; dob: string }): Promise<void>;
  completeProfile(input: { displayName: string; dob: string }): Promise<void>;
  resetPassword(email: string): Promise<void>;
  resendVerification(): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

async function writeProfile(uid: string, input: ProfileInput): Promise<UserProfile> {
  const { db } = getServices();
  const p = buildNewProfile(input);
  await setDoc(doc(db, 'users', uid), { ...p, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  try { reportSignup(); } catch { /* telemetry never blocks */ }
  return p;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [redirectError, setRedirectError] = useState('');
  const busy = useRef(false); // true while signUp is writing the profile
  const seq = useRef(0); // invalidates in-flight profile lookups (sign-out, another sign-in, unmount)

  const loadProfile = useCallback(async (u: User) => {
    const my = ++seq.current;
    setLoading(true);
    setProfileError(false);
    try {
      const snap = await getDoc(doc(getServices().db, 'users', u.uid));
      if (my !== seq.current || busy.current) return;
      setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch {
      // a failed lookup is not "no profile": never bounce an existing account to /complete-profile
      if (my !== seq.current || busy.current) return;
      setProfile(null);
      setProfileError(true);
    } finally {
      if (my === seq.current && !busy.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { auth } = getServices();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        seq.current += 1;
        setProfile(null);
        setProfileError(false);
        setLoading(false);
        return;
      }
      if (busy.current) return; // signUp will set the profile itself
      void loadProfile(u);
    });
    return () => {
      seq.current += 1;
      unsub();
    };
  }, [loadProfile]);

  // Google redirect fallback: the result is only available once, right after the page reloads
  useEffect(() => {
    let live = true;
    const { auth } = getServices();
    getRedirectResult(auth).catch((e) => {
      // no redirect pending resolves to null, not an error; real failures get the usual friendly text
      if (live) setRedirectError(friendlyAuthError(e));
    });
    return () => { live = false; };
  }, []);

  const reloadProfile = useCallback(async () => {
    const u = getServices().auth.currentUser;
    if (u) await loadProfile(u);
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getServices().auth, email.trim(), password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { auth } = getServices();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  }, []);

  const signUp: AuthContextValue['signUp'] = useCallback(async ({ name, email, password, dob }) => {
    const { auth } = getServices();
    const input = { displayName: name, email: email.trim(), dob };
    buildNewProfile(input); // validate before creating the account
    busy.current = true;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, input.email, password);
      // Auth lower-cases the address in the ID token and firestore.rules require profile.email == token.email
      const email = cred.user.email ?? input.email.toLowerCase();
      setProfile(await writeProfile(cred.user.uid, { ...input, email }));
      await updateProfile(cred.user, { displayName: input.displayName }).catch(() => {});
      await sendEmailVerification(cred.user).catch(() => {});
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  const completeProfile: AuthContextValue['completeProfile'] = useCallback(
    async ({ displayName, dob }) => {
      if (!user) throw new Error('Sign in first.');
      // another tab / an earlier attempt may have created it already: a second setDoc would be an (invalid) update
      const existing = await getDoc(doc(getServices().db, 'users', user.uid));
      if (existing.exists()) {
        setProfile(existing.data() as UserProfile);
        return;
      }
      setProfile(await writeProfile(user.uid, { displayName, dob, email: user.email ?? '' }));
      if (!user.emailVerified && user.providerData.some((p) => p.providerId === 'password')) {
        await sendEmailVerification(user).catch(() => {});
      }
    },
    [user],
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getServices().auth, email.trim());
  }, []);

  const resendVerification = useCallback(async () => {
    const u = getServices().auth.currentUser;
    if (u) await sendEmailVerification(u);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(getServices().auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, profileError, redirectError, reloadProfile, signIn, signInWithGoogle, signUp, completeProfile, resetPassword, resendVerification, signOut }),
    [user, profile, loading, profileError, redirectError, reloadProfile, signIn, signInWithGoogle, signUp, completeProfile, resetPassword, resendVerification, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Update the editable profile fields only (rules allow displayName, onboarded + onboarding fields). */
export async function updateProfileFields(uid: string, fields: Partial<Pick<UserProfile, 'displayName' | 'onboarded' | 'exam' | 'examDate' | 'ambition' | 'minutesPerWeekday' | 'offDay' | 'chaptersDone' | 'lang'>>) {
  await updateDoc(doc(getServices().db, 'users', uid), { ...fields, updatedAt: serverTimestamp() });
}
