import { describe, it, expect } from 'vitest';
import { validateActivity } from '../../shared/src/validation/activityValidator';
import type { ActivityDocument } from '../../shared/src/schema/activity';

describe('Activity Validation Engine', () => {
  const validActivity: ActivityDocument = {
    id: 'act_test_01',
    title: 'Rapat Koordinasi Penataan Koperasi',
    startDate: '2026-10-01',
    startTime: '09:00',
    endDate: '2026-10-01',
    endTime: '11:00',
    openEnded: false,
    locationId: 'loc_01',
    organizerId: 'org_01',
    categoryId: 'cat_01',
    attendeeIds: ['emp_01'],
    attendeeSnapshots: [
      { employeeId: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', label: '1. Kadis' }
    ],
    guestAttendees: [],
    status: 'SCHEDULED',
    publicNotes: 'Pakaian: Batik',
    privateNotes: 'Catatan internal pimpinan',
    privateMeetingUrl: null,
    version: 1,
    createdAt: '2026-09-25T08:00:00.000Z',
    createdBy: 'admin_test',
    updatedAt: '2026-09-25T08:00:00.000Z',
    updatedBy: 'admin_test'
  };

  it('passes validation for a fully valid activity', () => {
    const result = validateActivity(validActivity);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects activities with title shorter than 3 characters', () => {
    const result = validateActivity({ ...validActivity, title: 'AB' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Judul'))).toBe(true);
  });

  it('rejects activities where endDate is chronologically before startDate', () => {
    const result = validateActivity({
      ...validActivity,
      startDate: '2026-10-05',
      endDate: '2026-10-01'
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Tanggal selesai'))).toBe(true);
  });

  it('rejects fixed-time activity whose end instant is earlier than start instant on the same day', () => {
    const result = validateActivity({
      ...validActivity,
      startDate: '2026-10-01',
      startTime: '10:00',
      endDate: '2026-10-01',
      endTime: '09:00',
      openEnded: false
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Waktu selesai harus lebih lambat dari waktu mulai'))).toBe(true);
  });

  it('rejects fixed-time activity whose end instant is EQUAL to start instant (zero duration)', () => {
    const result = validateActivity({
      ...validActivity,
      startDate: '2026-10-01',
      startTime: '10:00',
      endDate: '2026-10-01',
      endTime: '10:00',
      openEnded: false
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Waktu selesai harus lebih lambat dari waktu mulai'))).toBe(true);
  });

  it('rejects fixed-time activity whose end instant is earlier across different dates', () => {
    const result = validateActivity({
      ...validActivity,
      startDate: '2026-10-02',
      startTime: '10:00',
      endDate: '2026-10-01',
      endTime: '12:00',
      openEnded: false
    });
    expect(result.valid).toBe(false);
  });

  it('permits open-ended activity with null endTime', () => {
    const result = validateActivity({
      ...validActivity,
      openEnded: true,
      endTime: null
    });
    expect(result.valid).toBe(true);
  });

  it('permits activities without attendees and provides a nonblocking warning', () => {
    const result = validateActivity({
      ...validActivity,
      attendeeIds: [],
      guestAttendees: []
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('kosong'))).toBe(true);
  });

  it('requires cancelReason if activity status is CANCELLED', () => {
    const resultWithoutReason = validateActivity({
      ...validActivity,
      status: 'CANCELLED',
      cancelReason: ''
    });
    expect(resultWithoutReason.valid).toBe(false);
    expect(resultWithoutReason.errors.some(e => e.includes('alasan pembatalan'))).toBe(true);

    const resultWithReason = validateActivity({
      ...validActivity,
      status: 'CANCELLED',
      cancelReason: 'Narasumber berhalangan hadir'
    });
    expect(resultWithReason.valid).toBe(true);
  });

  describe('Feature F01: Administrative Workflow & Invitation Letter Validation', () => {
    it('validates Google Drive & Docs HTTPS URLs correctly and rejects unsafe schemes', async () => {
      const { isValidGoogleDriveUrl } = await import('../../shared/src/validation/activityValidator');
      
      // Valid URLs
      expect(isValidGoogleDriveUrl('https://drive.google.com/file/d/1A2B3C4D/view')).toBe(true);
      expect(isValidGoogleDriveUrl('https://docs.google.com/document/d/1X2Y3Z/edit?usp=sharing')).toBe(true);
      expect(isValidGoogleDriveUrl('https://drive.google.com/drive/folders/0B_xyz')).toBe(true);
      expect(isValidGoogleDriveUrl('https://docs.google.com/spreadsheets/d/12345/edit')).toBe(true);

      // Invalid or unsafe URLs
      expect(isValidGoogleDriveUrl('http://drive.google.com/file/d/123')).toBe(false); // Insecure HTTP
      expect(isValidGoogleDriveUrl('javascript:alert(1)')).toBe(false); // XSS scheme
      expect(isValidGoogleDriveUrl('data:text/html,<script>alert(1)</script>')).toBe(false); // Data scheme
      expect(isValidGoogleDriveUrl('https://malicious-drive.google.com/phish')).toBe(false); // Fake domain
      expect(isValidGoogleDriveUrl('https://google.com')).toBe(false); // Not drive or docs
      expect(isValidGoogleDriveUrl('ftp://drive.google.com')).toBe(false);
      expect(isValidGoogleDriveUrl('')).toBe(false);
    });

    it('permits INITIAL_ENTRY activity without attendees, remarks, or letter metadata', () => {
      const initialActivity: ActivityDocument = {
        ...validActivity,
        attendeeIds: [],
        attendeeSnapshots: [],
        guestAttendees: [],
        publicNotes: '',
        administrativeStage: 'INITIAL_ENTRY',
        invitationLetter: undefined
      };

      const result = validateActivity(initialActivity);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('kosong'))).toBe(true);
    });

    it('permits OFFLINE_PROCESS and DETAILS_COMPLETED stages', () => {
      const offlineAct: ActivityDocument = {
        ...validActivity,
        administrativeStage: 'OFFLINE_PROCESS'
      };
      expect(validateActivity(offlineAct).valid).toBe(true);

      const detailsAct: ActivityDocument = {
        ...validActivity,
        administrativeStage: 'DETAILS_COMPLETED'
      };
      expect(validateActivity(detailsAct).valid).toBe(true);
    });

    it('rejects ADMIN_COMPLETE if letter metadata is missing and no explicit exception is provided', () => {
      const incompleteAdminAct: ActivityDocument = {
        ...validActivity,
        administrativeStage: 'ADMIN_COMPLETE',
        invitationLetter: undefined
      };

      const result = validateActivity(incompleteAdminAct);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Administrasi Lengkap'))).toBe(true);
    });

    it('rejects ADMIN_COMPLETE if letter metadata contains invalid Google Drive URL', () => {
      const badUrlAdminAct: ActivityDocument = {
        ...validActivity,
        administrativeStage: 'ADMIN_COMPLETE',
        invitationLetter: {
          agendaNumber: '045/DKUM/2026',
          letterDate: '2026-09-30',
          letterTopic: 'Undangan Rapat Koordinasi',
          driveUrl: 'http://insecure-drive.google.com/file/123'
        }
      };

      const result = validateActivity(badUrlAdminAct);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Google Drive'))).toBe(true);
    });

    it('passes ADMIN_COMPLETE when full valid letter metadata is provided', () => {
      const completeAdminAct: ActivityDocument = {
        ...validActivity,
        administrativeStage: 'ADMIN_COMPLETE',
        invitationLetter: {
          agendaNumber: '045/DKUM/2026',
          letterDate: '2026-09-30',
          letterTopic: 'Undangan Rapat Koordinasi Batam',
          driveUrl: 'https://drive.google.com/file/d/1A2B3C_valid_link/view',
          documentVisibility: 'INTERNAL'
        }
      };

      const result = validateActivity(completeAdminAct);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes ADMIN_COMPLETE with missing document exception reason', () => {
      const exceptionAdminAct: ActivityDocument = {
        ...validActivity,
        administrativeStage: 'ADMIN_COMPLETE',
        invitationLetter: {
          missingDocumentReason: 'Undangan lisan dari Sekretaris Daerah Kota Batam'
        }
      };

      const result = validateActivity(exceptionAdminAct);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.some(w => w.includes('Pengecualian'))).toBe(true);
    });

    it('maintains backward compatibility with activities having undefined administrativeStage', () => {
      const legacyAct = { ...validActivity };
      delete (legacyAct as any).administrativeStage;
      delete (legacyAct as any).invitationLetter;

      const result = validateActivity(legacyAct);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
