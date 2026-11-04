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
}
