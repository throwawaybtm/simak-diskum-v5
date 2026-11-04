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

  it('rejects activities without attendees (both attendeeIds and guestAttendees empty)', () => {
    const result = validateActivity({
      ...validActivity,
      attendeeIds: [],
      guestAttendees: []
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('peserta'))).toBe(true);
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
});
