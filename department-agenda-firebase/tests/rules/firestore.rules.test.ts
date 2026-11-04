import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

describe('Firestore Security Rules: Strict Hosted vs Permissive Emulator', () => {
  const hostedRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/firestore.rules'),
    'utf8'
  );
  const emulatorRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/emulator.rules'),
    'utf8'
  );

  let hostedEnv: RulesTestEnvironment;
  let emulatorEnv: RulesTestEnvironment;

  beforeAll(async () => {
    // Hosted rules test environment
    hostedEnv = await initializeTestEnvironment({
      projectId: 'test-hosted-strict',
      firestore: {
        rules: hostedRules,
        host: '127.0.0.1',
        port: 8080
      }
    });

    // Emulator rules test environment
    emulatorEnv = await initializeTestEnvironment({
      projectId: 'test-emulator-permissive',
      firestore: {
        rules: emulatorRules,
        host: '127.0.0.1',
        port: 8080
      }
    });

    // Clear stale state in emulator from previous runs
    await hostedEnv.clearFirestore();
    await emulatorEnv.clearFirestore();
  });

  afterAll(async () => {
    if (hostedEnv) await hostedEnv.cleanup();
    if (emulatorEnv) await emulatorEnv.cleanup();
  });

  describe('Hosted Rules (firebase/firestore.rules) - Strict Deny-by-Default', () => {
    it('allows anonymous read on publicActivities', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(anonDb, 'publicActivities', 'act_sample')));
    });

    it('allows anonymous read on publicAnnouncements', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(anonDb, 'publicAnnouncements', 'ann_sample')));
    });

    it('allows anonymous read on publicSettings', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(anonDb, 'publicSettings', 'main')));
    });

    it('denies anonymous write to publicActivities', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertFails(
        setDoc(doc(anonDb, 'publicActivities', 'act_sample'), { title: 'Hacked' })
      );
    });

    it('denies all reads and writes to private activities collection', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(anonDb, 'activities', 'act_sample')));
      await assertFails(
        setDoc(doc(anonDb, 'activities', 'act_sample'), { title: 'Secret Rapat' })
      );
    });

    it('denies all reads and writes to employees, auditLogs, and settings', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(anonDb, 'employees', 'emp_01')));
      await assertFails(getDoc(doc(anonDb, 'auditLogs', 'log_01')));
      await assertFails(setDoc(doc(anonDb, 'auditLogs', 'log_01'), { action: 'UNAUTHORIZED' }));
      await assertFails(getDoc(doc(anonDb, 'settings', 'main')));
    });
  });

  describe('Hosted Rules - Production RBAC and Security Invariants', () => {
    const adminAuth = { uid: 'admin_user_01', role: 'admin' };
    const editorAuth = { uid: 'editor_user_01', role: 'editor' };
    const guestAuth = { uid: 'guest_user_01' }; // Authenticated with no role

    const validActivityDoc = {
      id: 'act_001',
      title: 'Rapat Koordinasi UMKM Batam',
      startDate: '2026-11-10',
      startTime: '09:00',
      endDate: '2026-11-10',
      endTime: '11:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [{
        employeeId: 'emp_01',
        name: 'Drs. Hendri Arifin, M.Si',
        position: 'Kepala Dinas',
        label: '1. Kadis'
      }],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: 'Pakaian: Batik Lengan Panjang',
      privateNotes: 'Bahan rapat rahasia pimpinan',
      privateMeetingUrl: null,
      version: 1,
      createdAt: '2026-11-04T10:00:00Z',
      createdBy: 'editor_user_01',
      updatedAt: '2026-11-04T10:00:00Z',
      updatedBy: 'editor_user_01'
    };

    const validPublicActivityDoc = {
      id: 'act_001',
      title: 'Rapat Koordinasi UMKM Batam',
      startDate: '2026-11-10',
      startTime: '09:00',
      endDate: '2026-11-10',
      endTime: '11:00',
      openEnded: false,
      timeDisplay: '09.00 - 11.00 WIB',
      dateDisplay: 'Selasa, 10 November 2026',
      status: 'SCHEDULED',
      locationName: 'Ruang Rapat Diskum Lt. 2',
      locationType: 'OFFICE',
      organizerName: 'Bidang Usaha Mikro',
      categoryName: 'Rapat Internal',
      publicNotes: 'Pakaian: Batik Lengan Panjang',
      attendeeLabels: ['1. Kadis'],
      updatedAt: '2026-11-04T10:00:00Z'
    };

    const validEmployeeDoc = {
      id: 'emp_01',
      name: 'Drs. Hendri Arifin, M.Si',
      position: 'Kepala Dinas',
      departmentId: 'dept_01',
      active: true
    };

    const validSignatoryDoc = {
      name: 'Drs. HENDRI ARIFIN, M.Si',
      nip: '19710312 199803 1 004',
      position: 'Kepala Dinas',
      department: 'Dinas Koperasi dan Usaha Mikro Kota Batam',
      city: 'Batam'
    };

    it('allows Admin and Editor to create and read activities via coordinated writeBatch', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      
      const batch = writeBatch(editorDb);
      batch.set(doc(editorDb, 'activities', 'act_001'), validActivityDoc);
      batch.set(doc(editorDb, 'publicActivities', 'act_001'), validPublicActivityDoc);
      await assertSucceeds(batch.commit());

      await assertSucceeds(getDoc(doc(editorDb, 'activities', 'act_001')));
      await assertSucceeds(getDoc(doc(editorDb, 'publicActivities', 'act_001')));

      const adminDb = hostedEnv.authenticatedContext(adminAuth.uid, { role: adminAuth.role }).firestore();
      await assertSucceeds(getDoc(doc(adminDb, 'activities', 'act_001')));
    });

    it('denies Editor from modifying publicActivities or activities independently without coordinated batch', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();

      // Malicious Editor calls setDoc on publicActivities directly without activities
      await assertFails(
        setDoc(doc(editorDb, 'publicActivities', 'act_rogue'), {
          ...validPublicActivityDoc,
          id: 'act_rogue'
        })
      );

      // Malicious Editor calls setDoc on activities directly without publicActivities
      await assertFails(
        setDoc(doc(editorDb, 'activities', 'act_rogue'), {
          ...validActivityDoc,
          id: 'act_rogue'
        })
      );

      // Malicious Editor calls updateDoc on publicActivities independently
      await assertFails(
        updateDoc(doc(editorDb, 'publicActivities', 'act_001'), {
          title: 'Defaced Title Rogue'
        })
      );

      // Malicious Editor writes batch with mismatched titles
      const mismatchBatch = writeBatch(editorDb);
      mismatchBatch.update(doc(editorDb, 'activities', 'act_001'), {
        title: 'Title in Private',
        version: 2,
        updatedAt: '2026-11-04T11:00:00Z',
        updatedBy: editorAuth.uid
      });
      mismatchBatch.update(doc(editorDb, 'publicActivities', 'act_001'), {
        title: 'Different Title in Public',
        updatedAt: '2026-11-04T11:00:00Z'
      });
      await assertFails(mismatchBatch.commit());
    });

    it('enforces optimistic concurrency version increment on activity update in coordinated batch', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();

      // Fails if version does not increment by 1
      const staleBatch = writeBatch(editorDb);
      staleBatch.update(doc(editorDb, 'activities', 'act_001'), {
        title: 'Updated Without Version Increment',
        version: 1
      });
      staleBatch.update(doc(editorDb, 'publicActivities', 'act_001'), {
        title: 'Updated Without Version Increment',
        updatedAt: '2026-11-04T11:00:00Z'
      });
      await assertFails(staleBatch.commit());

      // Succeeds when version increments to 2 and both match
      const validBatch = writeBatch(editorDb);
      validBatch.update(doc(editorDb, 'activities', 'act_001'), {
        title: 'Updated Rapat Title',
        version: 2,
        updatedAt: '2026-11-04T11:00:00Z',
        updatedBy: editorAuth.uid
      });
      validBatch.update(doc(editorDb, 'publicActivities', 'act_001'), {
        title: 'Updated Rapat Title',
        updatedAt: '2026-11-04T11:00:00Z'
      });
      await assertSucceeds(validBatch.commit());
    });

    it('denies Editor from deleting activities or public projections, allows Admin to delete both', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const adminDb = hostedEnv.authenticatedContext(adminAuth.uid, { role: adminAuth.role }).firestore();

      // Editor cannot delete activities
      await assertFails(deleteDoc(doc(editorDb, 'activities', 'act_001')));
      // Editor cannot delete publicActivities
      await assertFails(deleteDoc(doc(editorDb, 'publicActivities', 'act_001')));

      // Admin can delete both
      const adminDelBatch = writeBatch(adminDb);
      adminDelBatch.delete(doc(adminDb, 'activities', 'act_001'));
      adminDelBatch.delete(doc(adminDb, 'publicActivities', 'act_001'));
      await assertSucceeds(adminDelBatch.commit());
    });

    it('allows Admin to manage master data, denies Editor', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const adminDb = hostedEnv.authenticatedContext(adminAuth.uid, { role: adminAuth.role }).firestore();

      // Editor cannot create or update employee
      await assertFails(setDoc(doc(editorDb, 'employees', 'emp_01'), validEmployeeDoc));

      // Admin can create employee
      await assertSucceeds(setDoc(doc(adminDb, 'employees', 'emp_01'), validEmployeeDoc));

      // Editor can read employee
      await assertSucceeds(getDoc(doc(editorDb, 'employees', 'emp_01')));

      // Editor cannot delete employee
      await assertFails(deleteDoc(doc(editorDb, 'employees', 'emp_01')));

      // Admin can delete employee
      await assertSucceeds(deleteDoc(doc(adminDb, 'employees', 'emp_01')));
    });

    it('enforces settings rules (Admin write, Editor read, delete prohibited)', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const adminDb = hostedEnv.authenticatedContext(adminAuth.uid, { role: adminAuth.role }).firestore();

      // Editor cannot write settings
      await assertFails(setDoc(doc(editorDb, 'settings', 'signatory'), validSignatoryDoc));

      // Admin can write settings
      await assertSucceeds(setDoc(doc(adminDb, 'settings', 'signatory'), validSignatoryDoc));

      // Editor can read settings
      await assertSucceeds(getDoc(doc(editorDb, 'settings', 'signatory')));

      // Deletion is strictly prohibited even for Admin
      await assertFails(deleteDoc(doc(adminDb, 'settings', 'signatory')));
    });

    it('enforces append-only audit logs with server timestamp and actor identity binding', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const adminDb = hostedEnv.authenticatedContext(adminAuth.uid, { role: adminAuth.role }).firestore();

      // Fails if client passes arbitrary string timestamp instead of serverTimestamp()
      await assertFails(
        setDoc(doc(editorDb, 'auditLogs', 'log_string_ts'), {
          id: 'log_string_ts',
          actorId: editorAuth.uid,
          action: 'CREATE',
          timestamp: '2026-11-04T12:00:00Z',
          recordId: 'act_001'
        })
      );

      // Valid audit log with matching actorId and server timestamp
      const validAuditLog = {
        id: 'log_001',
        actorId: editorAuth.uid,
        action: 'CREATE',
        timestamp: serverTimestamp(),
        recordId: 'act_001'
      };

      // Fails if actorId is spoofed
      await assertFails(
        setDoc(doc(editorDb, 'auditLogs', 'log_spoofed'), {
          id: 'log_spoofed',
          actorId: 'someone_else_uid',
          action: 'CREATE',
          timestamp: serverTimestamp()
        })
      );

      // Succeeds when actorId matches request.auth.uid and timestamp is serverTimestamp()
      await assertSucceeds(setDoc(doc(editorDb, 'auditLogs', 'log_001'), validAuditLog));

      // Update is strictly prohibited (fails even for Admin)
      await assertFails(
        updateDoc(doc(adminDb, 'auditLogs', 'log_001'), {
          action: 'MODIFIED_LOG'
        })
      );

      // Deletion is strictly prohibited (fails even for Admin)
      await assertFails(deleteDoc(doc(adminDb, 'auditLogs', 'log_001')));
    });

    it('denies unauthenticated and role-less users from accessing private data', async () => {
      const guestDb = hostedEnv.authenticatedContext(guestAuth.uid).firestore();

      // Guest cannot read or write private activities
      await assertFails(getDoc(doc(guestDb, 'activities', 'act_001')));
      await assertFails(setDoc(doc(guestDb, 'activities', 'act_001'), validActivityDoc));

      // Guest cannot read master data
      await assertFails(getDoc(doc(guestDb, 'employees', 'emp_01')));

      // Guest cannot write to publicActivities
      await assertFails(setDoc(doc(guestDb, 'publicActivities', 'act_001'), validPublicActivityDoc));
    });

    it('allows Admin and Editor to publish publicActivities via coordinated batch and allows public read', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      
      const batch = writeBatch(editorDb);
      batch.set(doc(editorDb, 'activities', 'act_pub_01'), { ...validActivityDoc, id: 'act_pub_01' });
      batch.set(doc(editorDb, 'publicActivities', 'act_pub_01'), { ...validPublicActivityDoc, id: 'act_pub_01' });
      await assertSucceeds(batch.commit());

      // Public can read
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(anonDb, 'publicActivities', 'act_pub_01')));
    });

    it('blocks DoS attacks with oversized payloads (>200 chars title)', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const oversizedDoc = {
        ...validActivityDoc,
        id: 'act_dos_01',
        title: 'A'.repeat(250) // Max allowed is 200
      };
      await assertFails(setDoc(doc(editorDb, 'activities', 'act_dos_01'), oversizedDoc));
    });

    it('blocks schema pollution (unrecognized extra fields)', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const pollutedDoc = {
        ...validActivityDoc,
        id: 'act_polluted_01',
        maliciousInjectedField: 'hacker_payload'
      };
      await assertFails(setDoc(doc(editorDb, 'activities', 'act_polluted_01'), pollutedDoc));
    });

    it('blocks PII and secret leakage in publicActivities projection', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const leakedPublicDoc = {
        ...validPublicActivityDoc,
        id: 'act_leak_01',
        privateNotes: 'Confidential secret notes should never be in public projection!'
      };
      await assertFails(setDoc(doc(editorDb, 'publicActivities', 'act_leak_01'), leakedPublicDoc));
    });

    it('enforces cancelReason when activity status is CANCELLED in coordinated batch', async () => {
      const editorDb = hostedEnv.authenticatedContext(editorAuth.uid, { role: editorAuth.role }).firestore();
      const cancelledWithoutReason = {
        ...validActivityDoc,
        id: 'act_cancel_no_reason',
        status: 'CANCELLED'
        // cancelReason omitted
      };
      const batchNoReason = writeBatch(editorDb);
      batchNoReason.set(doc(editorDb, 'activities', 'act_cancel_no_reason'), cancelledWithoutReason);
      batchNoReason.set(doc(editorDb, 'publicActivities', 'act_cancel_no_reason'), {
        ...validPublicActivityDoc,
        id: 'act_cancel_no_reason',
        status: 'CANCELLED'
      });
      await assertFails(batchNoReason.commit());

      const cancelledWithReason = {
        ...validActivityDoc,
        id: 'act_cancel_with_reason',
        status: 'CANCELLED',
        cancelReason: 'Pejabat dinas berhalangan hadir mendadak karena tugas luar kota'
      };
      const batchWithReason = writeBatch(editorDb);
      batchWithReason.set(doc(editorDb, 'activities', 'act_cancel_with_reason'), cancelledWithReason);
      batchWithReason.set(doc(editorDb, 'publicActivities', 'act_cancel_with_reason'), {
        ...validPublicActivityDoc,
        id: 'act_cancel_with_reason',
        status: 'CANCELLED'
      });
      await assertSucceeds(batchWithReason.commit());
    });

    it('blocks overwriting existing audit log document', async () => {
      const adminDb = hostedEnv.authenticatedContext(adminAuth.uid, { role: adminAuth.role }).firestore();
      // Trying to recreate or overwrite log_001
      await assertFails(
        setDoc(doc(adminDb, 'auditLogs', 'log_001'), {
          id: 'log_001',
          actorId: adminAuth.uid,
          action: 'DELETE',
          timestamp: serverTimestamp()
        })
      );
    });
  });

  describe('Emulator Rules (firebase/emulator.rules) - Local Synthetic CRUD', () => {
    it('permits local writes to activities, publicActivities, and auditLogs in emulator', async () => {
      const emuDb = emulatorEnv.unauthenticatedContext().firestore();

      await assertSucceeds(
        setDoc(doc(emuDb, 'activities', 'act_local_01'), {
          title: 'Local Test Activity',
          version: 1
        })
      );

      await assertSucceeds(
        setDoc(doc(emuDb, 'publicActivities', 'act_local_01'), {
          title: 'Local Test Activity Public',
          status: 'SCHEDULED'
        })
      );

      await assertSucceeds(
        setDoc(doc(emuDb, 'auditLogs', 'log_local_01'), {
          action: 'CREATE',
          actorLabel: 'UNVERIFIED'
        })
      );
    });
  });
});

