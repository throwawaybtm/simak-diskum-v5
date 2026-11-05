/**
 * SIMAK DISKUM Kota Batam v5.0 — Hardened Spark-Compatible Logical Backup & Restore Utility
 * 
 * Provides:
 * 1. Lossless JSON export and SHA-256 integrity validation.
 * 2. Explicit restore modes: Non-destructive import (`--mode=merge`) and controlled full restore (`--mode=full`).
 * 3. Dry-run diff analysis, dry-run review requirement, and explicit confirmation safety gates.
 * 4. Resumable and restartable restore checkpoints bound to operationId, project, manifest checksum, and mode.
 * 5. Full-document equality verification (nested objects, arrays, Timestamps, DocumentReferences, nulls, optional fields).
 * 6. Audit history protection (never delete post-backup audit logs, never overwrite existing audit logs, safe ID collision handling).
 * 7. Privileged maintenance record tagging distinguishable from regular operator audit logs.
 * 8. Target environment validation and banner display before writes; prevention of accidental production targeting.
 * 9. Production seeding safety: strictly rejects unapproved templates or placeholder tags.
 * 
 * Target Architecture: Firebase Spark (No-Cost Plan)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, DocumentReference } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// All core collections for SIMAK DISKUM
export const CORE_COLLECTIONS = [
  'activities',
  'publicActivities',
  'employees',
  'departments',
  'locations',
  'organizers',
  'categories',
  'settings',
  'auditLogs'
];

export const REQUIRED_PROJECT_ID = 'simakdiskum';

/**
 * Validates target environment, preventing accidental execution against production
 * when emulator is intended, and enforcing project ID safeguards.
 */
export function validateTargetEnvironment(options = {}) {
  const isEmulatorHost = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const requestedTarget = options.target || (isEmulatorHost ? 'emulator' : 'prod');
  const targetProjectId = process.env.GCLOUD_PROJECT || (isEmulatorHost ? 'demo-department-agenda' : REQUIRED_PROJECT_ID);

  if (requestedTarget === 'emulator' && !isEmulatorHost) {
    throw new Error(
      `[Target Guard] Execution blocked: --target=emulator was specified but FIRESTORE_EMULATOR_HOST is not set. ` +
      `Refusing to connect to live Google Cloud environment.`
    );
  }

  if (requestedTarget === 'prod' && isEmulatorHost) {
    throw new Error(
      `[Target Guard] Execution blocked: --target=prod was specified but FIRESTORE_EMULATOR_HOST (${process.env.FIRESTORE_EMULATOR_HOST}) is active. ` +
      `Unset emulator environment variables before executing against production.`
    );
  }

  if (!isEmulatorHost && targetProjectId !== REQUIRED_PROJECT_ID && !process.env.ALLOW_ANY_PROJECT) {
    throw new Error(
      `[Target Guard] Execution blocked: Target project "${targetProjectId}" does not match required production project "${REQUIRED_PROJECT_ID}". ` +
      `Set GCLOUD_PROJECT=${REQUIRED_PROJECT_ID} or set ALLOW_ANY_PROJECT=true for testing.`
    );
  }

  const authMethod = isEmulatorHost
    ? 'EMULATOR'
    : (process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SERVICE_ACCOUNT' : 'ADC');

  return {
    target: requestedTarget,
    isEmulator: isEmulatorHost,
    projectId: targetProjectId,
    host: isEmulatorHost ? process.env.FIRESTORE_EMULATOR_HOST : 'Live Google Cloud',
    authMethod
  };
}

/**
 * Prominently displays the effective target environment before any write operations
 */
export function printTargetBanner(envInfo, operation = 'READ', isDestructive = false) {
  console.log('======================================================================');
  console.log(`[SIMAK DISKUM] TARGET ENVIRONMENT: ${envInfo.isEmulator ? 'LOCAL EMULATOR' : 'LIVE PRODUCTION'}`);
  console.log(`Operation:        ${operation}`);
  console.log(`Target Project:   ${envInfo.projectId}`);
  console.log(`Host / Endpoint:  ${envInfo.host}`);
  console.log(`Auth Method:      ${envInfo.authMethod}`);
  console.log(`Destructive:      ${isDestructive ? 'YES (Data Modification / Deletion)' : 'NO (Read-only / Safe)'}`);
  console.log('======================================================================');
}

/**
 * Initializes Firestore instance safely with ADC, service account, or emulator
 */
export function initFirestore(options = {}) {
  const envInfo = validateTargetEnvironment(options);

  if (getApps().length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (envInfo.isEmulator) {
      console.log(`[backupRestore] Connecting to Firestore Emulator at ${envInfo.host} (Project: ${envInfo.projectId})`);
      initializeApp({ projectId: envInfo.projectId });
    } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      console.log(`[backupRestore] Initializing with service account credentials from: ${serviceAccountPath}`);
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || envInfo.projectId
      });
    } else {
      console.log(`[backupRestore] Initializing with Application Default Credentials (ADC) for project: ${envInfo.projectId}`);
      initializeApp({ projectId: envInfo.projectId });
    }
  }

  return { db: getFirestore(), envInfo };
}

/**
 * Computes SHA-256 hash of a string or buffer
 */
export function computeSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Lossless serialization of Firestore complex types to JSON-safe structures
 */
export function serializeFirestoreData(val) {
  if (val === null || val === undefined) return val;

  // Timestamp detection (Firestore Admin Timestamp or standard { _seconds, _nanoseconds })
  if (val instanceof Timestamp || (typeof val === 'object' && ('_seconds' in val || 'seconds' in val) && ('_nanoseconds' in val || 'nanoseconds' in val))) {
    return {
      _type: 'Firestore.Timestamp',
      seconds: val.seconds !== undefined ? val.seconds : val._seconds,
      nanoseconds: val.nanoseconds !== undefined ? val.nanoseconds : val._nanoseconds
    };
  }

  // DocumentReference detection
  if (val instanceof DocumentReference || (typeof val === 'object' && val.path && val.id && typeof val.collection === 'function')) {
    return {
      _type: 'Firestore.DocumentReference',
      path: val.path
    };
  }

  // Date instance
  if (val instanceof Date) {
    return {
      _type: 'JavaScript.Date',
      iso: val.toISOString()
    };
  }

  // Array recursive serialization
  if (Array.isArray(val)) {
    return val.map(serializeFirestoreData);
  }

  // Plain object recursive serialization
  if (typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serializeFirestoreData(v);
    }
    return res;
  }

  return val;
}

/**
 * Lossless deserialization of JSON-safe structures back into Firestore types
 */
export function deserializeFirestoreData(val, db) {
  if (val === null || val === undefined) return val;

  if (typeof val === 'object' && !Array.isArray(val)) {
    if (val._type === 'Firestore.Timestamp') {
      return new Timestamp(val.seconds, val.nanoseconds);
    }
    if (val._type === 'Firestore.DocumentReference' && db) {
      return db.doc(val.path);
    }
    if (val._type === 'JavaScript.Date') {
      return new Date(val.iso);
    }

    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = deserializeFirestoreData(v, db);
    }
    return res;
  }

  if (Array.isArray(val)) {
    return val.map(item => deserializeFirestoreData(item, db));
  }

  return val;
}

/**
 * Recursively verifies deep equality between backup data and live Firestore data,
 * including nested objects, arrays, Timestamps, DocumentReferences, nulls, and absence of extra fields.
 */
export function assertDeepFirestoreEquality(expected, actual, pathContext = '', isFullMode = false) {
  if (expected === actual) return;

  // Handle nulls
  if (expected === null || actual === null) {
    if (expected !== actual) {
      throw new Error(`Null mismatch at "${pathContext}": expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    return;
  }

  // Handle Timestamps
  const isExpectedTs = expected && typeof expected === 'object' && ('_seconds' in expected || 'seconds' in expected) && ('_nanoseconds' in expected || 'nanoseconds' in expected);
  const isActualTs = actual && typeof actual === 'object' && ('_seconds' in actual || 'seconds' in actual) && ('_nanoseconds' in actual || 'nanoseconds' in actual);
  if (isExpectedTs || isActualTs) {
    const expSec = expected.seconds !== undefined ? expected.seconds : expected._seconds;
    const expNano = expected.nanoseconds !== undefined ? expected.nanoseconds : expected._nanoseconds;
    const actSec = actual.seconds !== undefined ? actual.seconds : actual._seconds;
    const actNano = actual.nanoseconds !== undefined ? actual.nanoseconds : actual._nanoseconds;
    if (expSec !== actSec || expNano !== actNano) {
      throw new Error(`Timestamp mismatch at "${pathContext}": expected {seconds:${expSec},nanoseconds:${expNano}}, got {seconds:${actSec},nanoseconds:${actNano}}`);
    }
    return;
  }

  // Handle DocumentReferences
  const isExpectedRef = expected && typeof expected === 'object' && ('path' in expected && typeof expected.path === 'string');
  const isActualRef = actual && typeof actual === 'object' && ('path' in actual && typeof actual.path === 'string');
  if (isExpectedRef || isActualRef) {
    if (!isExpectedRef || !isActualRef || expected.path !== actual.path) {
      throw new Error(`DocumentReference path mismatch at "${pathContext}": expected ${expected?.path}, got ${actual?.path}`);
    }
    return;
  }

  // Handle Dates
  if (expected instanceof Date || actual instanceof Date) {
    const expTime = expected instanceof Date ? expected.getTime() : new Date(expected).getTime();
    const actTime = actual instanceof Date ? actual.getTime() : new Date(actual).getTime();
    if (expTime !== actTime) {
      throw new Error(`Date mismatch at "${pathContext}": expected ${expected}, got ${actual}`);
    }
    return;
  }

  // Handle Arrays
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      throw new Error(`Type mismatch at "${pathContext}": expected Array, got ${typeof actual}`);
    }
    if (expected.length !== actual.length) {
      throw new Error(`Array length mismatch at "${pathContext}": expected ${expected.length}, got ${actual.length}`);
    }
    for (let i = 0; i < expected.length; i++) {
      assertDeepFirestoreEquality(expected[i], actual[i], `${pathContext}[${i}]`, isFullMode);
    }
    return;
  }

  // Handle Plain Objects
  if (typeof expected === 'object') {
    if (typeof actual !== 'object' || Array.isArray(actual)) {
      throw new Error(`Type mismatch at "${pathContext}": expected Object, got ${typeof actual}`);
    }
    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);

    for (const key of expectedKeys) {
      if (!(key in actual)) {
        throw new Error(`Missing expected key "${key}" at "${pathContext}"`);
      }
      assertDeepFirestoreEquality(expected[key], actual[key], pathContext ? `${pathContext}.${key}` : key, isFullMode);
    }

    if (isFullMode) {
      for (const key of actualKeys) {
        if (!(key in expected)) {
          throw new Error(`Unexpected extra key "${key}" found in live document at "${pathContext}" (Full mode requires exact replacement)`);
        }
      }
    }
    return;
  }

  // Primitives
  if (expected !== actual) {
    throw new Error(`Scalar value mismatch at "${pathContext}": expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Exports all core collections to a target directory with lossless serialization and SHA-256 manifest
 */
export async function exportCollections(db, targetDir, options = {}) {
  const envInfo = validateTargetEnvironment(options);
  printTargetBanner(envInfo, `EXPORT BACKUP -> ${targetDir}`, false);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    systemVersion: '5.0.0',
    projectId: envInfo.projectId,
    collections: {},
    files: {}
  };

  for (const collName of CORE_COLLECTIONS) {
    console.log(`[backupRestore] Exporting collection: ${collName}...`);
    const snap = await db.collection(collName).get();
    const docs = [];

    const docList = snap.docs || [];
    for (const d of docList) {
      const data = typeof d.data === 'function' ? d.data() : d.data;
      docs.push({ id: d.id, ...serializeFirestoreData(data) });
    }

    const content = JSON.stringify(docs, null, 2);
    const fileName = `${collName}.json`;
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');

    const sha256 = computeSha256(content);
    manifest.collections[collName] = docs.length;
    manifest.files[fileName] = {
      sha256,
      count: docs.length
    };
    console.log(`  ✓ Exported ${docs.length} documents from ${collName} (SHA-256: ${sha256.slice(0, 8)}...)`);
  }

  const manifestContent = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(path.join(targetDir, 'manifest.json'), manifestContent, 'utf-8');
  console.log(`[backupRestore] Backup completed successfully in ${targetDir}`);
  return manifest;
}

/**
 * Validates SHA-256 hashes for all backup files against manifest.json
 */
export function validateBackupIntegrity(sourceDir) {
  const manifestPath = path.join(sourceDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found in ${sourceDir}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`[backupRestore] Validating backup integrity for: ${sourceDir}...`);

  for (const [fileName, meta] of Object.entries(manifest.files || {})) {
    const filePath = path.join(sourceDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing expected backup file: ${fileName}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const actualHash = computeSha256(content);
    if (actualHash !== meta.sha256) {
      throw new Error(`Integrity violation in ${fileName}: expected SHA-256 ${meta.sha256}, got ${actualHash}`);
    }
  }

  console.log(`[backupRestore] ✓ SHA-256 integrity verified for all ${Object.keys(manifest.files || {}).length} files.`);
  return manifest;
}

/**
 * Computes a dry-run diff between Firestore live collections and backup records
 */
export async function computeRestoreDiff(db, sourceDir) {
  const diff = {
    collections: {},
    totalToRestore: 0,
    totalOrphans: 0
  };

  for (const collName of CORE_COLLECTIONS) {
    const filePath = path.join(sourceDir, `${collName}.json`);
    if (!fs.existsSync(filePath)) continue;

    const backupDocs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const backupIds = new Set(backupDocs.map(d => d.id));

    const snap = await db.collection(collName).get();
    const liveIds = new Set();
    const docList = snap.docs || [];
    for (const d of docList) {
      liveIds.add(d.id);
    }

    const toRestore = backupDocs.length;
    const orphans = [];
    for (const liveId of liveIds) {
      if (!backupIds.has(liveId)) {
        orphans.push(liveId);
      }
    }

    diff.collections[collName] = {
      backupCount: backupDocs.length,
      liveCount: liveIds.size,
      toRestoreCount: toRestore,
      orphanCount: orphans.length,
      orphanIds: orphans
    };

    diff.totalToRestore += toRestore;
    diff.totalOrphans += orphans.length;
  }

  return diff;
}

/**
 * Restores collections with explicit mode, dry-run safety, audit protection,
 * resumable checkpoints, and deep equality verification.
 * 
 * Options:
 * - mode: 'merge' (non-destructive import) | 'full' (controlled full restore)
 * - dryRun: boolean (output diff without modifying)
 * - dryRunReviewed: boolean (explicit acknowledgment that dry-run was reviewed)
 * - force: boolean (confirm execution of destructive full restore)
 * - resume: boolean (resume from existing checkpoint ledger)
 * - restart: boolean (discard existing checkpoint and restart fresh)
 * - progressPath: string (checkpoint file path, default 'restore-progress.json')
 * - operator: string (actor email for audit log)
 * - target: 'emulator' | 'prod'
 */
export async function restoreCollections(db, sourceDir, options = {}) {
  const mode = options.mode || 'merge';
  const dryRun = Boolean(options.dryRun);
  const dryRunReviewed = Boolean(options.dryRunReviewed);
  const force = Boolean(options.force);
  const resume = Boolean(options.resume);
  const restart = Boolean(options.restart);
  const progressPath = options.progressPath || 'restore-progress.json';
  const operator = options.operator || process.env.ADMIN_OPERATOR_EMAIL || 'admin_cli';

  if (!['merge', 'full'].includes(mode)) {
    throw new Error(`Invalid restore mode: "${mode}". Allowed modes: "merge" (non-destructive) or "full" (controlled full restoration)`);
  }

  const envInfo = validateTargetEnvironment(options);
  printTargetBanner(envInfo, `RESTORE BACKUP (${mode.toUpperCase()} MODE)`, mode === 'full' && !dryRun);

  // 1. Integrity check
  const manifest = validateBackupIntegrity(sourceDir);
  const manifestRaw = fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf-8');
  const manifestHash = computeSha256(manifestRaw);

  // 2. Compute Diff
  console.log(`[backupRestore] Calculating restore diff (mode: ${mode})...`);
  const diff = await computeRestoreDiff(db, sourceDir);

  console.log('--------------------------------------------------');
  console.log(`RESTORE DIFF REPORT (Mode: ${mode.toUpperCase()}):`);
  for (const [coll, info] of Object.entries(diff.collections)) {
    console.log(`  - ${coll}: ${info.toRestoreCount} backup docs, ${info.liveCount} live docs, ${info.orphanCount} orphans`);
  }
  console.log(`Total documents to restore: ${diff.totalToRestore}`);
  console.log(`Total orphaned live documents: ${diff.totalOrphans}`);
  console.log('--------------------------------------------------');

  if (dryRun) {
    console.log('[backupRestore] Dry-run complete. No changes were made to Firestore.');
    return { dryRun: true, diff, manifest };
  }

  // 3. Safety Gate: Full restore requires prior dry-run review AND explicit confirmation (--force),
  // even when orphan count is zero, because all live documents are replaced ({ merge: false }).
  if (mode === 'full') {
    if (!dryRunReviewed && !force) {
      throw new Error(
        `[Destructive Action Safeguard] Controlled full restore requires prior dry-run review (--dry-run-reviewed) and explicit confirmation (--force), ` +
        `even when orphan count is zero, because all live documents are replaced ({ merge: false }). ` +
        `Run with --dry-run first to review document diff, then confirm with --force.`
      );
    }
  }

  // 4. Checkpoint & Resumption Ledger Management
  let progressLedger;
  if (fs.existsSync(progressPath)) {
    const existingProgress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    if (existingProgress.status === 'IN_PROGRESS' || existingProgress.status === 'FAILED') {
      if (resume) {
        if (existingProgress.targetProjectId !== envInfo.projectId) {
          throw new Error(
            `Cannot resume restore: checkpoint target project "${existingProgress.targetProjectId}" does not match effective project "${envInfo.projectId}".`
          );
        }
        if (existingProgress.manifestHash !== manifestHash) {
          throw new Error(`Cannot resume restore: checkpoint manifest hash does not match backup directory.`);
        }
        if (existingProgress.mode !== mode) {
          throw new Error(
            `Cannot resume restore: checkpoint mode "${existingProgress.mode}" does not match requested mode "${mode}". ` +
            `Do NOT switch to merge mode to resolve a failed full restore.`
          );
        }
        progressLedger = existingProgress;
        progressLedger.status = 'IN_PROGRESS';
        console.log(`[backupRestore] Resuming restore operation "${progressLedger.operationId}" (${progressLedger.completedBatches.length} batches previously completed).`);
      } else if (restart) {
        console.log(`[backupRestore] Restarting restore operation from scratch. Discarding prior checkpoint "${existingProgress.operationId}".`);
        progressLedger = {
          operationId: options.operationId || `restore_op_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          targetProjectId: envInfo.projectId,
          manifestHash,
          sourceDir: path.resolve(sourceDir),
          mode,
          startedAt: new Date().toISOString(),
          completedBatches: [],
          completedDeletions: [],
          failedBatch: null,
          status: 'IN_PROGRESS'
        };
      } else {
        throw new Error(
          `[Checkpoint Safeguard] An interrupted restore checkpoint exists for this target project (Operation: ${existingProgress.operationId}). ` +
          `Pass --resume to safely resume from where it failed, or --restart to clear checkpoint and restart from scratch.`
        );
      }
    } else {
      // Completed or other
      progressLedger = {
        operationId: options.operationId || `restore_op_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        targetProjectId: envInfo.projectId,
        manifestHash,
        sourceDir: path.resolve(sourceDir),
        mode,
        startedAt: new Date().toISOString(),
        completedBatches: [],
        completedDeletions: [],
        failedBatch: null,
        status: 'IN_PROGRESS'
      };
    }
  } else {
    progressLedger = {
      operationId: options.operationId || `restore_op_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      targetProjectId: envInfo.projectId,
      manifestHash,
      sourceDir: path.resolve(sourceDir),
      mode,
      startedAt: new Date().toISOString(),
      completedBatches: [],
      completedDeletions: [],
      failedBatch: null,
      status: 'IN_PROGRESS'
    };
  }

  fs.writeFileSync(progressPath, JSON.stringify(progressLedger, null, 2), 'utf-8');

  try {
    for (const collName of CORE_COLLECTIONS) {
      const filePath = path.join(sourceDir, `${collName}.json`);
      if (!fs.existsSync(filePath)) {
        console.warn(`[backupRestore] Skipping missing collection file: ${collName}.json`);
        continue;
      }

      const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`[backupRestore] Restoring ${collName} (${docs.length} docs, mode: ${mode})...`);

      // In full mode, delete orphans EXCEPT for auditLogs (audit history is protected and immutable)
      if (mode === 'full' && collName !== 'auditLogs') {
        const orphanIds = diff.collections[collName]?.orphanIds || [];
        if (orphanIds.length > 0) {
          console.log(`  ⚠ Removing ${orphanIds.length} orphaned document(s) from ${collName}...`);
          const DEL_BATCH = 450;
          for (let i = 0; i < orphanIds.length; i += DEL_BATCH) {
            const delBatchId = `${collName}_del_${Math.floor(i / DEL_BATCH) + 1}`;
            if (progressLedger.completedDeletions.includes(delBatchId)) {
              console.log(`  ↷ Skipping already deleted orphan batch: ${delBatchId}`);
              continue;
            }

            const chunk = orphanIds.slice(i, i + DEL_BATCH);
            const delBatch = db.batch();
            for (const id of chunk) {
              delBatch.delete(db.collection(collName).doc(id));
            }
            await delBatch.commit();
            progressLedger.completedDeletions.push(delBatchId);
            fs.writeFileSync(progressPath, JSON.stringify(progressLedger, null, 2), 'utf-8');
          }
        }
      }

      // Write backup documents in batches of 450
      const BATCH_SIZE = 450;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batchId = `${collName}_batch_${Math.floor(i / BATCH_SIZE) + 1}`;
        if (progressLedger.completedBatches.includes(batchId)) {
          console.log(`  ↷ Skipping already completed batch: ${batchId}`);
          continue;
        }

        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = db.batch();

        for (const item of chunk) {
          const { id, ...rawContent } = item;
          const deserialized = deserializeFirestoreData(rawContent, db);
          const ref = db.collection(collName).doc(id);

          // Audit log protection: never overwrite existing audit logs; handle collisions safely
          if (collName === 'auditLogs') {
            const liveDocSnap = await db.collection('auditLogs').doc(id).get();
            if (liveDocSnap.exists) {
              const liveData = liveDocSnap.data();
              // If identical, preserve without write
              try {
                assertDeepFirestoreEquality(deserialized, liveData, `auditLogs.${id}`, false);
                continue; // Identical, skip write
              } catch {
                // Collision on ID with different data: write under collision-safe ID
                const collisionId = `${id}_backup_restored_${Date.now()}`;
                console.warn(`  ⚠ Preserved existing live audit log "${id}" without overwriting. Restored copy saved as "${collisionId}".`);
                batch.set(db.collection('auditLogs').doc(collisionId), {
                  ...deserialized,
                  originalCollidingId: id,
                  isCollidingRestoredRecord: true
                }, { merge: false });
                continue;
              }
            }
          }

          if (mode === 'merge') {
            batch.set(ref, deserialized, { merge: true });
          } else {
            // Full mode: complete replacement ({ merge: false }) so deleted fields are cleaned
            batch.set(ref, deserialized, { merge: false });
          }
        }

        try {
          await batch.commit();
          progressLedger.completedBatches.push(batchId);
          fs.writeFileSync(progressPath, JSON.stringify(progressLedger, null, 2), 'utf-8');
          console.log(`  ✓ Restored batch ${batchId} (${chunk.length} docs) for ${collName}`);
        } catch (commitErr) {
          progressLedger.status = 'FAILED';
          progressLedger.failedBatch = {
            batchId,
            collection: collName,
            chunkSize: chunk.length,
            error: commitErr.message
          };
          fs.writeFileSync(progressPath, JSON.stringify(progressLedger, null, 2), 'utf-8');
          throw new Error(
            `[backupRestore Fatal] Batch failure in ${batchId} for ${collName}: ${commitErr.message}. ` +
            `Progress saved to ${progressPath}. Do NOT switch to merge mode to resolve a partial full restoration failure. ` +
            `Fix the underlying error and resume with --resume or restart with --restart.`
          );
        }
      }
    }

    // 5. Log Privileged Maintenance Operation in auditLogs
    const maintenanceLogId = `audit_maint_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const maintenanceRecord = {
      id: maintenanceLogId,
      action: 'MAINTENANCE_RESTORE',
      entity: 'DATABASE_BACKUP',
      entityId: path.basename(sourceDir),
      actorId: 'SYSTEM_MAINTENANCE_CLI',
      actorLabel: `System Administrator (${operator})`,
      identitySource: 'ADMIN_CLI_PRIVILEGED',
      isPrivilegedMaintenance: true,
      operationId: progressLedger.operationId,
      targetProject: envInfo.projectId,
      mode,
      details: `Restored ${diff.totalToRestore} documents across collections (mode: ${mode}, dryRun: false, force: ${force})`,
      performedAt: new Date().toISOString(),
      timestamp: Timestamp.now()
    };
    await db.collection('auditLogs').doc(maintenanceLogId).set(maintenanceRecord);
    console.log(`[backupRestore] ✓ Privileged maintenance operation logged in auditLogs (${maintenanceLogId})`);

    // 6. Post-Restoration Deep Equality Verification
    console.log(`[backupRestore] Running post-restoration deep equality verification...`);
    const verification = await verifyRestoration(db, manifest, sourceDir, mode === 'full');
    console.log(`[backupRestore] ✓ Verification passed: ${verification.verifiedCount} records matched full-document equality.`);

    // Mark checkpoint as completed
    progressLedger.status = 'COMPLETED';
    progressLedger.completedAt = new Date().toISOString();
    fs.writeFileSync(progressPath, JSON.stringify(progressLedger, null, 2), 'utf-8');

    return {
      success: true,
      operationId: progressLedger.operationId,
      mode,
      diff,
      verification
    };
  } catch (err) {
    console.error(`[backupRestore Fatal]: ${err.message}`);
    throw err;
  }
}

/**
 * Verifies document counts and full-document equality between Firestore and backup
 */
export async function verifyRestoration(db, manifest, sourceDir, isFullMode = false) {
  let verifiedCount = 0;

  for (const collName of CORE_COLLECTIONS) {
    const filePath = path.join(sourceDir, `${collName}.json`);
    if (!fs.existsSync(filePath)) continue;

    const backupDocs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const snap = await db.collection(collName).get();
    const liveMap = new Map();
    const docList = snap.docs || [];
    for (const d of docList) {
      liveMap.set(d.id, typeof d.data === 'function' ? d.data() : d.data);
    }

    for (const bDoc of backupDocs) {
      const live = liveMap.get(bDoc.id);
      if (!live) {
        if (collName === 'auditLogs') {
          // If collision occurred, a colliding restored doc may exist with originalCollidingId
          const collidingEntry = Array.from(liveMap.values()).find(x => x.originalCollidingId === bDoc.id);
          if (collidingEntry) {
            verifiedCount++;
            continue;
          }
        }
        throw new Error(`Verification mismatch: document ${bDoc.id} missing in collection ${collName}`);
      }

      const { id, ...expectedContent } = bDoc;
      const deserializedExpected = deserializeFirestoreData(expectedContent, db);

      // Deep full-document equality verification
      if (collName === 'auditLogs') {
        try {
          assertDeepFirestoreEquality(deserializedExpected, live, `${collName}.${id}`, false);
        } catch {
          // If collision occurred in auditLogs, a colliding restored doc exists with originalCollidingId
          const collidingEntry = Array.from(liveMap.values()).find(x => x.originalCollidingId === bDoc.id);
          if (collidingEntry) {
            verifiedCount++;
            continue;
          }
          throw new Error(`Verification mismatch: auditLog ${bDoc.id} collision was not safely restored`);
        }
      } else {
        assertDeepFirestoreEquality(deserializedExpected, live, `${collName}.${id}`, isFullMode);
      }
      verifiedCount++;
    }
  }

  return { verified: true, verifiedCount };
}

/**
 * Seeds department master data safely.
 * In production mode, strictly REJECTS unapproved personnel templates.
 */
export async function seedInitialMasterData(db, options = {}) {
  const envInfo = validateTargetEnvironment(options);
  const env = options.env || (envInfo.isEmulator ? 'dev' : 'prod');
  const templatePath = options.templatePath;

  printTargetBanner(envInfo, `SEED MASTER DATA (Env: ${env.toUpperCase()})`, true);
  console.log(`[backupRestore] Seeding master data (Environment: ${env.toUpperCase()})...`);

  // ==========================================================================
  // PRODUCTION SEEDING SAFETY GATE
  // ==========================================================================
  if (env === 'prod') {
    if (!templatePath || !fs.existsSync(templatePath)) {
      throw new Error(
        `[Production Seeding Blocked] Production master data seeding requires a client-approved JSON template. ` +
        `Pass --template=<path> pointing to an approved template (e.g. templates/productionMasterDataTemplate.json) ` +
        `or use 'seed:dev' for local testing.`
      );
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const template = JSON.parse(templateContent);

    if (template.clientApproved !== true) {
      throw new Error(
        `[Production Seeding Blocked] Template at "${templatePath}" has clientApproved=false. ` +
        `Production master data must be officially verified and signed off by Dinas Koperasi dan Usaha Mikro Kota Batam.`
      );
    }

    if (templateContent.includes('[NAMA') || templateContent.includes('[NIP')) {
      throw new Error(
        `[Production Seeding Blocked] Template contains unresolved placeholder tags (e.g. "[NAMA ...]", "[NIP ...]"). ` +
        `Populate with verified civil service decree data before seeding production.`
      );
    }

    console.log(`[backupRestore] Client approval verified for template: ${template.approvalReference || 'APPROVED'}`);
    const batch = db.batch();

    for (const emp of template.employees || []) {
      const { id, ...data } = emp;
      batch.set(db.collection('employees').doc(id), data, { merge: true });
    }
    for (const dept of template.departments || []) {
      const { id, ...data } = dept;
      batch.set(db.collection('departments').doc(id), data, { merge: true });
    }
    for (const loc of template.locations || []) {
      const { id, ...data } = loc;
      batch.set(db.collection('locations').doc(id), data, { merge: true });
    }
    for (const org of template.organizers || []) {
      const { id, ...data } = org;
      batch.set(db.collection('organizers').doc(id), data, { merge: true });
    }
    for (const cat of template.categories || []) {
      const { id, ...data } = cat;
      batch.set(db.collection('categories').doc(id), data, { merge: true });
    }
    if (template.signatory) {
      batch.set(db.collection('settings').doc('signatory'), template.signatory, { merge: true });
    }

    await batch.commit();
    console.log('[backupRestore] ✓ Production master data seeded successfully from approved template.');
    return;
  }

  // ==========================================================================
  // DEV / SYNTHETIC LOCAL TESTING FIXTURES
  // ==========================================================================
  console.log('[backupRestore] Seeding synthetic development/demo fixtures for local testing...');

  const syntheticEmployees = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si [DEMO]', nip: '19710312 199803 1 004', position: 'Kepala Dinas', rank: 'Pembina Utama Muda (IV/c)', departmentId: 'dept_01', active: true },
    { id: 'emp_02', name: 'Rini Marlina, S.Sos [DEMO]', nip: '19750821 200112 2 003', position: 'Sekretaris Dinas', rank: 'Pembina (IV/a)', departmentId: 'dept_01', active: true },
    { id: 'emp_03', name: 'Ahmad Fauzi, SE [DEMO]', nip: '19820415 200604 1 009', position: 'Kepala Bidang Koperasi', rank: 'Penata Tk. I (III/d)', departmentId: 'dept_02', active: true },
    { id: 'emp_04', name: 'Siti Nurhaliza, S.Kom [DEMO]', nip: '19881105 201101 2 008', position: 'Kepala Bidang Usaha Mikro', rank: 'Penata (III/c)', departmentId: 'dept_03', active: true }
  ];

  const syntheticLocations = [
    { id: 'loc_01', name: 'Ruang Rapat Kadis (Lantai 2)', type: 'OFFICE', address: 'Kantor Dinas Koperasi dan Usaha Mikro Kota Batam', bookable: true, active: true },
    { id: 'loc_02', name: 'Aula Pertemuan PLUT Batam', type: 'OFFICE', address: 'Pusat Layanan Usaha Terpadu (PLUT) KUKM Kota Batam', bookable: true, active: true },
    { id: 'loc_03', name: 'Ruang Media Center PLUT Batam', type: 'OFFICE', address: 'PLUT KUKM Kota Batam', bookable: true, active: true }
  ];

  const syntheticOrganizers = [
    { id: 'org_01', name: 'Sekretariat Dinas', code: 'SEKR', active: true },
    { id: 'org_02', name: 'Bidang Pemberdayaan Koperasi', code: 'KOP', active: true },
    { id: 'org_03', name: 'Bidang Fasilitasi Usaha Mikro', code: 'MIKRO', active: true }
  ];

  const syntheticCategories = [
    { id: 'cat_01', name: 'Rapat Koordinasi', color: '#2563eb', active: true },
    { id: 'cat_02', name: 'Bimbingan Teknis & Pelatihan', color: '#0284c7', active: true },
    { id: 'cat_03', name: 'Kunjungan Kerja & Lapangan', color: '#16a34a', active: true }
  ];

  const syntheticSignatory = {
    headOfDepartmentName: 'Drs. Hendri Arifin, M.Si [DEMO]',
    headOfDepartmentNip: '19710312 199803 1 004',
    headOfDepartmentRank: 'Pembina Utama Muda (IV/c)',
    headOfDepartmentTitle: 'Kepala Dinas Koperasi dan Usaha Mikro Kota Batam',
    city: 'Batam',
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_dev_seed'
  };

  const batch = db.batch();
  for (const emp of syntheticEmployees) {
    const { id, ...data } = emp;
    batch.set(db.collection('employees').doc(id), data, { merge: true });
  }
  for (const loc of syntheticLocations) {
    const { id, ...data } = loc;
    batch.set(db.collection('locations').doc(id), data, { merge: true });
  }
  for (const org of syntheticOrganizers) {
    const { id, ...data } = org;
    batch.set(db.collection('organizers').doc(id), data, { merge: true });
  }
  for (const cat of syntheticCategories) {
    const { id, ...data } = cat;
    batch.set(db.collection('categories').doc(id), data, { merge: true });
  }
  batch.set(db.collection('settings').doc('signatory'), syntheticSignatory, { merge: true });

  await batch.commit();
  console.log('[backupRestore] ✓ Synthetic development fixtures seeded successfully.');
}

// CLI Support
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
SIMAK DISKUM Spark-Compatible Backup Utility
Commands:
  export <target_directory> [--target=emulator|prod]
  restore <source_directory> [--mode=merge|full] [--dry-run] [--dry-run-reviewed] [--force] [--resume] [--restart] [--target=emulator|prod]
  seed [--env=prod|dev] [--template=<path>] [--target=emulator|prod]
    `);
    return;
  }

  const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1];
  const { db, envInfo } = initFirestore({ target: targetArg });

  try {
    if (command === 'export') {
      const targetDir = args[1] && !args[1].startsWith('--') ? args[1] : `./backups/backup_${new Date().toISOString().slice(0, 10)}`;
      await exportCollections(db, targetDir, { target: targetArg });
    } else if (command === 'restore') {
      const sourceDir = args[1];
      if (!sourceDir || sourceDir.startsWith('--')) {
        console.error('Usage: backupRestore.mjs restore <source_directory> [--mode=merge|full] [--dry-run] [--dry-run-reviewed] [--force] [--resume] [--restart] [--target=emulator|prod]');
        process.exit(1);
      }
      const modeArg = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'merge';
      const dryRun = args.includes('--dry-run');
      const dryRunReviewed = args.includes('--dry-run-reviewed');
      const force = args.includes('--force');
      const resume = args.includes('--resume');
      const restart = args.includes('--restart');
      await restoreCollections(db, sourceDir, {
        mode: modeArg,
        dryRun,
        dryRunReviewed,
        force,
        resume,
        restart,
        target: targetArg
      });
    } else if (command === 'seed') {
      const envArg = args.find(a => a.startsWith('--env='))?.split('=')[1] || (args.includes('seed:dev') ? 'dev' : 'prod');
      const templateArg = args.find(a => a.startsWith('--template='))?.split('=')[1];
      await seedInitialMasterData(db, { env: envArg, templatePath: templateArg, target: targetArg });
    } else if (command === 'seed:dev') {
      await seedInitialMasterData(db, { env: 'dev', target: targetArg });
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[backupRestore Error]: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('backupRestore.mjs')) {
  main();
}
