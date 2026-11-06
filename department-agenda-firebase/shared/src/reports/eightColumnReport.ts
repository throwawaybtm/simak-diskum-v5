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

import type { ActivityDocument, ActivityStatus, AttendeeSnapshot } from '../schema/activity';
import type { Location, Organizer, Category, Employee, SignatorySettings } from '../schema/master';
import { DEFAULT_SIGNATORY_SETTINGS } from '../schema/master';
import {
  formatIndonesianDateSpan,
  formatTimeDisplay,
  intersectsRange,
  formatIndonesianDate,
  formatDynamicScheduleTitlePeriod
} from '../scheduling/timeUtils';
import { sortActivities } from '../scheduling/sortUtils';

/**
 * Detects if a string is a role, job position, rank, or non-personal organizational title
 * in Indonesian civil service terminology (Pemerintah Kota Batam / Diskum).
 */
export function isRoleOrPosition(str: string): boolean {
  if (!str) return false;
  let clean = str.trim();
  clean = clean.replace(/^\(+|\)+$/g, '').trim();
  clean = clean.replace(/\s*\((?:simulasi|ujicoba|demo)\)/gi, '').trim();
  clean = clean.replace(/\s*(?:simulasi|ujicoba|demo)\b/gi, '').trim();
  if (!clean) return false;

  const rolePrefixes = [
    'kadis', 'kasi', 'kasubbag', 'kabid', 'sekdis', 'sekda', 'sekretaris',
    'kepala', 'staf', 'staff', 'pengelola', 'pranata', 'penyuluh', 'pengawas',
    'pengembang', 'konsultan', 'analis', 'auditor', 'inspektur', 'asisten',
    'walikota', 'bupati', 'gubernur', 'direktur', 'direksi', 'camat', 'sekcam',
    'lurah', 'seklur', 'pejabat', 'pns', 'asn', 'thl', 'p3k', 'pppk', 'honorer',
    'bendahara', 'notulis', 'moderator', 'narasumber', 'pembawa acara', 'mc',
    'dirjen', 'irjen', 'anggota', 'ketua', 'wakil', 'pegawai dinas', 'pegawai'
  ];
  const lower = clean.toLowerCase();
  for (const prefix of rolePrefixes) {
    if (lower === prefix || lower.startsWith(prefix + ' ') || lower.startsWith(prefix + '/') || lower.startsWith(prefix + '-')) {
      return true;
    }
  }
  if (/^(?:bidang|bagian|subbag|seksi|dinas)\b/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Checks if a token is a non-name synthetic / placeholder word
 */
export function isNonNameToken(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toLowerCase();
  return (
    s === '-' ||
    s === 'simulasi' ||
    s === 'ujicoba' ||
    s === 'demo' ||
    s === 'dummy' ||
    s === 'test' ||
    s === 'testing' ||
    s.startsWith('emp_')
  );
}

/**
 * Ensures human-readable Indonesian date formatting (e.g. "Jumat, 30 Oktober 2026")
 * Converts raw YYYY-MM-DD or raw YYYY-MM-DD s.d. YYYY-MM-DD strings defensively.
 */
export function ensureIndonesianDateFormat(str: string): string {
  if (!str) return '-';
  const clean = str.trim();

  // If already formatted in Indonesian words, return as is
  if (/(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu|Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)/i.test(clean)) {
    return clean;
  }

  // Single raw date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    try {
      return formatIndonesianDate(clean);
    } catch {
      return clean;
    }
  }

  // Multi-day raw range: YYYY-MM-DD s.d. YYYY-MM-DD
  const rangeMatch = clean.match(/^(\d{4}-\d{2}-\d{2})\s*(?:s\.d\.|-|–|to)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    try {
      return formatIndonesianDateSpan(rangeMatch[1], rangeMatch[2]);
    } catch {
      return clean;
    }
  }

  return clean;
}

/**
 * Extracts pure employee / guest name from attendee snapshot or label,
 * stripping position, title, department, rank, NIP, and internal database IDs.
 *
 * If a label contains ONLY a role or position without any personal name,
 * outputs "Nama belum tersedia" instead of mistakenly displaying the role.
 */
export function extractNameFromLabel(label: string): string {
  if (!label) return '-';
  let clean = label.trim();

  // Strip leading numbering like "1. ", "2) ", "1 - "
  clean = clean.replace(/^\d+[\.\)\-]\s*/, '');
  if (!clean || clean === '-') return '-';

  // Format: "Tamu: Name"
  if (clean.toLowerCase().startsWith('tamu:')) {
    const guest = clean.slice(5).trim();
    return guest || 'Tamu';
  }

  // Defense-in-depth: purge raw employee database IDs
  clean = clean.replace(/\(?emp_[a-zA-Z0-9_-]+\)?/gi, '').trim();
  if (!clean) return 'Nama belum tersedia';

  // Format with parentheses: "Name (Position)" or "Position (Name)" or "Position (Name (Simulasi))"
  const firstParen = clean.indexOf('(');
  if (firstParen !== -1) {
    const lastParen = clean.lastIndexOf(')');
    const partBefore = clean.substring(0, firstParen).trim();
    const partInside = lastParen > firstParen
      ? clean.substring(firstParen + 1, lastParen).trim()
      : clean.substring(firstParen + 1).trim();

    const beforeIsRole = isRoleOrPosition(partBefore) || isNonNameToken(partBefore);
    const insideIsRole = isRoleOrPosition(partInside) || isNonNameToken(partInside);

    if (!beforeIsRole && insideIsRole) {
      return partBefore || 'Nama belum tersedia';
    }
    if (beforeIsRole && !insideIsRole) {
      return partInside || 'Nama belum tersedia';
    }
    if (beforeIsRole && insideIsRole) {
      return 'Nama belum tersedia';
    }
    return partBefore || partInside || 'Nama belum tersedia';
  }

  // Format: "Position — Name" or "Name — Position"
  if (clean.includes('—')) {
    const [p0, p1] = clean.split('—').map(s => s.trim());
    const p0Role = isRoleOrPosition(p0) || isNonNameToken(p0);
    const p1Role = isRoleOrPosition(p1) || isNonNameToken(p1);
    if (p0Role && !p1Role) return p1;
    if (!p0Role && p1Role) return p0;
    if (p0Role && p1Role) return 'Nama belum tersedia';
    return p0 || p1 || 'Nama belum tersedia';
  }

  // Format: "Position - Name" or "Name - Position"
  if (clean.includes(' - ')) {
    const [p0, p1] = clean.split(' - ').map(s => s.trim());
    const p0Role = isRoleOrPosition(p0) || isNonNameToken(p0);
    const p1Role = isRoleOrPosition(p1) || isNonNameToken(p1);
    if (p0Role && !p1Role) return p1;
    if (!p0Role && p1Role) return p0;
    if (p0Role && p1Role) return 'Nama belum tersedia';
    return p0 || p1 || 'Nama belum tersedia';
  }

  // Pure role or non-name token without any individual name
  if (isRoleOrPosition(clean) || isNonNameToken(clean)) {
    return 'Nama belum tersedia';
  }

  return clean;
}

/**
 * Formats attendees strictly as numbered names only:
 * 1. Budi Simulasi, S.Sos
 * 2. Siti Purwarupa, M.Si
 * Zero jabatan, zero NIP, zero pangkat/golongan.
 */
export function formatAttendeeNamesOnly(attendees: (AttendeeSnapshot | string | any)[]): string {
  if (!attendees || attendees.length === 0) return '-';

  const names: string[] = [];

  for (const item of attendees) {
    if (!item) continue;
    let name = '';
    if (typeof item === 'object') {
      if (item.name && !isRoleOrPosition(item.name) && !isNonNameToken(item.name)) {
        name = item.name.trim();
      } else if (item.label) {
        name = extractNameFromLabel(item.label);
      } else {
        name = 'Nama belum tersedia';
      }
    } else if (typeof item === 'string') {
      name = extractNameFromLabel(item);
    }

    name = name.trim();
    if (name && name !== '-' && !names.includes(name)) {
      names.push(name);
    }
  }

  if (names.length === 0) return '-';
  if (names.length === 1) return `1. ${names[0]}`;
  return names.map((n, i) => `${i + 1}. ${n}`).join('\n');
}

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
  status?: ActivityStatus;
  startDate?: string;
  startTime?: string | null;
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
  lookups: ReportLookups,
  sortOption: 'NEWEST' | 'OLDEST' = 'NEWEST'
): EightColumnReportRow[] {
  // 1. Filter by date-range intersection
  const matching = activities.filter(act =>
    intersectsRange(act.startDate, act.endDate, startDate, endDate)
  );

  // 2. Sort according to specified sortOption (default: NEWEST)
  const sorted = sortActivities(matching, sortOption);

  // 3. Map to 8-column rows
  return sorted.map((act, index) => {
    const isCancelled = act.status === 'CANCELLED';
    const loc = lookups.locations.get(act.locationId);
    const org = lookups.organizers.get(act.organizerId);
    const cat = lookups.categories.get(act.categoryId);

    // Hari / Tanggal
    const hariTanggal = ensureIndonesianDateFormat(
      formatIndonesianDateSpan(act.startDate, act.endDate || act.startDate)
    );

    // Pukul
    const pukul = formatTimeDisplay(act.startTime, act.endTime, act.openEnded);

    // Kegiatan
    const kegiatan = isCancelled ? `[DIBATALKAN] ${act.title}` : act.title;

    // Tempat
    const tempat = loc ? loc.name : (act.locationId || '-');

    // Penyelenggara
    const penyelenggara = org ? org.name : (act.organizerId || '-');

    // Dihadiri Oleh (from frozen snapshots, with fallback to guest list)
    const attendeeParts: (AttendeeSnapshot | string)[] = [];
    if (act.attendeeSnapshots && act.attendeeSnapshots.length > 0) {
      attendeeParts.push(...act.attendeeSnapshots);
    } else if (act.attendeeIds && act.attendeeIds.length > 0 && lookups.employees) {
      attendeeParts.push(...act.attendeeIds.map(id => lookups.employees?.get(id)?.name || id));
    }

    if (act.guestAttendees && act.guestAttendees.length > 0) {
      for (const guest of act.guestAttendees) {
        if (!attendeeParts.some(p => typeof p === 'string' ? p.includes(guest) : p.name?.includes(guest))) {
          attendeeParts.push(`Tamu: ${guest}`);
        }
      }
    }
    const dihadiriOleh = attendeeParts.length > 0 ? formatAttendeeNamesOnly(attendeeParts) : '-';

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
      status: act.status,
      startDate: act.startDate,
      startTime: act.startTime,
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
  isStaging?: boolean;
  watermarkText?: string;
}

/**
 * Generates clean manual-style Indonesian schedule HTML Report (A4 Landscape)
 * per Section 6 & 8 of S01-QA-R2:
 * 1. 3 centered title lines:
 *    - JADWAL KEGIATAN
 *    - DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM
 *    - BULAN OKTOBER 2026 (or dynamic period)
 * 2. 8 columns: No | Hari / Tanggal | Pukul | Kegiatan | Tempat | Penyelenggara | Dihadiri Oleh | Keterangan
 * 3. Uniform typography (Arial), white background, black text, thin black borders (1px solid #000)
 * 4. Alignments: Dihadiri Oleh left-aligned, all others centered
 * 5. Names-only attendees
 * 6. NO kop surat, logo, signature block, signatory name/NIP
 * 7. Prominent staging warning & watermark when isStaging is true
 */
export function generateEightColumnHtmlReport(options: HtmlReportOptions): string {
  const department = options.departmentName || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM';
  const periodTitle = formatDynamicScheduleTitlePeriod(options.startDate, options.endDate);
  const watermark = options.watermarkText || (options.isStaging ? 'DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI' : '');

  const tableRowsHtml = options.rows.map(row => `
    <tr class="${row.isCancelled ? 'cancelled-row' : ''}">
      <td class="text-center align-middle">${row.no}</td>
      <td class="text-center align-middle">${ensureIndonesianDateFormat(row.hariTanggal)}</td>
      <td class="text-center align-middle text-nowrap">${row.pukul}</td>
      <td class="text-center align-middle font-bold">${row.kegiatan}</td>
      <td class="text-center align-middle">${row.tempat}</td>
      <td class="text-center align-middle">${row.penyelenggara}</td>
      <td class="text-left align-middle pre-line">${row.dihadiriOleh}</td>
      <td class="text-center align-middle">${row.keterangan}</td>
    </tr>
  `).join('\n');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Jadwal Kegiatan - ${department}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm 15mm 12mm 15mm;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 10pt;
      color: #000000;
      margin: 0;
      padding: 10px;
      line-height: 1.4;
      background: #ffffff;
    }
    .schedule-header {
      text-align: center;
      margin-bottom: 16px;
    }
    .schedule-header .title-line-1 {
      margin: 0;
      font-size: 12pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .schedule-header .title-line-2 {
      margin: 2px 0;
      font-size: 11pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .schedule-header .title-line-3 {
      margin: 2px 0 0 0;
      font-size: 11pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    table.report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5pt;
      background: #ffffff;
    }
    table.report-table th, table.report-table td {
      border: 1px solid #000000;
      padding: 6px 8px;
      vertical-align: middle;
      color: #000000;
    }
    table.report-table th {
      background-color: #ffffff;
      font-weight: bold;
      text-align: center;
      font-size: 9.5pt;
    }
    tr.cancelled-row td {
      background-color: #fff1f2;
      color: #991b1b;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .align-middle { vertical-align: middle; }
    .text-nowrap { white-space: nowrap; }
    .font-bold { font-weight: 600; }
    .pre-line { white-space: pre-line; }

    .watermark-overlay {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 32pt;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.13);
      text-transform: uppercase;
      letter-spacing: 3px;
      pointer-events: none;
      z-index: 9999;
      white-space: nowrap;
      border: 3.5px dashed rgba(220, 38, 38, 0.25);
      padding: 12px 28px;
      border-radius: 8px;
      text-align: center;
    }
    .staging-report-warning {
      background: #fef2f2;
      border: 1.5px solid #ef4444;
      color: #991b1b;
      font-weight: bold;
      font-size: 9.5pt;
      padding: 6px 12px;
      margin-bottom: 14px;
      text-align: center;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${watermark ? `
    <div class="watermark-overlay" aria-hidden="true">${watermark}</div>
    <div class="staging-report-warning">
      ⚠️ ${watermark} (LINGKUNGAN STAGING) ⚠️
    </div>
  ` : ''}

  <div class="schedule-header">
    <div class="title-line-1">JADWAL KEGIATAN</div>
    <div class="title-line-2">${department}</div>
    <div class="title-line-3">${periodTitle}</div>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 4%">No</th>
        <th style="width: 15%">Hari / Tanggal</th>
        <th style="width: 10%">Pukul</th>
        <th style="width: 22%">Kegiatan</th>
        <th style="width: 14%">Tempat</th>
        <th style="width: 14%">Penyelenggara</th>
        <th style="width: 13%">Dihadiri Oleh</th>
        <th style="width: 8%">Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || '<tr><td colspan="8" class="text-center" style="padding: 20px;">Tidak ada agenda kegiatan pada periode ini.</td></tr>'}
    </tbody>
  </table>

  ${watermark ? `
    <div style="font-size: 8pt; color: #991b1b; font-style: italic; margin-top: 15px; border-top: 1px dashed #ef4444; padding-top: 6px;">
      * Peringatan: Dokumen ini dicetak dari Lingkungan Staging / Uji Coba SIMAK DISKUM. ${watermark}.
    </div>
  ` : ''}
</body>
</html>
  `.trim();
}
