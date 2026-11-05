import { describe, it, expect } from 'vitest';
import { projectPublicActivity } from '../../shared/src/projection/publicProjector';
import type { ActivityDocument } from '../../shared/src/schema/activity';
import type { Location, Organizer, Category } from '../../shared/src/schema/master';

describe('Public Projection & Privacy Isolation Engine', () => {
  const locationsMap = new Map<string, Location>([
    ['loc_01', { id: 'loc_01', name: 'Ruang Rapat Kadis', type: 'OFFICE', isBookableRoom: true, active: true }],
    ['loc_02', { id: 'loc_02', name: 'Zoom Cloud Meeting', type: 'ONLINE', isBookableRoom: false, active: true }]
  ]);

  const organizersMap = new Map<string, Organizer>([
    ['org_01', { id: 'org_01', name: 'Sekretariat Dinas', active: true }]
  ]);

  const categoriesMap = new Map<string, Category>([
    ['cat_01', { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true }]
  ]);

  const lookups = {
    locations: locationsMap,
    organizers: organizersMap,
    categories: categoriesMap
  };

  const samplePrivateActivity: ActivityDocument = {
    id: 'act_sec_01',
    title: 'Rapat Strategis Dinas',
    startDate: '2026-10-01',
    startTime: '07:00',
    endDate: '2026-10-01',
    endTime: '09:00',
    openEnded: false,
    locationId: 'loc_01',
    organizerId: 'org_01',
    categoryId: 'cat_01',
    attendeeIds: ['emp_001', 'emp_002'],
    attendeeSnapshots: [
      { employeeId: 'emp_001', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', label: '1. Kadis' },
      { employeeId: 'emp_002', name: 'Rini Marlina, S.Sos', position: 'Sekretaris', label: '2. Sekretaris' }
    ],
    guestAttendees: [],
    status: 'SCHEDULED',
    publicNotes: 'Pakaian: PSL Lengkap',
    privateNotes: 'INFORMASI SANGAT RAHASIA: Diskusi anggaran rahasia pimpinan',
    privateMeetingUrl: 'https://us02web.zoom.us/j/8500005418?pwd=SuperSecretPasscode',
    cancelReason: 'Alasan internal',
    publicCancellationNotice: undefined,
    version: 3,
    createdAt: '2026-09-01T00:00:00.000Z',
    createdBy: 'admin_root',
    updatedAt: '2026-09-10T00:00:00.000Z',
    updatedBy: 'admin_root'
  };

  it('strictly excludes privateNotes, privateMeetingUrl, and internal employee IDs', () => {
    const publicDto = projectPublicActivity(samplePrivateActivity, lookups);

    // Cast to any to verify absence of sensitive fields
    const rawDto = publicDto as any;
    expect(rawDto.privateNotes).toBeUndefined();
    expect(rawDto.privateMeetingUrl).toBeUndefined();
    expect(rawDto.cancelReason).toBeUndefined();
    expect(rawDto.attendeeIds).toBeUndefined();

    // Verify sanitized public fields
    expect(publicDto.title).toBe('Rapat Strategis Dinas');
    expect(publicDto.locationName).toBe('Ruang Rapat Kadis');
    expect(publicDto.organizerName).toBe('Sekretariat Dinas');
    expect(publicDto.categoryName).toBe('Rapat Koordinasi');
    expect(publicDto.attendeeLabels).toEqual(['1. Kadis', '2. Sekretaris']);
    expect(publicDto.publicNotes).toBe('Pakaian: PSL Lengkap');
  });

  it('retains CANCELLED activity with publicCancellationNotice if provided', () => {
    const cancelledActivity: ActivityDocument = {
      ...samplePrivateActivity,
      status: 'CANCELLED',
      cancelReason: 'Internal confidential reason (tidak boleh tayang)',
      publicCancellationNotice: 'Rapat dijadwalkan ulang karena ada agenda mendesak Walikota.'
    };

    const publicDto = projectPublicActivity(cancelledActivity, lookups);

    expect(publicDto.status).toBe('CANCELLED');
    expect(publicDto.publicCancellationNotice).toBe('Rapat dijadwalkan ulang karena ada agenda mendesak Walikota.');
    expect((publicDto as any).cancelReason).toBeUndefined();
  });

  it('redacts meeting URLs if accidentally typed into publicNotes as secondary defense', () => {
    const leakyActivity: ActivityDocument = {
      ...samplePrivateActivity,
      publicNotes: 'Silakan klik https://meet.google.com/xyz-123-abc untuk bergabung, Passcode: rahasia'
    };

    const publicDto = projectPublicActivity(leakyActivity, lookups);

    expect(publicDto.publicNotes).not.toContain('https://meet.google.com');
    expect(publicDto.publicNotes).not.toContain('rahasia');
    expect(publicDto.publicNotes).toContain('[TAUTAN DIHAPUS]');
  });

  it('sanitizes and purges raw internal employee IDs from attendeeLabels as defense-in-depth', () => {
    const activityWithRawIdsInSnapshots: ActivityDocument = {
      ...samplePrivateActivity,
      attendeeSnapshots: [
        { employeeId: 'emp_01', name: 'Pegawai (emp_01)', position: 'Pegawai Dinas', label: '1. Pegawai (emp_01)' },
        { employeeId: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris', label: '2. Sekretaris (Rini Marlina, S.Sos)' }
      ]
    };

    const publicDto = projectPublicActivity(activityWithRawIdsInSnapshots, lookups);

    expect(publicDto.attendeeLabels).toHaveLength(2);
    expect(publicDto.attendeeLabels[0]).toBe('1. Pegawai Dinas');
    expect(publicDto.attendeeLabels[0]).not.toContain('emp_01');
    expect(publicDto.attendeeLabels[1]).toBe('2. Sekretaris (Rini Marlina, S.Sos)');
  });

  it('strictly excludes private Google Drive invitation letter metadata and URLs from public projection', () => {
    const activityWithDriveUrl: ActivityDocument = {
      ...samplePrivateActivity,
      invitationLetter: {
        number: '005/DISKUM/XI/2026',
        sender: 'Walikota Batam',
        originCity: 'Batam',
        date: '2026-11-04',
        subject: 'Undangan Rapat Evaluasi Anggaran Rahasia',
        driveUrl: 'https://drive.google.com/file/d/1A2B3C4D_CONFIDENTIAL_INVITATION/view?usp=sharing'
      }
    };

    const publicDto = projectPublicActivity(activityWithDriveUrl, lookups);
    const rawDto = publicDto as any;

    expect(rawDto.invitationLetter).toBeUndefined();
    expect(rawDto.driveUrl).toBeUndefined();

    // Verify raw JSON string has zero occurrences of Google Drive URL or invitation metadata
    const serializedJson = JSON.stringify(publicDto);
    expect(serializedJson).not.toContain('drive.google.com');
    expect(serializedJson).not.toContain('1A2B3C4D_CONFIDENTIAL_INVITATION');
    expect(serializedJson).not.toContain('005/DISKUM/XI/2026');
    expect(serializedJson).not.toContain('Undangan Rapat Evaluasi Anggaran Rahasia');
  });
});
