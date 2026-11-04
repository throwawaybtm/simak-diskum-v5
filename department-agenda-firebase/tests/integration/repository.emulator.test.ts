import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import { doc, getDoc } from 'firebase/firestore';
import { saveActivity, deleteActivity } from '../../shared/src/repository/activityRepository';
import type { ActivityDocument } from '../../shared/src/schema/activity';
import type { Location, Organizer, Category, Employee } from '../../shared/src/schema/master';

describe('Repository Integration Tests (Firestore Emulator)', () => {
  const emulatorRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/emulator.rules'),
    'utf8'
  );

  let testEnv: RulesTestEnvironment;

  const mockLocations = new Map<string, Location>([
    ['loc_01', { id: 'loc_01', name: 'Ruang Rapat Kadis', type: 'OFFICE', isBookableRoom: true, active: true }]
  ]);
  const mockOrganizers = new Map<string, Organizer>([
    ['org_01', { id: 'org_01', name: 'Sekretariat Dinas', active: true }]
  ]);
  const mockCategories = new Map<string, Category>([
    ['cat_01', { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true }]
  ]);
  const mockEmployees: Employee[] = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true }
  ];

  const lookups = {
    locations: mockLocations,
    organizers: mockOrganizers,
    categories: mockCategories
  };

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-department-agenda-integ',
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

  it('performs atomic writes across private activities, publicActivities, and auditLogs', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const activity: ActivityDocument = {
      id: 'act_atomic_01',
      title: 'Rapat Koordinasi Evaluasi Program Triwulan III',
      startDate: '2026-10-01',
      startTime: '08:00',
      endDate: '2026-10-01',
      endTime: '10:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: 'Pakaian: Batik',
      privateNotes: 'Catatan internal rahasia pimpinan',
      privateMeetingUrl: 'https://us02web.zoom.us/j/8500005418?pwd=secret',
      version: 1,
      createdAt: '2026-10-01T00:00:00.000Z',
      createdBy: 'admin_test',
      updatedAt: '2026-10-01T00:00:00.000Z',
      updatedBy: 'admin_test'
    };

    const result = await saveActivity(db, activity, lookups, {
      actorLabel: 'UNVERIFIED',
      employeesMasterList: mockEmployees,
      isAttendeeEdited: true
    });

    expect(result.newVersion).toBe(1);

    // 1. Verify private record contains privateNotes, privateMeetingUrl, and attendeeSnapshots
    const actSnap = await getDoc(doc(db, 'activities', 'act_atomic_01'));
    expect(actSnap.exists()).toBe(true);
    const actData = actSnap.data() as ActivityDocument;
    expect(actData.privateNotes).toBe('Catatan internal rahasia pimpinan');
    expect(actData.privateMeetingUrl).toBe('https://us02web.zoom.us/j/8500005418?pwd=secret');
    expect(actData.attendeeSnapshots).toHaveLength(1);
    expect(actData.attendeeSnapshots[0].name).toBe('Drs. Hendri Arifin, M.Si');

    // 2. Verify public record strictly excludes secrets
    const pubSnap = await getDoc(doc(db, 'publicActivities', 'act_atomic_01'));
    expect(pubSnap.exists()).toBe(true);
    const pubData = pubSnap.data() as any;
    expect(pubData.privateNotes).toBeUndefined();
    expect(pubData.privateMeetingUrl).toBeUndefined();
    expect(pubData.attendeeIds).toBeUndefined();
    expect(pubData.locationName).toBe('Ruang Rapat Kadis');
    expect(pubData.attendeeLabels).toEqual(['1. Kadis (Drs. Hendri Arifin, M.Si)']);

    // 3. Verify audit log entry
    const auditSnap = await getDoc(doc(db, 'auditLogs', result.auditId));
    expect(auditSnap.exists()).toBe(true);
    const auditData = auditSnap.data() as any;
    expect(auditData.action).toBe('CREATE');
    expect(auditData.actorLabel).toBe('UNVERIFIED');
    expect(auditData.identitySource).toBe('UNVERIFIED');
  });

  it('enforces optimistic concurrency control (expectedVersion)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const activity: ActivityDocument = {
      id: 'act_concur_01',
      title: 'Rapat Versi Kontrol',
      startDate: '2026-10-01',
      startTime: '08:00',
      endDate: '2026-10-01',
      endTime: '10:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: '',
      privateNotes: '',
      privateMeetingUrl: null,
      version: 1,
      createdAt: '2026-10-01T00:00:00.000Z',
      createdBy: 'admin_test',
      updatedAt: '2026-10-01T00:00:00.000Z',
      updatedBy: 'admin_test'
    };

    // Save version 1
    const res1 = await saveActivity(db, activity, lookups, {
      employeesMasterList: mockEmployees,
      isAttendeeEdited: true
    });
    expect(res1.newVersion).toBe(1);

    // Save update with correct expectedVersion: 1 -> succeeds, increments to 2
    const res2 = await saveActivity(
      db,
      { ...activity, title: 'Rapat Versi Kontrol Diperbarui' },
      lookups,
      { expectedVersion: 1 }
    );
    expect(res2.newVersion).toBe(2);

    // Attempt update with outdated expectedVersion: 1 -> throws VERSION_CONFLICT
    await expect(
      saveActivity(
        db,
        { ...activity, title: 'Rapat Versi Stale' },
        lookups,
        { expectedVersion: 1 }
      )
    ).rejects.toThrow('VERSION_CONFLICT');
  });

  it('safely handles cancellation and retains public document with CANCELLED status', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const activity: ActivityDocument = {
      id: 'act_cancel_01',
      title: 'Sosialisasi Anggaran',
      startDate: '2026-10-05',
      startTime: '09:00',
      endDate: '2026-10-05',
      endTime: '11:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: '',
      privateNotes: '',
      privateMeetingUrl: null,
      version: 1,
      createdAt: '2026-10-01T00:00:00.000Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T00:00:00.000Z',
      updatedBy: 'admin'
    };

    await saveActivity(db, activity, lookups, { employeesMasterList: mockEmployees, isAttendeeEdited: true });

    // Cancel activity
    const cancelled = {
      ...activity,
      status: 'CANCELLED' as const,
      cancelReason: 'Alasan internal rahasia pimpinan',
      publicCancellationNotice: 'Kegiatan ditunda karena ada peringatan HUT Batam.'
    };

    const res = await saveActivity(db, cancelled, lookups, { expectedVersion: 1 });
    expect(res.newVersion).toBe(2);

    // Public record must be RETAINED, not deleted, with CANCELLED status and notice
    const pubSnap = await getDoc(doc(db, 'publicActivities', 'act_cancel_01'));
    expect(pubSnap.exists()).toBe(true);
    const pubData = pubSnap.data() as any;
    expect(pubData.status).toBe('CANCELLED');
    expect(pubData.publicCancellationNotice).toBe('Kegiatan ditunda karena ada peringatan HUT Batam.');
    expect(pubData.cancelReason).toBeUndefined(); // private reason excluded
  });

  it('records conflict override reason in audit log upon save', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const activity: ActivityDocument = {
      id: 'act_override_01',
      title: 'Rapat Prioritas Mendesak',
      startDate: '2026-10-01',
      startTime: '09:00',
      endDate: '2026-10-01',
      endTime: '11:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: '',
      privateNotes: '',
      privateMeetingUrl: null,
      version: 1,
      createdAt: '2026-10-01T00:00:00.000Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T00:00:00.000Z',
      updatedBy: 'admin'
    };

    const res = await saveActivity(db, activity, lookups, {
      conflictOverrideReason: 'Disetujui langsung oleh Kepala Dinas karena agenda darurat.',
      employeesMasterList: mockEmployees,
      isAttendeeEdited: true
    });

    const auditSnap = await getDoc(doc(db, 'auditLogs', res.auditId));
    expect(auditSnap.exists()).toBe(true);
    const auditData = auditSnap.data() as any;
    expect(auditData.afterSummary.conflictOverrideReason).toBe(
      'Disetujui langsung oleh Kepala Dinas karena agenda darurat.'
    );
  });
});
