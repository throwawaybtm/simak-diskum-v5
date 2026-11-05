/**
 * Firebase Client Initialization for Admin Application
 * Automatically connects to local Firebase Firestore Emulator during development.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';

const isStagingMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'staging';

const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'demo-api-key',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    (isStagingMode ? 'simakdiskum-staging.firebaseapp.com' : 'simakdiskum.firebaseapp.com'),
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) ||
    (isStagingMode ? 'simakdiskum-staging' : 'simakdiskum'),
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) ||
    (isStagingMode ? 'simakdiskum-staging.appspot.com' : 'simakdiskum.appspot.com'),
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '123456789',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) ||
    (isStagingMode ? '1:123456789:web:simakdiskum-staging-admin' : '1:123456789:web:simakdiskum-admin')
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Configure local session persistence
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn('[Admin Auth] Session persistence warning:', err);
  });
}

// Connect to local Firestore & Auth emulators strictly during local development.
// Invariant: Staging and production builds (MODE=staging / MODE=production) NEVER connect to emulator endpoints.
const isLocalDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
const isStagingOrProd = typeof import.meta !== 'undefined' && (import.meta.env?.MODE === 'staging' || import.meta.env?.MODE === 'production');
const isEmulatorDisabled = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_EMULATOR === 'false';

const shouldConnectEmulator = !isStagingOrProd && !isEmulatorDisabled && (
  (typeof window !== 'undefined' && isLocalDev && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) ||
  (typeof process !== 'undefined' && (Boolean(process.env?.FIREBASE_AUTH_EMULATOR_HOST) || Boolean(process.env?.FIRESTORE_EMULATOR_HOST) || process.env?.NODE_ENV === 'test'))
);

if (shouldConnectEmulator) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[Admin] Connected to Firestore Emulator on 127.0.0.1:8080');
  } catch (err) {
    console.warn('[Admin] Emulator connection warning:', err);
  }

  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    console.log('[Admin] Connected to Auth Emulator on http://127.0.0.1:9099');
  } catch (err) {
    console.warn('[Admin] Auth emulator connection warning:', err);
  }
}
