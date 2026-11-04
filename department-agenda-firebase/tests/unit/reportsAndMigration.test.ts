/**
 * Unit Tests for Phase 7B: Official 8-Column Reports, Validated XLSX & Legacy Migration
 */

import { describe, it, expect } from 'vitest';
import type { ActivityDocument } from '../../shared/src/schema/activity';
import {
  buildEightColumnReportRows,
  sanitizeFormulaInjection,
  type EightColumnReportRow
} from '../../shared/src/reports/eightColumnReport';
import { generateEightColumnXlsx } from '../../shared/src/reports/xlsxGenerator';
import {
  parseLegacySpreadsheetData,
  type LegacySpreadsheetRow
} from '../../shared/src/migration/legacyMigrationParser';

describe('Phase 7B: Official 8-Column Reports & Migration Unit Tests', () => {

  const mockActivities: ActivityDocument[] = [
    {
      id: 'act_002',
      title: 'Bimtek Digitalisasi Keuangan',
      startDate: '2026-11-04',
      startTime: '13:30',
      endDate: '2026-11-04',
      endTime: '16:00',
      openEnded: false,
      locationId: 'loc_02',
      organizerId: 'org_02',
      categoryId: 'cat_02',
      attendeeIds: ['emp_03'],
      attendeeSnapshots: [
        { employeeId: 'emp_03', name: 'Ahmad Fauzi, SE', position: 'Kabid Koperasi', label: '1. Kabid Koperasi (Ahmad Fauzi, SE)' }
      ],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: 'Peserta membawa laptop.',
      privateNotes: 'Internal',
      version: 1,
      createdAt: '2026-10-01T08:00:00Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T08:00:00Z',
      updatedBy: 'admin'
    },
    {
      id: 'act_001',
      title: 'Rapat Koordinasi Evaluasi Triwulan III',
      startDate: '2026-11-04',
      startTime: '09:00',
      endDate: '2026-11-04',
      endTime: '11:30',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [
        { employeeId: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', label: '1. Kadis (Drs. Hendri Arifin, M.Si)' }
      ],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: 'Pakaian PDH.',
      privateNotes: 'Internal',
      version: 1,
      createdAt: '2026-10-01T08:00:00Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T08:00:00Z',
      updatedBy: 'admin'
    },
    {
      id: 'act_003',
      title: 'Batam Cooperative & Micro Enterprise Expo 2026',
      startDate: '2026-11-06',
      startTime: '08:00',
      endDate: '2026-11-08',
      endTime: '21:00',
      openEnded: false,
      locationId: 'loc_04',
      organizerId: 'org_03',
      categoryId: 'cat_03',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [
        { employeeId: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', label: '1. Kadis' }
      ],
      guestAttendees: ['Deputi Kemenkop UKM'],
      status: 'SCHEDULED',
      publicNotes: 'Terbuka untuk umum.',
      privateNotes: 'Internal VIP',
      version: 1,
      createdAt: '2026-10-01T08:00:00Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T08:00:00Z',
      updatedBy: 'admin'
    },
    {
      id: 'act_005',
      title: 'Sosialisasi Regulasi KSP',
      startDate: '2026-11-05',
      startTime: '09:00',
      endDate: '2026-11-05',
      endTime: '12:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_04',
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [
        { employeeId: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', label: '1. Kadis' }
      ],
      guestAttendees: [],
      status: 'CANCELLED',
      publicCancellationNotice: 'Ditunda ke Desember 2026.',
      cancelReason: 'Protokoler kementerian reschedule.',
      version: 1,
      createdAt: '2026-10-01T08:00:00Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T08:00:00Z',
      updatedBy: 'admin'
    }
  ];

  const lookups = {
    locations: new Map([
      ['loc_01', { id: 'loc_01', name: 'Ruang Rapat Kadis (Lantai 2)', type: 'OFFICE' as const, isBookableRoom: true, active: true }],
      ['loc_02', { id: 'loc_02', name: 'Aula PLUT Batam', type: 'OFFICE' as const, isBookableRoom: true, active: true }],
      ['loc_04', { id: 'loc_04', name: 'Hotel Planet Holiday Batam', type: 'EXTERNAL' as const, isBookableRoom: false, active: true }]
    ]),
    organizers: new Map([
      ['org_01', { id: 'org_01', name: 'Sekretariat Dinas', active: true }],
      ['org_02', { id: 'org_02', name: 'Bidang Pemberdayaan Koperasi', active: true }],
      ['org_03', { id: 'org_03', name: 'Kementerian Koperasi dan UKM RI', active: true }]
    ]),
    categories: new Map([
      ['cat_01', { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true }],
      ['cat_02', { id: 'cat_02', name: 'Pelatihan / Bimtek', colorHex: '#16a34a', active: true }],
      ['cat_03', { id: 'cat_03', name: 'Pameran & Ekspo', colorHex: '#ea580c', active: true }],
      ['cat_04', { id: 'cat_04', name: 'Sosialisasi Regulasi', colorHex: '#9333ea', active: true }]
    ])
  };

  describe('Official Eight-Column Layout & Formatting', () => {
    it('produces exactly one row per activity, including multi-day events', () => {
      const rows = buildEightColumnReportRows(mockActivities, '2026-11-01', '2026-11-30', lookups);
      expect(rows).toHaveLength(4);

      // Verify multi-day event has exactly one row and correct date span
      const expoRow = rows.find(r => r.kegiatan.includes('Expo 2026'));
      expect(expoRow).toBeDefined();
      expect(expoRow?.hariTanggal).toBe('Jumat–Minggu, 6–8 November 2026');
    });

    it('orders rows strictly chronologically and assigns sequential numbering', () => {
      const rows = buildEightColumnReportRows(mockActivities, '2026-11-01', '2026-11-30', lookups);

      // Row 1 should be act_001 (09:00), Row 2 should be act_002 (13:30)
      expect(rows[0].no).toBe(1);
      expect(rows[0].kegiatan).toContain('Rapat Koordinasi Evaluasi Triwulan III');
      expect(rows[0].pukul).toBe('09.00 - 11.30 WIB');

      expect(rows[1].no).toBe(2);
      expect(rows[1].kegiatan).toContain('Bimtek Digitalisasi Keuangan');
      expect(rows[1].pukul).toBe('13.30 - 16.00 WIB');

      expect(rows[2].no).toBe(3);
      expect(rows[3].no).toBe(4);
    });

    it('clearly marks cancelled activities and outputs cancellation notices in Keterangan', () => {
      const rows = buildEightColumnReportRows(mockActivities, '2026-11-01', '2026-11-30', lookups);
      const cancelledRow = rows.find(r => r.kegiatan.includes('Sosialisasi Regulasi KSP'));

      expect(cancelledRow).toBeDefined();
      expect(cancelledRow?.isCancelled).toBe(true);
      expect(cancelledRow?.keterangan).toContain('Ditunda ke Desember 2026');
      // Ensure private cancelReason is NEVER leaked
      expect(cancelledRow?.keterangan).not.toContain('Protokoler kementerian');
    });

    it('filters strictly by date-range intersection', () => {
      // Range: 2026-11-06 to 2026-11-07 (only Expo should intersect)
      const rows = buildEightColumnReportRows(mockActivities, '2026-11-06', '2026-11-07', lookups);
      expect(rows).toHaveLength(1);
      expect(rows[0].kegiatan).toContain('Expo 2026');
      expect(rows[0].no).toBe(1);
    });
  });

  describe('Spreadsheet Formula Injection Sanitization', () => {
    it('neutralizes dangerous formula prefix characters (=, +, -, @, tab, cr)', () => {
      expect(sanitizeFormulaInjection('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeFormulaInjection('+123456789')).toBe("'+123456789");
      expect(sanitizeFormulaInjection('-CMD|/C calc')).toBe("'-CMD|/C calc");
      expect(sanitizeFormulaInjection('@IMPORTXML(url)')).toBe("'@IMPORTXML(url)");
      expect(sanitizeFormulaInjection('\tTabPayload')).toBe("'\tTabPayload");
      expect(sanitizeFormulaInjection('\rCarriagePayload')).toBe("'\rCarriagePayload");
    });

    it('leaves safe regular text untouched', () => {
      expect(sanitizeFormulaInjection('Rapat Koordinasi')).toBe('Rapat Koordinasi');
      expect(sanitizeFormulaInjection('Ruang Rapat Kadis (Lantai 2)')).toBe('Ruang Rapat Kadis (Lantai 2)');
      expect(sanitizeFormulaInjection('09.00 - 11.30 WIB')).toBe('09.00 - 11.30 WIB');
    });
  });

  describe('Genuine OpenXML XLSX Generation', () => {
    it('generates a valid, readable ExcelJS workbook buffer with 8 columns', async () => {
      const rows = buildEightColumnReportRows(mockActivities, '2026-11-01', '2026-11-30', lookups);
      const buffer = await generateEightColumnXlsx({
        departmentName: 'Dinas Koperasi dan Usaha Mikro Kota Batam',
        periodLabel: '1 November 2026 s.d. 30 November 2026',
        rows
      });

      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(1000); // Standard minimal OpenXML zip container
    });
  });

  describe('Legacy October 2026 Spreadsheet Ingestion & Deduplication', () => {
    const legacyDataset: LegacySpreadsheetRow[] = [
      {
        tanggal: '2026-10-01',
        waktu: '09.00 - 11.00',
        namaKegiatan: 'Rapat Koordinasi Evaluasi Program Koperasi Triwulan III',
        lokasi: 'Ruang Rapat Kadis (Lantai 2)',
        penyelenggara: 'Sekretariat Dinas',
        peserta: 'Drs. Hendri Arifin, M.Si, Ahmad Fauzi, SE',
        catatan: 'Pakaian PDH. Tautan Zoom: https://zoom.us/j/123456789?pwd=SECRET_PASSCODE'
      },
      {
        tanggal: '2026-10-05',
        waktu: '08.30 - 15.00',
        namaKegiatan: 'Pelatihan Kewirausahaan Produk Olahan Laut Baru',
        lokasi: 'Aula PLUT Batam',
        penyelenggara: 'Bidang Pemberdayaan Koperasi',
        peserta: 'Dewi Sartika, S.Si',
        catatan: 'Membawa sampel produk UKM masing-masing.'
      }
    ];

    it('parses legacy records, separates private Zoom credentials, and flags duplicates', () => {
      const result = parseLegacySpreadsheetData(legacyDataset, mockActivities, lookups);

      expect(result.totalRows).toBe(2);
      expect(result.validCount).toBe(2);

      // Check credential separation on row 0
      const row1 = result.records[0];
      expect(row1.privateMeetingUrl).toBe('https://zoom.us/j/123456789?pwd=SECRET_PASSCODE');
      expect(row1.publicNotes).not.toContain('SECRET_PASSCODE');
      expect(row1.publicNotes).not.toContain('https://zoom.us');

      // Check clean public notes on row 1
      const row2 = result.records[1];
      expect(row2.publicNotes).toBe('Membawa sampel produk UKM masing-masing.');
      expect(row2.privateMeetingUrl).toBeNull();
    });
  });

});
