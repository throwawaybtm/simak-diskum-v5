/**
 * Staging Report Watermark & Print Designation Verification
 * 
 * Verifies that official 8-column HTML print and XLSX exports generated in staging mode
 * prominently carry the "DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI" watermark and header,
 * preventing any apparently official, unmarked report from leaking from staging.
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { generateEightColumnHtmlReport } from '../../shared/src/reports/eightColumnReport';
import { generateEightColumnXlsx } from '../../shared/src/reports/xlsxGenerator';

describe('S01 Staging Report Watermark & Print Designation', () => {
  const sampleRows = [
    {
      no: 1,
      hariTanggal: 'Kamis, 15 Oktober 2026',
      pukul: '09.00 - 11.00 WIB',
      kegiatan: 'Rapat Koordinasi Evaluasi KUMKM Triwulan III',
      tempat: 'Ruang Rapat Hang Nadim',
      penyelenggara: 'Sekretariat Dinas',
      dihadiriOleh: 'Drs. Hendri Arifin, M.Si',
      keterangan: 'Koordinasi internal',
      isCancelled: false
    }
  ];

  it('embeds prominent watermark and warning banner in HTML print output when isStaging is true', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: sampleRows,
      isStaging: true
    });

    expect(html).toContain('class="watermark-overlay"');
    expect(html).toContain('DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI');
    expect(html).toContain('class="staging-report-warning"');
    expect(html).toContain('LINGKUNGAN STAGING');
  });

  it('omits watermark and staging banner in production HTML print output when isStaging is false/omitted', () => {
    const html = generateEightColumnHtmlReport({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      rows: sampleRows,
      isStaging: false
    });

    expect(html).not.toContain('class="watermark-overlay"');
    expect(html).not.toContain('class="staging-report-warning"');
    expect(html).not.toContain('DATA SIMULASI');
  });

  it('embeds prominent warning row and print header/footer in XLSX export when isStaging is true', async () => {
    const buffer = await generateEightColumnXlsx({
      periodLabel: '1 s.d. 31 Oktober 2026',
      rows: sampleRows,
      isStaging: true
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Agenda Kegiatan');
    expect(sheet).toBeDefined();

    // Check warning row exists
    let foundWarning = false;
    sheet?.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' && cell.value.includes('DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI')) {
          foundWarning = true;
        }
      });
    });

    expect(foundWarning).toBe(true);
    expect(sheet?.headerFooter?.oddHeader).toContain('DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI');
    expect(sheet?.headerFooter?.oddFooter).toContain('Lingkungan Staging');
  });

  it('omits staging warning in production XLSX export when isStaging is false/omitted', async () => {
    const buffer = await generateEightColumnXlsx({
      periodLabel: '1 s.d. 31 Oktober 2026',
      rows: sampleRows,
      isStaging: false
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Agenda Kegiatan');
    expect(sheet).toBeDefined();

    let foundWarning = false;
    sheet?.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' && cell.value.includes('DATA SIMULASI')) {
          foundWarning = true;
        }
      });
    });

    expect(foundWarning).toBe(false);
    expect(sheet?.headerFooter?.oddHeader).toBeUndefined();
  });
});
