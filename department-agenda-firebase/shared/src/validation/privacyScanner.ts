/**
 * Pure TypeScript Privacy Scanner & Credential Detector
 * 
 * DISCLAIMER:
 * Client-side regex scanning and text redaction are defense-in-depth safety rails,
 * NOT a cryptographic or complete confidentiality guarantee. Operators must review
 * all public notices prior to publication.
 */

export interface PrivacyScanResult {
  hasViolations: boolean;
  violations: string[];
}

const MEETING_URL_REGEX = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com)\/[^\s]+/gi;
const PASSWORD_REGEX = /(?:password|passcode|kata\s*sandi|pwd)\s*[:=]\s*[^\s,;]+/gi;
const PIN_REGEX = /\b(?:pin)\s*[:=]\s*\d{3,8}\b/gi;
const MEETING_ID_REGEX = /\b(?:meeting\s*id|id\s*rapat)\s*[:=]\s*[\d\s-]{6,16}\b/gi;
const EMPLOYEE_ID_REGEX = /\bemp_[a-zA-Z0-9_-]+\b/gi;

/**
 * Scans public text for sensitive meeting URLs, passcodes, and credentials
 */
export function scanForCredentials(text: string): PrivacyScanResult {
  if (!text || typeof text !== 'string') {
    return { hasViolations: false, violations: [] };
  }

  const violations: string[] = [];

  // 1. Meeting URLs
  const urlMatches = text.match(MEETING_URL_REGEX);
  if (urlMatches && urlMatches.length > 0) {
    const isZoom = /zoom\.us/i.test(text);
    const isTeams = /teams\.microsoft/i.test(text);
    const isMeet = /meet\.google/i.test(text);
    const providers = [isZoom && 'Zoom', isTeams && 'Teams', isMeet && 'Google Meet'].filter(Boolean).join(', ');
    violations.push(`Terdeteksi tautan rapat online ${providers ? `(${providers})` : ''}: Tautan tidak boleh dicantumkan pada catatan publik.`);
  }

  // 2. Passwords / Passcodes
  const passMatches = text.match(PASSWORD_REGEX);
  if (passMatches && passMatches.length > 0) {
    violations.push(`Terdeteksi Password / Passcode / Kata Sandi: Kredensial tidak boleh dicantumkan pada catatan publik.`);
  }

  // 3. PINs
  const pinMatches = text.match(PIN_REGEX);
  if (pinMatches && pinMatches.length > 0) {
    violations.push(`Terdeteksi PIN rapat / akses.`);
  }

  // 4. Meeting IDs
  const meetingIdMatches = text.match(MEETING_ID_REGEX);
  if (meetingIdMatches && meetingIdMatches.length > 0) {
    violations.push(`Terdeteksi Meeting ID.`);
  }

  // 5. Raw Employee Database IDs
  const empIdMatches = text.match(EMPLOYEE_ID_REGEX);
  if (empIdMatches && empIdMatches.length > 0) {
    violations.push(`Terdeteksi ID internal pegawai (${empIdMatches.join(', ')}).`);
  }

  return {
    hasViolations: violations.length > 0,
    violations
  };
}

/**
 * Redacts detected URLs and credential patterns from text as secondary defense
 */
export function sanitizePublicText(text: string): string {
  if (!text) return '';

  return text
    .replace(MEETING_URL_REGEX, '[TAUTAN DIHAPUS]')
    .replace(PASSWORD_REGEX, '[KREDENSIAL DIHAPUS]')
    .replace(PIN_REGEX, '[KREDENSIAL DIHAPUS]')
    .replace(MEETING_ID_REGEX, '[ID DIHAPUS]');
}
