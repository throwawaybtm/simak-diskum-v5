import { describe, it, expect } from 'vitest';
import {
  APPROVED_PUBLIC_FIELDS,
  REQUIRED_PUBLIC_FIELDS,
  validatePublicDocument,
  validatePublicPayload,
  inspectValueRecursively
} from '../../scripts/verifyS06bSecurityWire.mjs';

describe('Milestone S06-B R1: Public Schema Strict Allowlist & Deep Sanitization Tests', () => {
  // A clean synthetic fixture representing a valid publicActivities document
  const createValidDoc = (overrides = {}) => ({
    name: 'projects/simakdiskum-staging/databases/(default)/documents/publicActivities/act_syn_test_01',
    fields: {
      id: { stringValue: 'act_syn_test_01' },
      title: { stringValue: 'Bimbingan Teknis Penguatan Koperasi' },
      startDate: { stringValue: '2026-10-15' },
      startTime: { stringValue: '09:00' },
      endDate: { stringValue: '2026-10-15' },
      endTime: { stringValue: '12:00' },
      openEnded: { booleanValue: false },
      timeDisplay: { stringValue: '09:00 - 12:00 WIB' },
      dateDisplay: { stringValue: 'Kamis, 15 Oktober 2026' },
      status: { stringValue: 'SCHEDULED' },
      publicCancellationNotice: { stringValue: '' },
      locationName: { stringValue: 'Ruang Rapat Hang Nadim Lt. 2' },
      locationType: { stringValue: 'OFFICE' },
      organizerName: { stringValue: 'Bidang Pemberdayaan Usaha Mikro' },
      categoryName: { stringValue: 'Pelatihan / Bimtek' },
      publicNotes: { stringValue: 'Pakaian PDH hari Kamis.' },
      attendeeLabels: {
        arrayValue: {
          values: [
            { stringValue: 'Budi Simulasi, S.Sos (Kepala Dinas)' },
            { stringValue: 'Agus Demo, SE (Kasubbag Umum)' }
          ]
        }
      },
      updatedAt: { stringValue: '2026-10-01T08:00:00.000Z' },
      version: { integerValue: '1' },
      ...overrides
    }
  });

  it('1. Confirms the approved public schema contains exactly 19 fields', () => {
    expect(APPROVED_PUBLIC_FIELDS).toHaveLength(19);
    expect(REQUIRED_PUBLIC_FIELDS).toHaveLength(18); // publicCancellationNotice is optional
    expect(APPROVED_PUBLIC_FIELDS).toContain('publicCancellationNotice');
    expect(REQUIRED_PUBLIC_FIELDS).not.toContain('publicCancellationNotice');
  });

  it('2. Passes validation on a perfectly formed publicActivities document', () => {
    const doc = createValidDoc();
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.fieldCount).toBe(19);
  });

  it('3. Passes validation when optional publicCancellationNotice is omitted', () => {
    const doc = createValidDoc();
    delete doc.fields.publicCancellationNotice;
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.fieldCount).toBe(18);
  });

  it('4. Rejects unexpected top-level field injected into publicActivities document', () => {
    const doc = createValidDoc({
      unapprovedField: { stringValue: 'malicious injection' }
    });
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.violations.some(v => v.type === 'UNEXPECTED_TOP_LEVEL_FIELD' && v.field === 'unapprovedField')).toBe(true);
  });

  it('5. Rejects missing required top-level field (e.g. missing locationName)', () => {
    const doc = createValidDoc();
    delete doc.fields.locationName;
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.violations.some(v => v.type === 'MISSING_REQUIRED_FIELD' && v.field === 'locationName')).toBe(true);
  });

  it('6. Rejects injected confidential fields (privateNotes, privateMeetingUrl)', () => {
    const doc = createValidDoc({
      privateNotes: { stringValue: 'Internal secret notes for Kadis' },
      privateMeetingUrl: { stringValue: 'https://zoom.us/j/999?pwd=123' }
    });
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(false);
    const unapproved = result.violations.filter(v => v.type === 'UNEXPECTED_TOP_LEVEL_FIELD');
    expect(unapproved.map(v => v.field)).toEqual(expect.arrayContaining(['privateNotes', 'privateMeetingUrl']));
  });

  it('7. Rejects injected invitationLetter metadata object', () => {
    const doc = createValidDoc({
      invitationLetter: {
        mapValue: {
          fields: {
            letterNumber: { stringValue: '005/DISKUM/2026' },
            driveUrl: { stringValue: 'https://drive.google.com/file/d/secret123/view' }
          }
        }
      }
    });
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.violations.some(v => v.type === 'UNEXPECTED_TOP_LEVEL_FIELD' && v.field === 'invitationLetter')).toBe(true);
  });

  it('8. Detects suspicious string pattern: Zoom credential with pwd query parameter in publicNotes', () => {
    const doc = createValidDoc({
      publicNotes: { stringValue: 'Silakan bergabung ke https://zoom.us/j/123456789?pwd=ConfidentialPassword' }
    });
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.violations.some(v => v.type === 'SUSPICIOUS_STRING_CONTENT' && v.rule === 'Zoom credential URL')).toBe(true);
  });

  it('9. Detects suspicious string pattern: Raw employee foreign key in attendeeLabels', () => {
    const doc = createValidDoc({
      attendeeLabels: {
        arrayValue: {
          values: [
            { stringValue: 'emp_pns_20261001_01' } // Leaked raw ID instead of formatted label
          ]
        }
      }
    });
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.violations.some(v => v.type === 'SUSPICIOUS_STRING_CONTENT' && v.rule === 'Raw employee foreign key')).toBe(true);
  });

  it('10. Detects suspicious string pattern: Internal Google Drive link in publicNotes', () => {
    const doc = createValidDoc({
      publicNotes: { stringValue: 'Unduh bahan di https://drive.google.com/drive/folders/internalSecretFolder' }
    });
    const result = validatePublicDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.violations.some(v => v.type === 'SUSPICIOUS_STRING_CONTENT' && v.rule === 'Google Drive URL')).toBe(true);
  });

  it('11. Reconciles baseline count: fails when batch document count does not match expected baseline', () => {
    const batch = Array(37).fill(null).map((_, idx) => createValidDoc({ id: { stringValue: `act_${idx}` } }));
    const result = validatePublicPayload(batch, 38);
    expect(result.isValid).toBe(false);
    expect(result.isReconciled).toBe(false);
    expect(result.violations.some(v => v.type === 'BASELINE_COUNT_MISMATCH')).toBe(true);
  });

  it('12. Reconciles baseline count: passes when batch document count exactly matches expected baseline', () => {
    const batch = Array(38).fill(null).map((_, idx) => createValidDoc({ id: { stringValue: `act_${idx}` } }));
    const result = validatePublicPayload(batch, 38);
    expect(result.isValid).toBe(true);
    expect(result.isReconciled).toBe(true);
    expect(result.totalDocuments).toBe(38);
    expect(result.violationsCount).toBe(0);
  });
});
