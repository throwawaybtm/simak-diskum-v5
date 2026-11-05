/**
 * Firebase Client Initialization for Public Application
 * Connects anonymously to Cloud Firestore (or local emulator during development).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

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
    (isStagingMode ? '1:123456789:web:simakdiskum-staging-public' : '1:123456789:web:simakdiskum')
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);

// Connect to local Firestore emulator (port 8080) strictly during local dev.
// Invariant: Staging and production builds (MODE=staging / MODE=production) NEVER connect to emulator endpoints.
const isLocalDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
const isStagingOrProd = typeof import.meta !== 'undefined' && (import.meta.env?.MODE === 'staging' || import.meta.env?.MODE === 'production');
const isEmulatorDisabled = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_EMULATOR === 'false';

const shouldConnectEmulator = !isStagingOrProd && !isEmulatorDisabled && (
  (typeof window !== 'undefined' && isLocalDev && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) ||
  (typeof process !== 'undefined' && (Boolean(process.env?.FIRESTORE_EMULATOR_HOST) || process.env?.NODE_ENV === 'test'))
);

if (shouldConnectEmulator) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[Public App] Connected to Firestore Emulator on 127.0.0.1:8080');
  } catch (err) {
    console.warn('[Public App] Emulator connection warning:', err);
  }
}
