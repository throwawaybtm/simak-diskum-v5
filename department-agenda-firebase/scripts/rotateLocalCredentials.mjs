/**
 * SIMAK DISKUM Kota Batam v5.0 — Secure Local Credential Rotation Script
 * 
 * Safely rotates local emulator credentials:
 * 1. Permanently revokes/deletes compromised 'admin.t01@batam.go.id' from Auth emulator.
 * 2. Uses non-municipal, demonstration-only domain (@diskum.local).
 * 3. Supports environment-provided password or cryptographically secure runtime generation.
 * 4. Never prints secrets or plaintext passwords to stdout or logs.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'node:crypto';

process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-department-agenda';

const app = getApps().length === 0 ? initializeApp({ projectId: PROJECT_ID }) : getApps()[0];
const auth = getAuth(app);

export function generateSecurePassword() {
  const randomPart = crypto.randomBytes(16).toString('base64url');
  return `Diskum!${randomPart}#9`;
}

export async function rotateCredentials(options = {}) {
  const oldEmail = options.oldEmail || 'admin.t01@batam.go.id';
  const newEmail = options.newEmail || process.env.LOCAL_ADMIN_EMAIL || 'admin.demo@diskum.local';
  const newPassword = options.newPassword || process.env.LOCAL_ADMIN_PASSWORD || generateSecurePassword();

  console.log('======================================================================');
  console.log('[SIMAK DISKUM] LOCAL TEST CREDENTIAL ROTATION');
  console.log(`Target:           Auth Emulator (${process.env.FIREBASE_AUTH_EMULATOR_HOST})`);
  console.log(`Action:           Revoke Old Account & Provision New Demo Account`);
  console.log('======================================================================');

  // 1. Delete compromised account
  try {
    const oldUser = await auth.getUserByEmail(oldEmail);
    await auth.deleteUser(oldUser.uid);
    console.log(`  ✓ Successfully deleted compromised user: ${oldEmail} (uid: ${oldUser.uid})`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`  ✓ Compromised user ${oldEmail} already absent from Auth emulator.`);
    } else {
      console.warn(`  ! Note during revocation of ${oldEmail}:`, err.message);
    }
  }

  // 2. Ensure new demo user uses an approved non-municipal demonstration domain
  if (newEmail.endsWith('@batam.go.id')) {
    throw new Error(`[Security Policy] Unapproved domain: Demonstration accounts must NOT use real municipal domain '@batam.go.id'. Use '@diskum.local' or similar.`);
  }

  // 3. Create or update the new demo account
  let newUser;
  try {
    newUser = await auth.getUserByEmail(newEmail);
    await auth.updateUser(newUser.uid, {
      password: newPassword,
      displayName: 'Admin Demo',
      disabled: false
    });
    console.log(`  ✓ Updated existing demonstration user: ${newEmail}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      newUser = await auth.createUser({
        email: newEmail,
        password: newPassword,
        displayName: 'Admin Demo',
        emailVerified: true
      });
      console.log(`  ✓ Provisioned new demonstration user: ${newEmail}`);
    } else {
      throw err;
    }
  }

  // 4. Set custom claim
  await auth.setCustomUserClaims(newUser.uid, { role: 'admin' });
  console.log(`  ✓ Set custom user claim { role: 'admin' } on ${newEmail}`);
  console.log(`  ✓ Credential rotation completed successfully. Password NOT logged.`);

  return { email: newEmail, password: newPassword, uid: newUser.uid };
}

// Direct execution
if (process.argv[1] && process.argv[1].endsWith('rotateLocalCredentials.mjs')) {
  rotateCredentials()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Rotation Error]', err.message);
      process.exit(1);
    });
}
