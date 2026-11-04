import { describe, it, expect } from 'vitest';
import {
  parseWibDate,
  formatWibDate,
  addDaysToWibDate,
  wibDateTimeToUtcInstant,
  getExclusiveInterval,
  intervalsOverlap,
  intersectsRange,
  getIntersectingDates,
  formatIndonesianDate,
  formatIndonesianDateSpan,
  formatTimeDisplay,
  formatAnnouncementDate
} from '../../shared/src/scheduling/timeUtils';

describe('Time Engine & Scheduling Utilities (Asia/Jakarta - WIB)', () => {
  describe('WIB Date Parsing & Math (Independent of Browser Timezone)', () => {
    it('parses YYYY-MM-DD string into calendar components without timezone shift', () => {
      const parsed = parseWibDate('2026-10-01');
      expect(parsed).toEqual({ year: 2026, month: 10, day: 1 });
    });

    it('formats calendar components back to ISO YYYY-MM-DD', () => {
      const str = formatWibDate({ year: 2026, month: 10, day: 1 });
      expect(str).toBe('2026-10-01');
    });

    it('handles month and year boundaries correctly with addDaysToWibDate', () => {
      expect(addDaysToWibDate('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDaysToWibDate('2027-01-01', -1)).toBe('2026-12-31');
    });

    it('correctly handles leap years vs non-leap years', () => {
      // 2028 is a leap year (divisible by 4)
      expect(addDaysToWibDate('2028-02-28', 1)).toBe('2028-02-29');
      expect(addDaysToWibDate('2028-02-29', 1)).toBe('2028-03-01');

      // 2026 is not a leap year
      expect(addDaysToWibDate('2026-02-28', 1)).toBe('2026-03-01');
    });
  });

  describe('Guidebook Fixture Tests', () => {
    it('matches UTC instant for 2026-10-01, 07:00 WIB (00:00Z)', () => {
      // 07:00 WIB is exactly 00:00 UTC (UTC+7)
      const instant = wibDateTimeToUtcInstant('2026-10-01', '07:00');
      const expectedUtc = new Date('2026-10-01T00:00:00.000Z').getTime();
      expect(instant).toBe(expectedUtc);
    });

    it('evaluates adjacent intervals: 09:00-10:00 vs 10:00-11:00 as NO intersection', () => {
      const intervalA = getExclusiveInterval('2026-10-01', '09:00', '2026-10-01', '10:00', false);
      const intervalB = getExclusiveInterval('2026-10-01', '10:00', '2026-10-01', '11:00', false);

      expect(intervalsOverlap(intervalA, intervalB)).toBe(false);
    });

    it('evaluates overlapping intervals: 09:00-10:00 vs 09:30-11:00 as 30-minute intersection', () => {
      const intervalA = getExclusiveInterval('2026-10-01', '09:00', '2026-10-01', '10:00', false);
      const intervalB = getExclusiveInterval('2026-10-01', '09:30', '2026-10-01', '11:00', false);

      expect(intervalsOverlap(intervalA, intervalB)).toBe(true);
      // Intersection duration is from 09:30 to 10:00 = 30 minutes = 1,800,000 ms
      const overlapStart = Math.max(intervalA.startMs, intervalB.startMs);
      const overlapEnd = Math.min(intervalA.endMs, intervalB.endMs);
      expect(overlapEnd - overlapStart).toBe(30 * 60 * 1000);
    });

    it('sets warning boundary = 04 Nov 00:00 WIB exclusive for 09:00 s.d. selesai on 03 Nov', () => {
      const interval = getExclusiveInterval('2026-11-03', '09:00', '2026-11-03', null, true);

      // Start: 2026-11-03 09:00 WIB = 2026-11-03 02:00:00 UTC
      expect(interval.startMs).toBe(new Date('2026-11-03T02:00:00.000Z').getTime());

      // End: Start of day 2026-11-04 00:00 WIB = 2026-11-03 17:00:00 UTC
      const expectedExclusiveEnd = new Date('2026-11-03T17:00:00.000Z').getTime();
      expect(interval.endMs).toBe(expectedExclusiveEnd);
    });

    it('multi-day Oct 1-3 is visible on all three calendar dates and yields discrete days', () => {
      const dates = getIntersectingDates('2026-10-01', '2026-10-03');
      expect(dates).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
      expect(dates.length).toBe(3);
    });
  });

  describe('Range Intersection Condition: startDate <= visibleEnd && endDate >= visibleStart', () => {
    const octoberStart = '2026-10-01';
    const octoberEnd = '2026-10-31';

    it('includes long-running multi-month events starting before and ending after the window', () => {
      // Event runs from August 15 to November 30
      expect(intersectsRange('2026-08-15', '2026-11-30', octoberStart, octoberEnd)).toBe(true);
    });

    it('includes events starting months before and ending mid-October', () => {
      expect(intersectsRange('2026-07-01', '2026-10-15', octoberStart, octoberEnd)).toBe(true);
    });

    it('includes events starting mid-October and ending in December', () => {
      expect(intersectsRange('2026-10-20', '2026-12-05', octoberStart, octoberEnd)).toBe(true);
    });

    it('includes events strictly contained within October', () => {
      expect(intersectsRange('2026-10-05', '2026-10-10', octoberStart, octoberEnd)).toBe(true);
    });

    it('excludes past events ending before visibleStart', () => {
      expect(intersectsRange('2026-08-01', '2026-09-30', octoberStart, octoberEnd)).toBe(false);
    });

    it('excludes future events starting after visibleEnd', () => {
      expect(intersectsRange('2026-11-01', '2026-11-30', octoberStart, octoberEnd)).toBe(false);
    });
  });

  describe('Indonesian Formatting Display Rules', () => {
    it('formats single date to Indonesian full date format', () => {
      // 2026-10-01 is a Thursday (Kamis)
      expect(formatIndonesianDate('2026-10-01')).toBe('Kamis, 1 Oktober 2026');
      // 2026-11-03 is a Tuesday (Selasa)
      expect(formatIndonesianDate('2026-11-03')).toBe('Selasa, 3 November 2026');
    });

    it('formats same-month date spans using em-dash and Indonesian months', () => {
      expect(formatIndonesianDateSpan('2026-10-01', '2026-10-03')).toBe('Kamis–Sabtu, 1–3 Oktober 2026');
    });

    it('formats cross-month date spans properly', () => {
      // 2026-10-30 (Jumat) to 2026-11-02 (Senin)
      expect(formatIndonesianDateSpan('2026-10-30', '2026-11-02')).toBe('Jumat–Senin, 30 Oktober – 2 November 2026');
    });

    it('formats time display for open-ended vs bounded schedules', () => {
      expect(formatTimeDisplay('07:00', null, true)).toBe('07.00 WIB s.d. selesai');
      expect(formatTimeDisplay('09:00', '11:00', false)).toBe('09.00 - 11.00 WIB');
    });
  });

  describe('Announcement Date Formatter (Robustness & Firestore Timestamp Support)', () => {
    it('formats valid ISO string into Indonesian WIB date', () => {
      // 08:00 UTC on 2026-11-04 is 15:00 WIB on 2026-11-04
      expect(formatAnnouncementDate('2026-11-04T08:00:00.000Z')).toBe('4 November 2026 WIB');
      expect(formatAnnouncementDate('2026-10-15T09:30:00.000Z')).toBe('15 Oktober 2026 WIB');
    });

    it('formats YYYY-MM-DD date strings safely', () => {
      expect(formatAnnouncementDate('2026-11-04')).toBe('4 November 2026 WIB');
      expect(formatAnnouncementDate('2026-05-17')).toBe('17 Mei 2026 WIB');
    });

    it('handles Firestore Timestamp object with .toDate() method', () => {
      const mockTimestamp = {
        toDate: () => new Date('2026-11-04T08:00:00.000Z')
      };
      expect(formatAnnouncementDate(mockTimestamp)).toBe('4 November 2026 WIB');
    });

    it('handles Firestore Timestamp object with seconds and nanoseconds', () => {
      const mockTimestamp = {
        seconds: 1793779200, // 2026-11-04T08:00:00Z
        nanoseconds: 0
      };
      expect(formatAnnouncementDate(mockTimestamp)).toBe('4 November 2026 WIB');
    });

    it('handles Firestore Timestamp object with _seconds and _nanoseconds', () => {
      const mockTimestamp = {
        _seconds: 1793779200,
        _nanoseconds: 0
      };
      expect(formatAnnouncementDate(mockTimestamp)).toBe('4 November 2026 WIB');
    });

    it('handles native JavaScript Date instances', () => {
      const date = new Date('2026-11-04T08:00:00.000Z');
      expect(formatAnnouncementDate(date)).toBe('4 November 2026 WIB');
    });

    it('handles missing or falsy date inputs cleanly without producing "Invalid Date WIB"', () => {
      expect(formatAnnouncementDate(null)).toBe('-');
      expect(formatAnnouncementDate(undefined)).toBe('-');
      expect(formatAnnouncementDate('')).toBe('-');
      expect(formatAnnouncementDate('   ')).toBe('-');
      expect(formatAnnouncementDate(null, 'Tanggal tidak tersedia')).toBe('Tanggal tidak tersedia');
    });

    it('handles invalid strings and malformed objects without producing "Invalid Date WIB"', () => {
      expect(formatAnnouncementDate('Invalid Date')).toBe('-');
      expect(formatAnnouncementDate('not-a-real-date')).toBe('-');
      expect(formatAnnouncementDate({})).toBe('-');
      expect(formatAnnouncementDate(NaN)).toBe('-');
      expect(formatAnnouncementDate(new Date('invalid-date-string'))).toBe('-');
    });
  });
});
