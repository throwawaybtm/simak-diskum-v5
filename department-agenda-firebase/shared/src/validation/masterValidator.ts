/**
 * Pure TypeScript Master Data Validation & Duplicate Detection Engine
 * Validates Employees, Departments, Locations, Organizers, and Categories.
 */

import type {
  Employee,
  Department,
  Location,
  Organizer,
  Category,
  LocationType
} from '../schema/master';

export type MasterCollectionName =
  | 'employees'
  | 'departments'
  | 'locations'
  | 'organizers'
  | 'categories';

export interface MasterValidationResult {
  valid: boolean;
  errors: string[];
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const VALID_LOCATION_TYPES: LocationType[] = ['OFFICE', 'EXTERNAL', 'ONLINE'];

/**
 * Validates required fields and formatting for master records
 */
export function validateMasterRecord(
  collectionName: MasterCollectionName,
  record: Record<string, any>
): MasterValidationResult {
  const errors: string[] = [];

  const name = (record.name || '').trim();
  if (name.length < 2) {
    if (collectionName === 'employees') errors.push('Nama pegawai minimal 2 karakter.');
    else if (collectionName === 'departments') errors.push('Nama bidang/bagian minimal 2 karakter.');
    else if (collectionName === 'locations') errors.push('Nama lokasi minimal 2 karakter.');
    else if (collectionName === 'organizers') errors.push('Nama penyelenggara minimal 2 karakter.');
    else if (collectionName === 'categories') errors.push('Nama kategori minimal 2 karakter.');
    else errors.push('Nama wajib diisi minimal 2 karakter.');
  }

  if (collectionName === 'employees') {
    const position = (record.position || '').trim();
    if (position.length < 2) {
      errors.push('Jabatan pegawai wajib diisi minimal 2 karakter.');
    }
    const deptId = (record.departmentId || '').trim();
    if (!deptId) {
      errors.push('Bidang / Bagian (Departemen) wajib dipilih.');
    }
  }

  if (collectionName === 'locations') {
    const type = record.type as LocationType;
    if (!VALID_LOCATION_TYPES.includes(type)) {
      errors.push('Tipe lokasi harus OFFICE, EXTERNAL, atau ONLINE.');
    }
  }

  if (collectionName === 'categories') {
    const colorHex = (record.colorHex || '').trim();
    if (!HEX_COLOR_REGEX.test(colorHex)) {
      errors.push('Warna label harus berformat kode HEX valid (contoh: #0284c7).');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Checks whether an active record with the same name already exists (case-insensitive)
 * If currentId is provided, skips comparing the record against itself (for edits).
 */
export function isDuplicateMasterName(
  existingRecords: Array<{ id: string; name: string }>,
  candidateName: string,
  currentId?: string
): boolean {
  const normalizedCandidate = candidateName.trim().toLowerCase();
  if (!normalizedCandidate) return false;

  return existingRecords.some(r => {
    if (currentId && r.id === currentId) {
      return false;
    }
    return r.name.trim().toLowerCase() === normalizedCandidate;
  });
}

/**
 * Filters only active records for select dropdowns in scheduling forms
 */
export function filterActiveMasterRecords<T extends { active: boolean }>(records: T[]): T[] {
  return records.filter(r => r.active !== false);
}
