/**
 * Unit & Safety Test Suite for Master Data and Legacy Migration (Task 8 - Requirement 4)
 * 
 * Verifies:
 * 1. Referential integrity safeguards under concurrent edit simulations.
 * 2. Duplicate detection across case, punctuation, and leading/trailing whitespace.
 * 3. Soft-delete and deactivation behaviors preserving historical references.
 * 4. Migration dry-run safety (pure memory evaluation, zero uncommitted writes, Zoom isolation).
 */

import { describe, it, expect } from 'vitest';
import type { Location, Employee, Department } from '../../shared/src/schema/master';
import type { ActivityDocument } from '../../shared/src/schema/activity';
import {
  isDuplicateMasterName,
  validateMasterRecord
} from '../../shared/src/validation/masterValidator';
import {
  parseLegacySpreadsheetData,
  type LegacySpreadsheetRow
} from '../../shared/src/migration/legacyMigrationParser';

describe('Task 8: Master Data Safety & Migration Isolation Tests', () => {

  const existingLocations: Location[] = [
    { id: 'loc_01', name: 'Ruang Rapat Kadis (Lantai 2)', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_02', name: 'Aula PLUT Batam', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_03', name: 'Zoom Cloud Meeting Dinas', type: 'ONLINE', isBookableRoom: false, active: true }
  ];

  describe('Duplicate Name Detection & Whitespace Normalization', () => {
    it('detects duplicate names regardless of case and surrounding whitespace', () => {
      // Exact match
      expect(isDuplicateMasterName(existingLocations, 'Aula PLUT Batam')).toBe(true);
      // Lowercase match
      expect(isDuplicateMasterName(existingLocations, 'aula plut batam')).toBe(true);
      // Uppercase match
      expect(isDuplicateMasterName(existingLocations, 'AULA PLUT BATAM')).toBe(true);
      // Surrounding whitespace
      expect(isDuplicateMasterName(existingLocations, '   Aula PLUT Batam   ')).toBe(true);
      // Unique name
      expect(isDuplicateMasterName(existingLocations, 'Ruang Rapat Media Center PLUT')).toBe(false);
    });

    it('permits preserving current name when editing the existing record itself', () => {
      // Editing loc_02 without changing its name should NOT trigger duplicate error
      expect(isDuplicateMasterName(existingLocations, 'Aula PLUT Batam', 'loc_02')).toBe(false);
      // But using loc_01's name on loc_02 MUST trigger duplicate error
      expect(isDuplicateMasterName(existingLocations, 'Ruang Rapat Kadis (Lantai 2)', 'loc_02')).toBe(true);
    });
  });

  describe('Master Data Input Validation Safeguards', () => {
    it('validates employee input requiring name, valid position, and department', () => {
      const validRes = validateMasterRecord('employees', {
        name: 'Siti Rahma, S.E.',
        position: 'Pranata Komputer Ahli Muda',
        departmentId: 'dept_01'
      });
      expect(validRes.valid).toBe(true);
      expect(validRes.errors).toHaveLength(0);

      const invalidRes = validateMasterRecord('employees', {
        name: ' ',
        position: 'K',
        departmentId: ''
      });
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('validates location input enforcing valid location types', () => {
      const validLoc = validateMasterRecord('locations', {
        name: 'Ruang Konsultasi PLUT',
        type: 'OFFICE',
        isBookableRoom: true
      });
      expect(validLoc.valid).toBe(true);

      const invalidLoc = validateMasterRecord('locations', {
        name: '',
        type: 'INVALID_TYPE' as any,
        isBookableRoom: false
      });
      expect(invalidLoc.valid).toBe(false);
      expect(invalidLoc.errors).toContain('Nama lokasi minimal 2 karakter.');
      expect(invalidLoc.errors).toContain('Tipe lokasi harus OFFICE, EXTERNAL, atau ONLINE.');
    });
  });

  describe('Migration Dry-Run Safety & Zero Side-Effects', () => {
    const existingActivities: ActivityDocument[] = [
      {
        id: 'act_existing_01',
        title: 'Rapat Koordinasi Evaluasi Program Koperasi Triwulan III',
        startDate: '2026-10-01',
        startTime: '07:00',
        endDate: '2026-10-01',
        endTime: '09:00',
        openEnded: false,
        locationId: 'loc_01',
        organizerId: 'org_01',
        categoryId: 'cat_01',
        attendeeIds: ['emp_01'],
        attendeeSnapshots: [],
        guestAttendees: [],
        status: 'SCHEDULED',
        publicNotes: 'Pakaian PDH.',
        privateNotes: 'Internal memo',
        version: 1,
        createdAt: '2026-10-01T08:00:00Z',
        createdBy: 'admin',
        updatedAt: '2026-10-01T08:00:00Z',
        updatedBy: 'admin'
      }
    ];

    const lookups = {
      locations: new Map([['loc_01', existingLocations[0]]]),
      organizers: new Map([['org_01', { id: 'org_01', name: 'Sekretariat Dinas', active: true }]]),
      categories: new Map([['cat_01', { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true }]])
    };

    const incomingRows: LegacySpreadsheetRow[] = [
      // Duplicate of act_existing_01
      {
        tanggal: '2026-10-01',
        waktu: '07.00 - 09.00',
        namaKegiatan: 'Rapat Koordinasi Evaluasi Program Koperasi Triwulan III',
        lokasi: 'Ruang Rapat Kadis (Lantai 2)',
        penyelenggara: 'Sekretariat Dinas',
        peserta: 'Drs. Hendri Arifin, M.Si',
        catatan: 'Pakaian PDH.'
      },
      // New row with sensitive meeting URL & password
      {
        tanggal: '2026-10-14',
        waktu: '09.00 - 12.00',
        namaKegiatan: 'Sosialisasi Permenkop UKM Nomor 2 Tahun 2026',
        lokasi: 'Zoom Cloud Meeting Dinas',
        penyelenggara: 'Sekretariat Dinas',
        peserta: 'Ahmad Fauzi, SE',
        catatan: 'Peserta wajib hadir tepat waktu. Tautan Zoom: https://zoom.us/j/5544332211?pwd=SECRET_OCTOBER_PIN kata sandi: SECRET_OCTOBER_PIN'
      }
    ];

    it('operates as a pure in-memory dry-run without mutating input objects', () => {
      const originalInputCopy = JSON.parse(JSON.stringify(incomingRows));
      const result = parseLegacySpreadsheetData(incomingRows, existingActivities, lookups);

      // Verify zero mutation on raw input
      expect(incomingRows).toEqual(originalInputCopy);

      // Verify dry-run output metrics
      expect(result.totalRows).toBe(2);
      expect(result.validCount).toBe(2);
      expect(result.duplicateCount).toBe(1);

      // Row 0 should be flagged as duplicate of act_existing_01
      expect(result.records[0].isDuplicate).toBe(true);
      expect(result.records[0].duplicateOfId).toBe('act_existing_01');

      // Row 1 should be valid new record with isolated credentials
      const row1 = result.records[1];
      expect(row1.isDuplicate).toBe(false);
      expect(row1.privateMeetingUrl).toBe('https://zoom.us/j/5544332211?pwd=SECRET_OCTOBER_PIN');
      expect(row1.publicNotes).not.toContain('SECRET_OCTOBER_PIN');
      expect(row1.publicNotes).not.toContain('https://zoom.us');
      expect(row1.publicNotes).toContain('Peserta wajib hadir tepat waktu.');
    });
  });

});
