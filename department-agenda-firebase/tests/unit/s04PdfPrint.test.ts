/**
 * Unit & Contract Tests for SIMAK DISKUM v5.0 — S04 PDF Print Fix
 * 
 * Verifies:
 * 1. Compact A4 Landscape CSS typography, padding, margins, and line-height.
 * 2. Eight-column structure with widened Keterangan (12%) and optimal column distribution.
 * 3. Prevention of database ID leaks (loc_syn_*, org_syn_*) with fallback resolution.
 * 4. Repeating table header (thead display: table-header-group) and row split prevention.
 * 5. Preservation of cancelled-row styling (#fff1f2, #991b1b) and staging watermark.
 * 6. Exclusion of letterhead (kop surat), logo, and signature block.
 */

import { describe, it, expect } from 'vitest';
import {
  generateEightColumnHtmlReport,
  buildEightColumnReportRows,
  resolveReportLocationName,
  resolveReportOrganizerName,
  KNOWN_LOCATION_NAMES,
  KNOWN_ORGANIZER_NAMES,
  type EightColumnReportRow,
  type ReportLookups
} from '../../shared/src/reports/eightColumnReport';
import type { ActivityDocument } from '../../shared/src/schema/activity';

describe('SIMAK DISKUM v5.0 — S04 PDF Print Fix Tests', () => {

  const sampleRow: EightColumnReportRow = {
    no: 1,
    hariTanggal: 'Sabtu, 31 Oktober 2026',
    pukul: '08:30 - 14:00 WIB',
    kegiatan: 'Layanan Jemput Bola Pembuatan Nomor Induk Berusaha (NIB) OSS-RBA',
    tempat: 'Aula Gedung PLUT-KUMKM Batam',
    penyelenggara: 'Bidang Fasilitasi Usaha Mikro',
    dihadiriOleh: '1. Drs. Hendri Arifin, M.Si\n2. Rini Marlina, S.Sos',
    keterangan: 'Fasilitasi penerbitan izin usaha bagi 50 pelaku usaha mikro sektor kuliner.',
    isCancelled: false
  };

  const cancelledRow: EightColumnReportRow = {
    no: 2,
    hariTanggal: 'Sabtu, 24 Oktober 2026',
    pukul: '08:30 - 15:30 WIB',
    kegiatan: '[DIBATALKAN] Workshop Strategi Pemasaran Digital dan Ekspor Produk UMKM',
    tempat: 'Hotel Aston Batam (Ruang Lavender)',
    penyelenggara: 'Bidang Fasilitasi Usaha Mikro',
    dihadiriOleh: '1. Ahmad Fauzi, SE',
    keterangan: 'Dibatalkan: Penyesuaian jadwal dengan narasumber kementerian.',
    isCancelled: true
  };

  it('enforces A4 Landscape size and compact margins in CSS @page rule', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: [sampleRow]
    });

    expect(html).toContain('size: 297mm 210mm;');
    expect(html).toContain('size: A4 landscape;');
    expect(html).toContain('margin: 8mm 10mm 10mm 10mm;');
    expect(html).toContain('-webkit-print-color-adjust: exact;');
    expect(html).toContain('print-color-adjust: exact;');
  });

  it('applies compact vertical typography and padding to maximize row density', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: [sampleRow]
    });

    // Font size should be 7.5pt / 8pt with 1.2 line height
    expect(html).toMatch(/font-size:\s*8pt/);
    expect(html).toMatch(/line-height:\s*1\.2/);
    expect(html).toMatch(/padding:\s*3px\s+4px/);
    expect(html).toContain('table-layout: fixed;');
  });

  it('allocates proper column percentages with 12% Keterangan to avoid excessive wrapping', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: [sampleRow]
    });

    expect(html).toContain('width: 3.5%'); // No
    expect(html).toContain('width: 14%');  // Hari / Tanggal
    expect(html).toContain('width: 9.5%'); // Pukul
    expect(html).toContain('width: 22%');  // Kegiatan
    expect(html).toContain('width: 12.5%'); // Tempat
    expect(html).toContain('width: 12.5%'); // Penyelenggara
    expect(html).toContain('width: 14%');  // Dihadiri Oleh
    expect(html).toContain('width: 12%');  // Keterangan
  });

  it('ensures repeating table headers and avoids row page-break splitting in print media query', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: [sampleRow]
    });

    expect(html).toContain('thead { display: table-header-group; }');
    expect(html).toContain('tr { break-inside: avoid; page-break-inside: avoid; }');
    expect(html).toContain('table.report-table { break-inside: auto; page-break-inside: auto; }');
  });

  it('preserves cancelled-row styling with distinct background and text colors', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: [cancelledRow]
    });

    expect(html).toContain('tr.cancelled-row td {');
    expect(html).toContain('background-color: #fff1f2;');
    expect(html).toContain('color: #991b1b;');
    expect(html).toContain('class="cancelled-row"');
  });

  it('omits letterhead (kop surat), logo, and signature blocks strictly', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: [sampleRow]
    });

    expect(html).not.toContain('<img');
    expect(html).not.toContain('kop-surat');
    expect(html).not.toContain('tanda-tangan');
    expect(html).not.toContain('NIP.');
    expect(html).not.toContain('Pembina Utama Muda');
  });

  it('displays prominent staging watermarks and warnings when isStaging is true', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: [sampleRow],
      isStaging: true
    });

    expect(html).toContain('class="watermark-overlay"');
    expect(html).toContain('DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI');
    expect(html).toContain('class="staging-report-warning"');
    expect(html).toContain('@bottom-left');
    expect(html).toContain('@bottom-right');
    expect(html).not.toContain('class="report-footer-note"');
  });

  describe('Location and Organizer Human-Readable Resolution (Requirement 9)', () => {
    const emptyLookups: ReportLookups = {
      locations: new Map(),
      organizers: new Map(),
      categories: new Map()
    };

    it('resolves synthetic location IDs (loc_syn_01) to human-readable names without leaking raw IDs', () => {
      const resolved = resolveReportLocationName('loc_syn_01');
      expect(resolved).toBe('Ruang Rapat Kadis (Lantai 2)');
      expect(resolved).not.toContain('loc_syn_');
    });

    it('resolves synthetic organizer IDs (org_syn_01) to human-readable names without leaking raw IDs', () => {
      const resolved = resolveReportOrganizerName('org_syn_01');
      expect(resolved).toBe('Sekretariat Diskum Kota Batam');
      expect(resolved).not.toContain('org_syn_');
    });

    it('all known locations and organizers have valid descriptive Indonesian names', () => {
      for (const [id, name] of Object.entries(KNOWN_LOCATION_NAMES)) {
        expect(name).toBeTruthy();
        expect(name.startsWith('loc_')).toBe(false);
      }
      for (const [id, name] of Object.entries(KNOWN_ORGANIZER_NAMES)) {
        expect(name).toBeTruthy();
        expect(name.startsWith('org_')).toBe(false);
      }
    });

    it('buildEightColumnReportRows resolves synthetic IDs even with empty lookup maps', () => {
      const mockAct: ActivityDocument = {
        id: 'act_syn_test',
        title: 'Rapat Kerja Evaluasi Koperasi',
        startDate: '2026-10-15',
        startTime: '09:00',
        endDate: '2026-10-15',
        endTime: '11:00',
        openEnded: false,
        locationId: 'loc_syn_03',
        organizerId: 'org_syn_02',
        categoryId: 'cat_01',
        attendeeIds: [],
        attendeeSnapshots: [],
        guestAttendees: [],
        status: 'SCHEDULED',
        publicNotes: '',
        privateNotes: '',
        version: 1,
        createdAt: '2026-10-01T00:00:00Z',
        createdBy: 'test',
        updatedAt: '2026-10-01T00:00:00Z',
        updatedBy: 'test'
      };

      const rows = buildEightColumnReportRows([mockAct], '2026-10-01', '2026-10-31', emptyLookups);
      expect(rows).toHaveLength(1);
      expect(rows[0].tempat).toBe('Ruang Konsultasi Koperasi (Lantai 1)');
      expect(rows[0].penyelenggara).toBe('Bidang Koperasi Diskum Batam');
      expect(rows[0].tempat).not.toContain('loc_syn_');
      expect(rows[0].penyelenggara).not.toContain('org_syn_');
    });
  });
});
