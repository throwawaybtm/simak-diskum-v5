import { describe, it, expect } from 'vitest';
import { scanForCredentials, sanitizePublicText } from '../../shared/src/validation/privacyScanner';

describe('Privacy Scanner & Credential Detector', () => {
  it('detects Zoom meeting links and passcodes in text', () => {
    const text = 'Rapat daring via https://us02web.zoom.us/j/8500005418?pwd=secretPassword123 dengan Passcode: batam2026';
    const result = scanForCredentials(text);

    expect(result.hasViolations).toBe(true);
    expect(result.violations.some(v => v.includes('Zoom'))).toBe(true);
    expect(result.violations.some(v => v.includes('Passcode'))).toBe(true);
  });

  it('detects Microsoft Teams and Google Meet URLs', () => {
    const textTeams = 'Silakan bergabung di https://teams.microsoft.com/l/meetup-join/19%3ameeting';
    const textMeet = 'Link meet: https://meet.google.com/abc-defg-hij';

    expect(scanForCredentials(textTeams).hasViolations).toBe(true);
    expect(scanForCredentials(textMeet).hasViolations).toBe(true);
  });

  it('detects explicit password, passcode, and PIN patterns', () => {
    const textPass = 'Password: RahasiaDinas123 PIN: 9876';
    const result = scanForCredentials(textPass);

    expect(result.hasViolations).toBe(true);
    expect(result.violations.some(v => v.includes('Password'))).toBe(true);
    expect(result.violations.some(v => v.includes('PIN'))).toBe(true);
  });

  it('passes completely clean public notes (e.g. attire, general notice)', () => {
    const text = 'Pakaian: Batik Lengan Panjang. Membawa laptop dan laporan evaluasi triwulan.';
    const result = scanForCredentials(text);

    expect(result.hasViolations).toBe(false);
    expect(result.violations).toHaveLength(0);
  });

  it('redacts meeting URLs and passcodes when sanitized for defense-in-depth', () => {
    const text = 'Rapat di https://meet.google.com/xyz-uvwx-rst dengan PIN: 12345';
    const sanitized = sanitizePublicText(text);

    expect(sanitized).not.toContain('https://meet.google.com');
    expect(sanitized).not.toContain('12345');
    expect(sanitized).toContain('[TAUTAN DIHAPUS]');
    expect(sanitized).toContain('[KREDENSIAL DIHAPUS]');
  });
});
