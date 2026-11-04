/**
 * Unit Tests for Phase 7A: Master Data Management
 * Validates entity schemas, duplicate detection, referential integrity guards,
 * and historical attendee snapshot preservation.
 */

import { describe, it, expect } from 'vitest';
import type { Employee, Department, Location, Organizer, Category, ActivityDocument } from '../../shared/src/schema/index';
import {
  validateMasterRecord,
  isDuplicateMasterName,
  filterActiveMasterRecords
} from '../../shared/src/validation/masterValidator';
import { projectPublicActivity } from '../../shared/src/projection/publicProjector';

describe('Phase 7A: Master Data Management Unit Tests', () => {

  describe('Master Data Validation', () => {
    it('validates Employee records correctly', () => {
      // Valid employee
      const validEmp: Partial<Employee> = {
        name: 'Drs. Hendri Arifin, M.Si',
        position: 'Kepala Dinas',
        departmentId: 'dept_01'
      };
      const v1 = validateMasterRecord('employees', validEmp);
      expect(v1.valid).toBe(true);
      expect(v1.errors).toHaveLength(0);

      // Invalid: missing position and department
      const invalidEmp: Partial<Employee> = {
        name: 'A'
      };
      const v2 = validateMasterRecord('employees', invalidEmp);
      expect(v2.valid).toBe(false);
      expect(v2.errors).toContain('Nama pegawai minimal 2 karakter.');
      expect(v2.errors).toContain('Jabatan pegawai wajib diisi minimal 2 karakter.');
      expect(v2.errors).toContain('Bidang / Bagian (Departemen) wajib dipilih.');
    });

    it('validates Department records correctly', () => {
      expect(validateMasterRecord('departments', { name: 'Sekretariat' }).valid).toBe(true);
      expect(validateMasterRecord('departments', { name: ' ' }).valid).toBe(false);
    });

    it('validates Location records correctly', () => {
      // Valid office location
      const validLoc: Partial<Location> = {
        name: 'Ruang Rapat Kadis',
        type: 'OFFICE',
        isBookableRoom: true
      };
      expect(validateMasterRecord('locations', validLoc).valid).toBe(true);

      // Invalid type
      const invalidLoc: Partial<Location> = {
        name: 'Ruang Test',
        type: 'INVALID' as any,
        isBookableRoom: false
      };
      const v = validateMasterRecord('locations', invalidLoc);
      expect(v.valid).toBe(false);
      expect(v.errors).toContain('Tipe lokasi harus OFFICE, EXTERNAL, atau ONLINE.');
    });

    it('validates Organizer records correctly', () => {
      expect(validateMasterRecord('organizers', { name: 'Sekretariat Dinas' }).valid).toBe(true);
      expect(validateMasterRecord('organizers', { name: '' }).valid).toBe(false);
    });

    it('validates Category records and hex colors correctly', () => {
      // Valid category
      const validCat: Partial<Category> = {
        name: 'Rapat Koordinasi',
        colorHex: '#0284c7'
      };
      expect(validateMasterRecord('categories', validCat).valid).toBe(true);

      // Invalid hex color
      const invalidCat: Partial<Category> = {
        name: 'Sosialisasi',
        colorHex: 'blue'
      };
      const v = validateMasterRecord('categories', invalidCat);
      expect(v.valid).toBe(false);
      expect(v.errors).toContain('Warna label harus berformat kode HEX valid (contoh: #0284c7).');
    });
  });

  describe('Duplicate Detection', () => {
    it('detects duplicate names within same master collection ignoring case and whitespace', () => {
      const existing: Employee[] = [
        { id: 'emp_01', name: 'Ahmad Fauzi, SE', position: 'Kabid', departmentId: 'dept_01', active: true },
        { id: 'emp_02', name: 'Dewi Sartika, S.Si', position: 'Kasi', departmentId: 'dept_02', active: true }
      ];

      // Exact match with different case
      expect(isDuplicateMasterName(existing, 'ahmad fauzi, se')).toBe(true);
      // Whitespace padded
      expect(isDuplicateMasterName(existing, '  DEWI SARTIKA, S.SI  ')).toBe(true);
      // New distinct name
      expect(isDuplicateMasterName(existing, 'Rini Marlina, S.Sos')).toBe(false);
      // Same record during edit (exempt from self-collision)
      expect(isDuplicateMasterName(existing, 'Ahmad Fauzi, SE', 'emp_01')).toBe(false);
    });
  });

  describe('Active vs Inactive Filtering', () => {
    it('filters active records for schedule form dropdowns', () => {
      const list: Location[] = [
        { id: 'loc_01', name: 'Ruang Rapat A', type: 'OFFICE', isBookableRoom: true, active: true },
        { id: 'loc_02', name: 'Ruang Rapat B (Renovasi)', type: 'OFFICE', isBookableRoom: true, active: false }
      ];

      const activeOnly = filterActiveMasterRecords(list);
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].id).toBe('loc_01');
    });
  });

  describe('Historical Attendee Snapshot Preservation', () => {
    it('preserves historical attendee name and title on existing activity even after employee master record is edited', () => {
      // 1. Initial Employee in master directory
      const employeeMaster: Employee = {
        id: 'emp_01',
        name: 'Hendri Arifin',
        position: 'Kepala Bidang Koperasi',
        departmentId: 'dept_02',
        active: true
      };

      // 2. Existing historical activity created in October 2026
      const historicalActivity: ActivityDocument = {
        id: 'act_hist_001',
        title: 'Rapat Pembinaan Koperasi Triwulan III',
        startDate: '2026-10-10',
        startTime: '09:00',
        endDate: '2026-10-10',
        endTime: '11:00',
        openEnded: false,
        locationId: 'loc_01',
        organizerId: 'org_01',
        categoryId: 'cat_01',
        attendeeIds: ['emp_01'],
        attendeeSnapshots: [
          {
            employeeId: 'emp_01',
            name: 'Hendri Arifin',
            position: 'Kepala Bidang Koperasi',
            label: '1. Kabid Koperasi (Hendri Arifin)'
          }
        ],
        guestAttendees: [],
        status: 'COMPLETED',
        publicNotes: '',
        privateNotes: '',
        privateMeetingUrl: null,
        version: 1,
        createdAt: '2026-10-01T08:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-10-01T08:00:00.000Z',
        updatedBy: 'admin'
      };

      // 3. Employee is promoted in the Master Directory (new name & position)
      employeeMaster.name = 'Drs. Hendri Arifin, M.Si';
      employeeMaster.position = 'Kepala Dinas';

      // 4. Verify the historical activity's snapshots remain untouched
      expect(historicalActivity.attendeeSnapshots[0].position).toBe('Kepala Bidang Koperasi');
      expect(historicalActivity.attendeeSnapshots[0].label).toBe('1. Kabid Koperasi (Hendri Arifin)');

      // 5. Verify the projected public DTO also retains the historical snapshot
      const lookups = {
        locations: new Map([['loc_01', { id: 'loc_01', name: 'Ruang Rapat', type: 'OFFICE' as const, isBookableRoom: true, active: true }]]),
        organizers: new Map([['org_01', { id: 'org_01', name: 'Sekretariat', active: true }]]),
        categories: new Map([['cat_01', { id: 'cat_01', name: 'Rapat', colorHex: '#0284c7', active: true }]])
      };

      const publicDto = projectPublicActivity(historicalActivity, lookups);
      expect(publicDto.attendeeLabels).toEqual(['1. Kabid Koperasi (Hendri Arifin)']);
      expect(publicDto.attendeeLabels[0]).not.toContain('Kepala Dinas');
    });
  });

});
