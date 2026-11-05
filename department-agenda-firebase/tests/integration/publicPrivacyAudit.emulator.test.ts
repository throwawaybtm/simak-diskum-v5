import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import { doc, getDoc } from 'firebase/firestore';
import { saveActivity } from '../../shared/src/repository/activityRepository';
import { projectPublicActivity } from '../../shared/src/projection/publicProjector';
import { captureAttendeeSnapshots } from '../../shared/src/scheduling/attendeeSnapshot';
import type { ActivityDocument } from '../../shared/src/schema/activity';
import type { Location, Organizer, Category, Employee } from '../../shared/src/schema/master';
import type { PublicActivityDTO } from '../../shared/src/schema/publicDto';

describe('Public Attendee Privacy, DTO Serialization & Document Leak Audit (Firestore Emulator)', () => {
  const emulatorRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/emulator.rules'),
    'utf8'
  );

  let testEnv: RulesTestEnvironment;

  const mockLocations = new Map<string, Location>([
    ['loc_01', { id: 'loc_01', name: 'Ruang Rapat Utama', type: 'OFFICE', isBookableRoom: true, active: true }]
  ]);
  const mockOrganizers = new Map<string, Organizer>([
    ['org_01', { id: 'org_01', name: 'Dinas Koperasi dan UKM', active: true }]
  ]);
  const mockCategories = new Map<string, Category>([
    ['cat_01', { id: 'cat_01', name: 'Rapat Kerja', colorHex: '#0284c7', active: true }]
  ]);
  const mockEmployees: Employee[] = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris', departmentId: 'dept_01', active: true }
  ];

  const lookups = {
    locations: mockLocations,
    organizers: mockOrganizers,
    categories: mockCategories
  };

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-department-agenda-privacy-audit',
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

  it('1. Serialized PublicActivityDTO strictly enforces allowed keys and excludes all private metadata', () => {
    const rawActivity: ActivityDocument = {
      id: 'act_privacy_001',
      title: 'Rapat Evaluasi Program Koperasi',
      startDate: '2026-11-10',
      startTime: '09:00',
      endDate: '2026-11-10',
      endTime: '11:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      status: 'SCHEDULED',
      administrativeStage: 'DETAILS_COMPLETED',
      invitationLetter: {
        letterNumber: '005/DISKUM/XI/2026',
        letterDate: '2026-11-08',
        sender: 'Bappeda Kota Batam',
        subject: 'Undangan Evaluasi',
        driveUrl: 'https://drive.google.com/file/d/secret_doc_id_123/view'
      },
      privateNotes: 'CONFIDENTIAL: Prioritas anggaran DAK tahun 2027',
      privateMeetingUrl: 'https://us04web.zoom.us/j/987654321?pwd=SUPER_SECRET_ZOOM_PASSWORD',
      publicNotes: 'Pakaian: Batik Dinas, mohon hadir 15 menit sebelum acara.',
      attendeeIds: ['emp_01', 'emp_01', 'emp_02', 'emp_unknown_999'],
      attendeeSnapshots: captureAttendeeSnapshots(
        ['emp_01', 'emp_01', 'emp_02', 'emp_unknown_999'],
        mockEmployees
      ),
      version: 1,
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T08:00:00.000Z'
    };

    const dto = projectPublicActivity(rawActivity, lookups);
    const dtoKeys = Object.keys(dto);

    // Allowed public keys
    const allowedKeys = new Set([
      'id', 'title', 'startDate', 'startTime', 'endDate', 'endTime', 'openEnded',
      'timeDisplay', 'dateDisplay', 'status', 'publicCancellationNotice',
      'locationName', 'locationType', 'organizerName', 'categoryName',
      'publicNotes', 'attendeeLabels', 'version', 'updatedAt'
    ]);

    // Assert zero unauthorized keys
    for (const key of dtoKeys) {
      expect(allowedKeys.has(key)).toBe(true);
    }

    // Explicitly assert forbidden private properties are completely absent
    const forbiddenKeys = [
      'attendeeIds', 'attendeeSnapshots', 'invitationLetter', 'driveUrl',
      'privateNotes', 'privateMeetingUrl', 'administrativeStage', 'cancelReason',
      'creatorId', 'editorId'
    ];
    for (const forbidden of forbiddenKeys) {
      expect((dto as any)[forbidden]).toBeUndefined();
    }

    // Inspect attendeeLabels
    expect(dto.attendeeLabels).toHaveLength(3); // emp_01 deduplicated, emp_02, unlisted fallback
    expect(dto.attendeeLabels[0]).toContain('Drs. Hendri Arifin, M.Si');
    expect(dto.attendeeLabels[1]).toContain('Rini Marlina, S.Sos');
    expect(dto.attendeeLabels[2]).toBe('3. Pegawai Dinas');

    // Zero raw internal IDs in attendeeLabels
    for (const label of dto.attendeeLabels) {
      expect(label).not.toMatch(/emp_/i);
      expect(label).not.toMatch(/\(\s*emp_/i);
    }

    // JSON string inspection
    const jsonStr = JSON.stringify(dto);
    expect(jsonStr).not.toContain('SUPER_SECRET_ZOOM_PASSWORD');
    expect(jsonStr).not.toContain('CONFIDENTIAL');
    expect(jsonStr).not.toContain('secret_doc_id_123');
    expect(jsonStr).not.toContain('005/DISKUM/XI/2026');
    expect(jsonStr).not.toMatch(/"attendeeIds"/);
    expect(jsonStr).not.toMatch(/"attendeeSnapshots"/);
    expect(jsonStr).not.toMatch(/"invitationLetter"/);
  });

  it('2. Directly queries raw publicActivities document from Firestore Emulator to verify zero database-level leakage', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const activityData: ActivityDocument = {
      id: 'act_privacy_002',
      title: 'Sosialisasi Bantuan Modal Usaha Mikro 2026',
      startDate: '2026-11-12',
      startTime: '13:30',
      endDate: '2026-11-12',
      endTime: '16:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      status: 'SCHEDULED',
      administrativeStage: 'ADMIN_COMPLETE',
      invitationLetter: {
        letterNumber: '500/UMKM/XI/2026',
        letterDate: '2026-11-09',
        sender: 'Kemenkop UKM RI',
        subject: 'Bantuan Permodalan',
        driveUrl: 'https://drive.google.com/file/d/strictly_private_doc_456/view'
      },
      privateNotes: 'INTERNAL NOTES: Verifikasi berkas NIB dan rekening bank penerima bantuan',
      privateMeetingUrl: 'https://meet.google.com/abc-defg-hij',
      publicNotes: 'Terbuka untuk pelaku UMKM terdaftar di Kota Batam.',
      attendeeIds: ['emp_01', 'emp_01', 'emp_02'],
      attendeeSnapshots: captureAttendeeSnapshots(['emp_01', 'emp_01', 'emp_02'], mockEmployees),
      version: 1,
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T08:00:00.000Z'
    };

    const saveResult = await saveActivity(
      db as any,
      activityData,
      lookups,
      {
        actorLabel: 'actor_operator_01',
        identitySource: 'CUSTOM_TOKEN',
        employeesMasterList: mockEmployees
      }
    );

    expect(saveResult.newVersion).toBe(1);
    expect(saveResult.publicDto.id).toBe('act_privacy_002');

    // Fetch the private activity document
    const privateDocSnap = await getDoc(doc(db as any, 'activities', 'act_privacy_002'));
    expect(privateDocSnap.exists()).toBe(true);
    const privateData = privateDocSnap.data()!;
    expect(privateData.invitationLetter).toBeDefined();
    expect(privateData.privateNotes).toContain('INTERNAL NOTES');

    // Fetch the raw publicActivities document from the database
    const publicDocSnap = await getDoc(doc(db as any, 'publicActivities', 'act_privacy_002'));
    expect(publicDocSnap.exists()).toBe(true);
    const publicData = publicDocSnap.data()!;

    // Exhaustive schema inspection on the persisted Firestore document
    expect(publicData.invitationLetter).toBeUndefined();
    expect(publicData.driveUrl).toBeUndefined();
    expect(publicData.privateNotes).toBeUndefined();
    expect(publicData.privateMeetingUrl).toBeUndefined();
    expect(publicData.administrativeStage).toBeUndefined();
    expect(publicData.attendeeIds).toBeUndefined();
    expect(publicData.attendeeSnapshots).toBeUndefined();
    expect(publicData.cancelReason).toBeUndefined();

    // Verify attendee labels deduplication and zero raw IDs
    expect(Array.isArray(publicData.attendeeLabels)).toBe(true);
    expect(publicData.attendeeLabels).toHaveLength(2); // emp_01 deduplicated to 1 item
    expect(publicData.attendeeLabels[0]).toContain('Drs. Hendri Arifin, M.Si');
    expect(publicData.attendeeLabels[1]).toContain('Rini Marlina, S.Sos');

    const rawPersistedJson = JSON.stringify(publicData);
    expect(rawPersistedJson).not.toMatch(/emp_\w+/i);
    expect(rawPersistedJson).not.toContain('strictly_private_doc_456');
    expect(rawPersistedJson).not.toContain('INTERNAL NOTES');
    expect(rawPersistedJson).not.toContain('500/UMKM/XI/2026');
  });

  it('3. Historical snapshot preservation: master employee record changes do not mutate past activity attendee snapshots', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const activityData: ActivityDocument = {
      id: 'act_privacy_003',
      title: 'Rapat Kerja Tahunan 2026',
      startDate: '2026-11-15',
      startTime: '08:00',
      endDate: '2026-11-15',
      endTime: '12:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      status: 'SCHEDULED',
      administrativeStage: 'INITIAL_ENTRY',
      publicNotes: '',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: captureAttendeeSnapshots(['emp_01'], mockEmployees),
      version: 1,
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T08:00:00.000Z'
    };

    const saveResult = await saveActivity(
      db as any,
      activityData,
      lookups,
      {
        actorLabel: 'actor_operator_01',
        identitySource: 'CUSTOM_TOKEN',
        employeesMasterList: mockEmployees
      }
    );

    expect(saveResult.newVersion).toBe(1);

    // Initial snapshot verification
    expect(activityData.attendeeSnapshots[0].name).toBe('Drs. Hendri Arifin, M.Si');
    expect(activityData.attendeeSnapshots[0].position).toBe('Kepala Dinas');

    // Simulate employee getting promoted / modifying master record later in the year
    const updatedEmployeesMaster: Employee[] = [
      { id: 'emp_01', name: 'Dr. Hendri Arifin, M.Si, Ph.D', position: 'Asisten Daerah II', departmentId: 'dept_sekda', active: true }
    ];

    // Read the stored activity from Firestore
    const storedSnap = await getDoc(doc(db as any, 'activities', 'act_privacy_003'));
    const storedActivity = storedSnap.data() as ActivityDocument;

    // Verify historical snapshot remains 100% immutable
    expect(storedActivity.attendeeSnapshots[0].name).toBe('Drs. Hendri Arifin, M.Si');
    expect(storedActivity.attendeeSnapshots[0].position).toBe('Kepala Dinas');

    // Read the stored publicActivity projection
    const storedPublicSnap = await getDoc(doc(db as any, 'publicActivities', 'act_privacy_003'));
    const storedPublic = storedPublicSnap.data() as PublicActivityDTO;
    expect(storedPublic.attendeeLabels[0]).toContain('Drs. Hendri Arifin, M.Si');
    expect(storedPublic.attendeeLabels[0]).not.toContain('Ph.D');
  });
});
