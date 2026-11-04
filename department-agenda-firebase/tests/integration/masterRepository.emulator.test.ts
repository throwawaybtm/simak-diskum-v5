import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  fetchMasterRecords,
  saveMasterRecord,
  toggleMasterRecordActive,
  checkMasterReferentialUsage
} from '../../shared/src/repository/masterRepository';
import type { Location, Employee } from '../../shared/src/schema/master';

describe('Master Repository Integration Tests (Firestore Emulator)', () => {
  const emulatorRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/emulator.rules'),
    'utf8'
  );

  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-department-agenda-master-integ',
      firestore: {
        rules: emulatorRules,
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('saves new master records and writes audit log entries', async () => {
    const db = testEnv.unauthenticatedContext().firestore() as any;

    const newLoc: Location = {
      id: 'loc_test_01',
      name: 'Ruang Rapat Integ',
      type: 'OFFICE',
      isBookableRoom: true,
      active: true
    };

    const res = await saveMasterRecord(db, 'locations', newLoc, 'TEST_ADMIN');
    expect(res.success).toBe(true);

    // Verify document in locations collection
    const locSnap = await getDoc(doc(db, 'locations', 'loc_test_01'));
    expect(locSnap.exists()).toBe(true);
    expect(locSnap.data()?.name).toBe('Ruang Rapat Integ');

    // Verify audit log creation
    const logs = await fetchMasterRecords(db, 'auditLogs' as any);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs.some(l => (l as any).recordId === 'loc_test_01')).toBe(true);
  });

  it('toggles active status and records audit logs', async () => {
    const db = testEnv.unauthenticatedContext().firestore() as any;

    const newLoc: Location = {
      id: 'loc_test_02',
      name: 'Ruang Rapat Deactivate',
      type: 'OFFICE',
      isBookableRoom: true,
      active: true
    };
    await saveMasterRecord(db, 'locations', newLoc);

    // Deactivate
    const toggleRes = await toggleMasterRecordActive(db, 'locations', 'loc_test_02', false, 'TEST_ADMIN');
    expect(toggleRes.active).toBe(false);

    const locSnap = await getDoc(doc(db, 'locations', 'loc_test_02'));
    expect(locSnap.data()?.active).toBe(false);
  });

  it('checks referential usage for locations and employees referenced in activities', async () => {
    const db = testEnv.unauthenticatedContext().firestore() as any;

    // Seed location and employee
    const loc: Location = { id: 'loc_ref_01', name: 'Aula Ref', type: 'OFFICE', isBookableRoom: true, active: true };
    const emp: Employee = { id: 'emp_ref_01', name: 'Budi Santoso', position: 'Staf', departmentId: 'dept_01', active: true };
    await saveMasterRecord(db, 'locations', loc);
    await saveMasterRecord(db, 'employees', emp);

    // Seed activity referencing loc_ref_01 and emp_ref_01
    await setDoc(doc(db, 'activities', 'act_ref_test'), {
      id: 'act_ref_test',
      title: 'Kegiatan Penggunaan Ruangan',
      locationId: 'loc_ref_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: ['emp_ref_01'],
      status: 'SCHEDULED'
    });

    // Check usage for location
    const locUsage = await checkMasterReferentialUsage(db, 'locations', 'loc_ref_01');
    expect(locUsage.inUse).toBe(true);
    expect(locUsage.count).toBe(1);
    expect(locUsage.referencingTitles).toContain('Kegiatan Penggunaan Ruangan');

    // Check usage for employee
    const empUsage = await checkMasterReferentialUsage(db, 'employees', 'emp_ref_01');
    expect(empUsage.inUse).toBe(true);
    expect(empUsage.count).toBe(1);

    // Check usage for an unreferenced location
    const unrefUsage = await checkMasterReferentialUsage(db, 'locations', 'loc_nonexistent');
    expect(unrefUsage.inUse).toBe(false);
    expect(unrefUsage.count).toBe(0);
  });

  it('prevents saving records with duplicate names in the same collection', async () => {
    const db = testEnv.unauthenticatedContext().firestore() as any;

    const loc1: Location = { id: 'loc_dup_01', name: 'Ruang Rapat Utama', type: 'OFFICE', isBookableRoom: true, active: true };
    await saveMasterRecord(db, 'locations', loc1);

    const loc2: Location = { id: 'loc_dup_02', name: '  ruang rapat utama  ', type: 'OFFICE', isBookableRoom: true, active: true };
    await expect(saveMasterRecord(db, 'locations', loc2)).rejects.toThrow(/sudah terdaftar/);
  });
});
