/**
 * SIMAK DISKUM Kota Batam v5.0 — Read-Only Production Preflight Verifier
 * 
 * Objectives:
 * 1. Require explicit target (--target=prod|staging|emulator) and project ID.
 * 2. Strictly reject emulator environment variables when inspecting cloud environments.
 * 3. Use approved credentials (ADC or GOOGLE_APPLICATION_CREDENTIALS) with read-only operations.
 * 4. Inspect document counts across all 9 Firestore collections and check initialization assumptions.
 * 5. Guarantee zero document creation, modification, or deletion (100% read-only).
 * 6. Report a deterministic PASS, FAIL, or NOT VERIFIED result without unhandled crashes.
 */

import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const PRODUCTION_PROJECT_ID = 'simakdiskum';
export const STAGING_PROJECT_ID = 'simakdiskum-staging';
export const EMULATOR_PROJECT_ID = 'demo-department-agenda';

export const MONITORED_COLLECTIONS = [
  'departments',
  'employees',
  'locations',
  'organizers',
  'categories',
  'activities',
  'publicActivities',
  'settings',
  'auditLogs'
];

/**
 * Validates target environment, project ID matching, and emulator isolation.
 */
export function validatePreflightEnvironment(options = {}) {
  const isEmulatorEnvActive = Boolean(process.env.FIRESTORE_EMULATOR_HOST) || Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const requestedTarget = options.target;

  if (!requestedTarget) {
    throw new Error(
      `[Preflight Error] Missing required parameter: --target=<prod|staging|emulator> must be explicitly specified.`
    );
  }

  if (!['prod', 'staging', 'emulator'].includes(requestedTarget)) {
    throw new Error(
      `[Preflight Error] Invalid target: '${requestedTarget}'. Must be one of: prod, staging, emulator.`
    );
  }

  // Reject emulator environment variables when inspecting live cloud
  if ((requestedTarget === 'prod' || requestedTarget === 'staging') && isEmulatorEnvActive) {
    throw new Error(
      `[Preflight Safeguard] Execution blocked: Target is '${requestedTarget}' but emulator environment variables are active ` +
      `(FIRESTORE_EMULATOR_HOST=${process.env.FIRESTORE_EMULATOR_HOST || 'unset'}, ` +
      `FIREBASE_AUTH_EMULATOR_HOST=${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'unset'}). ` +
      `Unset all emulator variables before inspecting live cloud environments.`
    );
  }

  // Resolve expected project ID
  let expectedProjectId;
  if (requestedTarget === 'prod') {
    expectedProjectId = PRODUCTION_PROJECT_ID;
  } else if (requestedTarget === 'staging') {
    expectedProjectId = STAGING_PROJECT_ID;
  } else {
    expectedProjectId = EMULATOR_PROJECT_ID;
  }

  // Check project ID if provided
  const providedProjectId = options.project || process.env.GCLOUD_PROJECT;
  if (providedProjectId && providedProjectId !== expectedProjectId) {
    throw new Error(
      `[Preflight Safeguard] Project ID mismatch: target '${requestedTarget}' expects project '${expectedProjectId}', ` +
      `but received '${providedProjectId}'. Refusing to proceed.`
    );
  }

  return {
    target: requestedTarget,
    projectId: expectedProjectId,
    isEmulator: requestedTarget === 'emulator'
  };
}

/**
 * Performs read-only collection inspection on target Firestore database.
 */
export async function executePreflightCheck(options = {}) {
  const phase = options.phase || 'pre-activation'; // 'pre-activation' or 'post-activation'
  
  let envInfo;
  try {
    envInfo = validatePreflightEnvironment(options);
  } catch (err) {
    return {
      status: 'FAIL',
      target: options.target || 'UNKNOWN',
      projectId: options.project || 'UNKNOWN',
      phase,
      counts: {},
      details: err.message
    };
  }

  console.log('======================================================================');
  console.log('[SIMAK DISKUM] PRODUCTION PREFLIGHT VERIFIER (READ-ONLY)');
  console.log(`Target:         ${envInfo.target.toUpperCase()}`);
  console.log(`Project ID:     ${envInfo.projectId}`);
  console.log(`Phase:          ${phase.toUpperCase()}`);
  console.log(`Mode:           STRICT READ-ONLY (0 MUTATIONS)`);
  console.log('======================================================================');

  // Emulator configuration
  if (envInfo.isEmulator) {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    }
  }

  const appName = `preflight_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let app;
  let db;

  try {
    app = initializeApp({ projectId: envInfo.projectId }, appName);
    db = getFirestore(app);
  } catch (initErr) {
    return {
      status: 'NOT VERIFIED',
      target: envInfo.target,
      projectId: envInfo.projectId,
      phase,
      counts: {},
      details: `Failed to initialize Firebase Admin SDK: ${initErr.message}`
    };
  }

  try {
    const counts = {};
    console.log('\n--- Inspecting Firestore Collections ---');

    for (const col of MONITORED_COLLECTIONS) {
      try {
        const snapshot = await db.collection(col).get();
        counts[col] = snapshot.size;
        console.log(`  - ${col.padEnd(20)}: ${snapshot.size} documents`);
      } catch (colErr) {
        // Handle credential failure gracefully
        const errMsg = colErr.message || '';
        if (
          errMsg.includes('Could not load the default credentials') ||
          errMsg.includes('UNAUTHENTICATED') ||
          errMsg.includes('invalid_grant') ||
          errMsg.includes('PERMISSION_DENIED')
        ) {
          console.log(`\n[Preflight Notice] Cloud credentials check: ${errMsg}`);
          return {
            status: 'NOT VERIFIED',
            target: envInfo.target,
            projectId: envInfo.projectId,
            phase,
            counts: {},
            details: `Google Cloud credentials not present, unauthenticated, or lacks read permission for project '${envInfo.projectId}'. Run 'gcloud auth application-default login' with authorized municipal account.`
          };
        }
        throw colErr;
      }
    }

    // Evaluate assumptions based on phase
    const totalDocs = Object.values(counts).reduce((acc, c) => acc + c, 0);

    if (phase === 'pre-activation') {
      // In pre-activation (Step 3 before master seed and admin provision),
      // we expect a pristine/clean database (totalDocs === 0)
      if (totalDocs === 0) {
        console.log('\n[PASS] Clean initial database verified: 0 documents across all 9 collections.');
        return {
          status: 'PASS',
          target: envInfo.target,
          projectId: envInfo.projectId,
          phase,
          totalDocs: 0,
          counts,
          details: 'Pristine initial database verified (0 documents across all 9 collections). Ready for Step 4 (Admin Provisioning) and Step 5 (Master Seeding).'
        };
      } else {
        console.log(`\n[FAIL] Pre-activation assumption violated: Expected 0 documents, but found ${totalDocs} total documents.`);
        return {
          status: 'FAIL',
          target: envInfo.target,
          projectId: envInfo.projectId,
          phase,
          totalDocs,
          counts,
          details: `Pre-activation assumption violated: Database already contains ${totalDocs} documents across collections: ${JSON.stringify(counts)}.`
        };
      }
    } else if (phase === 'post-activation') {
      // In post-activation, master data should be populated
      const masterPopulated = counts.departments > 0 && counts.locations > 0 && counts.organizers > 0 && counts.categories > 0;
      if (masterPopulated) {
        console.log('\n[PASS] Post-activation state verified: Master collections populated.');
        return {
          status: 'PASS',
          target: envInfo.target,
          projectId: envInfo.projectId,
          phase,
          totalDocs,
          counts,
          details: 'Post-activation verified: Master collections populated and accessible.'
        };
      } else {
        console.log('\n[FAIL] Post-activation assumption violated: One or more master collections are empty.');
        return {
          status: 'FAIL',
          target: envInfo.target,
          projectId: envInfo.projectId,
          phase,
          totalDocs,
          counts,
          details: `Post-activation master collections incomplete: ${JSON.stringify(counts)}.`
        };
      }
    }

    return {
      status: 'PASS',
      target: envInfo.target,
      projectId: envInfo.projectId,
      phase,
      totalDocs,
      counts,
      details: 'Collection inspection completed successfully.'
    };
  } catch (err) {
    const isAuthErr = err.message.includes('default credentials') || err.message.includes('UNAUTHENTICATED');
    return {
      status: isAuthErr ? 'NOT VERIFIED' : 'FAIL',
      target: envInfo.target,
      projectId: envInfo.projectId,
      phase,
      counts: {},
      details: err.message
    };
  } finally {
    if (app) {
      await deleteApp(app).catch(() => {});
    }
  }
}

// CLI Execution entrypoint
if (process.argv[1] && process.argv[1].endsWith('verifyProductionPreflight.mjs')) {
  const args = process.argv.slice(2);
  const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1];
  const projectArg = args.find(a => a.startsWith('--project='))?.split('=')[1];
  const phaseArg = args.find(a => a.startsWith('--phase='))?.split('=')[1] || 'pre-activation';

  if (!targetArg || args.includes('--help')) {
    console.log(`
SIMAK DISKUM Read-Only Production Preflight Verifier

Usage:
  node verifyProductionPreflight.mjs --target=<prod|staging|emulator> [--project=<id>] [--phase=<pre-activation|post-activation>]

Safety Invariants:
  - Strictly requires explicit --target
  - Strictly rejects emulator environment variables when --target=prod or --target=staging
  - Read-only execution: 0 documents created, modified, or deleted
  - Reports PASS, FAIL, or NOT VERIFIED
`);
    process.exit(targetArg ? 0 : 1);
  }

  executePreflightCheck({
    target: targetArg,
    project: projectArg,
    phase: phaseArg
  }).then(result => {
    console.log(`\nFINAL PREFLIGHT RESULT: [${result.status}]`);
    console.log(`Details: ${result.details}`);
    if (result.status === 'FAIL') {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }).catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
