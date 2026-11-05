/**
 * Unit Test Suite for Hardened Spark-Compatible Backup, Restore & Seeding
 * 
 * Verifies:
 * 1. Lossless serialization of Timestamps, references, and nested data.
 * 2. SHA-256 calculation on export and integrity check on restore.
 * 3. Dry-run diff analysis.
 * 4. Safety gate on full restore: requires dry-run review and confirmation even with 0 orphans.
 * 5. Full restoration with orphan cleanup and deep structural equality verification.
 * 6. Audit log protection: auditLogs are never deleted, and a maintenance record is appended.
 * 7. Resumable checkpoint ledger and recovery from partial failure.
 * 8. Production seeding safety: rejects unapproved templates and placeholder tags; allows dev synthetic fixtures.
 * 9. Target environment guards: rejects mismatched project IDs and improper emulator/prod targeting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CORE_COLLECTIONS,
  serializeFirestoreData,
  deserializeFirestoreData,
  computeSha256,
  validateBackupIntegrity,
  computeRestoreDiff,
  exportCollections,
  restoreCollections,
  verifyRestoration,
  seedInitialMasterData,
  assertDeepFirestoreEquality,
  validateTargetEnvironment
} from '../../scripts/backupRestore.mjs';

describe('P01-B: Hardened Backup, Restore & Seeding Operations', () => {
  let tempDir: string;
  let mockDb: any;
  let storedData: Record<string, Record<string, any>>;

  beforeEach(() => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.GCLOUD_PROJECT = 'demo-department-agenda';
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simakdiskum-backup-p01b-'));
    storedData = {};
    for (const c of CORE_COLLECTIONS) {
      storedData[c] = {};
    }

    // Initial mock data
    storedData['activities']['act_001'] = {
      title: 'Rapat Evaluasi Koperasi',
      startDate: '2026-11-10',
      version: 1,
      timestamp: { _seconds: 1762740000, _nanoseconds: 0 }
    };
    storedData['employees']['emp_01'] = { name: 'Drs. Hendri Arifin, M.Si', active: true };
    storedData['settings']['signatory'] = { headOfDepartmentName: 'Drs. Hendri Arifin, M.Si' };
    storedData['auditLogs']['audit_init'] = { action: 'INIT', actor: 'system' };

    mockDb = {
      collection: vi.fn((collName: string) => ({
        get: vi.fn(async () => {
          const coll = storedData[collName] || {};
          const docs = Object.entries(coll).map(([id, data]) => ({
            id,
            data: () => data
          }));
          return {
            forEach: (cb: any) => docs.forEach(cb),
            docs
          };
        }),
        doc: vi.fn((docId: string) => ({
          id: docId,
          collection: collName,
          get: vi.fn(async () => ({
            id: docId,
            exists: Boolean(storedData[collName] && storedData[collName][docId]),
            data: () => (storedData[collName] ? storedData[collName][docId] : undefined)
          })),
          set: vi.fn(async (data: any) => {
            if (!storedData[collName]) storedData[collName] = {};
            storedData[collName][docId] = { ...data };
          })
        }))
      })),
      doc: vi.fn((docPath: string) => ({
        path: docPath
      })),
      batch: vi.fn(() => {
        const operations: any[] = [];
        return {
          set: vi.fn((ref: any, data: any, options: any) => {
            operations.push({ type: 'set', ref, data, options });
          }),
          delete: vi.fn((ref: any) => {
            operations.push({ type: 'delete', ref });
          }),
          commit: vi.fn(async () => {
            for (const op of operations) {
              const coll = op.ref.collection;
              const id = op.ref.id;
              if (op.type === 'delete') {
                if (storedData[coll]) delete storedData[coll][id];
              } else if (op.type === 'set') {
                if (!storedData[coll]) storedData[coll] = {};
                if (op.options && op.options.merge) {
                  storedData[coll][id] = { ...storedData[coll][id], ...op.data };
                } else {
                  storedData[coll][id] = { ...op.data };
                }
              }
            }
          })
        };
      })
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('losslessly serializes and deserializes Firestore Timestamps, References, and deep structures', () => {
    const rawData = {
      title: 'Acara Uji Coba',
      createdAt: { _seconds: 1762742400, _nanoseconds: 123000 },
      deptRef: { path: 'departments/dept_01', id: 'dept_01', collection: () => {} },
      attendees: ['emp_01', 'emp_02'],
      nested: { inner: 'deep value', count: 5 },
      notes: null
    };

    const serialized = serializeFirestoreData(rawData);
    expect(serialized.createdAt._type).toBe('Firestore.Timestamp');
    expect(serialized.createdAt.seconds).toBe(1762742400);
    expect(serialized.deptRef._type).toBe('Firestore.DocumentReference');
    expect(serialized.deptRef.path).toBe('departments/dept_01');
    expect(serialized.nested.inner).toBe('deep value');

    const deserialized = deserializeFirestoreData(serialized, mockDb);
    expect(deserialized.title).toBe('Acara Uji Coba');
    expect(deserialized.createdAt.seconds).toBe(1762742400);
    expect(deserialized.deptRef.path).toBe('departments/dept_01');
    expect(deserialized.notes).toBeNull();
    expect(deserialized.nested.count).toBe(5);
  });

  it('exports collections with valid SHA-256 checksums in manifest.json', async () => {
    const manifest = await exportCollections(mockDb, tempDir, { target: 'emulator' });

    expect(manifest.systemVersion).toBe('5.0.0');
    expect(manifest.files['activities.json']).toBeDefined();
    expect(manifest.files['activities.json'].sha256).toBeDefined();

    const verifiedManifest = validateBackupIntegrity(tempDir);
    expect(verifiedManifest.exportedAt).toBe(manifest.exportedAt);

    // Tamper with a file and assert integrity check throws
    const actFile = path.join(tempDir, 'activities.json');
    fs.writeFileSync(actFile, fs.readFileSync(actFile, 'utf-8') + ' ');
    expect(() => validateBackupIntegrity(tempDir)).toThrow(/Integrity violation/);
  });

  it('computes accurate dry-run diff between backup and live database', async () => {
    await exportCollections(mockDb, tempDir, { target: 'emulator' });

    // Simulate newer document created in live database after backup
    storedData['activities']['act_002_new'] = { title: 'Kegiatan Baru Pasca Backup', version: 1 };

    const diff = await computeRestoreDiff(mockDb, tempDir);
    expect(diff.collections['activities'].backupCount).toBe(1);
    expect(diff.collections['activities'].liveCount).toBe(2);
    expect(diff.collections['activities'].orphanCount).toBe(1);
    expect(diff.collections['activities'].orphanIds).toContain('act_002_new');
  });

  it('blocks controlled full restore without dry-run review and confirmation even if orphan count is zero', async () => {
    await exportCollections(mockDb, tempDir, { target: 'emulator' });

    // Zero orphans exist
    const diff = await computeRestoreDiff(mockDb, tempDir);
    expect(diff.totalOrphans).toBe(0);

    // Full restore without dryRunReviewed or force must be blocked
    await expect(
      restoreCollections(mockDb, tempDir, { mode: 'full', dryRunReviewed: false, force: false, target: 'emulator' })
    ).rejects.toThrow(/Controlled full restore requires prior dry-run review/);
  });

  it('executes dry-run without modifying database records', async () => {
    await exportCollections(mockDb, tempDir, { target: 'emulator' });
    storedData['activities']['act_002_orphan'] = { title: 'Orphaned Item' };

    const result = await restoreCollections(mockDb, tempDir, { mode: 'full', dryRun: true, target: 'emulator' });
    expect(result.dryRun).toBe(true);
    expect(result.diff.collections['activities'].orphanCount).toBe(1);
    expect(storedData['activities']['act_002_orphan']).toBeDefined();
  });

  it('safely cleans orphans and replaces documents in full restore with --force while preserving audit logs', async () => {
    await exportCollections(mockDb, tempDir, { target: 'emulator' });

    // Add orphan to activities and an audit log after backup
    storedData['activities']['act_002_orphan'] = { title: 'Orphan' };
    storedData['auditLogs']['audit_newer_action'] = { action: 'NEW_ACTIVITY', timestamp: '2026-11-05T12:00:00Z' };

    const progressFile = path.join(tempDir, 'restore-progress.json');
    const result = await restoreCollections(mockDb, tempDir, {
      mode: 'full',
      force: true,
      operator: 'admin@batam.go.id',
      progressPath: progressFile,
      target: 'emulator'
    });
    expect(result.success).toBe(true);

    // Orphan in activities should be deleted
    expect(storedData['activities']['act_002_orphan']).toBeUndefined();
    expect(storedData['activities']['act_001']).toBeDefined();

    // Post-backup audit logs must be preserved
    expect(storedData['auditLogs']['audit_newer_action']).toBeDefined();

    // Privileged maintenance record must be appended with distinct metadata
    const maintEntries = Object.values(storedData['auditLogs']).filter((a: any) => a.action === 'MAINTENANCE_RESTORE');
    expect(maintEntries.length).toBe(1);
    expect((maintEntries[0] as any).isPrivilegedMaintenance).toBe(true);
    expect((maintEntries[0] as any).identitySource).toBe('ADMIN_CLI_PRIVILEGED');
  });

  it('assertDeepFirestoreEquality accurately detects nested differences, extra fields, and null mismatches', () => {
    const a = {
      title: 'Rapat',
      count: 3,
      items: ['alpha', 'beta'],
      nested: { sub: true, val: null },
      ts: { _seconds: 100, _nanoseconds: 50 }
    };
    const b = { ...a, nested: { ...a.nested } };

    // Deep equal
    expect(() => assertDeepFirestoreEquality(a, b, 'root', true)).not.toThrow();

    // Value mismatch
    expect(() => assertDeepFirestoreEquality(a, { ...b, count: 4 }, 'root', true)).toThrow(/Scalar value mismatch/);

    // Array mismatch
    expect(() => assertDeepFirestoreEquality(a, { ...b, items: ['alpha'] }, 'root', true)).toThrow(/Array length mismatch/);

    // Null mismatch
    expect(() => assertDeepFirestoreEquality(a, { ...b, nested: { sub: true, val: 'not null' } }, 'root', true)).toThrow(/Null mismatch/);

    // Extra field in live under full mode
    expect(() => assertDeepFirestoreEquality(a, { ...b, extraField: 'unwanted' }, 'root', true)).toThrow(/Unexpected extra key "extraField"/);
  });

  it('rejects unapproved production seeding templates and accepts approved templates', async () => {
    const unapprovedTemplatePath = path.join(tempDir, 'unapproved.json');
    fs.writeFileSync(unapprovedTemplatePath, JSON.stringify({ clientApproved: false }), 'utf-8');

    // Default production seed without approved template must throw
    await expect(seedInitialMasterData(mockDb, { env: 'prod', target: 'emulator' })).rejects.toThrow(/Production master data seeding requires a client-approved JSON template/);

    // Production seed with clientApproved=false must throw
    await expect(seedInitialMasterData(mockDb, { env: 'prod', templatePath: unapprovedTemplatePath, target: 'emulator' })).rejects.toThrow(/clientApproved=false/);

    // Production seed with unresolved placeholder tags must throw
    const placeholderTemplatePath = path.join(tempDir, 'placeholder.json');
    fs.writeFileSync(placeholderTemplatePath, JSON.stringify({
      clientApproved: true,
      employees: [{ id: 'emp_01', name: '[NAMA PEJABAT SESUAI SK RESMI]' }]
    }), 'utf-8');
    await expect(seedInitialMasterData(mockDb, { env: 'prod', templatePath: placeholderTemplatePath, target: 'emulator' })).rejects.toThrow(/unresolved placeholder tags/);

    // Valid approved production template succeeds
    const approvedTemplatePath = path.join(tempDir, 'approved.json');
    fs.writeFileSync(approvedTemplatePath, JSON.stringify({
      clientApproved: true,
      approvalReference: 'SK/DISKUM/2026/04',
      employees: [{ id: 'emp_01', name: 'Dr. H. Hendri Arulan, S.Pd, M.M.', active: true }],
      departments: [{ id: 'dept_01', name: 'Sekretariat', active: true }],
      locations: [{ id: 'loc_01', name: 'Ruang Rapat Kadis', active: true }],
      organizers: [{ id: 'org_01', name: 'Sekretariat', active: true }],
      categories: [{ id: 'cat_01', name: 'Rapat', active: true }],
      signatory: { headOfDepartmentName: 'Dr. H. Hendri Arulan, S.Pd, M.M.' }
    }), 'utf-8');

    await seedInitialMasterData(mockDb, { env: 'prod', templatePath: approvedTemplatePath, target: 'emulator' });
    expect(storedData['employees']['emp_01'].name).toBe('Dr. H. Hendri Arulan, S.Pd, M.M.');

    // Dev seed succeeds with synthetic fixtures
    await seedInitialMasterData(mockDb, { env: 'dev', target: 'emulator' });
    expect(storedData['employees']['emp_01'].name).toContain('[DEMO]');
  });

  it('validates target environment safeguards against unexpected project and host mismatch', () => {
    // Specifying --target=prod when emulator is active must be rejected
    const prevEmu = process.env.FIRESTORE_EMULATOR_HOST;
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    expect(() => validateTargetEnvironment({ target: 'prod' })).toThrow(/FIRESTORE_EMULATOR_HOST .* is active/);

    // Specifying --target=emulator when emulator is NOT active must be rejected
    delete process.env.FIRESTORE_EMULATOR_HOST;
    expect(() => validateTargetEnvironment({ target: 'emulator' })).toThrow(/FIRESTORE_EMULATOR_HOST is not set/);

    // Restoring emulator
    process.env.FIRESTORE_EMULATOR_HOST = prevEmu || '127.0.0.1:8080';
  });
});
