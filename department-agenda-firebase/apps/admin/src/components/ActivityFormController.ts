/**
 * Admin Activity Form Controller & UI State Helper
 * Manages form lifecycle, real-time validation, credential blocking, and live preview.
 */

import type { ActivityDocument, ActivityStatus, AttendeeSnapshot } from '@department-agenda/shared';
import type { Location, Organizer, Category, Employee } from '@department-agenda/shared';
import type { PublicActivityDTO } from '@department-agenda/shared';
import {
  validateActivity,
  scanForCredentials,
  projectPublicActivity,
  findConflicts,
  captureAttendeeSnapshots,
  type ConflictWarning
} from '@department-agenda/shared';

export interface ActivityFormState {
  id: string;
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string | null;
  openEnded: boolean;
  locationId: string;
  organizerId: string;
  categoryId: string;
  attendeeIds: string[];
  attendeeSnapshots: AttendeeSnapshot[];
  guestAttendees: string[];
  status: ActivityStatus;
  cancelReason?: string;
  publicCancellationNotice?: string;
  publicNotes: string;
  privateNotes: string;
  privateMeetingUrl: string | null;
  version: number;
  conflictOverrideReason?: string;
}

export interface FormValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  privacyViolations: string[];
}

export function createInitialActivityFormState(): ActivityFormState {
  // Format today's date in YYYY-MM-DD
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;

  const randomId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: randomId,
    title: '',
    startDate: today,
    startTime: '09:00',
    endDate: today,
    endTime: '11:00',
    openEnded: false,
    locationId: '',
    organizerId: '',
    categoryId: '',
    attendeeIds: [],
    attendeeSnapshots: [],
    guestAttendees: [],
    status: 'SCHEDULED',
    publicNotes: '',
    privateNotes: '',
    privateMeetingUrl: null,
    version: 0
  };
}

export function validateActivityForm(form: ActivityFormState): FormValidationResult {
  const baseResult = validateActivity(form as Partial<ActivityDocument>);

  // Privacy scan on publicNotes and title
  const privacyCheck = scanForCredentials(`${form.title} ${form.publicNotes}`);
  const privacyViolations = privacyCheck.violations;

  // Credential violations block publication
  const isValid = baseResult.valid && !privacyCheck.hasViolations;

  return {
    valid: isValid,
    errors: baseResult.errors,
    warnings: baseResult.warnings,
    privacyViolations
  };
}

export function generateLivePreviewDto(
  form: ActivityFormState,
  locations: Location[],
  organizers: Organizer[],
  categories: Category[],
  employees: Employee[]
): PublicActivityDTO {
  const locMap = new Map<string, Location>(locations.map(l => [l.id, l]));
  const orgMap = new Map<string, Organizer>(organizers.map(o => [o.id, o]));
  const catMap = new Map<string, Category>(categories.map(c => [c.id, c]));

  // Generate attendee snapshots from current selections
  const snapshots = captureAttendeeSnapshots(form.attendeeIds, employees, form.guestAttendees);

  const mockPrivateDoc: ActivityDocument = {
    ...form,
    attendeeSnapshots: snapshots,
    createdAt: new Date().toISOString(),
    createdBy: 'admin_preview',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin_preview'
  };

  return projectPublicActivity(mockPrivateDoc, {
    locations: locMap,
    organizers: orgMap,
    categories: catMap
  });
}

export function evaluateActivityConflicts(
  form: ActivityFormState,
  existingActivities: ActivityDocument[],
  locations: Location[]
): ConflictWarning[] {
  const candidateDoc: ActivityDocument = {
    ...form,
    createdAt: new Date().toISOString(),
    createdBy: 'admin',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin'
  };

  return findConflicts(candidateDoc, existingActivities, locations);
}
