const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Projection = require('../shared/Projection.js');
const synthetic = require('./fixtures/synthetic_agenda.json');

describe('Projection (Public DTO Privacy Boundary)', () => {
  const rawActivity = {
    activity_id: 'act-secret-123',
    title: 'Rapat Evaluasi Anggaran',
    start_date: '2026-10-01',
    start_time: '09:00',
    end_date: '2026-10-01',
    end_time: '11:00',
    location_id: 'loc-1',
    organizer_id: 'org-2',
    category_id: 'cat-2',
    status: 'SCHEDULED',
    public_notes: 'Pakaian batik dinas',
    private_notes: 'Catatan rahasia internal: siapkan laporan defisit',
    private_meeting_url: 'https://zoom.us/j/123456789?pwd=supersecretpasscode',
    cancel_reason: '',
    version: 3,
    created_at: '2026-09-30T00:00:00Z',
    created_by: 'admin-internal-user',
    updated_at: new Date().toISOString(), // recent update
    updated_by: 'admin-internal-user'
  };

  const rawAttendees = [
    {
      attendee_id: 'att-1',
      activity_id: 'act-secret-123',
      employee_id: 'emp-internal-999',
      guest_name: '',
      attendee_role: 'Kadis',
      name_snapshot: 'Dr. Hendri Arulan, S.Pd., M.M.',
      position_snapshot: 'Kepala Dinas',
      public_label: '1. Kadis'
    },
    {
      attendee_id: 'att-2',
      activity_id: 'act-secret-123',
      employee_id: 'emp-internal-888',
      guest_name: '',
      attendee_role: 'Sekretaris',
      name_snapshot: 'Rahmat Sugiarto, S.E.',
      position_snapshot: 'Sekretaris Dinas',
      public_label: '2. Sekretaris'
    }
  ];

  const lookups = {
    locations: synthetic.Locations,
    organizers: synthetic.Organizers,
    categories: synthetic.Categories
  };

  test('projectPublicActivity returns only authorized public fields', () => {
    const dto = Projection.projectPublicActivity(rawActivity, rawAttendees, lookups);

    assert.strictEqual(dto.id, 'act-secret-123');
    assert.strictEqual(dto.title, 'Rapat Evaluasi Anggaran');
    assert.strictEqual(dto.startDate, '2026-10-01');
    assert.strictEqual(dto.endDate, '2026-10-01');
    assert.strictEqual(dto.timeDisplay, '09.00 - 11.00 WIB');
    assert.strictEqual(dto.locationName, 'Ruang Rapat Kadis (Lantai 2)');
    assert.strictEqual(dto.organizerName, 'Dinas Koperasi dan UKM Kota Batam');
    assert.strictEqual(dto.categoryName, 'Rapat Koordinasi');
    assert.strictEqual(dto.publicNotes, 'Pakaian batik dinas');
    assert.deepStrictEqual(dto.attendeeLabels, ['1. Kadis', '2. Sekretaris']);
    assert.strictEqual(dto.recentlyUpdated, true);
  });

  test('projectPublicActivity strictly filters out all private credentials and internal IDs', () => {
    const dto = Projection.projectPublicActivity(rawActivity, rawAttendees, lookups);

    assert.strictEqual(dto.private_notes, undefined, 'private_notes must not be present');
    assert.strictEqual(dto.privateNotes, undefined, 'privateNotes must not be present');
    assert.strictEqual(dto.private_meeting_url, undefined, 'private_meeting_url must not be present');
    assert.strictEqual(dto.privateMeetingUrl, undefined, 'privateMeetingUrl must not be present');
    assert.strictEqual(dto.created_by, undefined, 'created_by must not be present');
    assert.strictEqual(dto.updated_by, undefined, 'updated_by must not be present');
    assert.strictEqual(dto.version, undefined, 'internal version must not be present');

    // Verify raw attendee employee_ids are stripped
    const jsonStr = JSON.stringify(dto);
    assert.strictEqual(jsonStr.includes('supersecretpasscode'), false, 'Passcode must not leak into JSON');
    assert.strictEqual(jsonStr.includes('laporan defisit'), false, 'Private notes must not leak into JSON');
    assert.strictEqual(jsonStr.includes('emp-internal-999'), false, 'Employee DB IDs must not leak into JSON');
    assert.strictEqual(jsonStr.includes('admin-internal-user'), false, 'Admin actor IDs must not leak into JSON');
  });
});
