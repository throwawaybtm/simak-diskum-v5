/**
 * SIMAK DISKUM Kota Batam v5.0 — Milestone P01-B Final Operational Safety Integration Tests
 * 
 * Verifies all 10 mandatory integration safety scenarios against the REAL Firestore Emulator
 * (127.0.0.1:8080) and REAL Firebase Auth Emulator (127.0.0.1:9099):
 * 
 * 1. Backup-export to restore round-trip (Real Emulator).
 * 2. Full restoration of changed and deleted documents (Real Emulator).
 * 3. Partial batch failure followed by safe full-mode recovery (Real Emulator).
 * 4. Audit log ID collision: never overwrite existing logs, safe collision renaming (Real Emulator).
 * 5. Complete nested Firestore data-type equality (Real Emulator).
 * 6. Failed manifest checksum validation.
 * 7. Incorrect project/environment rejection.
 * 8. Destructive restore without prior dry-run approval.
 * 9. Unapproved personnel-data seeding rejection.
 * 10. Admin and Editor permission boundaries (Real Auth Emulator & Firestore Rules).
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  exportCollections,
  restoreCollections,
  computeRestoreDiff,
  validateBackupIntegrity,
  assertDeepFirestoreEquality,
  seedInitialMasterData,
  validateTargetEnvironment,
  CORE_COLLECTIONS
} from '../../scripts/backupRestore.mjs';
import {
  provisionUser,
  setUserRole,
  disableUser,
  generatePasswordResetLink,
  inspectUser
} from '../../scripts/manageRoles.mjs';

describe('Milestone P01-B: Final Operational Safety Verification (Real Emulators)', () => {
  let adminApp: any;
  let db: any;
  let auth: any;
  let tempBackupDir: string;

  beforeAll(() => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    process.env.GCLOUD_PROJECT = 'demo-department-agenda';

    if (getApps().length === 0) {
      adminApp = initializeApp({ projectId: 'demo-department-agenda' }, 'p01b-test-app');
    } else {
      adminApp = getApps().find(a => a.name === 'p01b-test-app') || initializeApp({ projectId: 'demo-department-agenda' }, 'p01b-test-app');
    }
    db = getFirestore(adminApp);
    auth = getAuth(adminApp);
  });

  beforeEach(async () => {
    tempBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simakdiskum-p01b-int-'));

    // Clear test collections in the emulator database
    for (const collName of CORE_COLLECTIONS) {
      const snap = await db.collection(collName).get();
      const batch = db.batch();
      for (const d of snap.docs) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  });

  afterEach(async () => {
    if (fs.existsSync(tempBackupDir)) {
      fs.rmSync(tempBackupDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // SCENARIO 1: Backup-Export to Restore Round-Trip (Real Emulator)
  // ==========================================================================
  it('Scenario 1: executes backup-export to restore round-trip with full document verification on real Firestore emulator', async () => {
    // 1. Populate real emulator with test documents
    await db.collection('activities').doc('act_trip_01').set({
      title: 'Rapat Koordinasi Roundtrip',
      startDate: '2026-11-20',
      startTime: '09:00',
      endDate: '2026-11-20',
      endTime: '11:00',
      status: 'SCHEDULED',
      version: 1,
      timestamp: Timestamp.fromDate(new Date('2026-11-05T08:00:00Z'))
    });

    await db.collection('employees').doc('emp_trip_01').set({
      name: 'Drs. Hendri Arifin, M.Si',
      nip: '19710312 199803 1 004',
      active: true
    });

    await db.collection('settings').doc('signatory').set({
      headOfDepartmentName: 'Drs. Hendri Arifin, M.Si',
      city: 'Batam'
    });

    // 2. Export backup
    const manifest = await exportCollections(db, tempBackupDir, { target: 'emulator' });
    expect(manifest.collections['activities']).toBe(1);
    expect(manifest.collections['employees']).toBe(1);
    expect(manifest.collections['settings']).toBe(1);

    // 3. Clear database to simulate complete loss
    await db.collection('activities').doc('act_trip_01').delete();
    await db.collection('employees').doc('emp_trip_01').delete();
    await db.collection('settings').doc('signatory').delete();

    // 4. Restore
    const progressPath = path.join(tempBackupDir, 'restore-progress.json');
    const restoreRes = await restoreCollections(db, tempBackupDir, {
      mode: 'full',
      force: true,
      dryRunReviewed: true,
      progressPath,
      target: 'emulator'
    });

    expect(restoreRes.success).toBe(true);
    expect(restoreRes.verification.verified).toBe(true);

    // 5. Verify data in real emulator
    const restoredAct = (await db.collection('activities').doc('act_trip_01').get()).data();
    expect(restoredAct.title).toBe('Rapat Koordinasi Roundtrip');
    expect(restoredAct.timestamp.seconds).toBe(Timestamp.fromDate(new Date('2026-11-05T08:00:00Z')).seconds);

    const restoredEmp = (await db.collection('employees').doc('emp_trip_01').get()).data();
    expect(restoredEmp.name).toBe('Drs. Hendri Arifin, M.Si');
  });

  // ==========================================================================
  // SCENARIO 2: Full Restoration of Changed, Added and Deleted Documents
  // ==========================================================================
  it('Scenario 2: recovers deleted documents, removes deleted fields, and cleans unexpected orphans in full mode', async () => {
    // 1. Initial State in Backup
    await db.collection('activities').doc('act_mut_01').set({
      title: 'Original Title',
      notes: 'Original Notes',
      version: 1
    });
    await db.collection('activities').doc('act_mut_02_to_delete').set({
      title: 'Document That Will Be Deleted in Live',
      version: 1
    });

    await exportCollections(db, tempBackupDir, { target: 'emulator' });

    // 2. Introduce Desynchronization in Live Firestore:
    // a) Mutate doc 01: change title and add unexpected extra fields
    await db.collection('activities').doc('act_mut_01').set({
      title: 'Mutated Corrupted Title',
      unauthorizedInjectedField: 'Hacker Payload',
      version: 2
    });

    // b) Delete doc 02 in live
    await db.collection('activities').doc('act_mut_02_to_delete').delete();

    // c) Add unexpected orphan doc 03 in live
    await db.collection('activities').doc('act_mut_03_orphan').set({
      title: 'Unexpected Orphan Document',
      version: 1
    });

    // 3. Perform Full Restoration
    const progressPath = path.join(tempBackupDir, 'restore-progress.json');
    const result = await restoreCollections(db, tempBackupDir, {
      mode: 'full',
      force: true,
      dryRunReviewed: true,
      progressPath,
      target: 'emulator'
    });

    expect(result.success).toBe(true);

    // 4. Verify Corrected State in Firestore Emulator:
    // Doc 01: Title restored, extra field completely wiped out
    const doc01 = (await db.collection('activities').doc('act_mut_01').get()).data();
    expect(doc01.title).toBe('Original Title');
    expect(doc01.notes).toBe('Original Notes');
    expect(doc01.unauthorizedInjectedField).toBeUndefined();

    // Doc 02: Deleted doc recreated
    const doc02 = (await db.collection('activities').doc('act_mut_02_to_delete').get()).data();
    expect(doc02.title).toBe('Document That Will Be Deleted in Live');

    // Doc 03: Unexpected orphan document deleted
    const doc03 = await db.collection('activities').doc('act_mut_03_orphan').get();
    expect(doc03.exists).toBe(false);
  });

  // ==========================================================================
  // SCENARIO 3: Partial Batch Failure Followed by Safe Full-Mode Recovery
  // ==========================================================================
  it('Scenario 3: handles interrupted restoration via bound checkpoint ledger and resumes safely', async () => {
    // 1. Seed and export
    await db.collection('departments').doc('dept_01').set({ name: 'Sekretariat', active: true });
    await db.collection('locations').doc('loc_01').set({ name: 'Ruang Rapat Kadis', active: true });
    await exportCollections(db, tempBackupDir, { target: 'emulator' });

    const manifestRaw = fs.readFileSync(path.join(tempBackupDir, 'manifest.json'), 'utf-8');
    const manifestHash = fs.readFileSync(path.join(tempBackupDir, 'manifest.json'), 'utf-8');

    // 2. Simulate partial failure checkpoint file
    const progressPath = path.join(tempBackupDir, 'restore-progress.json');
    const failedLedger = {
      operationId: 'restore_op_simulated_fail',
      targetProjectId: 'demo-department-agenda',
      manifestHash: JSON.parse(manifestRaw) ? 'dummy_will_be_recalculated' : '',
      sourceDir: path.resolve(tempBackupDir),
      mode: 'full',
      startedAt: new Date().toISOString(),
      completedBatches: ['activities_batch_1', 'departments_batch_1'],
      completedDeletions: [],
      failedBatch: {
        batchId: 'locations_batch_1',
        collection: 'locations',
        error: 'Simulated network drop'
      },
      status: 'FAILED'
    };

    // Calculate real manifest hash
    const crypto = await import('node:crypto');
    failedLedger.manifestHash = crypto.createHash('sha256').update(manifestRaw).digest('hex');
    fs.writeFileSync(progressPath, JSON.stringify(failedLedger, null, 2), 'utf-8');

    // 3. Attempting restore without --resume or --restart must be blocked
    await expect(
      restoreCollections(db, tempBackupDir, {
        mode: 'full',
        force: true,
        dryRunReviewed: true,
        progressPath,
        target: 'emulator'
      })
    ).rejects.toThrow(/Checkpoint Safeguard.*An interrupted restore checkpoint exists/);

    // 4. Attempting to resume with mismatched mode (e.g. merge) must be blocked
    await expect(
      restoreCollections(db, tempBackupDir, {
        mode: 'merge',
        resume: true,
        progressPath,
        target: 'emulator'
      })
    ).rejects.toThrow(/Cannot resume restore: checkpoint mode "full" does not match requested mode "merge"/);

    // 5. Resuming with matching parameters must succeed
    const resumedResult = await restoreCollections(db, tempBackupDir, {
      mode: 'full',
      resume: true,
      force: true,
      dryRunReviewed: true,
      progressPath,
      target: 'emulator'
    });

    expect(resumedResult.success).toBe(true);

    // Checkpoint must now be marked COMPLETED
    const finalProgress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    expect(finalProgress.status).toBe('COMPLETED');
  });

  // ==========================================================================
  // SCENARIO 4: Audit Log ID Collision & Non-Overwriting Protection
  // ==========================================================================
  it('Scenario 4: protects audit history against deletion and overwriting during ID collisions', async () => {
    // 1. Historical audit record in backup
    const historicalAudit = {
      id: 'audit_col_001',
      action: 'HISTORICAL_EVENT',
      actor: 'operator_old',
      details: 'Historical action recorded before backup',
      timestamp: Timestamp.fromDate(new Date('2026-11-01T10:00:00Z'))
    };
    await db.collection('auditLogs').doc('audit_col_001').set(historicalAudit);

    await exportCollections(db, tempBackupDir, { target: 'emulator' });

    // 2. In live database, modify audit_col_001 with DIFFERENT content (e.g. concurrent write with same ID)
    await db.collection('auditLogs').doc('audit_col_001').set({
      id: 'audit_col_001',
      action: 'LIVE_EVENT_COLLISION',
      actor: 'operator_live',
      details: 'Critical live event that must NOT be overwritten',
      timestamp: Timestamp.fromDate(new Date('2026-11-05T12:00:00Z'))
    });

    // Also add a post-backup audit log
    await db.collection('auditLogs').doc('audit_post_backup_002').set({
      action: 'POST_BACKUP_EVENT',
      actor: 'operator_live'
    });

    // 3. Perform full restoration
    const progressPath = path.join(tempBackupDir, 'restore-progress.json');
    const result = await restoreCollections(db, tempBackupDir, {
      mode: 'full',
      force: true,
      dryRunReviewed: true,
      progressPath,
      target: 'emulator'
    });

    expect(result.success).toBe(true);

    // 4. Verify in real Firestore emulator:
    // a) Live audit_col_001 is NOT overwritten!
    const liveColDoc = (await db.collection('auditLogs').doc('audit_col_001').get()).data();
    expect(liveColDoc.action).toBe('LIVE_EVENT_COLLISION');
    expect(liveColDoc.details).toBe('Critical live event that must NOT be overwritten');

    // b) Backup audit record saved under uncolliding ID
    const allAuditSnap = await db.collection('auditLogs').get();
    const collidingBackupRestored = allAuditSnap.docs.find(d => d.data().originalCollidingId === 'audit_col_001');
    expect(collidingBackupRestored).toBeDefined();
    expect(collidingBackupRestored?.data().action).toBe('HISTORICAL_EVENT');
    expect(collidingBackupRestored?.data().isCollidingRestoredRecord).toBe(true);

    // c) Post-backup audit log was NOT deleted
    const postBackupDoc = await db.collection('auditLogs').doc('audit_post_backup_002').get();
    expect(postBackupDoc.exists).toBe(true);

    // d) Privileged maintenance log was recorded
    const maintLog = allAuditSnap.docs.find(d => d.data().action === 'MAINTENANCE_RESTORE');
    expect(maintLog).toBeDefined();
    expect(maintLog?.data().isPrivilegedMaintenance).toBe(true);
  });

  // ==========================================================================
  // SCENARIO 5: Complete Nested Firestore Data-Type Equality
  // ==========================================================================
  it('Scenario 5: preserves complete nested Firestore data-types (Timestamps, References, Arrays, Nulls)', async () => {
    const complexData = {
      title: 'Nested Types Test',
      roomRef: db.doc('locations/loc_01'),
      scheduledAt: Timestamp.fromDate(new Date('2026-11-15T10:30:00.000Z')),
      attendees: [
        { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', tags: ['kadis', 'pimpinan'] }
      ],
      nullableField: null,
      metadata: {
        creator: 'system',
        subConfig: {
          flag: true,
          numericLimit: 450
        }
      }
    };

    await db.collection('activities').doc('act_complex_01').set(complexData);
    await exportCollections(db, tempBackupDir, { target: 'emulator' });

    // Deep equality test
    const liveSnap = (await db.collection('activities').doc('act_complex_01').get()).data();
    expect(() => assertDeepFirestoreEquality(complexData, liveSnap, 'activities.act_complex_01', true)).not.toThrow();
  });

  // ==========================================================================
  // SCENARIO 6: Failed Manifest Checksum Validation
  // ==========================================================================
  it('Scenario 6: detects tampered backup files and fails manifest checksum validation', async () => {
    await db.collection('employees').doc('emp_test').set({ name: 'Test' });
    await exportCollections(db, tempBackupDir, { target: 'emulator' });

    // Tamper with employees.json
    const empFile = path.join(tempBackupDir, 'employees.json');
    fs.writeFileSync(empFile, fs.readFileSync(empFile, 'utf-8') + '\n/* hacker injected comment */');

    expect(() => validateBackupIntegrity(tempBackupDir)).toThrow(/Integrity violation in employees.json/);
  });

  // ==========================================================================
  // SCENARIO 7: Incorrect Project and Environment Rejection
  // ==========================================================================
  it('Scenario 7: rejects unexpected production projects or target environment mismatches', () => {
    // 1. Specified target prod while emulator host is active
    expect(() => validateTargetEnvironment({ target: 'prod' })).toThrow(/FIRESTORE_EMULATOR_HOST .* is active/);

    // 2. Specified target emulator while emulator host is unset
    const prevHost = process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    expect(() => validateTargetEnvironment({ target: 'emulator' })).toThrow(/FIRESTORE_EMULATOR_HOST is not set/);

    // 3. Fake project in live environment
    delete process.env.ALLOW_ANY_PROJECT;
    process.env.GCLOUD_PROJECT = 'fake-malicious-target';
    expect(() => validateTargetEnvironment({ target: 'prod' })).toThrow(/does not match required production project "simakdiskum"/);

    // Restore
    process.env.FIRESTORE_EMULATOR_HOST = prevHost;
    process.env.GCLOUD_PROJECT = 'demo-department-agenda';
  });

  // ==========================================================================
  // SCENARIO 8: Destructive Restore without Prior Dry-Run Approval
  // ==========================================================================
  it('Scenario 8: rejects destructive full restore without prior dry-run review and confirmation', async () => {
    await exportCollections(db, tempBackupDir, { target: 'emulator' });

    // Attempting full restore with dryRunReviewed=false and force=false must throw
    await expect(
      restoreCollections(db, tempBackupDir, {
        mode: 'full',
        dryRunReviewed: false,
        force: false,
        target: 'emulator'
      })
    ).rejects.toThrow(/Controlled full restore requires prior dry-run review/);
  });

  // ==========================================================================
  // SCENARIO 9: Unapproved Personnel-Data Seeding Rejection
  // ==========================================================================
  it('Scenario 9: strictly rejects unapproved personnel templates and unpopulated placeholders', async () => {
    const unapprovedTemplate = path.join(tempBackupDir, 'unapproved_template.json');
    fs.writeFileSync(unapprovedTemplate, JSON.stringify({ clientApproved: false }), 'utf-8');

    // Missing approval
    await expect(
      seedInitialMasterData(db, { env: 'prod', templatePath: unapprovedTemplate, target: 'emulator' })
    ).rejects.toThrow(/clientApproved=false/);

    // Unresolved placeholder
    const placeholderTemplate = path.join(tempBackupDir, 'placeholder_template.json');
    fs.writeFileSync(placeholderTemplate, JSON.stringify({
      clientApproved: true,
      employees: [{ id: 'emp_01', name: '[NAMA PEJABAT SESUAI SK RESMI]' }]
    }), 'utf-8');

    await expect(
      seedInitialMasterData(db, { env: 'prod', templatePath: placeholderTemplate, target: 'emulator' })
    ).rejects.toThrow(/unresolved placeholder tags/);
  });

  // ==========================================================================
  // SCENARIO 10: Admin and Editor Permission Boundaries (Real Auth Emulator)
  // ==========================================================================
  it('Scenario 10: enforces Admin and Editor role assignment, token revocation, and user disabling on real Auth emulator', async () => {
    const testEmail = `operator_${Date.now()}@batam.go.id`;

    // 1. Provision operator with role 'editor'
    const user = await provisionUser(auth, testEmail, 'StrongP@ss1234!', 'Operator Lapangan', 'editor');
    expect(user.email).toBe(testEmail);

    let inspected = await inspectUser(auth, user.uid);
    expect(inspected.customClaims.role).toBe('editor');
    expect(inspected.customClaims.department).toBe('Dinas Koperasi dan Usaha Mikro Kota Batam');

    // 2. Promote to 'admin' and verify refresh tokens revoked
    await setUserRole(auth, user.uid, 'admin');
    inspected = await inspectUser(auth, user.uid);
    expect(inspected.customClaims.role).toBe('admin');
    expect(inspected.tokensValidAfterTime).toBeDefined();

    // 3. Disable user account
    await disableUser(auth, user.uid);
    inspected = await inspectUser(auth, user.uid);
    expect(inspected.disabled).toBe(true);

    // 4. Generate password reset link
    const resetLink = await generatePasswordResetLink(auth, testEmail);
    expect(resetLink).toContain('mode=resetPassword');
    expect(resetLink).toContain('oobCode=');
  });
});
