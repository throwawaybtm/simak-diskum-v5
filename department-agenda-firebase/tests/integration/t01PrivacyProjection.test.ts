/**
 * SIMAK DISKUM v5.0 — T01 Privacy Projection & Public Security Leak Audit
 * 
 * Verifies that all 152 imported public activities in Firestore emulator:
 * 1. Exclude all Zoom passwords, meeting passcodes, PINs, and meeting URLs with credentials.
 * 2. Exclude personal phone numbers and private contact numbers.
 * 3. Exclude privateNotes, privateMeetingUrl, and cancelReason.
 * 4. Exclude raw employee database IDs (emp_...) and NIPs in attendeeLabels.
 * 5. Verify security rules enforce that unauthenticated users cannot read private collections.
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { runT01Import } from '../../scripts/executeT01Import.mjs';
import { rotateCredentials } from '../../scripts/rotateLocalCredentials.mjs';

const PROJECT_ID = 'demo-department-agenda';
const app = getApps().length === 0 ? initializeApp({ projectId: PROJECT_ID, apiKey: 'fake-api-key' }) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// Connect emulators
try {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
} catch (e) {
  // Ignore already connected
}
try {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
} catch (e) {
  // Ignore already connected
}

describe('T01 Privacy Projection & Public Document Audit (Real Emulator)', () => {
  let testAdminEmail = '';
  let testAdminPassword = '';

  beforeAll(async () => {
    // Ensure data is imported in case prior integration tests cleared the emulator
    await runT01Import({ dryRun: false });
    // Rotate and provision secure demonstration credentials in Auth emulator
    const rotated = await rotateCredentials();
    testAdminEmail = rotated.email;
    testAdminPassword = rotated.password;
    // Ensure signed out initially
    await signOut(auth).catch(() => {});
  });

  it('verifies all 152 publicActivities documents are free of confidential meeting credentials and personal contact numbers', async () => {
    const pubCol = collection(db, 'publicActivities');
    const snap = await getDocs(pubCol);
    expect(snap.size).toBe(152);

    const credentialLeakRegex = /\b(?:password|passcode|sandi|pwd|pin)\s*[:=]\s*[^\s,;]+/i;
    const zoomUrlWithPassRegex = /https?:\/\/[^\s]*zoom\.us[^\s]*pwd=[^\s]*/i;
    const phoneLeakRegex = /(?:\+62|08)[0-9\s-]{9,15}/;
    const rawEmpIdRegex = /\bemp_[a-zA-Z0-9_-]+\b/i;
    const nipRegex = /\b\d{8}\s*\d{6}\s*\d\s*\d{3}\b/; // Standard NIP format

    let scannedCount = 0;
    const violations: any[] = [];

    snap.forEach(docSnap => {
      scannedCount++;
      const data = docSnap.data();

      // Check forbidden fields that must never exist in publicActivities
      expect(data.privateNotes).toBeUndefined();
      expect(data.privateMeetingUrl).toBeUndefined();
      expect(data.cancelReason).toBeUndefined();
      expect(data.attendeeIds).toBeUndefined();

      // Check text fields
      const allText = `${data.title || ''} ${data.locationName || ''} ${data.organizerName || ''} ${data.categoryName || ''} ${data.publicNotes || ''}`;

      if (credentialLeakRegex.test(allText)) {
        violations.push({ id: docSnap.id, error: 'Passcode / Password leak in text', text: allText });
      }
      if (zoomUrlWithPassRegex.test(allText)) {
        violations.push({ id: docSnap.id, error: 'Zoom URL with pwd leak in text', text: allText });
      }
      if (phoneLeakRegex.test(allText)) {
        violations.push({ id: docSnap.id, error: 'Phone number leak in text', text: allText });
      }

      // Check attendee labels
      if (data.attendeeLabels && Array.isArray(data.attendeeLabels)) {
        for (const label of data.attendeeLabels) {
          if (rawEmpIdRegex.test(label)) {
            violations.push({ id: docSnap.id, error: 'Raw employee ID leak in attendee label', label });
          }
          if (nipRegex.test(label)) {
            violations.push({ id: docSnap.id, error: 'NIP leak in attendee label', label });
          }
        }
      }
    });

    expect(scannedCount).toBe(152);
    expect(violations).toEqual([]);
  });

  it('verifies that confidential information was quarantined into private activities', async () => {
    // Pitching Misi Dagang Jabar-Kepri had Zoom & passcode
    const privDoc = await getDoc(doc(db, 'activities', 'act_20261001_02'));
    expect(privDoc.exists()).toBe(true);
    const privData = privDoc.data()!;

    expect(privData.privateMeetingUrl).toContain('zoom.us');
    expect(privData.privateNotes).toMatch(/Passcode:\s*\S+/i);

    // Verify public counterpart has zero leak
    const pubDoc = await getDoc(doc(db, 'publicActivities', 'act_20261001_02'));
    expect(pubDoc.exists()).toBe(true);
    const pubData = pubDoc.data()!;
    expect(pubData.publicNotes).not.toMatch(/Passcode:\s*\S+/i);
    expect(pubData.publicNotes).not.toContain('zoom.us');
    expect(pubData.publicNotes).toContain('[TAUTAN VIRTUAL DIAMANKAN]');
  });

  it('verifies anonymous access to private collections is strictly rejected by production Firestore rules', async () => {
    const { initializeTestEnvironment, assertFails, assertSucceeds } = await import('@firebase/rules-unit-testing');
    const fs = await import('node:fs');
    const path = await import('node:path');

    const strictRules = fs.readFileSync(
      path.resolve(__dirname, '../../firebase/firestore.rules'),
      'utf8'
    );

    const strictEnv = await initializeTestEnvironment({
      projectId: 'demo-t01-strict-security',
      firestore: {
        rules: strictRules,
        host: '127.0.0.1',
        port: 8080
      }
    });

    try {
      // 1. Unauthenticated (Anonymous) context
      const anonContext = strictEnv.unauthenticatedContext();
      const anonDb = anonContext.firestore();

      // Reading publicActivities is allowed for anonymous
      await assertSucceeds(getDoc(doc(anonDb, 'publicActivities', 'act_sample')));

      // Reading internal activities is strictly DENIED
      await assertFails(getDoc(doc(anonDb, 'activities', 'act_sample')));

      // Reading internal employees is strictly DENIED
      await assertFails(getDoc(doc(anonDb, 'employees', 'emp_sample')));

      // Reading auditLogs is strictly DENIED
      await assertFails(getDocs(collection(anonDb, 'auditLogs')));

      // 2. Authenticated Admin context
      const adminContext = strictEnv.authenticatedContext('admin_uid', {
        role: 'admin',
        department: 'Dinas Koperasi dan Usaha Mikro Kota Batam'
      });
      const adminDb = adminContext.firestore();

      // Admin CAN read private activities
      await assertSucceeds(getDoc(doc(adminDb, 'activities', 'act_sample')));

      // Admin CAN read private employees
      await assertSucceeds(getDoc(doc(adminDb, 'employees', 'emp_sample')));

      // Admin CAN read auditLogs
      await assertSucceeds(getDocs(collection(adminDb, 'auditLogs')));
    } finally {
      await strictEnv.cleanup();
    }
  });

  it('verifies single Admin test account exists on Auth emulator with admin claim', async () => {
    const userCred = await signInWithEmailAndPassword(auth, testAdminEmail, testAdminPassword);
    expect(userCred.user.email).toBe(testAdminEmail);
    expect(userCred.user.email).not.toMatch(/@batam\.go\.id$/); // Invariant: must not use real municipal domain
    const idTokenResult = await userCred.user.getIdTokenResult();
    expect(idTokenResult.claims.role).toBe('admin');
    await signOut(auth);
  });
});
