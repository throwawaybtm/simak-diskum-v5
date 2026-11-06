/**
 * Genuine OpenXML XLSX Generator using ExcelJS
 * Produces manual-style Indonesian local government 8-column spreadsheet reports
 * matching legacy department schedule format (S01-QA-R2).
 * 
 * Enforces spreadsheet formula injection sanitization on all text cells.
 */

import ExcelJS from 'exceljs';
import type { EightColumnReportRow } from './eightColumnReport';
import { sanitizeFormulaInjection, ensureIndonesianDateFormat } from './eightColumnReport';
import { formatDynamicScheduleTitlePeriod } from '../scheduling/timeUtils';

export interface GenerateXlsxOptions {
  departmentName?: string;
  subTitle?: string;
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  rows: EightColumnReportRow[];
  isStaging?: boolean;
  watermarkText?: string;
}

export async function generateEightColumnXlsx(
  options: GenerateXlsxOptions
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIMAK DISKUM v5.0';
  workbook.lastModifiedBy = 'SIMAK DISKUM';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Agenda Kegiatan', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  const deptName = options.departmentName || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM';
  const periodTitle = (options.startDate && options.endDate)
    ? formatDynamicScheduleTitlePeriod(options.startDate, options.endDate)
    : (options.periodLabel || 'BULAN OKTOBER 2026').toUpperCase();

  const watermark = options.watermarkText || (options.isStaging ? 'DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI' : '');

  // 1. Title section: 3 centered lines per Section 6.1
  const rowTitle1 = worksheet.addRow(['JADWAL KEGIATAN']);
  const rowTitle2 = worksheet.addRow([deptName]);
  const rowTitle3 = worksheet.addRow([periodTitle]);

  let currentRowIdx = 3;

  if (watermark) {
    currentRowIdx++;
    const warningRow = worksheet.addRow([`⚠️ ${watermark} (LINGKUNGAN STAGING) ⚠️`]);
    worksheet.mergeCells(warningRow.number, 1, warningRow.number, 8);
    const cell = worksheet.getCell(warningRow.number, 1);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = {
      name: 'Arial',
      bold: true,
      size: 10,
      color: { argb: 'FF991B1B' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEE2E2' }
    };
    warningRow.height = 24;

    worksheet.headerFooter.oddHeader = `&C&B&11&K991B1B ⚠️ ${watermark} ⚠️`;
    worksheet.headerFooter.oddFooter = `&C&8 Dokumen dibuat di Lingkungan Staging — ${watermark}`;
  }

  // Format the 3 title rows
  for (let r = 1; r <= 3; r++) {
    worksheet.mergeCells(r, 1, r, 8);
    const cell = worksheet.getCell(r, 1);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = {
      name: 'Arial',
      bold: true,
      size: r === 1 ? 12 : 11,
      color: { argb: 'FF000000' }
    };
    worksheet.getRow(r).height = r === 1 ? 24 : 20;
  }

  // Spacer row
  worksheet.addRow([]);
  currentRowIdx += 2;

  // 2. Table Column Headers per Section 6.2 & 6.3
  const headerRow = worksheet.addRow([
    'No',
    'Hari / Tanggal',
    'Pukul',
    'Kegiatan',
    'Tempat',
    'Penyelenggara',
    'Dihadiri Oleh',
    'Keterangan'
  ]);

  headerRow.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF000000' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' } // White background per Section 6.3
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 28;

  // Column widths matching legacy proportions: [6, 25, 18, 36, 25, 25, 28, 22]
  const colWidths = [6, 25, 18, 36, 25, 25, 28, 22];
  for (let c = 1; c <= 8; c++) {
    worksheet.getColumn(c).width = colWidths[c - 1];
  }

  // Header row borders: thin black on all sides
  for (let c = 1; c <= 8; c++) {
    headerRow.getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  }

  // 3. Add Data Rows (formula injection sanitized)
  for (const row of options.rows) {
    const dataRow = worksheet.addRow([
      row.no,
      sanitizeFormulaInjection(ensureIndonesianDateFormat(row.hariTanggal)),
      sanitizeFormulaInjection(row.pukul),
      sanitizeFormulaInjection(row.kegiatan),
      sanitizeFormulaInjection(row.tempat),
      sanitizeFormulaInjection(row.penyelenggara),
      sanitizeFormulaInjection(row.dihadiriOleh),
      sanitizeFormulaInjection(row.keterangan)
    ]);

    dataRow.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };

    // Alignments per Section 6.3:
    // No, Hari/Tanggal, Pukul, Kegiatan, Tempat, Penyelenggara, Keterangan centered; Dihadiri Oleh left-aligned
    dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    dataRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    dataRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    dataRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    dataRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    dataRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    if (row.isCancelled) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF1F2' }
      };
      dataRow.font = { name: 'Arial', size: 10, color: { argb: 'FF991B1B' } };
    }

    // Thin black border around each cell
    for (let c = 1; c <= 8; c++) {
      dataRow.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    }

    // Dynamic row height calculation to prevent text clipping in Excel
    const linesDihadiri = (row.dihadiriOleh || '').split('\n').length;
    const linesKegiatan = Math.ceil((row.kegiatan || '').length / 28);
    const linesTempat = Math.ceil((row.tempat || '').length / 20);
    const linesPenyelenggara = Math.ceil((row.penyelenggara || '').length / 20);
    const linesKeterangan = Math.ceil((row.keterangan || '').length / 18);
    const maxLines = Math.max(1, linesDihadiri, linesKegiatan, linesTempat, linesPenyelenggara, linesKeterangan);
    dataRow.height = Math.max(24, maxLines * 16 + 6);
  }

  // 4. Staging disclaimer footer row (if staging)
  if (watermark) {
    worksheet.addRow([]);
    const disclaimerRow = worksheet.addRow([`* Peringatan: Dokumen ini diunduh dari Lingkungan Staging / Uji Coba SIMAK DISKUM. ${watermark}.`]);
    worksheet.mergeCells(disclaimerRow.number, 1, disclaimerRow.number, 8);
    disclaimerRow.font = { name: 'Arial', italic: true, size: 8, color: { argb: 'FF991B1B' } };
  }

  const rawBuffer = await workbook.xlsx.writeBuffer();
  return rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);
}
