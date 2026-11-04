/**
 * Firebase Client Initialization for Admin Application
 * Automatically connects to local Firebase Firestore Emulator during development.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-department-agenda.firebaseapp.com',
  projectId: 'demo-department-agenda',
  storageBucket: 'demo-department-agenda.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef'
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);

// Connect to local Firestore emulator (port 8080) for development
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[Admin] Connected to Firestore Emulator on 127.0.0.1:8080');
  } catch (err) {
    console.warn('[Admin] Emulator connection warning:', err);
  }
}
