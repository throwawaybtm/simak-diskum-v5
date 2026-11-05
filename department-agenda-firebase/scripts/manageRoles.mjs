/**
 * SIMAK DISKUM Kota Batam v5.0 — Operator Role Management & Auth Provisioning Script
 * 
 * Usage:
 *   # Running locally against Firebase Auth Emulator:
 *   export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
 *   node scripts/manageRoles.mjs provision operator@batam.go.id "TemporaryP@ss123" "Operator Diskum" editor
 * 
 *   # Setting role claims on existing user:
 *   node scripts/manageRoles.mjs set-role operator@batam.go.id admin
 * 
 *   # Disabling an operator account and revoking refresh tokens:
 *   node scripts/manageRoles.mjs disable operator@batam.go.id
 * 
 *   # Generating password reset link:
 *   node scripts/manageRoles.mjs reset-password operator@batam.go.id
 * 
 *   # Verifying user claims:
 *   node scripts/manageRoles.mjs inspect operator@batam.go.id
 * 
 * SECURITY DIRECTIVES:
 * 1. Target project is strictly validated against `simakdiskum`.
 * 2. In production, this script prefers Application Default Credentials (ADC via `gcloud auth application-default login`)
 *    or a locally secured service account referenced via GOOGLE_APPLICATION_CREDENTIALS.
 * 3. Custom role claims ('admin', 'editor') are evaluated directly by Cloud Firestore Security Rules (firebase/firestore.rules).
 * 4. Token lifetime limitation: ID tokens carry claims for up to 1 hour until client calls `getIdToken(true)` or token expires.
 * 5. Password reset limitation: Spark plan lacks automated SMTP email functions; links must be transmitted out-of-band securely.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';

// Allowed department roles matching firestore.rules
export const ALLOWED_ROLES = ['admin', 'editor'];
export const REQUIRED_PROJECT_ID = 'simakdiskum';

/**
 * Initializes the Firebase Admin SDK safely with ADC, service account, or emulator
 */
export function initAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const isEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const targetProjectId = process.env.GCLOUD_PROJECT || REQUIRED_PROJECT_ID;

  // Project Safeguard: prevent accidental operations on unintended Firebase projects
  if (!isEmulator && targetProjectId !== REQUIRED_PROJECT_ID && !process.env.ALLOW_ANY_PROJECT) {
    throw new Error(
      `[manageRoles Safeguard] Execution blocked: Target project "${targetProjectId}" does not match required project "${REQUIRED_PROJECT_ID}". ` +
      `Set GCLOUD_PROJECT=${REQUIRED_PROJECT_ID} or set ALLOW_ANY_PROJECT=true to override.`
    );
  }

  if (isEmulator) {
    console.log(`[manageRoles] Using Firebase Auth Emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST} (Project: ${targetProjectId})`);
    return initializeApp({ projectId: targetProjectId });
  }

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    console.log(`[manageRoles] Initializing with service account credentials from: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    if (serviceAccount.project_id && serviceAccount.project_id !== REQUIRED_PROJECT_ID && !process.env.ALLOW_ANY_PROJECT) {
      throw new Error(`[manageRoles Safeguard] Service account belongs to "${serviceAccount.project_id}", expected "${REQUIRED_PROJECT_ID}".`);
    }
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || targetProjectId
    });
  }

  // Application Default Credentials (ADC)
  console.log(`[manageRoles] Initializing with Application Default Credentials (ADC) for project: ${targetProjectId}`);
  return initializeApp({ projectId: targetProjectId });
}

/**
 * Resolves user record by either email or UID
 */
export async function resolveUser(auth, identifier) {
  if (identifier.includes('@')) {
    return await auth.getUserByEmail(identifier);
  }
  return await auth.getUser(identifier);
}

/**
 * Provisions a new department operator with Email/Password and custom role claims
 */
export async function provisionUser(auth, email, password, displayName, role) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}". Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
  }

  console.log(`[manageRoles] Creating operator account for ${email} with role: ${role}...`);
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`[manageRoles] User ${email} already exists (UID: ${user.uid}). Updating profile and claims...`);
    await auth.updateUser(user.uid, {
      displayName: displayName || user.displayName,
      emailVerified: true
    });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      user = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
        disabled: false
      });
      console.log(`[manageRoles] Successfully created user ${email} (UID: ${user.uid})`);
    } else {
      throw err;
    }
  }

  // Set Custom Claims evaluated by Firestore Security Rules: request.auth.token.role
  await auth.setCustomUserClaims(user.uid, {
    role,
    department: 'Dinas Koperasi dan Usaha Mikro Kota Batam',
    updatedAt: new Date().toISOString()
  });

  console.log(`[manageRoles] Custom claim { role: "${role}" } successfully attached to ${email}`);
  return user;
}

/**
 * Modifies an existing operator's custom role claim and forces token refresh
 */
export async function setUserRole(auth, identifier, role) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}". Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
  }

  const user = await resolveUser(auth, identifier);
  await auth.setCustomUserClaims(user.uid, {
    role,
    department: 'Dinas Koperasi dan Usaha Mikro Kota Batam',
    updatedAt: new Date().toISOString()
  });

  // Revoke refresh tokens to force client token refresh on next request
  await auth.revokeRefreshTokens(user.uid);
  console.log(`[manageRoles] Role updated to "${role}" for ${user.email} (UID: ${user.uid}). Refresh tokens revoked.`);
  console.log(`[manageRoles Note] Active browser sessions will receive the new role upon next token refresh (within 1 hour or when calling getIdToken(true)).`);
}

/**
 * Disables an operator account and immediately revokes all active sessions
 */
export async function disableUser(auth, identifier) {
  const user = await resolveUser(auth, identifier);
  await auth.updateUser(user.uid, { disabled: true });
  await auth.revokeRefreshTokens(user.uid);
  console.log(`[manageRoles] User ${user.email} (UID: ${user.uid}) has been DISABLED and refresh tokens revoked.`);
  console.log(`[manageRoles Note] User cannot obtain new ID tokens. Existing client JWT tokens expire within 1 hour.`);
}

/**
 * Generates an out-of-band password reset link
 */
export async function generatePasswordResetLink(auth, identifier) {
  const user = await resolveUser(auth, identifier);
  const link = await auth.generatePasswordResetLink(user.email);
  console.log(`[manageRoles] Password reset link generated for ${user.email}:`);
  console.log(`  ${link}`);
  console.log(`[manageRoles Spark Note] Automated email sending is not available on Spark plan without external SMTP. Deliver this link securely to the operator via official municipal channels.`);
  return link;
}

/**
 * Inspects user record and current custom claims
 */
export async function inspectUser(auth, identifier) {
  const user = await resolveUser(auth, identifier);
  console.log('--------------------------------------------------');
  console.log(`UID:             ${user.uid}`);
  console.log(`Email:           ${user.email}`);
  console.log(`Display Name:    ${user.displayName || '(none)'}`);
  console.log(`Disabled:        ${user.disabled}`);
  console.log(`Email Verified:  ${user.emailVerified}`);
  console.log(`Tokens Revoked:  ${user.tokensValidAfterTime || 'N/A'}`);
  console.log(`Custom Claims:   ${JSON.stringify(user.customClaims, null, 2)}`);
  console.log('--------------------------------------------------');
  return user;
}

// CLI Execution Support
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
SIMAK DISKUM Auth Provisioning Utility
Commands:
  provision <email> <password> <displayName> <role: admin|editor>
  set-role <email|uid> <role: admin|editor>
  disable <email|uid>
  reset-password <email|uid>
  inspect <email|uid>
    `);
    return;
  }

  const app = initAdminApp();
  const auth = getAuth(app);

  try {
    if (command === 'provision') {
      const [, email, password, displayName, role] = args;
      if (!email || !password || !displayName || !role) {
        console.error('Usage: manageRoles.mjs provision <email> <password> <displayName> <role>');
        process.exit(1);
      }
      await provisionUser(auth, email, password, displayName, role);
    } else if (command === 'set-role') {
      const [, identifier, role] = args;
      if (!identifier || !role) {
        console.error('Usage: manageRoles.mjs set-role <email|uid> <role>');
        process.exit(1);
      }
      await setUserRole(auth, identifier, role);
    } else if (command === 'disable') {
      const [, identifier] = args;
      if (!identifier) {
        console.error('Usage: manageRoles.mjs disable <email|uid>');
        process.exit(1);
      }
      await disableUser(auth, identifier);
    } else if (command === 'reset-password') {
      const [, identifier] = args;
      if (!identifier) {
        console.error('Usage: manageRoles.mjs reset-password <email|uid>');
        process.exit(1);
      }
      await generatePasswordResetLink(auth, identifier);
    } else if (command === 'inspect') {
      const [, identifier] = args;
      if (!identifier) {
        console.error('Usage: manageRoles.mjs inspect <email|uid>');
        process.exit(1);
      }
      await inspectUser(auth, identifier);
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[manageRoles Error]: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('manageRoles.mjs')) {
  main();
}
