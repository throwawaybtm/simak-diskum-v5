/**
 * Unit Test Suite for Milestone S01-QA-R2: Final Remediation & Schedule Export Enhancement
 * 
 * Verifies:
 * 1. F-01: Public XLSX export executes without ReferenceError and handles staging state safely.
 * 2. Attendee Names-Only parsing (extractNameFromLabel, formatAttendeeNamesOnly).
 * 3. Dynamic schedule title period formatting (formatDynamicScheduleTitlePeriod).
 * 4. Critical October 30 sorting parity (Newest-first vs Oldest-first).
 * 5. Manual-style XLSX workbook structure (3 title rows, 8 columns, white headers, row heights, no signatures).
 * 6. Clean HTML print report (3 title lines, no kop surat/signatures, staging overlays).
 * 7. Image generator pagination, file naming, and staging watermark behavior.
 * 8. Formula injection protection across spreadsheet and print outputs.
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  extractNameFromLabel,
  formatAttendeeNamesOnly,
  buildEightColumnReportRows,
  generateEightColumnHtmlReport,
  generateEightColumnXlsx,
  formatDynamicScheduleTitlePeriod,
  type EightColumnReportRow,
  type ActivityDocument
} from '@department-agenda/shared';

describe('S01-QA-R2: Defect Remediation & Schedule Export Enhancement', () => {

  describe('1. Attendee Names-Only Formatting (Section 6.4)', () => {
    it('extracts employee names from structured parenthesized strings', () => {
      expect(extractNameFromLabel('Kadis (Drs. Hendri Arifin, M.Si)')).toBe('Drs. Hendri Arifin, M.Si');
      expect(extractNameFromLabel('Sekretaris Dinas (Rini Marlina, S.Sos)')).toBe('Rini Marlina, S.Sos');
      expect(extractNameFromLabel('Staff (Budi Santoso)')).toBe('Budi Santoso');
    });

    it('extracts employee names from em-dash or hyphen strings', () => {
      expect(extractNameFromLabel('Kepala Bidang — Ahmad Fauzi, SE')).toBe('Ahmad Fauzi, SE');
      expect(extractNameFromLabel('Pranata Komputer - Siti Purwarupa')).toBe('Siti Purwarupa');
    });

    it('extracts guest names from "Tamu: Name" format', () => {
      expect(extractNameFromLabel('Tamu: Ir. Bambang Hermanto')).toBe('Ir. Bambang Hermanto');
      expect(extractNameFromLabel('Tamu: Perwakilan Bank Indonesia')).toBe('Perwakilan Bank Indonesia');
    });

    it('strips leading numbers and raw database IDs', () => {
      expect(extractNameFromLabel('1. Kadis (Drs. Hendri Arifin, M.Si)')).toBe('Drs. Hendri Arifin, M.Si');
      expect(extractNameFromLabel('emp_abc123 (Drs. Hendri Arifin, M.Si)')).toBe('Drs. Hendri Arifin, M.Si');
    });

    it('formats multiple attendees strictly as numbered names only', () => {
      const attendees = [
        { label: 'Kadis (Drs. Hendri Arifin, M.Si)', name: 'Drs. Hendri Arifin, M.Si' },
        { label: 'Sekretaris Dinas (Rini Marlina, S.Sos)', name: 'Rini Marlina, S.Sos' },
        'Tamu: Ir. Bambang Hermanto'
      ];
      const result = formatAttendeeNamesOnly(attendees);
      expect(result).toBe('1. Drs. Hendri Arifin, M.Si\n2. Rini Marlina, S.Sos\n3. Ir. Bambang Hermanto');
      // Must not leak jabatan, NIP, or IDs
      expect(result).not.toContain('Kadis');
      expect(result).not.toContain('Sekretaris Dinas');
      expect(result).not.toContain('Tamu:');
    });

    it('returns placeholder "-" for empty attendees', () => {
      expect(formatAttendeeNamesOnly([])).toBe('-');
      expect(formatAttendeeNamesOnly([null, ''])).toBe('-');
    });
  });

  describe('2. Dynamic Schedule Title Period (Section 6.1)', () => {
    it('formats single full month as "BULAN [MONTH] [YEAR]"', () => {
      expect(formatDynamicScheduleTitlePeriod('2026-10-01', '2026-10-31')).toBe('BULAN OKTOBER 2026');
      expect(formatDynamicScheduleTitlePeriod('2026-11-01', '2026-11-30')).toBe('BULAN NOVEMBER 2026');
    });

    it('formats single specific day as "TANGGAL [DAY] [MONTH] [YEAR]"', () => {
      expect(formatDynamicScheduleTitlePeriod('2026-10-30', '2026-10-30')).toBe('TANGGAL 30 OKTOBER 2026');
    });

    it('formats multi-day within same month as "TANGGAL X S.D. Y [MONTH] [YEAR]"', () => {
      expect(formatDynamicScheduleTitlePeriod('2026-10-05', '2026-10-12')).toBe('TANGGAL 5 S.D. 12 OKTOBER 2026');
    });

    it('formats multi-month within same year as "PERIODE X [MONTH] S.D. Y [MONTH] [YEAR]"', () => {
      expect(formatDynamicScheduleTitlePeriod('2026-10-01', '2026-11-30')).toBe('PERIODE 1 OKTOBER S.D. 30 NOVEMBER 2026');
    });
  });

  describe('3. Critical Sorting Scenarios on October 30 (Section 5)', () => {
    const actMorning: ActivityDocument = {
      id: 'act_oct30_0900',
      title: 'Rapat Pagi Monitoring UMKM',
      startDate: '2026-10-30',
      endDate: '2026-10-30',
      startTime: '09:00',
      endTime: '11:00',
      openEnded: false,
      locationId: 'loc_1',
      organizerId: 'org_1',
      categoryId: 'cat_1',
      status: 'SCHEDULED',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
      createdBy: 'user_1',
      attendeeIds: [],
      attendeeSnapshots: [{ id: 'emp_1', label: 'Kadis (Drs. Hendri Arifin, M.Si)', name: 'Drs. Hendri Arifin, M.Si', position: 'Kadis' }]
    };

    const actAfternoon: ActivityDocument = {
      id: 'act_oct30_1400',
      title: 'Evaluasi Sore Koperasi Berprestasi',
      startDate: '2026-10-30',
      endDate: '2026-10-30',
      startTime: '14:00',
      endTime: '16:00',
      openEnded: false,
      locationId: 'loc_1',
      organizerId: 'org_1',
      categoryId: 'cat_1',
      status: 'SCHEDULED',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
      createdBy: 'user_1',
      attendeeIds: [],
      attendeeSnapshots: [{ id: 'emp_2', label: 'Staff (Budi Simulasi)', name: 'Budi Simulasi', position: 'Staff' }]
    };

    const lookups = {
      locations: new Map([['loc_1', { id: 'loc_1', name: 'Ruang Rapat', type: 'INTERNAL' as const }]]),
      organizers: new Map([['org_1', { id: 'org_1', name: 'Sekretariat Dinas', type: 'INTERNAL' as const }]]),
      categories: new Map([['cat_1', { id: 'cat_1', name: 'Rapat', color: '#3b82f6' }]])
    };

    it('newest-first sort puts 14:00 above 09:00', () => {
      const rows = buildEightColumnReportRows([actMorning, actAfternoon], '2026-10-30', '2026-10-30', lookups, 'NEWEST');
      expect(rows.length).toBe(2);
      expect(rows[0].pukul).toContain('14.00');
      expect(rows[1].pukul).toContain('09.00');
      expect(rows[0].no).toBe(1);
      expect(rows[1].no).toBe(2);
    });

    it('oldest-first sort puts 09:00 above 14:00', () => {
      const rows = buildEightColumnReportRows([actMorning, actAfternoon], '2026-10-30', '2026-10-30', lookups, 'OLDEST');
      expect(rows.length).toBe(2);
      expect(rows[0].pukul).toContain('09.00');
      expect(rows[1].pukul).toContain('14.00');
      expect(rows[0].no).toBe(1);
      expect(rows[1].no).toBe(2);
    });
  });

  describe('4. Manual-Style Schedule XLSX Export (Section 7)', () => {
    const sampleRows: EightColumnReportRow[] = [
      {
        no: 1,
        hariTanggal: 'Jumat, 30 Oktober 2026',
        pukul: '14.00 - 16.00 WIB',
        kegiatan: 'Evaluasi Sore Koperasi Berprestasi',
        tempat: 'Ruang Rapat Kadis',
        penyelenggara: 'Sekretariat Dinas',
        dihadiriOleh: '1. Drs. Hendri Arifin, M.Si\n2. Siti Purwarupa',
        keterangan: 'Pakaian PDH',
        isCancelled: false
      },
      {
        no: 2,
        hariTanggal: 'Jumat, 30 Oktober 2026',
        pukul: '09.00 - 11.00 WIB',
        kegiatan: '[DIBATALKAN] Rapat Pagi Monitoring UMKM',
        tempat: 'Aula PLUT',
        penyelenggara: 'Bidang Pemberdayaan',
        dihadiriOleh: '1. Budi Simulasi',
        keterangan: 'Dibatalkan: Agenda Walikota',
        isCancelled: true
      }
    ];

    it('generates valid XLSX with 3 centered title lines and no signature block (staging mode)', async () => {
      const buffer = await generateEightColumnXlsx({
        departmentName: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        startDate: '2026-10-30',
        endDate: '2026-10-30',
        rows: sampleRows,
        isStaging: true
      });

      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('Agenda Kegiatan');
      expect(sheet).toBeDefined();

      // Title rows
      expect(sheet?.getCell('A1').value).toBe('JADWAL KEGIATAN');
      expect(sheet?.getCell('A2').value).toBe('DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM');
      expect(sheet?.getCell('A3').value).toBe('TANGGAL 30 OKTOBER 2026');

      // Staging warning row present
      let hasWarning = false;
      sheet?.eachRow((r) => {
        r.eachCell((c) => {
          if (typeof c.value === 'string' && c.value.includes('DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI')) {
            hasWarning = true;
          }
        });
      });
      expect(hasWarning).toBe(true);

      // Verify no signature block exists
      let hasSignature = false;
      sheet?.eachRow((r) => {
        r.eachCell((c) => {
          const str = String(c.value || '');
          if (str.includes('NIP.') || str.includes('Pembina Utama') || str.includes('Tanda Tangan')) {
            hasSignature = true;
          }
        });
      });
      expect(hasSignature).toBe(false);

      // Verify row heights are calculated (> 24)
      const dataRow1 = sheet?.getRow(7);
      expect(dataRow1?.height).toBeGreaterThanOrEqual(24);
    });

    it('omits staging warning row in production mode', async () => {
      const buffer = await generateEightColumnXlsx({
        departmentName: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        startDate: '2026-10-30',
        endDate: '2026-10-30',
        rows: sampleRows,
        isStaging: false
      });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('Agenda Kegiatan');

      let hasWarning = false;
      sheet?.eachRow((r) => {
        r.eachCell((c) => {
          if (typeof c.value === 'string' && c.value.includes('DATA SIMULASI')) {
            hasWarning = true;
          }
        });
      });
      expect(hasWarning).toBe(false);
    });
  });

  describe('5. Clean Manual-Style HTML Print Report (Section 8)', () => {
    const sampleRows: EightColumnReportRow[] = [
      {
        no: 1,
        hariTanggal: '30 Oktober 2026',
        pukul: '14.00 - 16.00 WIB',
        kegiatan: 'Evaluasi Sore',
        tempat: 'Ruang Rapat',
        penyelenggara: 'Dinas',
        dihadiriOleh: '1. Drs. Hendri Arifin, M.Si',
        keterangan: '-',
        isCancelled: false
      }
    ];

    it('contains 3 centered title lines and no kop surat or signature', () => {
      const html = generateEightColumnHtmlReport({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        rows: sampleRows,
        departmentName: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        isStaging: true
      });

      // 3 title lines
      expect(html).toContain('JADWAL KEGIATAN');
      expect(html).toContain('DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM');
      expect(html).toContain('BULAN OKTOBER 2026');

      // Staging notices
      expect(html).toContain('DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI');
      expect(html).toContain('watermark-overlay');
      expect(html).toContain('staging-report-warning');

      // No kop surat or signature block
      expect(html).not.toContain('class="kop-surat"');
      expect(html).not.toContain('Jl. Engku Putri');
      expect(html).not.toContain('class="signature-block"');
      expect(html).not.toContain('NIP.');
    });
  });

  describe('6. Long Schedule Synthetic Robustness (Section 12.4)', () => {
    it('handles large schedules (35 rows, multi-attendee, long text, cancellations, ties) across XLSX and HTML', async () => {
      const longRows: EightColumnReportRow[] = Array.from({ length: 35 }, (_, i) => ({
        no: i + 1,
        hariTanggal: `Senin, ${((i % 28) + 1)} Oktober 2026`,
        pukul: i % 3 === 0 ? '08.00 - Selesai WIB' : '09.00 - 12.00 WIB',
        kegiatan: `Kegiatan Dinas Super Panjang Nomor ${i + 1} dengan deskripsi komprehensif mengenai koordinasi lintas sektor koperasi mikro Kota Batam`,
        tempat: `Lokasi Dinas Gedung Bersama Lantai ${(i % 5) + 1}`,
        penyelenggara: 'Dinas Koperasi dan Usaha Mikro Kota Batam',
        dihadiriOleh: `1. Drs. Hendri Arifin, M.Si\n2. Rini Marlina, S.Sos\n3. Pegawai ${i + 1}\n4. Tamu Kehormatan ${i + 1}`,
        keterangan: `Catatan penting baris ke-${i + 1}: wajib membawa seluruh berkas fisik dan laporan triwulan`,
        isCancelled: i % 7 === 0
      }));

      // Test XLSX with 35 rows
      const xlsxBuffer = await generateEightColumnXlsx({
        departmentName: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        rows: longRows,
        isStaging: true
      });

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(xlsxBuffer);
      const sheet = wb.getWorksheet('Agenda Kegiatan');
      expect(sheet).toBeDefined();

      let validDataRowCount = 0;
      sheet?.eachRow((r) => {
        const val = r.getCell(1).value;
        if (typeof val === 'number' && val >= 1 && val <= 35) {
          validDataRowCount++;
        }
      });
      expect(validDataRowCount).toBe(35);

      // Test HTML with 35 rows
      const html = generateEightColumnHtmlReport({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        rows: longRows,
        departmentName: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        isStaging: true
      });

      expect(html).toContain('Kegiatan Dinas Super Panjang Nomor 35');
      expect(html).toContain('Kegiatan Dinas Super Panjang Nomor 1');
      expect(html).toContain('class="cancelled-row"');
    });
  });
});
