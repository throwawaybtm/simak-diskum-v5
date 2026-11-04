/**
 * Activity entity and attendee snapshot schemas
 * Pure TypeScript definitions with zero Firebase/DOM runtime dependencies.
 */

export interface AttendeeSnapshot {
  employeeId: string;
  name: string;
  position: string;
  departmentId?: string;
  label: string; // Formatted snapshot label, e.g. "1. Kadis (Drs. Hendri Arifin, M.Si)"
}

export type ActivityStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';

export type AdministrativeStage =
  | 'INITIAL_ENTRY'
  | 'OFFLINE_PROCESS'
  | 'DETAILS_COMPLETED'
  | 'ADMIN_COMPLETE';

export type DocumentVisibility = 'INTERNAL' | 'PUBLIC';

export interface InvitationLetterMetadata {
  agendaNumber?: string;              // Handwritten registration number in incoming mail book
  letterDate?: string;                // Date on physical letter (YYYY-MM-DD)
  letterTopic?: string;               // Subject / perihal of invitation letter
  driveUrl?: string;                  // HTTPS Google Drive / Docs link
  documentVisibility?: DocumentVisibility; // Default: 'INTERNAL'
  missingDocumentReason?: string;     // Explicit reason if ADMIN_COMPLETE lacks letter
}

export interface ActivityDocument {
  id: string;                      // UUID v4
  title: string;                   // Min 3 chars
  startDate: string;               // YYYY-MM-DD (WIB)
  startTime: string;               // HH:mm (WIB)
  endDate: string;                 // YYYY-MM-DD (WIB)
  endTime: string | null;          // HH:mm or null ("s.d. selesai")
  openEnded: boolean;              // true if endTime is null
  locationId: string;              // Foreign key to locations/{id}
  organizerId: string;             // Foreign key to organizers/{id}
  categoryId: string;              // Foreign key to categories/{id}
  attendeeIds: string[];           // Employee ID references
  attendeeSnapshots: AttendeeSnapshot[]; // Frozen snapshot at scheduling time
  guestAttendees: string[];        // Non-employee participants
  status: ActivityStatus;
  cancelReason?: string;           // Private internal cancellation explanation
  publicCancellationNotice?: string; // Optional reviewed notice intentionally published to visitors
  publicNotes: string;             // Attire ("Pakaian: PSL"), public notices
  privateNotes: string;            // Internal notes (Never public)
  privateMeetingUrl: string | null;// Meeting credentials (Never public)
  version: number;                 // Optimistic concurrency version
  createdAt: string;               // ISO 8601 UTC
  createdBy: string;               // Actor label or user ID
  updatedAt: string;               // ISO 8601 UTC
  updatedBy: string;               // Actor label or user ID

  // Feature F01: Administrative Workflow & Invitation Letter Reference
  administrativeStage?: AdministrativeStage; // Default 'INITIAL_ENTRY'
  invitationLetter?: InvitationLetterMetadata;
}
