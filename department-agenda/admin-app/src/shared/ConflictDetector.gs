/**
 * shared/ConflictDetector.js
 * Conflict detection engine for Dinas Koperasi dan Usaha Mikro Kota Batam.
 * Detects schedule collisions on shared attendees or bookable OFFICE rooms.
 * Uses half-open [start, end) intervals; open-ended events use 00:00 WIB next day as exclusive boundary.
 */

let TimeUtilsModule;
if (typeof require !== 'undefined') {
  try {
    TimeUtilsModule = require('./TimeUtils.js');
  } catch (e) {
    TimeUtilsModule = globalThis.TimeUtils;
  }
} else {
  TimeUtilsModule = globalThis.TimeUtils;
}

const ConflictDetector = {
  /**
   * Find conflicts between a target activity and existing activities/attendees.
   *
   * @param {Object} activity - The activity being created or edited
   * @param {Array<Object>} existingActivities - All current activities
   * @param {Array<Object>} existingAttendees - All attendee rows (with activity_id, employee_id)
   * @param {Array<Object>} locations - Location records (to check location_type === 'OFFICE')
   * @param {Array<Object>} [employees] - Optional employee list for friendly names
   * @returns {Object} { hasConflict: boolean, conflicts: Array<Object> }
   */
  findConflicts(activity, existingActivities = [], existingAttendees = [], locations = [], employees = []) {
    const conflicts = [];
    if (!activity || !activity.start_date) {
      return { hasConflict: false, conflicts };
    }

    const isUntilFinished = activity.is_until_finished || !activity.end_time;
    const intervalA = TimeUtilsModule.makeInterval(
      activity.start_date,
      activity.start_time,
      activity.end_date,
      activity.end_time,
      isUntilFinished
    );

    // Map locations
    const locationMap = new Map();
    locations.forEach(loc => locationMap.set(loc.location_id, loc));

    // Map employees
    const employeeMap = new Map();
    employees.forEach(emp => employeeMap.set(emp.employee_id, emp));

    // Attendees for the target activity
    const targetEmployeeIds = new Set();
    if (Array.isArray(activity.attendees)) {
      activity.attendees.forEach(att => {
        if (att && att.employee_id) targetEmployeeIds.add(att.employee_id);
      });
    } else if (Array.isArray(activity.employee_ids)) {
      activity.employee_ids.forEach(id => targetEmployeeIds.add(id));
    }

    // Attendees map for existing activities: activity_id -> Set of employee_ids
    const existingAttendeesByActivity = new Map();
    existingAttendees.forEach(att => {
      if (!existingAttendeesByActivity.has(att.activity_id)) {
        existingAttendeesByActivity.set(att.activity_id, new Set());
      }
      if (att.employee_id) {
        existingAttendeesByActivity.get(att.activity_id).add(att.employee_id);
      }
    });

    for (const existing of existingActivities) {
      // Ignore self
      if (activity.activity_id && existing.activity_id === activity.activity_id) {
        continue;
      }
      // Ignore cancelled
      if (existing.status === 'CANCELLED') {
        continue;
      }

      const existingUntilFinished = existing.is_until_finished || !existing.end_time;
      const intervalB = TimeUtilsModule.makeInterval(
        existing.start_date,
        existing.start_time,
        existing.end_date,
        existing.end_time,
        existingUntilFinished
      );

      // Check interval intersection
      if (!TimeUtilsModule.intervalsIntersect(intervalA, intervalB)) {
        continue;
      }

      const isPotential = Boolean(isUntilFinished || existingUntilFinished);

      // 1. Room collision (only for bookable OFFICE rooms)
      if (activity.location_id && existing.location_id && activity.location_id === existing.location_id) {
        const loc = locationMap.get(activity.location_id);
        if (loc && loc.location_type === 'OFFICE') {
          conflicts.push({
            type: 'ROOM_CONFLICT',
            conflictingActivityId: existing.activity_id,
            conflictingActivityTitle: existing.title,
            resourceId: loc.location_id,
            resourceName: loc.name,
            isPotentialWarning: isPotential,
            message: `Ruang rapat "${loc.name}" telah dipesan untuk kegiatan "${existing.title}".`
          });
        }
      }

      // 2. Attendee collision
      const existingStaff = existingAttendeesByActivity.get(existing.activity_id);
      if (existingStaff && existingStaff.size > 0 && targetEmployeeIds.size > 0) {
        for (const empId of targetEmployeeIds) {
          if (existingStaff.has(empId)) {
            const emp = employeeMap.get(empId);
            const staffName = emp ? emp.full_name : `Pegawai ID ${empId}`;
            conflicts.push({
              type: 'ATTENDEE_CONFLICT',
              conflictingActivityId: existing.activity_id,
              conflictingActivityTitle: existing.title,
              resourceId: empId,
              resourceName: staffName,
              isPotentialWarning: isPotential,
              message: `Pegawai "${staffName}" telah terdaftar pada kegiatan "${existing.title}".`
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConflictDetector;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ConflictDetector = ConflictDetector;
}
