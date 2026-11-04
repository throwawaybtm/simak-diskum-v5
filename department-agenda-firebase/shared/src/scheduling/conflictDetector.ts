/**
 * Pure TypeScript Conflict Detection Engine
 * 
 * Uses half-open [start, end) intervals in WIB (UTC+7).
 * Detects collisions on:
 * 1. Bookable office rooms (OFFICE locations where isBookableRoom === true)
 * 2. Shared staff attendees (overlapping schedules for the same employee)
 * 
 * Ignores CANCELLED activities and adjacent non-overlapping intervals.
 */

import type { ActivityDocument } from '../schema/activity';
import type { Location } from '../schema/master';
import { getExclusiveInterval, intervalsOverlap } from './timeUtils';

export type ConflictType = 'VENUE_CONFLICT' | 'ATTENDEE_CONFLICT';

export interface ConflictWarning {
  type: ConflictType;
  conflictingActivityId: string;
  conflictingTitle: string;
  message: string;
  sharedAttendeeIds?: string[];
  locationId?: string;
  locationName?: string;
}

export function findConflicts(
  candidate: ActivityDocument,
  existingActivities: ActivityDocument[],
  locations: Location[]
): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  const locationMap = new Map<string, Location>(locations.map(loc => [loc.id, loc]));

  // Calculate candidate's half-open interval
  const candidateInterval = getExclusiveInterval(
    candidate.startDate,
    candidate.startTime,
    candidate.endDate,
    candidate.endTime,
    candidate.openEnded
  );

  const candidateLoc = locationMap.get(candidate.locationId);

  for (const existing of existingActivities) {
    // 1. Skip self when editing
    if (existing.id && candidate.id && existing.id === candidate.id) {
      continue;
    }

    // 2. Skip cancelled activities (cancelled events do not occupy rooms or staff)
    if (existing.status === 'CANCELLED') {
      continue;
    }

    // 3. Calculate existing activity interval
    const existingInterval = getExclusiveInterval(
      existing.startDate,
      existing.startTime,
      existing.endDate,
      existing.endTime,
      existing.openEnded
    );

    // 4. Check if intervals overlap
    if (!intervalsOverlap(candidateInterval, existingInterval)) {
      continue;
    }

    // 5. Check Room / Venue Collision
    if (candidate.locationId === existing.locationId && candidateLoc) {
      if (candidateLoc.type === 'OFFICE' && candidateLoc.isBookableRoom) {
        warnings.push({
          type: 'VENUE_CONFLICT',
          conflictingActivityId: existing.id,
          conflictingTitle: existing.title,
          locationId: candidate.locationId,
          locationName: candidateLoc.name,
          message: `Bentrok ruangan: "${candidateLoc.name}" telah dijadwalkan untuk kegiatan "${existing.title}". Diperlukan alasan konfirmasi untuk melanjutkan.`
        });
      }
    }

    // 6. Check Staff / Attendee Collision
    const sharedStaff = (candidate.attendeeIds || []).filter(empId =>
      (existing.attendeeIds || []).includes(empId)
    );

    if (sharedStaff.length > 0) {
      warnings.push({
        type: 'ATTENDEE_CONFLICT',
        conflictingActivityId: existing.id,
        conflictingTitle: existing.title,
        sharedAttendeeIds: sharedStaff,
        message: `Bentrok jadwal pegawai: ${sharedStaff.length} orang pegawai yang sama ditugaskan pada kegiatan "${existing.title}". Diperlukan alasan konfirmasi untuk melanjutkan.`
      });
    }
  }

  return warnings;
}
