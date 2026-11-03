/**
 * shared/Projection.js
 * Sanitizes internal database activity records into safe, public-facing DTOs.
 * Strictly guarantees that no private notes, meeting credentials (Zoom/Meet passcodes),
 * internal database IDs, or audit metadata leak to public clients.
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

const RECENT_THRESHOLD_MS = 48 * 3600 * 1000; // 48 hours

const Projection = {
  /**
   * Projects a single raw activity record into an approved public DTO.
   */
  projectPublicActivity(rawActivity, rawAttendees = [], lookups = {}) {
    if (!rawActivity) return null;

    // Helper map resolver
    const findInLookup = (listOrMap, idKey, idVal) => {
      if (!listOrMap || !idVal) return null;
      if (Array.isArray(listOrMap)) {
        return listOrMap.find(item => item && item[idKey] === idVal) || null;
      }
      if (listOrMap instanceof Map) {
        return listOrMap.get(idVal) || null;
      }
      if (typeof listOrMap === 'object') {
        return listOrMap[idVal] || null;
      }
      return null;
    };

    const locationObj = findInLookup(lookups.locations, 'location_id', rawActivity.location_id);
    const organizerObj = findInLookup(lookups.organizers, 'organizer_id', rawActivity.organizer_id);
    const categoryObj = findInLookup(lookups.categories, 'category_id', rawActivity.category_id);

    // Format attendee public labels (e.g. "1. Kadis", "2. Sekretaris")
    const attendeeLabels = [];
    if (Array.isArray(rawAttendees)) {
      rawAttendees
        .filter(att => att && (att.activity_id === rawActivity.activity_id || !att.activity_id))
        .forEach(att => {
          if (att.public_label && att.public_label.trim().length > 0) {
            attendeeLabels.push(att.public_label.trim());
          } else if (att.name_snapshot && att.name_snapshot.trim().length > 0) {
            attendeeLabels.push(att.name_snapshot.trim());
          } else if (att.guest_name && att.guest_name.trim().length > 0) {
            attendeeLabels.push(att.guest_name.trim());
          }
        });
    }

    // Determine recentlyUpdated
    let recentlyUpdated = false;
    if (rawActivity.updated_at) {
      const updateEpoch = new Date(rawActivity.updated_at).getTime();
      if (!isNaN(updateEpoch) && (Date.now() - updateEpoch) <= RECENT_THRESHOLD_MS) {
        recentlyUpdated = true;
      }
    }

    const effectiveEndDate = rawActivity.end_date || rawActivity.start_date;
    const timeDisplay = TimeUtilsModule.formatTimeRange(rawActivity.start_time, rawActivity.end_time);
    const dateDisplay = TimeUtilsModule.formatIndonesianDateRange(rawActivity.start_date, effectiveEndDate);

    // Construct the STRICT public DTO
    const publicDto = {
      id: String(rawActivity.activity_id || ''),
      title: String(rawActivity.title || ''),
      startDate: String(rawActivity.start_date || ''),
      startTime: rawActivity.start_time || null,
      endDate: String(effectiveEndDate || ''),
      endTime: rawActivity.end_time || null,
      timeDisplay,
      dateDisplay,
      locationName: locationObj ? locationObj.name : (rawActivity.location_name || '-'),
      locationType: locationObj ? locationObj.location_type : 'EXTERNAL',
      organizerName: organizerObj ? organizerObj.name : (rawActivity.organizer_name || '-'),
      categoryName: categoryObj ? categoryObj.name : (rawActivity.category_name || '-'),
      status: rawActivity.status || 'SCHEDULED',
      publicNotes: String(rawActivity.public_notes || ''),
      attendeeLabels,
      recentlyUpdated
    };

    return publicDto;
  },

  /**
   * Projects a collection of activities.
   */
  projectPublicList(rawActivities = [], rawAttendees = [], lookups = {}) {
    // Group attendees by activity_id
    const attendeesByActivity = new Map();
    if (Array.isArray(rawAttendees)) {
      rawAttendees.forEach(att => {
        if (!att || !att.activity_id) return;
        if (!attendeesByActivity.has(att.activity_id)) {
          attendeesByActivity.set(att.activity_id, []);
        }
        attendeesByActivity.get(att.activity_id).push(att);
      });
    }

    return rawActivities.map(act => {
      const activityAttendees = attendeesByActivity.get(act.activity_id) || [];
      return Projection.projectPublicActivity(act, activityAttendees, lookups);
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Projection;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Projection = Projection;
}
