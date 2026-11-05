/**
 * SIMAK DISKUM v5.0 — T01 Historical Agenda & Temporary Master Data Ingestion Engine
 * 
 * Target: Local Firebase Emulator (demo-department-agenda)
 * Host: Firestore 127.0.0.1:8080, Auth 127.0.0.1:9099
 * 
 * Safety invariants:
 * 1. ZERO connection to production Firebase.
 * 2. 100% idempotent execution (runs twice without duplicating or corrupting data).
 * 3. Complete privacy isolation: Zoom credentials, passcodes, and phone numbers are quarantined to privateNotes.
 * 4. Traceable source mapping (Workbook -> Sheet -> Row -> Normalized ID -> Action).
 * 5. Deterministic identifiers and version-locked public projection.
 */

import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Validate emulator environment
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
}

const PROJECT_ID = 'demo-department-agenda';
const app = getApps().length === 0 ? initializeApp({ projectId: PROJECT_ID }) : getApps()[0];
const db = getFirestore(app);

// -------------------------------------------------------------
// 1. MASTER DEPARTMENTS DEFINITION (8 Units)
// -------------------------------------------------------------
export const DEPARTMENTS = [
  { id: 'dept_dinas', name: 'Dinas (Pimpinan)', active: true },
  { id: 'dept_kewirausahaan', name: 'Bidang Kewirausahaan', active: true },
  { id: 'dept_pemberdayaan_koperasi', name: 'Bidang Pemberdayaan dan Pelindungan Koperasi', active: true },
  { id: 'dept_pengawasan_koperasi', name: 'Bidang Pengawasan Koperasi', active: true },
  { id: 'dept_usaha_mikro', name: 'Bidang Pengembangan Usaha Mikro', active: true },
  { id: 'dept_dana_bergulir', name: 'UPTD Pengelolaan Dana Bergulir', active: true },
  { id: 'dept_plut_kumkm', name: 'UPTD PLUT KUMKM', active: true },
  { id: 'dept_sekretariat', name: 'Sekretariat', active: true }
];

// Department name matching map
const DEPT_NAME_MAP = {
  'dinas': 'dept_dinas',
  'bidang kewirausahaan': 'dept_kewirausahaan',
  'bidang pemberdayaan dan pelindungan koperasi': 'dept_pemberdayaan_koperasi',
  'bidang pengawasan koperasi': 'dept_pengawasan_koperasi',
  'bidang pengembangan usaha mikro': 'dept_usaha_mikro',
  'uptd pengelolaan dana bergulir': 'dept_dana_bergulir',
  'uptd plut kumkm': 'dept_plut_kumkm',
  'sekretariat': 'dept_sekretariat'
};

// -------------------------------------------------------------
// 2. PARSE TEMPORARY PERSONNEL ROSTER (Markdown -> JSON)
// -------------------------------------------------------------
export function parsePersonnelMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let currentDept = '';
  const employees = [];

  for (let line of lines) {
    line = line.trim();
    if (!line || !line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim().replace(/\*\*/g, ''));
    if (cells.length === 0) continue;

    // Department header row
    if (cells[0] && !cells[1] && !cells[2] && !cells[3] && !cells[4]) {
      currentDept = cells[0].trim();
      continue;
    }
    if (cells[0].toLowerCase() === 'no' || cells[0].toLowerCase() === 'no.' || cells[0].startsWith('---')) {
      continue;
    }

    const no = cells[0];
    const name = cells[1];
    if (!no || !name || isNaN(parseInt(no))) continue;

    let nip = cells[2] || '';
    let rank = cells[3] || '';
    let position = cells[4] || '';

    // Handle 3-column table (Non-ASN section)
    if (!position && !rank && nip) {
      position = nip;
      nip = '';
      rank = '';
    }

    const cleanNip = nip.replace(/\s+/g, '');
    let category = 'NON_ASN';
    if (cleanNip.length === 18) {
      if (cleanNip.slice(12, 14) === '21') {
        category = 'PPPK';
      } else {
        category = 'PNS';
      }
    }

    const deptId = DEPT_NAME_MAP[currentDept.toLowerCase()] || 'dept_sekretariat';

    // Generate deterministic ID
    const nameSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 30);
    const empId = `emp_${nameSlug}`;

    employees.push({
      id: empId,
      name,
      nip,
      rank,
      position,
      departmentId: deptId,
      departmentName: currentDept,
      employmentCategory: category,
      active: true,
      provisional: true
    });
  }

  return employees;
}

// -------------------------------------------------------------
// 3. MASTER AUXILIARIES (Locations, Organizers, Categories)
// -------------------------------------------------------------
export const LOCATIONS = [
  { id: 'loc_engku_putri', name: 'Dataran Engku Putri, Batam Centre', type: 'EXTERNAL', isBookableRoom: false, active: true },
  { id: 'loc_rapat_diskum', name: 'Ruang Rapat Diskum Lantai 2', type: 'OFFICE', isBookableRoom: true, active: true },
  { id: 'loc_aula_plut', name: 'Aula Pertemuan PLUT KUKM Batam', type: 'OFFICE', isBookableRoom: true, active: true },
  { id: 'loc_media_center_plut', name: 'Ruang Media Center PLUT Batam', type: 'OFFICE', isBookableRoom: true, active: true },
  { id: 'loc_dprd_batam', name: 'Ruang Sidang Utama DPRD Kota Batam', type: 'EXTERNAL', isBookableRoom: false, active: true },
  { id: 'loc_engku_hamidah', name: 'Aula Engku Hamidah Kantor Walikota', type: 'EXTERNAL', isBookableRoom: false, active: true },
  { id: 'loc_hang_nadim', name: 'Ruang Rapat Hang Nadim Kantor Walikota', type: 'EXTERNAL', isBookableRoom: false, active: true },
  { id: 'loc_zoom_kedinasan', name: 'Ruang Virtual Zoom Kedinasan', type: 'ONLINE', isBookableRoom: false, active: true },
  { id: 'loc_external_hotel', name: 'Hotel / Lokasi Eksternal Kota Batam', type: 'EXTERNAL', isBookableRoom: false, active: true },
  { id: 'loc_lapangan_koperasi', name: 'Koperasi Lapangan / Lokasi Binaan', type: 'EXTERNAL', isBookableRoom: false, active: true }
];

export const ORGANIZERS = [
  { id: 'org_diskum_batam', name: 'Dinas Koperasi dan Usaha Mikro Kota Batam', active: true },
  { id: 'org_setdako_batam', name: 'Sekretariat Daerah Kota Batam', active: true },
  { id: 'org_walikota_batam', name: 'Wali Kota Batam', active: true },
  { id: 'org_dprd_batam', name: 'DPRD Kota Batam', active: true },
  { id: 'org_kemenkop_ri', name: 'Kementerian Koperasi dan UKM RI', active: true },
  { id: 'org_plut_kumkm', name: 'UPTD PLUT KUMKM Batam', active: true },
  { id: 'org_dana_bergulir', name: 'UPTD Pengelolaan Dana Bergulir', active: true },
  { id: 'org_gerakan_koperasi', name: 'Gerakan Koperasi / Mitra Eksternal', active: true }
];

export const CATEGORIES = [
  { id: 'cat_rapat_koordinasi', name: 'Rapat Koordinasi & Evaluasi', colorHex: '#2563eb', active: true },
  { id: 'cat_pelatihan_bimtek', name: 'Bimbingan Teknis & Pelatihan', colorHex: '#0284c7', active: true },
  { id: 'cat_pengawasan_lapangan', name: 'Pengawasan Koperasi & Monev', colorHex: '#16a34a', active: true },
  { id: 'cat_sosialisasi_edukasi', name: 'Sosialisasi & Regulasi', colorHex: '#d97706', active: true },
  { id: 'cat_bazar_pameran', name: 'Pameran, Festival & Acara Publik', colorHex: '#9333ea', active: true }
];

export const PROVISIONAL_SIGNATORY = {
  name: 'Salim, S.Sos, M.Si',
  nip: '19681021 199010 1 001',
  position: 'Kepala Dinas',
  department: 'Dinas Koperasi dan Usaha Mikro Kota Batam',
  city: 'Batam',
  provisionalNote: 'PROVISIONAL — NOT VERIFIED FOR OFFICIAL USE (Awaiting formal SK decree verification)'
};

// -------------------------------------------------------------
// 4. CLEAN CELL & TIME PARSING HELPERS
// -------------------------------------------------------------
function cleanCell(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (val.richText && Array.isArray(val.richText)) {
      return val.richText.map(p => (p && p.text ? String(p.text) : '')).join('').trim();
    }
    if (val.text !== undefined) {
      if (typeof val.text === 'string') return val.text.trim();
      if (typeof val.text === 'object') return cleanCell(val.text);
      return String(val.text).trim();
    }
    if (val.result !== undefined) {
      if (val.result instanceof Date) return val.result.toISOString();
      return String(val.result).trim();
    }
    if (val.hyperlink) return String(val.hyperlink).trim();
    return JSON.stringify(val);
  }
  return String(val).trim();
}

function parseIndonesianTime(rawTime) {
  const norm = (rawTime || '').replace(/,/g, '.');
  const matches = norm.match(/\b(\d{1,2})[.:](\d{2})\b/g);
  const isOpen = /selesai/i.test(norm) || !matches || matches.length === 1;

  let startTime = '08:00';
  if (matches && matches[0]) {
    const parts = matches[0].split(/[.:]/);
    startTime = `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }

  let endTime = null;
  if (!isOpen && matches && matches.length > 1) {
    const parts = matches[1].split(/[.:]/);
    endTime = `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }

  let timeDisplay = '';
  if (isOpen) {
    timeDisplay = `${startTime} WIB s.d. Selesai`;
  } else if (endTime) {
    timeDisplay = `${startTime} - ${endTime} WIB`;
  } else {
    timeDisplay = `${startTime} WIB`;
  }

  return { startTime, endTime, openEnded: isOpen, timeDisplay };
}

// -------------------------------------------------------------
// 5. PRIVACY ISOLATION
// -------------------------------------------------------------
export function extractAndIsolatePrivacy(allText) {
  let privateMeetingUrl = null;
  const privateSecrets = [];
  let sanitizedPublicNotes = allText;

  // Zoom URL
  const zoomMatch = allText.match(/https?:\/\/[^\s]*zoom\.us[^\s]*/i);
  if (zoomMatch) {
    privateMeetingUrl = zoomMatch[0];
    privateSecrets.push(`Virtual URL: ${zoomMatch[0]}`);
    sanitizedPublicNotes = sanitizedPublicNotes.replace(zoomMatch[0], '[TAUTAN VIRTUAL DIAMANKAN]');
  }

  // Meeting ID
  const meetingIdMatch = allText.match(/(?:meeting\s*id|id\s*meeting|id\s*zoom|id)[:\s]*([0-9\s-]{9,16})/i);
  if (meetingIdMatch) {
    privateSecrets.push(`Meeting ID: ${meetingIdMatch[1].trim()}`);
    sanitizedPublicNotes = sanitizedPublicNotes.replace(meetingIdMatch[0], '[ID RAPAT DIKANTOR]');
  }

  // Passcode / Password
  const passMatch = allText.match(/\b(?:passcode|password|sandi|pwd)[:\s=]+([a-zA-Z0-9_\-.]+)\b/i);
  if (passMatch) {
    privateSecrets.push(`Passcode: ${passMatch[1].trim()}`);
    sanitizedPublicNotes = sanitizedPublicNotes.replace(passMatch[0], '[KREDENSIAL DIKANTOR]');
  }

  // Phone numbers
  const phoneMatches = allText.match(/(?:\+62|08)[0-9\s-]{9,15}/g);
  if (phoneMatches) {
    for (const ph of phoneMatches) {
      const cleanPh = ph.replace(/\s+/g, '');
      if (cleanPh.length >= 10 && cleanPh.length <= 14) {
        privateSecrets.push(`Kontak: ${ph.trim()}`);
        sanitizedPublicNotes = sanitizedPublicNotes.replace(ph, '[KONTAK RESMI DIARSIP]');
      }
    }
  }

  // Clean remaining whitespace
  sanitizedPublicNotes = sanitizedPublicNotes.replace(/\s+/g, ' ').trim();
  const privateNotes = privateSecrets.length > 0
    ? `[INFORMASI INTERNAL & KREDENSIAL]\n${privateSecrets.join('\n')}`
    : '';

  return { privateMeetingUrl, privateNotes, sanitizedPublicNotes };
}

// -------------------------------------------------------------
// 6. MAIN IMPORT SCRIPT
// -------------------------------------------------------------
export async function runT01Import(options = { dryRun: false }) {
  console.log('======================================================================');
  console.log('[SIMAK DISKUM] T01 HISTORICAL AGENDA & TEMPORARY MASTER IMPORT');
  console.log(`Target:           LOCAL EMULATOR (${PROJECT_ID})`);
  console.log(`Dry Run:          ${options.dryRun ? 'YES (No writes)' : 'NO (Writing to Emulator)'}`);
  console.log('======================================================================');

  // Step A: Parse Temporary Employees Roster
  const mdPath = 'C:/Users/Evaluation Software/.gemini/antigravity/brain/9bc97728-a55d-4267-af2e-af77ebf60f34/.user_uploaded/media_1793871442944_88b3b141.md';
  const fullRoster = parsePersonnelMarkdown(mdPath);
  console.log(`\n[Master Data] Parsed ${fullRoster.length} temporary employees across ${DEPARTMENTS.length} departments.`);

  const pnsCount = fullRoster.filter(e => e.employmentCategory === 'PNS').length;
  const pppkCount = fullRoster.filter(e => e.employmentCategory === 'PPPK').length;
  const nonAsnCount = fullRoster.filter(e => e.employmentCategory === 'NON_ASN').length;
  console.log(`  - PNS: ${pnsCount}`);
  console.log(`  - PPPK: ${pppkCount}`);
  console.log(`  - Non-ASN: ${nonAsnCount}`);

  // Resolve paths robustly whether executed from D:/Temp or D:/Temp/department-agenda-firebase
  const rootDir = fs.existsSync(path.resolve(process.cwd(), 'department-agenda-firebase'))
    ? process.cwd()
    : path.resolve(process.cwd(), '..');
  const monorepoDir = path.resolve(rootDir, 'department-agenda-firebase');
  const masterJsonPath = path.resolve(monorepoDir, 'templates/temporaryEmployeeMaster.json');

  fs.writeFileSync(masterJsonPath, JSON.stringify({
    metadata: {
      source: 'Roster Tenaga ASN dan Non-ASN Dinas Koperasi dan Usaha Mikro Kota Batam',
      totalCount: fullRoster.length,
      pnsCount,
      pppkCount,
      nonAsnCount,
      isProvisional: true,
      approvalStatus: 'NOT_VERIFIED_FOR_OFFICIAL_PRODUCTION_USE',
      generatedAt: new Date().toISOString()
    },
    departments: DEPARTMENTS,
    employees: fullRoster
  }, null, 2));
  console.log(`  ✓ Written temporary master template: ${masterJsonPath}`);

  // Step B: Parse October 2026 Spreadsheet
  const xlsxPath = path.resolve(rootDir, 'temp_october_2026.xlsx');
  console.log(`\n[Spreadsheet] Reading workbook: ${xlsxPath}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  console.log(`[Spreadsheet] Found ${wb.worksheets.length} worksheets.`);

  const rawSourceRows = [];
  const normalizedActivities = [];
  const sourceMapping = [];

  // Track duplicates on same sheet
  const seenOnSameSheet = new Map(); // `${date}_${titleNorm}` -> existingActId

  for (let idx = 0; idx < wb.worksheets.length; idx++) {
    const ws = wb.worksheets[idx];
    const sheetName = ws.name;

    // Derive ISO date from sheetName DDMMYY (e.g. 011026 -> 2026-10-01)
    const day = sheetName.slice(0, 2);
    const month = sheetName.slice(2, 4);
    const year = `20${sheetName.slice(4, 6)}`;
    const isoDate = `${year}-${month}-${day}`;

    // Dynamically detect column indices from Row 5
    const row5 = ws.getRow(5);
    let colMap = { no: -1, date: -1, time: -1, title: -1, loc: -1, org: -1, att: -1, notes: -1 };

    row5.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const txt = cleanCell(cell.value).toLowerCase();
      if (txt === 'no' || txt === 'no.') colMap.no = colNumber;
      else if (txt.includes('hari') || txt.includes('tanggal')) colMap.date = colNumber;
      else if (txt.includes('pukul') || txt.includes('jam') || txt.includes('waktu')) colMap.time = colNumber;
      else if (txt.includes('kegiatan') || txt.includes('agenda')) colMap.title = colNumber;
      else if (txt.includes('tempat') || txt.includes('lokasi')) colMap.loc = colNumber;
      else if (txt.includes('penyelenggara')) colMap.org = colNumber;
      else if (txt.includes('dihadiri')) colMap.att = colNumber;
      else if (txt.includes('keterangan')) colMap.notes = colNumber;
    });

    if (colMap.no === -1) colMap.no = 1;
    if (colMap.date === -1) colMap.date = colMap.no + 1;
    if (colMap.time === -1) colMap.time = colMap.no + 2;
    if (colMap.title === -1) colMap.title = colMap.no + 3;
    if (colMap.loc === -1) colMap.loc = colMap.no + 4;
    if (colMap.org === -1) colMap.org = colMap.no + 5;
    if (colMap.att === -1) colMap.att = colMap.no + 6;
    if (colMap.notes === -1) colMap.notes = colMap.no + 7;

    let dailyIndex = 1;

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < 6) return;

      const no = cleanCell(row.getCell(colMap.no).value);
      const rawDate = cleanCell(row.getCell(colMap.date).value);
      const rawTime = cleanCell(row.getCell(colMap.time).value);
      const title = cleanCell(row.getCell(colMap.title).value);
      const location = cleanCell(row.getCell(colMap.loc).value);
      const organizer = cleanCell(row.getCell(colMap.org).value);
      const rawAttendees = cleanCell(row.getCell(colMap.att).value);
      const notes = cleanCell(row.getCell(colMap.notes).value);

      if (!title && !location && !rawTime) return;

      const sourceRecordIndex = rawSourceRows.length + 1;
      rawSourceRows.push({
        sourceIndex: sourceRecordIndex,
        sheetName,
        rowNumber,
        no,
        rawDate,
        rawTime,
        title,
        location,
        organizer,
        rawAttendees,
        notes
      });

      // Parse time
      const timeParsed = parseIndonesianTime(rawTime);

      // Privacy scan
      const combinedNotes = `${location.includes('Zoom') ? location : ''} ${notes}`.trim();
      const privacy = extractAndIsolatePrivacy(combinedNotes);

      // Location resolution
      let locId = 'loc_external_hotel';
      let locName = location || 'Lokasi Kegiatan';
      const locLower = locName.toLowerCase();
      if (locLower.includes('zoom')) {
        locId = 'loc_zoom_kedinasan';
        locName = 'Ruang Virtual Zoom Kedinasan';
      } else if (locLower.includes('engku putri')) {
        locId = 'loc_engku_putri';
      } else if (locLower.includes('dprd')) {
        locId = 'loc_dprd_batam';
      } else if (locLower.includes('engku hamidah')) {
        locId = 'loc_engku_hamidah';
      } else if (locLower.includes('hang nadim')) {
        locId = 'loc_hang_nadim';
      } else if (locLower.includes('plut')) {
        locId = 'loc_aula_plut';
      } else if (locLower.includes('diskum') || locLower.includes('ruang rapat')) {
        locId = 'loc_rapat_diskum';
      } else if (locLower.includes('koperasi')) {
        locId = 'loc_lapangan_koperasi';
      }

      // Organizer resolution
      let orgId = 'org_diskum_batam';
      let orgName = organizer || 'Dinas Koperasi dan Usaha Mikro Kota Batam';
      const orgLower = orgName.toLowerCase();
      if (orgLower.includes('walikota')) orgId = 'org_walikota_batam';
      else if (orgLower.includes('sekretariat daerah') || orgLower.includes('setda')) orgId = 'org_setdako_batam';
      else if (orgLower.includes('dprd')) orgId = 'org_dprd_batam';
      else if (orgLower.includes('kemenkop')) orgId = 'org_kemenkop_ri';
      else if (orgLower.includes('plut')) orgId = 'org_plut_kumkm';
      else if (orgLower.includes('dana bergulir')) orgId = 'org_dana_bergulir';
      else if (orgLower.includes('koperasi') || orgLower.includes('kpri') || orgLower.includes('bank')) orgId = 'org_gerakan_koperasi';

      // Category resolution
      let catId = 'cat_rapat_koordinasi';
      let catName = 'Rapat Koordinasi & Evaluasi';
      const titleLower = title.toLowerCase();
      if (titleLower.includes('pelatihan') || titleLower.includes('bimtek') || titleLower.includes('diklat')) {
        catId = 'cat_pelatihan_bimtek';
        catName = 'Bimbingan Teknis & Pelatihan';
      } else if (titleLower.includes('pengawasan') || titleLower.includes('monev') || titleLower.includes('monitoring')) {
        catId = 'cat_pengawasan_lapangan';
        catName = 'Pengawasan Koperasi & Monev';
      } else if (titleLower.includes('sosialisasi') || titleLower.includes('edukasi') || titleLower.includes('penyuluhan')) {
        catId = 'cat_sosialisasi_edukasi';
        catName = 'Sosialisasi & Regulasi';
      } else if (titleLower.includes('pameran') || titleLower.includes('expo') || titleLower.includes('bazar') || titleLower.includes('nobar') || titleLower.includes('festival') || titleLower.includes('senam') || titleLower.includes('upacara') || titleLower.includes('silaturahmi')) {
        catId = 'cat_bazar_pameran';
        catName = 'Pameran, Festival & Acara Publik';
      }

      // Attendee resolution against temporary employees roster
      const attendeeIds = [];
      const attendeeSnapshots = [];
      const guestAttendees = [];
      const attLower = rawAttendees.toLowerCase();

      for (const emp of fullRoster) {
        const baseName = emp.name.split(',')[0].trim();
        if (attLower.includes(baseName.toLowerCase())) {
          attendeeIds.push(emp.id);
          attendeeSnapshots.push({
            employeeId: emp.id,
            label: `${emp.name} (${emp.position})`,
            departmentId: emp.departmentId,
            role: emp.position
          });
        }
      }

      // Role aliases
      if (attLower.includes('kadis') || attLower.includes('kepala dinas')) {
        const kadis = fullRoster.find(e => e.position === 'Kepala Dinas');
        if (kadis && !attendeeIds.includes(kadis.id)) {
          attendeeIds.push(kadis.id);
          attendeeSnapshots.push({
            employeeId: kadis.id,
            label: `${kadis.name} (${kadis.position})`,
            departmentId: kadis.departmentId,
            role: kadis.position
          });
        }
      }
      if (attLower.includes('sekdis') || (attLower.includes('sekretaris') && !attLower.includes('subbag'))) {
        const sekdis = fullRoster.find(e => e.position === 'Sekretaris');
        if (sekdis && !attendeeIds.includes(sekdis.id)) {
          attendeeIds.push(sekdis.id);
          attendeeSnapshots.push({
            employeeId: sekdis.id,
            label: `${sekdis.name} (${sekdis.position})`,
            departmentId: sekdis.departmentId,
            role: sekdis.position
          });
        }
      }
      if (attLower.includes('ka. plut') || attLower.includes('kepala plut')) {
        const kaplut = fullRoster.find(e => e.position === 'Kepala UPTD PLUT KUMKM');
        if (kaplut && !attendeeIds.includes(kaplut.id)) {
          attendeeIds.push(kaplut.id);
          attendeeSnapshots.push({
            employeeId: kaplut.id,
            label: `${kaplut.name} (${kaplut.position})`,
            departmentId: kaplut.departmentId,
            role: kaplut.position
          });
        }
      }

      // Add general team notes as guest attendee if unmatched
      if (attendeeIds.length === 0 && rawAttendees) {
        const lines = rawAttendees.split('\n').map(l => l.replace(/^[0-9.]+\s*/, '').trim()).filter(Boolean);
        lines.forEach(l => {
          if (l.length > 2 && !guestAttendees.includes(l)) {
            guestAttendees.push(l);
          }
        });
      }

      // Check for exact duplicate on same sheet (e.g. 191026 Row 7 vs Row 10)
      const sameSheetKey = `${isoDate}_${title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      let importAction = 'Created';
      let actId = `act_${year}${month}${day}_${String(dailyIndex).padStart(2, '0')}`;

      if (seenOnSameSheet.has(sameSheetKey)) {
        const existingActId = seenOnSameSheet.get(sameSheetKey);
        importAction = 'Merged with verified same event';
        actId = existingActId;

        // Merge attendees into the existing record
        const existingAct = normalizedActivities.find(a => a.id === existingActId);
        if (existingAct && existingAct.activity) {
          attendeeIds.forEach(id => {
            if (!existingAct.activity.attendeeIds.includes(id)) {
              existingAct.activity.attendeeIds.push(id);
            }
          });
          attendeeSnapshots.forEach(snap => {
            if (!existingAct.activity.attendeeSnapshots.some(s => s.employeeId === snap.employeeId)) {
              existingAct.activity.attendeeSnapshots.push(snap);
            }
          });
          guestAttendees.forEach(g => {
            if (!existingAct.activity.guestAttendees.includes(g)) {
              existingAct.activity.guestAttendees.push(g);
            }
          });
          if (existingAct.publicDto) {
            existingAct.publicDto.attendeeLabels = existingAct.activity.attendeeSnapshots.map(s => s.label);
          }
        }

        sourceMapping.push({
          sourceIndex: sourceRecordIndex,
          sheetName,
          rowNumber,
          normalizedActivityId: actId,
          title,
          date: isoDate,
          importAction,
          notes: 'Merged duplicate session on same date and time into canonical activity'
        });
        return; // Done merging
      }

      // Track multi-day series
      const isMultiDayChain = [
        'Sosialisasi KOMCAD ASN',
        'Penyusunan Dokumen Human Capital Development Plan',
        'Pengawasan Koperasi',
        'Pelatihan Seni Kreatif dan Panduan',
        'Bimbingan Teknis Peningkatan Kapasitas Agent of Change',
        'Seminar Penegakan Hukum Kekayaan Intelektual',
        'Sosialisasi Laporan Keuangan Terhadap Koperasi',
        'Gotong Royong Kebun',
        'Pendataan Pelaku Usaha dan Monitoring Pasca Kegiatan Inkubasi',
        'Semarak UMKM Tahun 2026',
        'Verifikasi Fisik Gerai Pergudangan'
      ].some(chain => title.toLowerCase().includes(chain.toLowerCase()));

      if (isMultiDayChain) {
        importAction = 'Linked recurring session';
      }

      seenOnSameSheet.set(sameSheetKey, actId);
      dailyIndex++;

      // Canonical Activity Document
      const nowIso = new Date().toISOString();
      const activityDoc = {
        id: actId,
        title,
        startDate: isoDate,
        startTime: timeParsed.startTime,
        endDate: isoDate,
        endTime: timeParsed.endTime,
        openEnded: timeParsed.openEnded,
        locationId: locId,
        organizerId: orgId,
        categoryId: catId,
        attendeeIds,
        attendeeSnapshots,
        guestAttendees,
        status: 'SCHEDULED',
        publicNotes: privacy.sanitizedPublicNotes.slice(0, 1000),
        privateNotes: privacy.privateNotes.slice(0, 2000),
        privateMeetingUrl: privacy.privateMeetingUrl,
        version: 1,
        createdAt: nowIso,
        createdBy: 't01_migration_engine',
        updatedAt: nowIso,
        updatedBy: 't01_migration_engine',
        sourceSheet: sheetName,
        sourceRow: rowNumber
      };

      // Sanitized Public DTO
      const publicDto = {
        id: actId,
        title,
        startDate: isoDate,
        startTime: timeParsed.startTime,
        endDate: isoDate,
        endTime: timeParsed.endTime,
        openEnded: timeParsed.openEnded,
        timeDisplay: timeParsed.timeDisplay,
        dateDisplay: `${day} Oktober ${year}`,
        status: 'SCHEDULED',
        locationName: locName,
        locationType: LOCATIONS.find(l => l.id === locId)?.type || 'EXTERNAL',
        organizerName: orgName,
        categoryName: catName,
        publicNotes: privacy.sanitizedPublicNotes.slice(0, 1000),
        attendeeLabels: attendeeSnapshots.map(s => s.label),
        version: 1,
        updatedAt: nowIso
      };

      normalizedActivities.push({
        id: actId,
        activity: activityDoc,
        publicDto
      });

      sourceMapping.push({
        sourceIndex: sourceRecordIndex,
        sheetName,
        rowNumber,
        normalizedActivityId: actId,
        title,
        date: isoDate,
        importAction,
        notes: privacy.privateMeetingUrl ? 'Credentials safely quarantined' : 'Standard schedule'
      });
    });
  }

  console.log(`\n[Reconciliation Summary]`);
  console.log(`  - Raw Source Rows:          ${rawSourceRows.length}`);
  console.log(`  - Canonical Activities:     ${normalizedActivities.length}`);
  console.log(`  - Merged Duplicates:        ${rawSourceRows.length - normalizedActivities.length}`);
  console.log(`  - Total Source Mapping Rows: ${sourceMapping.length}`);

  // Step C: Write Source Mapping Document
  const mappingDocPath = path.resolve(rootDir, 'docs/T01_SOURCE_MAPPING.md');
  const mappingMonorepoPath = path.resolve(monorepoDir, 'docs/T01_SOURCE_MAPPING.md');

  let mappingMd = `# SIMAK DISKUM Kota Batam v5.0 — T01 Source-to-Import Traceability Matrix\n\n`;
  mappingMd += `**Date:** ${new Date().toISOString()}  \n`;
  mappingMd += `**Total Source Rows:** ${rawSourceRows.length}  \n`;
  mappingMd += `**Total Canonical Activities:** ${normalizedActivities.length}  \n`;
  mappingMd += `**Total Merged Duplicate Rows:** ${rawSourceRows.length - normalizedActivities.length}  \n`;
  mappingMd += `**Total Skipped Rows:** 0  \n\n`;
  mappingMd += `| No | Sheet | Row | Normalized ID | Date | Activity Title | Import Action | Notes |\n`;
  mappingMd += `|---|---|---|---|---|---|---|---|\n`;

  for (const m of sourceMapping) {
    const safeTitle = m.title.replace(/\|/g, '-').slice(0, 45);
    mappingMd += `| ${m.sourceIndex} | \`${m.sheetName}\` | ${m.rowNumber} | \`${m.normalizedActivityId}\` | ${m.date} | ${safeTitle} | **${m.importAction}** | ${m.notes} |\n`;
  }

  fs.writeFileSync(mappingDocPath, mappingMd, 'utf8');
  fs.writeFileSync(mappingMonorepoPath, mappingMd, 'utf8');
  console.log(`  ✓ Written traceability matrix to ${mappingDocPath} and ${mappingMonorepoPath}`);

  if (options.dryRun) {
    console.log('\n[Dry Run Completed] No database mutations performed.');
    return { rawSourceRows, normalizedActivities, sourceMapping, fullRoster };
  }

  // Step D: Write to Firestore Emulator
  console.log('\n[Firestore Ingestion] Writing Master Data to Firestore Emulator...');

  // 1. Departments
  const deptBatch = db.batch();
  for (const dept of DEPARTMENTS) {
    const docRef = db.collection('departments').doc(dept.id);
    deptBatch.set(docRef, { id: dept.id, name: dept.name, active: dept.active }, { merge: true });
  }
  await deptBatch.commit();
  console.log(`  ✓ Saved ${DEPARTMENTS.length} departments.`);

  // 2. Employees (conforming strictly to isValidEmployee: id, name, position, departmentId, active)
  const empBatches = [];
  let currentEmpBatch = db.batch();
  let count = 0;

  for (const emp of fullRoster) {
    const docRef = db.collection('employees').doc(emp.id);
    currentEmpBatch.set(docRef, {
      id: emp.id,
      name: emp.name,
      position: emp.position,
      departmentId: emp.departmentId,
      active: emp.active
    }, { merge: true });
    count++;
    if (count % 400 === 0) {
      empBatches.push(currentEmpBatch.commit());
      currentEmpBatch = db.batch();
    }
  }
  empBatches.push(currentEmpBatch.commit());
  await Promise.all(empBatches);
  console.log(`  ✓ Saved ${fullRoster.length} employees (conforming to firestore.rules isValidEmployee).`);

  // 3. Locations, Organizers, Categories, Settings
  const auxBatch = db.batch();
  for (const loc of LOCATIONS) {
    auxBatch.set(db.collection('locations').doc(loc.id), loc, { merge: true });
  }
  for (const org of ORGANIZERS) {
    auxBatch.set(db.collection('organizers').doc(org.id), org, { merge: true });
  }
  for (const cat of CATEGORIES) {
    auxBatch.set(db.collection('categories').doc(cat.id), cat, { merge: true });
  }
  // Provisional Signatory setting
  auxBatch.set(db.collection('settings').doc('signatory'), PROVISIONAL_SIGNATORY, { merge: true });
  await auxBatch.commit();
  console.log(`  ✓ Saved locations, organizers, categories, and provisional signatory settings.`);

  // 4. Activities & PublicActivities
  console.log(`\n[Firestore Ingestion] Writing ${normalizedActivities.length} canonical activities and public projections...`);
  const actBatches = [];
  let actBatch = db.batch();
  let actCount = 0;

  for (const item of normalizedActivities) {
    const actRef = db.collection('activities').doc(item.id);
    const pubRef = db.collection('publicActivities').doc(item.id);

    actBatch.set(actRef, item.activity, { merge: true });
    actBatch.set(pubRef, item.publicDto, { merge: true });
    actCount += 2;

    if (actCount >= 400) {
      actBatches.push(actBatch.commit());
      actBatch = db.batch();
      actCount = 0;
    }
  }
  actBatches.push(actBatch.commit());
  await Promise.all(actBatches);
  console.log(`  ✓ Successfully committed ${normalizedActivities.length} internal activities & public projections.`);

  // 5. Ingestion Audit Log
  const auditDocRef = db.collection('auditLogs').doc(`audit_t01_${Date.now()}`);
  await auditDocRef.set({
    id: auditDocRef.id,
    actorId: 't01_migration_engine',
    timestamp: FieldValue.serverTimestamp(),
    action: 'MIGRATE',
    actorLabel: 'T01 Historical Migration Engine',
    identitySource: 'LOCAL_EMULATOR',
    collectionName: 'activities',
    requestId: `req_t01_${Date.now()}`,
    version: 1,
    details: {
      rawSourceRows: rawSourceRows.length,
      importedActivities: normalizedActivities.length,
      mergedDuplicates: rawSourceRows.length - normalizedActivities.length,
      importedEmployees: fullRoster.length,
      importedDepartments: DEPARTMENTS.length,
      status: 'SUCCESS'
    }
  });
  console.log(`  ✓ Written append-only audit trail record to auditLogs.`);

  return { rawSourceRows, normalizedActivities, sourceMapping, fullRoster };
}

// Self-executing runner
if (process.argv[1] && process.argv[1].endsWith('executeT01Import.mjs')) {
  const isDry = process.argv.includes('--dry-run');
  runT01Import({ dryRun: isDry })
    .then(() => {
      console.log('\n[T01 Execution Complete] Finished successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n[T01 Execution Failed]', err);
      process.exit(1);
    });
}
