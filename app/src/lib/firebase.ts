import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const env = import.meta.env;
// Emulators are a development-only convenience: a production build (`vite build`) NEVER connects to localhost, even if
// VITE_USE_EMULATORS=true is set in app/.env.local, so the live site can't ship in emulator mode by accident.
export const useEmulators = env.VITE_USE_EMULATORS === 'true' && !env.PROD;

const REQUIRED = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'] as const;
const missing = REQUIRED.filter((k) => !env[k]);

/** Non-null when Firebase can't start; the UI shows a dev error screen. */
export const firebaseConfigError: string | null =
  missing.length > 0 && !useEmulators
    ? `Missing Firebase config: ${missing.join(', ')}. Copy app/.env.example to app/.env.local and fill it in, or set VITE_USE_EMULATORS=true.`
    : null;

export interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: Services | null = null;

export function getServices(): Services {
  if (firebaseConfigError) throw new Error(firebaseConfigError);
  if (services) return services;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || 'kairos-76a0d';
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY || 'demo-key',
    // Google sign-in's redirect fallback lands on https://<authDomain>/__/auth/handler: the default must be the project's
    // own Firebase domain (never 'localhost', which has no handler).
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID || 'demo-app',
  });
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    // feature code writes plain objects with optional fields: undefined would make setDoc/updateDoc throw
    ignoreUndefinedProperties: true,
  });
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  services = { app, auth, db };
  return services;
}
