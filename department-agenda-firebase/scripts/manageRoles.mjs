/**
 * SIMAK DISKUM Kota Batam v5.0 — Operator Role Management & Auth Provisioning Script
 * 
 * Usage:
 *   # Running locally against Firebase Auth Emulator:
 *   export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
 *   node scripts/manageRoles.mjs provision operator@batam.go.id "TemporaryP@ss123" "Operator Diskum" editor --target=emulator
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
 * 6. Zero credential exposure: passwords and sensitive keys are NEVER printed into stdout or logs.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Allowed department roles matching firestore.rules
export const ALLOWED_ROLES = ['admin', 'editor'];
export const PRODUCTION_PROJECT_ID = 'simakdiskum';
export const STAGING_PROJECT_ID = 'simakdiskum-staging';
export const REQUIRED_PROJECT_ID = PRODUCTION_PROJECT_ID; // Backward-compatible alias

/**
 * Validates target environment, preventing accidental execution against production
 * when emulator or staging is intended, and enforcing project ID safeguards.
 */
export function validateTargetEnvironment(options = {}) {
  const isEmulatorHost = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const requestedTarget = options.target || (isEmulatorHost ? 'emulator' : 'prod');
  const targetProjectId = process.env.GCLOUD_PROJECT || (isEmulatorHost ? 'demo-department-agenda' : (requestedTarget === 'staging' ? STAGING_PROJECT_ID : PRODUCTION_PROJECT_ID));

  if (requestedTarget === 'emulator' && !isEmulatorHost) {
    throw new Error(
      `[manageRoles Safeguard] Execution blocked: --target=emulator was specified but FIREBASE_AUTH_EMULATOR_HOST is not set. ` +
      `Refusing to connect to live Google Cloud environment.`
    );
  }

  if ((requestedTarget === 'prod' || requestedTarget === 'staging') && isEmulatorHost) {
    throw new Error(
      `[manageRoles Safeguard] Execution blocked: --target=${requestedTarget} was specified but FIREBASE_AUTH_EMULATOR_HOST (${process.env.FIREBASE_AUTH_EMULATOR_HOST}) is active. ` +
      `Unset emulator environment variables before executing against cloud.`
    );
  }

  // Staging Target Protection: MUST reject production project ID
  if (requestedTarget === 'staging') {
    if (targetProjectId === PRODUCTION_PROJECT_ID) {
      throw new Error(
        `[manageRoles Safeguard] Execution blocked: --target=staging was specified, but target project is "${targetProjectId}" (PRODUCTION). ` +
        `Refusing to run staging operations against production project!`
      );
    }
    if (targetProjectId !== STAGING_PROJECT_ID && !process.env.ALLOW_ANY_PROJECT) {
      throw new Error(
        `[manageRoles Safeguard] Execution blocked: Target project "${targetProjectId}" does not match required staging project "${STAGING_PROJECT_ID}". ` +
        `Set GCLOUD_PROJECT=${STAGING_PROJECT_ID} or set ALLOW_ANY_PROJECT=true.`
      );
    }
  }

  // Production Target Protection: MUST reject staging or foreign project IDs
  if (requestedTarget === 'prod') {
    if (targetProjectId === STAGING_PROJECT_ID) {
      throw new Error(
        `[manageRoles Safeguard] Execution blocked: --target=prod was specified, but target project is "${targetProjectId}" (STAGING). ` +
        `Refusing to run production operations against staging project!`
      );
    }
    if (targetProjectId !== PRODUCTION_PROJECT_ID && !process.env.ALLOW_ANY_PROJECT) {
      throw new Error(
        `[manageRoles Safeguard] Execution blocked: Target project "${targetProjectId}" does not match required project "${PRODUCTION_PROJECT_ID}". ` +
        `Set GCLOUD_PROJECT=${PRODUCTION_PROJECT_ID} or set ALLOW_ANY_PROJECT=true to override.`
      );
    }
  }

  const authMethod = isEmulatorHost
    ? 'EMULATOR'
    : (process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SERVICE_ACCOUNT' : 'ADC');

  return {
    target: requestedTarget,
    isEmulator: isEmulatorHost,
    projectId: targetProjectId,
    host: isEmulatorHost ? process.env.FIREBASE_AUTH_EMULATOR_HOST : 'Live Google Cloud',
    authMethod
  };
}

/**
 * Prominently displays the effective target environment before any write operations
 */
export function printTargetBanner(envInfo, operation = 'READ', isDestructive = false) {
  console.log('======================================================================');
  console.log(`[SIMAK DISKUM AUTH] TARGET ENVIRONMENT: ${envInfo.isEmulator ? 'LOCAL EMULATOR' : 'LIVE PRODUCTION'}`);
  console.log(`Operation:        ${operation}`);
  console.log(`Target Project:   ${envInfo.projectId}`);
  console.log(`Host / Endpoint:  ${envInfo.host}`);
  console.log(`Auth Method:      ${envInfo.authMethod}`);
  console.log(`Destructive:      ${isDestructive ? 'YES (Role Modification / Account Disabling)' : 'NO (Read-only / Safe)'}`);
  console.log('======================================================================');
}

/**
 * Initializes the Firebase Admin SDK safely with ADC, service account, or emulator
 */
export function initAdminApp(options = {}) {
  const envInfo = validateTargetEnvironment(options);

  if (getApps().length > 0) {
    return { app: getApps()[0], envInfo };
  }

  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (envInfo.isEmulator) {
    console.log(`[manageRoles] Using Firebase Auth Emulator at ${envInfo.host} (Project: ${envInfo.projectId})`);
    return { app: initializeApp({ projectId: envInfo.projectId }), envInfo };
  }

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    console.log(`[manageRoles] Initializing with service account credentials from: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    if (serviceAccount.project_id && serviceAccount.project_id !== REQUIRED_PROJECT_ID && !process.env.ALLOW_ANY_PROJECT) {
      throw new Error(`[manageRoles Safeguard] Service account belongs to "${serviceAccount.project_id}", expected "${REQUIRED_PROJECT_ID}".`);
    }
    return {
      app: initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || envInfo.projectId
      }),
      envInfo
    };
  }

  // Application Default Credentials (ADC)
  console.log(`[manageRoles] Initializing with Application Default Credentials (ADC) for project: ${envInfo.projectId}`);
  return { app: initializeApp({ projectId: envInfo.projectId }), envInfo };
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
 * Note: Password is never printed or logged to stdout.
 */
export async function provisionUser(auth, email, password, displayName, role) {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(`Invalid role "${role}". Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
  }

  const effectivePassword = password || (crypto.randomBytes(24).toString('base64url') + '!A1');
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
    if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
      user = await auth.createUser({
        email,
        password: effectivePassword,
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
  return user;
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
  return user;
}

/**
 * Generates an out-of-band password reset link
 * Note: Link is output to terminal for immediate out-of-band delivery.
 * WARNING: Do not redirect stdout to shared/unencrypted logs or shell history.
 */
export async function generatePasswordResetLink(auth, identifier) {
  const user = await resolveUser(auth, identifier);
  const link = await auth.generatePasswordResetLink(user.email);
  console.log(`[manageRoles] Password reset link generated for ${user.email}:`);
  console.log(`  ${link}`);
  console.log(`[manageRoles Note] Firebase native password reset emails are supported on the Spark plan (up to 150 emails/day; quota subject to Google Cloud limits). Prefer having the operator use the web application password recovery interface. If using this CLI link as an out-of-band administrative fallback, deliver it directly to the operator via confidential municipal channels. DO NOT redirect or persist this output into shared logs, shell history, or unapproved communication channels.`);
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
  provision <email> <displayName> <role: admin|editor> [--target=emulator|prod]
  provision <email> <password> <displayName> <role: admin|editor> [--target=emulator|prod]
  set-role <email|uid> <role: admin|editor> [--target=emulator|prod]
  disable <email|uid> [--target=emulator|prod]
  reset-password <email|uid> [--target=emulator|prod]
  inspect <email|uid> [--target=emulator|prod]
    `);
    return;
  }

  const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1];
  const { app, envInfo } = initAdminApp({ target: targetArg });
  const auth = getAuth(app);

  printTargetBanner(envInfo, `AUTH CLI: ${command.toUpperCase()}`, ['provision', 'set-role', 'disable'].includes(command));

  try {
    if (command === 'provision') {
      const positional = args.slice(1).filter(a => !a.startsWith('--'));
      let email, password, displayName, role;
      if (positional.length === 3) {
        // Secure passwordless provisioning: email, displayName, role
        [email, displayName, role] = positional;
        password = null; // Auto-generated secure random credential
      } else if (positional.length === 4) {
        // Explicit password provisioning: email, password, displayName, role
        [email, password, displayName, role] = positional;
      } else {
        console.error('Usage:');
        console.error('  manageRoles.mjs provision <email> <displayName> <role: admin|editor> [--target=emulator|prod]');
        console.error('  manageRoles.mjs provision <email> <password> <displayName> <role: admin|editor> [--target=emulator|prod]');
        process.exit(1);
      }
      await provisionUser(auth, email, password, displayName, role);
      if (!password) {
        const suppressLink = args.includes('--suppress-link') || args.includes('--no-link') || process.env.SUPPRESS_SETUP_LINK === 'true';
        console.log(`[manageRoles Security] Account provisioned with auto-generated secure entropy.`);
        if (suppressLink) {
          console.log(`[manageRoles Disclosure Safeguard] One-time setup link suppressed from terminal output to prevent exposure in logs.`);
          console.log(`[manageRoles Delivery Guidance] Operator should use the web portal password recovery interface (sendPasswordResetEmail) for direct confidential delivery.`);
        } else {
          console.log(`[manageRoles Delivery Guidance] Recommended: Operator should receive or request a password reset via native email (150/day Spark quota).`);
          console.log(`[manageRoles Terminal Notice] Generating one-time administrative setup link below for immediate interactive handoff.`);
          console.log(`[manageRoles Disclosure Safeguard] DO NOT redirect this output to shared logs, shell history, or unapproved communication channels.`);
          await generatePasswordResetLink(auth, email);
        }
      }
    } else if (command === 'set-role') {
      const [, identifier, role] = args;
      if (!identifier || !role) {
        console.error('Usage: manageRoles.mjs set-role <email|uid> <role> [--target=emulator|prod]');
        process.exit(1);
      }
      await setUserRole(auth, identifier, role);
    } else if (command === 'disable') {
      const [, identifier] = args;
      if (!identifier) {
        console.error('Usage: manageRoles.mjs disable <email|uid> [--target=emulator|prod]');
        process.exit(1);
      }
      await disableUser(auth, identifier);
    } else if (command === 'reset-password') {
      const [, identifier] = args;
      if (!identifier) {
        console.error('Usage: manageRoles.mjs reset-password <email|uid> [--target=emulator|prod]');
        process.exit(1);
      }
      await generatePasswordResetLink(auth, identifier);
    } else if (command === 'inspect') {
      const [, identifier] = args;
      if (!identifier) {
        console.error('Usage: manageRoles.mjs inspect <email|uid> [--target=emulator|prod]');
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
