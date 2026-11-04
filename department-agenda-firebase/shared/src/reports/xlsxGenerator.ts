/**
 * Genuine OpenXML XLSX Generator using ExcelJS
 * Produces official Indonesian local government 8-column spreadsheet reports.
 * 
 * Enforces spreadsheet formula injection sanitization on all text cells.
 */

import ExcelJS from 'exceljs';
import type { EightColumnReportRow } from './eightColumnReport';
import { sanitizeFormulaInjection } from './eightColumnReport';
import type { SignatorySettings } from '../schema/master';
import { DEFAULT_SIGNATORY_SETTINGS } from '../schema/master';

export interface GenerateXlsxOptions {
  departmentName?: string;
  subTitle?: string;
  periodLabel: string;
  rows: EightColumnReportRow[];
  signatory?: SignatorySettings;
  signatoryName?: string;
  signatoryNip?: string;
  signatoryPosition?: string;
  signDateStr?: string;
}

export async function generateEightColumnXlsx(
  options: GenerateXlsxOptions
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Department Agenda System v5.0';
  workbook.lastModifiedBy = 'Department Agenda System';
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
  const title = options.subTitle || 'LAPORAN AGENDA KEGIATAN KEDINASAN';

  // 1. Title rows
  worksheet.addRow(['PEMERINTAH KOTA BATAM']);
  worksheet.addRow([deptName]);
  worksheet.addRow([title]);
  worksheet.addRow([`Periode: ${options.periodLabel}`]);
  worksheet.addRow([]); // Empty spacer row

  // Merge and format title rows
  for (let r = 1; r <= 4; r++) {
    worksheet.mergeCells(r, 1, r, 8);
    const cell = worksheet.getCell(r, 1);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font = {
      name: 'Arial',
      bold: true,
      size: r === 1 ? 14 : r === 2 ? 12 : 11,
      color: { argb: 'FF0F172A' }
    };
  }

  // 2. Table Column Headers
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

  headerRow.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate-800
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 28;

  // Set column widths explicitly
  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 28;
  worksheet.getColumn(3).width = 20;
  worksheet.getColumn(4).width = 38;
  worksheet.getColumn(5).width = 24;
  worksheet.getColumn(6).width = 24;
  worksheet.getColumn(7).width = 28;
  worksheet.getColumn(8).width = 24;

  // 3. Add Data Rows (neutralizing formula injection on all string cells)
  for (const row of options.rows) {
    const dataRow = worksheet.addRow([
      row.no,
      sanitizeFormulaInjection(row.hariTanggal),
      sanitizeFormulaInjection(row.pukul),
      sanitizeFormulaInjection(row.kegiatan),
      sanitizeFormulaInjection(row.tempat),
      sanitizeFormulaInjection(row.penyelenggara),
      sanitizeFormulaInjection(row.dihadiriOleh),
      sanitizeFormulaInjection(row.keterangan)
    ]);

    dataRow.font = { name: 'Arial', size: 9 };

    // Alignment and wrapping
    dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
    dataRow.getCell(2).alignment = { vertical: 'top', wrapText: true };
    dataRow.getCell(3).alignment = { vertical: 'top', wrapText: true };
    dataRow.getCell(4).alignment = { vertical: 'top', wrapText: true };
    dataRow.getCell(5).alignment = { vertical: 'top', wrapText: true };
    dataRow.getCell(6).alignment = { vertical: 'top', wrapText: true };
    dataRow.getCell(7).alignment = { vertical: 'top', wrapText: true };
    dataRow.getCell(8).alignment = { vertical: 'top', wrapText: true };

    if (row.isCancelled) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF1F2' }
      };
      dataRow.font = { name: 'Arial', size: 9, color: { argb: 'FF991B1B' } };
    }

    // Border around each cell
    for (let c = 1; c <= 8; c++) {
      dataRow.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }
  }

  // Header row borders
  for (let c = 1; c <= 8; c++) {
    headerRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  }

  // 4. Official Signature Block (Columns F-H)
  worksheet.addRow([]);
  worksheet.addRow([]);

  const signatoryName = options.signatory?.name || options.signatoryName || DEFAULT_SIGNATORY_SETTINGS.name;
  const signatoryNip = options.signatory?.nip || options.signatoryNip || DEFAULT_SIGNATORY_SETTINGS.nip;
  const signatoryPosition = options.signatory?.position || options.signatoryPosition || DEFAULT_SIGNATORY_SETTINGS.position;
  const signatoryCity = options.signatory?.city || 'Batam';
  const signDate = options.signDateStr || new Date().toISOString().slice(0, 10);

  const sigDateRow = worksheet.addRow(['', '', '', '', '', `${signatoryCity}, ${signDate}`]);
  const sigPosRow = worksheet.addRow(['', '', '', '', '', signatoryPosition]);
  worksheet.addRow([]);
  worksheet.addRow([]);
  const sigNameRow = worksheet.addRow(['', '', '', '', '', signatoryName]);
  const sigNipRow = worksheet.addRow(['', '', '', '', '', `NIP. ${signatoryNip}`]);

  sigDateRow.getCell(6).font = { name: 'Arial', size: 9 };
  sigPosRow.getCell(6).font = { name: 'Arial', size: 9 };
  sigNameRow.getCell(6).font = { name: 'Arial', bold: true, underline: true, size: 9 };
  sigNipRow.getCell(6).font = { name: 'Arial', size: 9 };

  const rawBuffer = await workbook.xlsx.writeBuffer();
  return rawBuffer instanceof Uint8Array ? rawBuffer : new Uint8Array(rawBuffer);
}
