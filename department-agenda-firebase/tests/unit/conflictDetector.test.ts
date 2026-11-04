import { describe, it, expect } from 'vitest';
import { findConflicts } from '../../shared/src/scheduling/conflictDetector';
import type { ActivityDocument } from '../../shared/src/schema/activity';
import type { Location } from '../../shared/src/schema/master';

describe('Conflict Detection Engine', () => {
  const masterLocations: Location[] = [
    { id: 'loc_office_01', name: 'Ruang Rapat Kadis', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_office_02', name: 'Aula PLUT', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_online', name: 'Zoom Meeting', type: 'ONLINE', isBookableRoom: false, active: true },
    { id: 'loc_external', name: 'Hotel Planet', type: 'EXTERNAL', isBookableRoom: false, active: true }
  ];

  const baseActivity: ActivityDocument = {
    id: 'act_existing_01',
    title: 'Rapat Evaluasi Triwulan',
    startDate: '2026-10-01',
    startTime: '09:00',
    endDate: '2026-10-01',
    endTime: '11:00',
    openEnded: false,
    locationId: 'loc_office_01',
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
    createdAt: '2026-09-01T00:00:00.000Z',
    createdBy: 'admin',
    updatedAt: '2026-09-01T00:00:00.000Z',
    updatedBy: 'admin'
  };

  it('triggers warning for same bookable OFFICE room at overlapping times', () => {
    const candidate: ActivityDocument = {
      ...baseActivity,
      id: 'act_candidate_01',
      title: 'Rapat Pengawasan',
      startTime: '10:00',
      endTime: '12:00',
      locationId: 'loc_office_01',
      attendeeIds: ['emp_02'] // Different staff!
    };

    const conflicts = findConflicts(candidate, [baseActivity], masterLocations);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('VENUE_CONFLICT');
    expect(conflicts[0].message).toContain('Ruang Rapat Kadis');
  });

  it('triggers warning for shared staff attendee at overlapping times even in different venues', () => {
    const candidate: ActivityDocument = {
      ...baseActivity,
      id: 'act_candidate_02',
      title: 'Webinar Regulasi',
      startTime: '10:30',
      endTime: '11:30',
      locationId: 'loc_online', // Online location
      attendeeIds: ['emp_01'] // Same staff as baseActivity!
    };

    const conflicts = findConflicts(candidate, [baseActivity], masterLocations);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('ATTENDEE_CONFLICT');
    expect(conflicts[0].sharedAttendeeIds).toContain('emp_01');
  });

  it('triggers NO warning for adjacent intervals on the same day in the same room', () => {
    const candidate: ActivityDocument = {
      ...baseActivity,
      id: 'act_candidate_03',
      title: 'Rapat Sesi 2',
      startTime: '11:00', // Adjacent to 09:00-11:00
      endTime: '12:00',
      locationId: 'loc_office_01',
      attendeeIds: ['emp_01']
    };

    const conflicts = findConflicts(candidate, [baseActivity], masterLocations);
    expect(conflicts).toHaveLength(0);
  });

  it('triggers NO warning for different rooms and different staff at the same clock time', () => {
    const candidate: ActivityDocument = {
      ...baseActivity,
      id: 'act_candidate_04',
      title: 'Pelatihan Aula',
      startTime: '09:00',
      endTime: '11:00',
      locationId: 'loc_office_02', // Different room
      attendeeIds: ['emp_03'] // Different staff
    };

    const conflicts = findConflicts(candidate, [baseActivity], masterLocations);
    expect(conflicts).toHaveLength(0);
  });

  it('ignores CANCELLED existing activities during conflict checks', () => {
    const cancelledActivity: ActivityDocument = {
      ...baseActivity,
      status: 'CANCELLED'
    };

    const candidate: ActivityDocument = {
      ...baseActivity,
      id: 'act_candidate_05',
      startTime: '09:30',
      endTime: '10:30'
    };

    const conflicts = findConflicts(candidate, [cancelledActivity], masterLocations);
    expect(conflicts).toHaveLength(0);
  });

  it('warns for open-ended activity overlapping throughout the remainder of the calendar day', () => {
    const openEndedActivity: ActivityDocument = {
      ...baseActivity,
      id: 'act_open_01',
      openEnded: true,
      endTime: null,
      startTime: '09:00'
    };

    const eveningCandidate: ActivityDocument = {
      ...baseActivity,
      id: 'act_candidate_evening',
      startTime: '19:00',
      endTime: '21:00'
    };

    const conflicts = findConflicts(eveningCandidate, [openEndedActivity], masterLocations);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
