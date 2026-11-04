/**
 * Official Eight-Column Report Generator
 * Complies with Indonesian Local Government (Pemerintah Kota Batam) standard layout:
 * No | Hari / Tanggal | Pukul | Kegiatan | Tempat | Penyelenggara | Dihadiri Oleh | Keterangan
 * 
 * Rules:
 * 1. Exactly one row per activity, including multi-day events.
 * 2. Multi-day events display formatted date span (e.g. "Kamis–Sabtu, 1–3 Oktober 2026").
 * 3. Cancelled activities are clearly marked with publicCancellationNotice in Keterangan.
 * 4. Internal cancelReason is NEVER leaked.
 * 5. Strictly filtered by date-range intersection and sorted chronologically.
 */

import type { ActivityDocument } from '../schema/activity';
import type { Location, Organizer, Category, Employee, SignatorySettings } from '../schema/master';
import { DEFAULT_SIGNATORY_SETTINGS } from '../schema/master';
import {
  formatIndonesianDateSpan,
  formatTimeDisplay,
  intersectsRange,
  formatIndonesianDate
} from '../scheduling/timeUtils';

export interface EightColumnReportRow {
  no: number;
  hariTanggal: string;
  pukul: string;
  kegiatan: string;
  tempat: string;
  penyelenggara: string;
  dihadiriOleh: string;
  keterangan: string;
  isCancelled: boolean;
  activityId?: string;
  categoryId?: string;
  categoryName?: string;
}

export interface ReportLookups {
  locations: Map<string, Location>;
  organizers: Map<string, Organizer>;
  categories: Map<string, Category>;
  employees?: Map<string, Employee>;
}

/**
 * Builds chronological 8-column report rows for activities intersecting the date range.
 * Guarantees exactly one row per activity, regardless of duration.
 */
export function buildEightColumnReportRows(
  activities: ActivityDocument[],
  startDate: string,
  endDate: string,
  lookups: ReportLookups
): EightColumnReportRow[] {
  // 1. Filter by date-range intersection
  const matching = activities.filter(act =>
    intersectsRange(act.startDate, act.endDate, startDate, endDate)
  );

  // 2. Sort chronologically: startDate -> startTime -> endDate -> endTime -> title
  matching.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.endDate !== b.endDate) return a.endDate.localeCompare(b.endDate);
    const endA = a.endTime || '23:59';
    const endB = b.endTime || '23:59';
    if (endA !== endB) return endA.localeCompare(endB);
    return a.title.localeCompare(b.title);
  });

  // 3. Map to 8-column rows
  return matching.map((act, index) => {
    const isCancelled = act.status === 'CANCELLED';
    const loc = lookups.locations.get(act.locationId);
    const org = lookups.organizers.get(act.organizerId);
    const cat = lookups.categories.get(act.categoryId);

    // Hari / Tanggal
    const hariTanggal = formatIndonesianDateSpan(act.startDate, act.endDate);

    // Pukul
    const pukul = formatTimeDisplay(act.startTime, act.endTime, act.openEnded);

    // Kegiatan
    const kegiatan = isCancelled ? `[DIBATALKAN] ${act.title}` : act.title;

    // Tempat
    const tempat = loc ? loc.name : (act.locationId || '-');

    // Penyelenggara
    const penyelenggara = org ? org.name : (act.organizerId || '-');

    // Dihadiri Oleh (from frozen snapshots, with fallback to guest list)
    const attendeeParts: string[] = [];
    if (act.attendeeSnapshots && act.attendeeSnapshots.length > 0) {
      attendeeParts.push(...act.attendeeSnapshots.map(s => s.label));
    } else if (act.attendeeIds && act.attendeeIds.length > 0 && lookups.employees) {
      attendeeParts.push(...act.attendeeIds.map(id => lookups.employees?.get(id)?.name || id));
    }

    if (act.guestAttendees && act.guestAttendees.length > 0) {
      for (const guest of act.guestAttendees) {
        if (!attendeeParts.some(p => p.includes(guest))) {
          attendeeParts.push(`Tamu: ${guest}`);
        }
      }
    }
    const dihadiriOleh = attendeeParts.length > 0 ? attendeeParts.join('\n') : '-';

    // Keterangan (public notes or cancellation notice only, NEVER privateNotes or cancelReason)
    let keterangan = '-';
    if (isCancelled) {
      keterangan = act.publicCancellationNotice
        ? `Dibatalkan: ${act.publicCancellationNotice}`
        : 'Kegiatan Dibatalkan';
    } else if (act.publicNotes && act.publicNotes.trim()) {
      keterangan = act.publicNotes.trim();
    }

    return {
      no: index + 1,
      hariTanggal,
      pukul,
      kegiatan,
      tempat,
      penyelenggara,
      dihadiriOleh,
      keterangan,
      isCancelled,
      activityId: act.id,
      categoryId: act.categoryId,
      categoryName: cat?.name
    };
  });
}

/**
 * Neutralizes formula injection characters (=, +, -, @, \t, \r)
 * for safe spreadsheet export (CSV/XLSX).
 */
export function sanitizeFormulaInjection(value: string): string {
  if (!value) return '';
  const firstChar = value.charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    return `'${value}`;
  }
  return value;
}

export interface HtmlReportOptions {
  departmentName?: string;
  subTitle?: string;
  startDate: string;
  endDate: string;
  rows: EightColumnReportRow[];
  signatory?: SignatorySettings;
  signatoryName?: string;
  signatoryNip?: string;
  signatoryPosition?: string;
  currentDateStr?: string;
}

/**
 * Generates official Indonesian Government A4 Landscape HTML Report with Letterhead
 */
export function generateEightColumnHtmlReport(options: HtmlReportOptions): string {
  const signatoryName = options.signatory?.name || options.signatoryName || DEFAULT_SIGNATORY_SETTINGS.name;
  const signatoryNip = options.signatory?.nip || options.signatoryNip || DEFAULT_SIGNATORY_SETTINGS.nip;
  const signatoryPosition = options.signatory?.position || options.signatoryPosition || DEFAULT_SIGNATORY_SETTINGS.position;
  const signatoryCity = options.signatory?.city || 'Batam';
  const department = options.departmentName || options.signatory?.department || DEFAULT_SIGNATORY_SETTINGS.department;
  const subTitle = options.subTitle || 'LAPORAN AGENDA KEGIATAN KEDINASAN';
  const periodLabel = `Periode: ${formatIndonesianDateSpan(options.startDate, options.endDate)}`;
  const signDate = options.currentDateStr
    ? formatIndonesianDate(options.currentDateStr)
    : formatIndonesianDate(new Date().toISOString().slice(0, 10));

  const tableRowsHtml = options.rows.map(row => `
    <tr class="${row.isCancelled ? 'cancelled-row' : ''}">
      <td class="text-center">${row.no}</td>
      <td>${row.hariTanggal}</td>
      <td class="text-nowrap">${row.pukul}</td>
      <td class="font-bold">${row.kegiatan}</td>
      <td>${row.tempat}</td>
      <td>${row.penyelenggara}</td>
      <td class="pre-line">${row.dihadiriOleh}</td>
      <td>${row.keterangan}</td>
    </tr>
  `).join('\n');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${subTitle} - ${department}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 10pt;
      color: #1e293b;
      margin: 0;
      padding: 10px;
      line-height: 1.4;
      background: #ffffff;
    }
    .kop-surat {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .kop-surat h1 {
      margin: 0;
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .kop-surat h2 {
      margin: 2px 0;
      font-size: 12pt;
      font-weight: bold;
    }
    .kop-surat p {
      margin: 0;
      font-size: 9pt;
      color: #334155;
    }
    .report-title-section {
      text-align: center;
      margin-bottom: 14px;
    }
    .report-title {
      font-size: 11pt;
      font-weight: bold;
      text-decoration: underline;
      margin: 0;
    }
    .report-subtitle {
      font-size: 9.5pt;
      margin: 4px 0 0 0;
      color: #475569;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 8.5pt;
    }
    table.report-table th, table.report-table td {
      border: 1px solid #334155;
      padding: 6px 8px;
      vertical-align: top;
    }
    table.report-table th {
      background-color: #f1f5f9;
      font-weight: bold;
      text-align: center;
    }
    tr.cancelled-row td {
      background-color: #fff1f2;
      color: #991b1b;
    }
    .text-center { text-align: center; }
    .text-nowrap { white-space: nowrap; }
    .font-bold { font-weight: 600; }
    .pre-line { white-space: pre-line; }
    
    .signature-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .signature-block {
      text-align: center;
      width: 250px;
    }
    .signature-space {
      height: 60px;
    }
    .signatory-name {
      font-weight: bold;
      text-decoration: underline;
      margin: 0;
    }
    .signatory-nip {
      margin: 2px 0 0 0;
      font-size: 9pt;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="kop-surat">
    <h1>PEMERINTAH KOTA BATAM</h1>
    <h2>${department}</h2>
    <p>Jl. Engku Putri No. 17, Batam Centre, Kota Batam, Kepulauan Riau | Telp: (0778) 462123</p>
  </div>

  <div class="report-title-section">
    <div class="report-title">${subTitle}</div>
    <div class="report-subtitle">${periodLabel}</div>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 4%">No</th>
        <th style="width: 16%">Hari / Tanggal</th>
        <th style="width: 11%">Pukul</th>
        <th style="width: 22%">Kegiatan</th>
        <th style="width: 14%">Tempat</th>
        <th style="width: 13%">Penyelenggara</th>
        <th style="width: 12%">Dihadiri Oleh</th>
        <th style="width: 8%">Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || '<tr><td colspan="8" class="text-center" style="padding: 20px;">Tidak ada agenda kegiatan pada periode ini.</td></tr>'}
    </tbody>
  </table>

  <div class="signature-container">
    <div class="signature-block">
      <div>${signatoryCity}, ${signDate}</div>
      <div>${signatoryPosition}</div>
      <div class="signature-space"></div>
      <div class="signatory-name">${signatoryName}</div>
      <div class="signatory-nip">NIP. ${signatoryNip}</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
