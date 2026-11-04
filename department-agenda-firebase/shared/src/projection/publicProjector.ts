/**
 * Pure TypeScript Public Projection & Privacy Isolation Engine
 * 
 * Guarantees zero leakage of:
 * - privateNotes
 * - privateMeetingUrl (Zoom / Teams links and passcodes)
 * - internal cancelReason
 * - raw database employee IDs
 * 
 * Preserves CANCELLED status and formats official Indonesian labels.
 */

import type { ActivityDocument } from '../schema/activity';
import type { Location, Organizer, Category } from '../schema/master';
import type { PublicActivityDTO } from '../schema/publicDto';
import { formatIndonesianDateSpan, formatTimeDisplay } from '../scheduling/timeUtils';
import { sanitizePublicText } from '../validation/privacyScanner';

export interface ProjectorLookups {
  locations: Map<string, Location>;
  organizers: Map<string, Organizer>;
  categories: Map<string, Category>;
}

export function projectPublicActivity(
  privateRecord: ActivityDocument,
  lookups: ProjectorLookups
): PublicActivityDTO {
  const loc = lookups.locations.get(privateRecord.locationId);
  const org = lookups.organizers.get(privateRecord.organizerId);
  const cat = lookups.categories.get(privateRecord.categoryId);

  // Format Indonesian date and time displays
  const dateDisplay = formatIndonesianDateSpan(privateRecord.startDate, privateRecord.endDate);
  const timeDisplay = formatTimeDisplay(
    privateRecord.startTime,
    privateRecord.endTime,
    privateRecord.openEnded
  );

  // Extract public labels from immutable attendee snapshots
  const attendeeLabels = (privateRecord.attendeeSnapshots || []).map(snap => snap.label);

  // Secondary defense-in-depth sanitization on public notes
  const safePublicNotes = sanitizePublicText(privateRecord.publicNotes || '');

  const dto: PublicActivityDTO = {
    id: privateRecord.id,
    title: privateRecord.title,
    startDate: privateRecord.startDate,
    startTime: privateRecord.startTime,
    endDate: privateRecord.endDate,
    endTime: privateRecord.endTime ?? null,
    openEnded: privateRecord.openEnded,
    timeDisplay,
    dateDisplay,
    status: privateRecord.status,
    locationName: loc ? loc.name : 'Lokasi Dinas',
    locationType: loc ? loc.type : 'OFFICE',
    organizerName: org ? org.name : 'Dinas Koperasi dan UKM Batam',
    categoryName: cat ? cat.name : 'Kegiatan',
    publicNotes: safePublicNotes,
    attendeeLabels,
    version: privateRecord.version,
    updatedAt: privateRecord.updatedAt
  };

  if (privateRecord.publicCancellationNotice) {
    dto.publicCancellationNotice = privateRecord.publicCancellationNotice;
  }

  return dto;
}
