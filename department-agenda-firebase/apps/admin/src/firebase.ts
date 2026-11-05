/**
 * Firebase Client Initialization for Admin Application
 * Automatically connects to local Firebase Firestore Emulator during development.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'demo-api-key',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || 'simakdiskum.firebaseapp.com',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || 'simakdiskum',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || 'simakdiskum.appspot.com',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || '123456789',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || '1:123456789:web:simakdiskum-admin'
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);

// Connect to local Firestore emulator (port 8080) strictly when running on localhost / loopback
const isLocalDevHost = typeof window !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

if (isLocalDevHost) {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[Admin] Connected to Firestore Emulator on 127.0.0.1:8080');
  } catch (err) {
    console.warn('[Admin] Emulator connection warning:', err);
  }
}
