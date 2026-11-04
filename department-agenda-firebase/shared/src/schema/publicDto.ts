/**
 * Public Sanitized DTO schema
 * Guaranteed exclusion of all internal secrets, private notes, meeting URLs, and raw employee IDs.
 */

import type { ActivityStatus } from './activity';
import type { LocationType } from './master';

export interface PublicActivityDTO {
  id: string;                      // Matches parent activityId
  title: string;
  startDate: string;               // YYYY-MM-DD
  startTime: string;               // HH:mm
  endDate: string;                 // YYYY-MM-DD
  endTime: string | null;          // null if open-ended
  openEnded: boolean;
  timeDisplay: string;             // e.g. "07.00 WIB s.d. selesai"
  dateDisplay: string;             // e.g. "Kamis, 1 Oktober 2026"
  status: ActivityStatus;          // Retained on CANCELLED
  publicCancellationNotice?: string;// Visitor-facing notice if cancelled
  locationName: string;
  locationType: LocationType;
  organizerName: string;
  categoryName: string;
  publicNotes: string;             // Attire ("Pakaian: PSL") & public directions
  attendeeLabels: string[];        // Resolved public snapshot labels
  updatedAt: string;               // ISO 8601 UTC
}
