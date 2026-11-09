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

type ConfigKey =
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_APP_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID';

const REQUIRED: readonly ConfigKey[] = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];

/** Config fetched at runtime from Firebase Hosting's reserved `/__/firebase/init.json` (production fallback). */
let hosted: Partial<Record<ConfigKey, string>> = {};
const cfg = (k: ConfigKey): string | undefined => (env[k] as string | undefined) || hosted[k] || undefined;

function computeError(): string | null {
  if (useEmulators) return null;
  const missing = REQUIRED.filter((k) => !cfg(k));
  if (missing.length === 0) return null;
  return env.PROD
    ? `Kairos could not load its Firebase settings (${missing.join(', ')}). Please reload the page; if this keeps happening, the site is being updated.`
    : `Missing Firebase config: ${missing.join(', ')}. Put the web app config in app/.env.local (get it with \`firebase apps:sdkconfig WEB --project kairos-76a0d\`) and set VITE_USE_EMULATORS=false to use the real project, or set VITE_USE_EMULATORS=true and run \`firebase emulators:start\`.`;
}

/** Non-null when Firebase can't start; the UI shows a setup/error screen. Live binding: updated by `loadHostingConfig()`. */
export let firebaseConfigError: string | null = computeError();

/**
 * On Firebase Hosting the project's public web config is served same-origin at `/__/firebase/init.json`, so a production
 * build does not depend on a local .env file. Call once before rendering. No-op when the env already has the config,
 * in emulator mode, or outside production (the dev server has no `/__/` route).
 */
export async function loadHostingConfig(): Promise<void> {
  if (useEmulators || !env.PROD || firebaseConfigError === null) return;
  try {
    const res = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (res.ok) {
      const j = (await res.json()) as Record<string, string | undefined>;
      hosted = {
        VITE_FIREBASE_API_KEY: j.apiKey,
        VITE_FIREBASE_AUTH_DOMAIN: j.authDomain,
        VITE_FIREBASE_PROJECT_ID: j.projectId,
        VITE_FIREBASE_APP_ID: j.appId,
        VITE_FIREBASE_STORAGE_BUCKET: j.storageBucket,
        VITE_FIREBASE_MESSAGING_SENDER_ID: j.messagingSenderId,
      };
    }
  } catch {
    // offline first load: keep the error screen; the next online load fixes it
  }
  firebaseConfigError = computeError();
}

export interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: Services | null = null;

export function getServices(): Services {
  if (firebaseConfigError) throw new Error(firebaseConfigError);
  if (services) return services;
  const projectId = cfg('VITE_FIREBASE_PROJECT_ID') || 'kairos-76a0d';
  const app = initializeApp({
    apiKey: cfg('VITE_FIREBASE_API_KEY') || 'demo-key',
    // Google sign-in's redirect fallback lands on https://<authDomain>/__/auth/handler: the default must be the project's
    // own Firebase domain (never 'localhost', which has no handler).
    authDomain: cfg('VITE_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: cfg('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: cfg('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: cfg('VITE_FIREBASE_APP_ID') || 'demo-app',
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
