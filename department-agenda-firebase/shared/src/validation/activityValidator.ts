/**
 * Pure TypeScript Activity Validation Engine
 * Validates integrity, chronology, and mandatory references
 */

import type { ActivityDocument } from '../schema/activity';
import { wibDateTimeToUtcInstant } from '../scheduling/timeUtils';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateActivity(activity: Partial<ActivityDocument>): ValidationResult {
  const errors: string[] = [];

  // Title validation
  if (!activity.title || activity.title.trim().length < 3) {
    errors.push('Judul kegiatan wajib diisi minimal 3 karakter.');
  }

  // Date presence and format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!activity.startDate || !dateRegex.test(activity.startDate)) {
    errors.push('Tanggal mulai tidak valid (format YYYY-MM-DD).');
  }
  if (!activity.endDate || !dateRegex.test(activity.endDate)) {
    errors.push('Tanggal selesai tidak valid (format YYYY-MM-DD).');
  }

  // Chronological date ordering
  if (activity.startDate && activity.endDate && activity.startDate > activity.endDate) {
    errors.push('Tanggal selesai tidak boleh mendahului tanggal mulai.');
  }

  // Time format
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!activity.startTime || !timeRegex.test(activity.startTime)) {
    errors.push('Waktu mulai tidak valid (format HH:mm).');
  }

  // Fixed-time end vs start instant check
  if (!activity.openEnded) {
    if (!activity.endTime || !timeRegex.test(activity.endTime)) {
      errors.push('Waktu selesai wajib diisi untuk kegiatan berbatas waktu.');
    } else if (activity.startDate && activity.endDate && activity.startTime) {
      try {
        const startInstant = wibDateTimeToUtcInstant(activity.startDate, activity.startTime);
        const endInstant = wibDateTimeToUtcInstant(activity.endDate, activity.endTime);

        if (endInstant <= startInstant) {
          errors.push('Waktu selesai harus lebih lambat dari waktu mulai.');
        }
      } catch (err) {
        errors.push('Gagal menghitung rentang waktu kegiatan.');
      }
    }
  }

  // Mandatory master data associations
  if (!activity.locationId) {
    errors.push('Lokasi kegiatan wajib dipilih.');
  }
  if (!activity.organizerId) {
    errors.push('Penyelenggara kegiatan wajib dipilih.');
  }
  if (!activity.categoryId) {
    errors.push('Kategori kegiatan wajib dipilih.');
  }

  // Attendee requirement: at least one employee or guest
  const hasEmployees = Array.isArray(activity.attendeeIds) && activity.attendeeIds.length > 0;
  const hasGuests = Array.isArray(activity.guestAttendees) && activity.guestAttendees.length > 0;
  if (!hasEmployees && !hasGuests) {
    errors.push('Kegiatan harus memiliki minimal satu peserta (pegawai atau tamu).');
  }

  // Status and cancellation reason
  const validStatuses = ['SCHEDULED', 'CANCELLED', 'COMPLETED'];
  if (!activity.status || !validStatuses.includes(activity.status)) {
    errors.push('Status kegiatan tidak valid.');
  }

  if (activity.status === 'CANCELLED') {
    if (!activity.cancelReason || activity.cancelReason.trim().length === 0) {
      errors.push('Kegiatan yang dibatalkan wajib mencantumkan alasan pembatalan.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
