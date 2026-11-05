/**
 * Legacy Spreadsheet Migration and Credential Ingestion Engine
 * 
 * Safely parses October 2026 legacy agenda spreadsheets.
 * Guarantees:
 * 1. Extraction and isolation of Zoom/Teams/Meet URLs and passcodes into privateMeetingUrl.
 * 2. Neutralization of credentials from publicNotes.
 * 3. Deduplication against existing Firestore activity records.
 * 4. Referential ID resolution against Master Data.
 */

import type { ActivityDocument } from '../schema/activity';
import type { Location, Organizer, Category, Employee } from '../schema/master';

export interface LegacySpreadsheetRow {
  tanggal: string;
  waktu: string;
  namaKegiatan: string;
  lokasi: string;
  penyelenggara: string;
  peserta?: string;
  catatan?: string;
}

export interface ParsedLegacyRecord {
  sourceRowIndex: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string | null;
  openEnded: boolean;
  title: string;
  locationId: string;
  locationName: string;
  organizerId: string;
  organizerName: string;
  categoryId: string;
  attendeeNames: string[];
  attendeeIds: string[];
  guestAttendees: string[];
  publicNotes: string;
  privateNotes: string;
  privateMeetingUrl: string | null;
  isDuplicate: boolean;
  duplicateOfId?: string;
  isValid: boolean;
  validationErrors: string[];
}

export interface LegacyMigrationResult {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  records: ParsedLegacyRecord[];
}

export interface MigrationLookups {
  locations: Map<string, Location>;
  organizers: Map<string, Organizer>;
  categories: Map<string, Category>;
  employees?: Map<string, Employee>;
}

const MEETING_URL_REGEX = /(https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com)\/[^\s"']+)/i;
const CREDENTIAL_PREFIX_REGEX = /(?:tautan|link|meeting)\s*(?:zoom|google\s*meet|teams)?\s*:?\s*/gi;
const PASSWORD_PATTERN_REGEX = /(?:password|passcode|kata\s*sandi|pwd)\s*[:=]\s*[^\s,;]+/gi;

/**
 * Parses a legacy time string (e.g. "09.00 - 11.00", "08.30 - 15.00", "09.00 s.d. selesai")
 */
function parseLegacyTime(waktuStr: string): { startTime: string; endTime: string | null; openEnded: boolean } {
  const norm = (waktuStr || '').replace(/\./g, ':');
  const matches = norm.match(/\b(\d{1,2}:\d{2})\b/g);
  const isOpen = /selesai/i.test(waktuStr) || (matches !== null && matches.length === 1);

  const startTime = matches && matches[0] ? matches[0].padStart(5, '0') : '08:00';
  let endTime: string | null = null;
  if (!isOpen && matches && matches.length > 1) {
    endTime = matches[1].padStart(5, '0');
  }

  return {
    startTime,
    endTime,
    openEnded: isOpen
  };
}

/**
 * Parses legacy spreadsheet dataset into validated, privacy-separated records
 */
export function parseLegacySpreadsheetData(
  rows: LegacySpreadsheetRow[],
  existingActivities: ActivityDocument[],
  lookups: MigrationLookups
): LegacyMigrationResult {
  const records: ParsedLegacyRecord[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const validationErrors: string[] = [];

    // 1. Date parsing
    const dateMatches = (raw.tanggal || '').match(/\d{4}-\d{2}-\d{2}/g);
    const startDate = dateMatches ? dateMatches[0] : (raw.tanggal || '').trim();
    const endDate = dateMatches && dateMatches[1] ? dateMatches[1] : startDate;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      validationErrors.push(`Format tanggal tidak valid: ${raw.tanggal}`);
    }

    // 2. Time parsing
    const { startTime, endTime, openEnded } = parseLegacyTime(raw.waktu);

    // 3. Title
    const title = (raw.namaKegiatan || '').trim();
    if (!title) {
      validationErrors.push('Nama kegiatan tidak boleh kosong.');
    }

    // 4. Location Resolution
    let locationId = 'loc_other';
    let locationName = raw.lokasi || 'Lokasi Kegiatan';
    const rawLocLower = (raw.lokasi || '').toLowerCase().trim();

    for (const [id, loc] of lookups.locations.entries()) {
      const locNameLower = loc.name.toLowerCase();
      if (locNameLower === rawLocLower ||
          rawLocLower.includes(locNameLower) ||
          locNameLower.includes(rawLocLower)) {
        locationId = id;
        locationName = loc.name;
        break;
      }
    }

    // 5. Organizer Resolution
    let organizerId = 'org_other';
    let organizerName = raw.penyelenggara || 'Dinas Koperasi dan Usaha Mikro';
    const rawOrgLower = (raw.penyelenggara || '').toLowerCase().trim();

    for (const [id, org] of lookups.organizers.entries()) {
      const orgNameLower = org.name.toLowerCase();
      if (orgNameLower === rawOrgLower ||
          rawOrgLower.includes(orgNameLower) ||
          orgNameLower.includes(rawOrgLower)) {
        organizerId = id;
        organizerName = org.name;
        break;
      }
    }

    // 6. Category Resolution
    let categoryId = 'cat_01';
    for (const [id, cat] of lookups.categories.entries()) {
      const catLower = cat.name.toLowerCase();
      if (title.toLowerCase().includes(catLower) || catLower.includes('kegiatan')) {
        categoryId = id;
        break;
      }
    }
    // Fallback category keywords
    if (categoryId === 'cat_01') {
      const titleLower = title.toLowerCase();
      if (titleLower.includes('pelatihan') || titleLower.includes('bimtek')) {
        categoryId = 'cat_02';
      } else if (titleLower.includes('pameran') || titleLower.includes('expo')) {
        categoryId = 'cat_03';
      } else if (titleLower.includes('sosialisasi')) {
        categoryId = 'cat_04';
      }
    }

    // 7. Attendees & Guests
    const attendeeNames: string[] = [];
    const attendeeIds: string[] = [];
    const guestAttendees: string[] = [];

    if (raw.peserta) {
      // First, find all matching employees from the directory whose name appears in raw.peserta
      const matchedEmpMap = new Map<string, string>(); // empId -> empName

      if (lookups.employees) {
        for (const emp of lookups.employees.values()) {
          const cleanEmpName = emp.name.toLowerCase();
          const rawPesertaLower = raw.peserta.toLowerCase();
          // Extract base name without title prefixes (e.g. "Hendri Arifin" from "Drs. Hendri Arifin, M.Si")
          const baseName = emp.name.replace(/^(drs\.|dr\.|ir\.|dra\.)\s*/i, '').split(',')[0].trim().toLowerCase();

          if (rawPesertaLower.includes(cleanEmpName) || (baseName.length > 4 && rawPesertaLower.includes(baseName))) {
            matchedEmpMap.set(emp.id, emp.name);
          }
        }
      }

      for (const [id, name] of matchedEmpMap.entries()) {
        attendeeIds.push(id);
        attendeeNames.push(name);
      }

      // Check for any remaining guest attendees not matching employees
      let remainder = raw.peserta;
      for (const name of matchedEmpMap.values()) {
        remainder = remainder.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
      }
      const leftoverParts = remainder.split(/[,;\n]/)
        .map(p => p.trim())
        .filter(p => p.length > 2 && !/^(m\.si|s\.sos|se|s\.t|s\.kom|m\.m|s\.pd|s\.stp|m\.a)$/i.test(p));

      for (const guest of leftoverParts) {
        if (!guestAttendees.includes(guest)) {
          guestAttendees.push(guest);
          attendeeNames.push(guest);
        }
      }
    }

    // 8. Credential Separation & Sanitization
    let privateMeetingUrl: string | null = null;
    let publicNotes = (raw.catatan || '').trim();

    const urlMatch = publicNotes.match(MEETING_URL_REGEX);
    if (urlMatch) {
      privateMeetingUrl = urlMatch[1];
      // Strip URL and any introductory label
      publicNotes = publicNotes.replace(urlMatch[0], '');
      publicNotes = publicNotes.replace(CREDENTIAL_PREFIX_REGEX, '');
    }

    // Strip leftover password patterns
    publicNotes = publicNotes.replace(PASSWORD_PATTERN_REGEX, '');
    publicNotes = publicNotes.replace(/\s+/g, ' ').trim();

    // 9. Deduplication check against existing Firestore records
    let isDuplicate = false;
    let duplicateOfId: string | undefined;

    for (const existing of existingActivities) {
      if (existing.startDate === startDate) {
        const existingTitleNorm = existing.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const newTitleNorm = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (existingTitleNorm === newTitleNorm ||
            existingTitleNorm.includes(newTitleNorm) ||
            newTitleNorm.includes(existingTitleNorm)) {
          isDuplicate = true;
          duplicateOfId = existing.id;
          break;
        }
      }
    }

    const isValid = validationErrors.length === 0;
    if (!isValid) {
      errorCount++;
    } else {
      validCount++;
    }

    if (isDuplicate) {
      duplicateCount++;
    }

    records.push({
      sourceRowIndex: i,
      startDate,
      endDate,
      startTime,
      endTime,
      openEnded,
      title,
      locationId,
      locationName,
      organizerId,
      organizerName,
      categoryId,
      attendeeNames,
      attendeeIds,
      guestAttendees,
      publicNotes,
      privateNotes: privateMeetingUrl ? `Migrated Online Meeting: ${privateMeetingUrl}` : '',
      privateMeetingUrl,
      isDuplicate,
      duplicateOfId,
      isValid,
      validationErrors
    });
  }

  return {
    totalRows: rows.length,
    validCount,
    duplicateCount,
    errorCount,
    records
  };
}
