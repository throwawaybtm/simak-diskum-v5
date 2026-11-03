const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ConflictDetector = require('../shared/ConflictDetector.js');
const synthetic = require('./fixtures/synthetic_agenda.json');

describe('ConflictDetector', () => {
  const existingActivities = [
    {
      activity_id: 'act-1',
      title: 'Rapat Koordinasi UKM',
      start_date: '2026-10-01',
      start_time: '09:00',
      end_date: '2026-10-01',
      end_time: '11:00',
      location_id: 'loc-1', // OFFICE
      status: 'SCHEDULED'
    },
    {
      activity_id: 'act-2',
      title: 'Pelatihan Kewirausahaan (s.d. selesai)',
      start_date: '2026-10-02',
      start_time: '08:30',
      end_date: '2026-10-02',
      end_time: null, // open-ended
      location_id: 'loc-2', // OFFICE
      status: 'SCHEDULED'
    }
  ];

  const existingAttendees = [
    { activity_id: 'act-1', employee_id: 'emp-1', public_label: '1. Kadis' },
    { activity_id: 'act-2', employee_id: 'emp-2', public_label: '2. Sekretaris' }
  ];

  const locations = synthetic.Locations;
  const employees = synthetic.Employees;

  test('adjacent interval in same room produces NO conflict', () => {
    const newActivity = {
      activity_id: 'act-new',
      title: 'Rapat Bidang Koperasi',
      start_date: '2026-10-01',
      start_time: '11:00',
      end_date: '2026-10-01',
      end_time: '12:00',
      location_id: 'loc-1', // same office room, adjacent time [09:00-11:00) vs [11:00-12:00)
      attendees: [{ employee_id: 'emp-3' }]
    };

    const result = ConflictDetector.findConflicts(newActivity, existingActivities, existingAttendees, locations, employees);
    assert.strictEqual(result.hasConflict, false);
    assert.strictEqual(result.conflicts.length, 0);
  });

  test('overlapping time in same OFFICE room produces ROOM_CONFLICT', () => {
    const newActivity = {
      activity_id: 'act-new',
      title: 'Audiensi Asosiasi Pedagang',
      start_date: '2026-10-01',
      start_time: '10:00',
      end_date: '2026-10-01',
      end_time: '12:00',
      location_id: 'loc-1', // same office room, overlaps [10:00-11:00)
      attendees: [{ employee_id: 'emp-3' }]
    };

    const result = ConflictDetector.findConflicts(newActivity, existingActivities, existingAttendees, locations, employees);
    assert.strictEqual(result.hasConflict, true);
    assert.ok(result.conflicts.some(c => c.type === 'ROOM_CONFLICT'));
  });

  test('overlapping time in EXTERNAL or ONLINE venue produces NO room conflict', () => {
    const newActivity = {
      activity_id: 'act-new',
      title: 'Webinar Sosialisasi NIB',
      start_date: '2026-10-01',
      start_time: '10:00',
      end_date: '2026-10-01',
      end_time: '11:00',
      location_id: 'loc-4', // ONLINE (Zoom), non-bookable room
      attendees: [{ employee_id: 'emp-4' }] // different staff
    };

    const result = ConflictDetector.findConflicts(newActivity, existingActivities, existingAttendees, locations, employees);
    assert.strictEqual(result.hasConflict, false);
  });

  test('overlapping time with SHARED EMPLOYEE produces ATTENDEE_CONFLICT', () => {
    const newActivity = {
      activity_id: 'act-new',
      title: 'Kunjungan Kerja Walikota',
      start_date: '2026-10-01',
      start_time: '10:00',
      end_date: '2026-10-01',
      end_time: '12:00',
      location_id: 'loc-3', // EXTERNAL location
      attendees: [{ employee_id: 'emp-1' }] // emp-1 (Kadis) is already in act-1
    };

    const result = ConflictDetector.findConflicts(newActivity, existingActivities, existingAttendees, locations, employees);
    assert.strictEqual(result.hasConflict, true);
    assert.ok(result.conflicts.some(c => c.type === 'ATTENDEE_CONFLICT'));
  });

  test('open-ended event flags potential warning for afternoon event in same office room', () => {
    const newActivity = {
      activity_id: 'act-new',
      title: 'Rapat Sore Evaluasi',
      start_date: '2026-10-02',
      start_time: '14:00',
      end_date: '2026-10-02',
      end_time: '16:00',
      location_id: 'loc-2', // loc-2 has open-ended act-2 starting at 08:30 s.d. selesai
      attendees: [{ employee_id: 'emp-4' }]
    };

    const result = ConflictDetector.findConflicts(newActivity, existingActivities, existingAttendees, locations, employees);
    assert.strictEqual(result.hasConflict, true);
    const roomConflict = result.conflicts.find(c => c.type === 'ROOM_CONFLICT');
    assert.ok(roomConflict);
    assert.strictEqual(roomConflict.isPotentialWarning, true);
  });
});
