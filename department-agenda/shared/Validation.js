/**
 * shared/Validation.js
 * Validation rules for activity records and master data.
 * Includes privacy leak detection for public notes to prevent publishing Zoom/Meet credentials.
 */

let SchemaModule;
if (typeof require !== 'undefined') {
  try {
    SchemaModule = require('./Schema.js');
  } catch (e) {
    SchemaModule = globalThis.Schema;
  }
} else {
  SchemaModule = globalThis.Schema;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3])[:.][0-5]\d$/;

// Pattern that identifies video conference meeting links or passwords in public text
const PRIVACY_LEAK_PATTERN = /(https?:\/\/[^\s]*(zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com)|(meeting\s*id|passcode|pwd=|password|pin)[\s:]+[a-zA-Z0-9_\-\.]+)/i;

const Validation = {
  validateActivity(input, isUpdate = false) {
    const errors = [];
    if (!input || typeof input !== 'object') {
      return { ok: false, errors: [{ field: 'root', code: 'REQUIRED', message: 'Payload is missing' }] };
    }

    // 1. Title validation
    if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
      errors.push({ field: 'title', code: 'REQUIRED', message: 'Judul kegiatan wajib diisi' });
    }

    // 2. Start Date validation
    if (!input.start_date || !DATE_REGEX.test(input.start_date)) {
      errors.push({ field: 'start_date', code: 'INVALID_FORMAT', message: 'Format tanggal mulai harus YYYY-MM-DD' });
    }

    // 3. End Date validation
    const effectiveEndDate = input.end_date || input.start_date;
    if (input.end_date && !DATE_REGEX.test(input.end_date)) {
      errors.push({ field: 'end_date', code: 'INVALID_FORMAT', message: 'Format tanggal selesai harus YYYY-MM-DD' });
    } else if (input.start_date && effectiveEndDate && effectiveEndDate < input.start_date) {
      errors.push({ field: 'end_date', code: 'DATE_ORDER', message: 'Tanggal selesai tidak boleh sebelum tanggal mulai' });
    }

    // 4. Time validation
    if (input.start_time && !TIME_REGEX.test(input.start_time)) {
      errors.push({ field: 'start_time', code: 'INVALID_FORMAT', message: 'Format jam mulai harus HH:mm (WIB)' });
    }
    if (input.end_time && !TIME_REGEX.test(input.end_time)) {
      errors.push({ field: 'end_time', code: 'INVALID_FORMAT', message: 'Format jam selesai harus HH:mm (WIB)' });
    }

    if (input.start_time && input.end_time && input.start_date === effectiveEndDate) {
      const s = input.start_time.replace('.', ':');
      const e = input.end_time.replace('.', ':');
      if (e <= s) {
        errors.push({ field: 'end_time', code: 'TIME_ORDER', message: 'Jam selesai harus setelah jam mulai pada hari yang sama' });
      }
    }

    // 5. Status validation
    const validStatuses = SchemaModule?.STATUS ? Object.values(SchemaModule.STATUS) : ['SCHEDULED', 'CANCELLED', 'COMPLETED'];
    if (input.status && !validStatuses.includes(input.status)) {
      errors.push({ field: 'status', code: 'INVALID_STATUS', message: 'Status tidak valid' });
    }

    // 6. Update checks: expectedVersion
    if (isUpdate) {
      if (input.expectedVersion === undefined || input.expectedVersion === null || !Number.isInteger(Number(input.expectedVersion)) || Number(input.expectedVersion) < 1) {
        errors.push({ field: 'expectedVersion', code: 'REQUIRED', message: 'expectedVersion wajib berupa bilangan bulat positif untuk update' });
      }
    }

    // 7. Privacy Leak Prevention on public_notes
    if (input.public_notes && typeof input.public_notes === 'string') {
      if (PRIVACY_LEAK_PATTERN.test(input.public_notes)) {
        errors.push({
          field: 'public_notes',
          code: 'PRIVACY_LEAK_RISK',
          message: 'Teks catatan publik terdeteksi memuat tautan atau kredensial rapat (Zoom/Meet/Password). Harap pindahkan ke Catatan Internal / URL Rapat Pribadi.'
        });
      }
    }

    return {
      ok: errors.length === 0,
      errors
    };
  },

  validateMasterData(kind, input) {
    const errors = [];
    if (!input || typeof input !== 'object') {
      return { ok: false, errors: [{ field: 'root', code: 'REQUIRED', message: 'Payload is missing' }] };
    }

    if (kind === 'Employees') {
      if (!input.full_name || input.full_name.trim().length === 0) {
        errors.push({ field: 'full_name', code: 'REQUIRED', message: 'Nama lengkap pegawai wajib diisi' });
      }
      if (!input.position || input.position.trim().length === 0) {
        errors.push({ field: 'position', code: 'REQUIRED', message: 'Jabatan wajib diisi' });
      }
    } else if (['Departments', 'Locations', 'Organizers', 'Categories'].includes(kind)) {
      if (!input.name || input.name.trim().length === 0) {
        errors.push({ field: 'name', code: 'REQUIRED', message: 'Nama entitas wajib diisi' });
      }
      if (kind === 'Locations') {
        const validTypes = ['OFFICE', 'EXTERNAL', 'ONLINE'];
        if (!input.location_type || !validTypes.includes(input.location_type)) {
          errors.push({ field: 'location_type', code: 'INVALID_TYPE', message: 'Tipe lokasi harus OFFICE, EXTERNAL, atau ONLINE' });
        }
      }
    } else {
      errors.push({ field: 'kind', code: 'INVALID_KIND', message: `Entitas master data '${kind}' tidak dikenali` });
    }

    return {
      ok: errors.length === 0,
      errors
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validation;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Validation = Validation;
}
