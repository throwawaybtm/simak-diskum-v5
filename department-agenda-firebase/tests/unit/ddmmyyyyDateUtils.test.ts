/**
 * Unit Tests for Strict DD/MM/YYYY Date Utilities (S03-PUB-04, S03-CAL-01, S03-ADM-13)
 */

import { describe, it, expect } from 'vitest';
import {
  formatDdmmyyyy,
  parseDdmmyyyy,
  isValidDdmmyyyy,
  isLeapYear,
  getDaysInMonth,
  validateDateRange
} from '../../shared/src/scheduling/timeUtils';

describe('Strict DD/MM/YYYY Date Utilities', () => {
  describe('formatDdmmyyyy()', () => {
    it('converts canonical ISO YYYY-MM-DD into zero-padded dd/mm/yyyy', () => {
      expect(formatDdmmyyyy('2026-10-30')).toBe('30/10/2026');
      expect(formatDdmmyyyy('2026-10-01')).toBe('01/10/2026');
      expect(formatDdmmyyyy('2026-05-04')).toBe('04/05/2026');
      expect(formatDdmmyyyy('2024-02-29')).toBe('29/02/2024');
    });

    it('returns empty string or trimmed string for invalid inputs', () => {
      expect(formatDdmmyyyy('')).toBe('');
      expect(formatDdmmyyyy(null as any)).toBe('');
      expect(formatDdmmyyyy('invalid-date')).toBe('invalid-date');
    });
  });

  describe('parseDdmmyyyy() and isValidDdmmyyyy()', () => {
    it('parses valid dd/mm/yyyy into canonical YYYY-MM-DD', () => {
      expect(parseDdmmyyyy('30/10/2026')).toBe('2026-10-30');
      expect(parseDdmmyyyy('01/10/2026')).toBe('2026-10-01');
      expect(parseDdmmyyyy('1/10/2026')).toBe('2026-10-01');
      expect(parseDdmmyyyy('06/11/2026')).toBe('2026-11-06');
      expect(parseDdmmyyyy('31/12/2026')).toBe('2026-12-31');
    });

    it('supports dash delimiter as well', () => {
      expect(parseDdmmyyyy('30-10-2026')).toBe('2026-10-30');
      expect(parseDdmmyyyy('01-10-2026')).toBe('2026-10-01');
    });

    it('rejects impossible dates strictly (e.g. 31/02/2026)', () => {
      expect(parseDdmmyyyy('31/02/2026')).toBeNull();
      expect(isValidDdmmyyyy('31/02/2026')).toBe(false);

      expect(parseDdmmyyyy('30/02/2026')).toBeNull();
      expect(isValidDdmmyyyy('30/02/2026')).toBe(false);

      expect(parseDdmmyyyy('31/04/2026')).toBeNull(); // April only has 30 days
      expect(isValidDdmmyyyy('31/04/2026')).toBe(false);

      expect(parseDdmmyyyy('31/06/2026')).toBeNull(); // June only has 30 days
      expect(isValidDdmmyyyy('31/06/2026')).toBe(false);

      expect(parseDdmmyyyy('31/09/2026')).toBeNull(); // September only has 30 days
      expect(isValidDdmmyyyy('31/09/2026')).toBe(false);

      expect(parseDdmmyyyy('31/11/2026')).toBeNull(); // November only has 30 days
      expect(isValidDdmmyyyy('31/11/2026')).toBe(false);
    });

    it('correctly handles leap years for February 29', () => {
      // 2024 is a leap year
      expect(isLeapYear(2024)).toBe(true);
      expect(getDaysInMonth(2024, 2)).toBe(29);
      expect(parseDdmmyyyy('29/02/2024')).toBe('2024-02-29');
      expect(isValidDdmmyyyy('29/02/2024')).toBe(true);

      // 2026 is NOT a leap year
      expect(isLeapYear(2026)).toBe(false);
      expect(getDaysInMonth(2026, 2)).toBe(28);
      expect(parseDdmmyyyy('29/02/2026')).toBeNull();
      expect(isValidDdmmyyyy('29/02/2026')).toBe(false);

      // 2025 is NOT a leap year
      expect(parseDdmmyyyy('29/02/2025')).toBeNull();
      expect(isValidDdmmyyyy('29/02/2025')).toBe(false);
    });

    it('rejects invalid months, days, years, and malformed strings', () => {
      expect(parseDdmmyyyy('00/10/2026')).toBeNull();
      expect(parseDdmmyyyy('32/10/2026')).toBeNull();
      expect(parseDdmmyyyy('15/00/2026')).toBeNull();
      expect(parseDdmmyyyy('15/13/2026')).toBeNull();
      expect(parseDdmmyyyy('15/10/1899')).toBeNull(); // year bounds
      expect(parseDdmmyyyy('15/10/2101')).toBeNull(); // year bounds
      expect(parseDdmmyyyy('abc/def/ghij')).toBeNull();
      expect(parseDdmmyyyy('30/10')).toBeNull();
      expect(parseDdmmyyyy('30/10/26')).toBeNull(); // must be 4-digit year
      expect(parseDdmmyyyy('')).toBeNull();
    });
  });

  describe('validateDateRange()', () => {
    it('accepts valid date ranges (startDate <= endDate)', () => {
      expect(validateDateRange('2026-10-01', '2026-10-31')).toEqual({ valid: true });
      expect(validateDateRange('2026-10-30', '2026-10-30')).toEqual({ valid: true }); // same day
      expect(validateDateRange('2026-10-31', '2026-11-01')).toEqual({ valid: true });
    });

    it('rejects inverted date ranges (startDate > endDate)', () => {
      const res = validateDateRange('2026-11-05', '2026-10-01');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
    });

    it('rejects missing dates', () => {
      expect(validateDateRange('', '2026-10-31').valid).toBe(false);
      expect(validateDateRange('2026-10-01', '').valid).toBe(false);
    });
  });
});
