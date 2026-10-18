// Firebase is initialised once per page load (module scope). In dev mode with VITE_USE_EMULATORS=true it talks
// to the local emulators (npm run dev:emu); the emulator host follows the page host so phones on the same Wi-Fi
// can reach a laptop running `npm run dev:lan` (see README).
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase, onValue, ref } from 'firebase/database';

const env = import.meta.env;
// emulators only in `vite` dev mode: a production build can never end up talking to localhost
const useEmulators = env.DEV && env.VITE_USE_EMULATORS === 'true';
const emulatorHost = env.VITE_EMULATOR_HOST || (typeof location !== 'undefined' ? location.hostname : '127.0.0.1');

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: useEmulators ? `http://${emulatorHost}:9000/?ns=${env.VITE_FIREBASE_PROJECT_ID}` : env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

/** A production build without a real Firebase project (scripts/check-env.mjs blocks deploying it). */
export const misconfigured = !useEmulators && (!env.VITE_FIREBASE_DATABASE_URL?.startsWith('https://') || env.VITE_FIREBASE_PROJECT_ID?.startsWith('demo-'));

export const auth = getAuth(app);
export const db = getDatabase(app);

if (useEmulators) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectDatabaseEmulator(db, emulatorHost, 9000);
}

let signIn: Promise<string> | null = null;

/** Anonymous session (kept by the browser, so a reload keeps the same player/host identity). */
export function ensureSignedIn(): Promise<string> {
  signIn ??= auth.authStateReady().then(async () => auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid);
  return signIn;
}

// Clock aligned with the database server: question deadlines are server timestamps.
let serverOffset = 0;
onValue(ref(db, '.info/serverTimeOffset'), s => {
  serverOffset = Number(s.val()) || 0;
});
export const serverNow = () => Date.now() + serverOffset;
