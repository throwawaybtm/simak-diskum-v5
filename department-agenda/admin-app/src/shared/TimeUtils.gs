/**
 * shared/TimeUtils.js
 * Timezone (Asia/Jakarta WIB UTC+7), half-open interval math [start, end),
 * and official Indonesian date/time formatting.
 */

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const TimeUtils = {
  WIB_OFFSET_HOURS: 7,

  /**
   * Parse a local WIB date string (YYYY-MM-DD) and optional time (HH:mm or HH.mm)
   * into a UTC epoch millisecond timestamp.
   */
  parseWibDate(dateStr, timeStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    let hour = 0;
    let minute = 0;

    if (timeStr && typeof timeStr === 'string' && timeStr.trim().length > 0) {
      const normalized = timeStr.trim().replace('.', ':');
      const timeParts = normalized.split(':').map(Number);
      if (!isNaN(timeParts[0])) hour = timeParts[0];
      if (!isNaN(timeParts[1])) minute = timeParts[1];
    }

    // WIB is UTC+7 -> UTC hour is (hour - 7)
    return Date.UTC(year, month - 1, day, hour - TimeUtils.WIB_OFFSET_HOURS, minute, 0, 0);
  },

  /**
   * Construct a half-open [startMs, endMs) interval.
   * For open-ended events (untilFinished or endTime is null),
   * the exclusive boundary is 00:00 WIB on the day following end_date.
   */
  makeInterval(startDate, startTime, endDate, endTime, isUntilFinished) {
    const effectiveEndDate = endDate || startDate;
    const startMs = TimeUtils.parseWibDate(startDate, startTime || '00:00');

    let endMs;
    if (isUntilFinished || !endTime) {
      // 00:00 WIB on the day following effectiveEndDate
      const endParts = effectiveEndDate.split('-').map(Number);
      const nextDayUtc = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2] + 1));
      const nextYear = nextDayUtc.getUTCFullYear();
      const nextMonth = String(nextDayUtc.getUTCMonth() + 1).padStart(2, '0');
      const nextDay = String(nextDayUtc.getUTCDate()).padStart(2, '0');
      const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;
      endMs = TimeUtils.parseWibDate(nextDateStr, '00:00');
    } else {
      endMs = TimeUtils.parseWibDate(effectiveEndDate, endTime);
    }

    return [startMs, endMs];
  },

  /**
   * Check if two half-open intervals [startA, endA) and [startB, endB) intersect.
   * Adjacent intervals [9, 10) and [10, 11) do NOT intersect.
   */
  intervalsIntersect(intervalA, intervalB) {
    if (!intervalA || !intervalB) return false;
    return intervalA[0] < intervalB[1] && intervalB[0] < intervalA[1];
  },

  /**
   * Format YYYY-MM-DD into "Kamis, 1 Oktober 2026"
   */
  formatIndonesianDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const dayName = INDO_DAYS[d.getUTCDay()];
    const monthName = INDO_MONTHS[parts[1] - 1];
    return `${dayName}, ${parts[2]} ${monthName} ${parts[0]}`;
  },

  /**
   * Format multi-day range:
   * Same month: "Kamis - Sabtu, 1 - 3 Oktober 2026"
   * Different month: "Kamis, 29 Oktober - Minggu, 1 November 2026"
   */
  formatIndonesianDateRange(startDateStr, endDateStr) {
    if (!endDateStr || startDateStr === endDateStr) {
      return TimeUtils.formatIndonesianDate(startDateStr);
    }

    const startParts = startDateStr.split('-').map(Number);
    const endParts = endDateStr.split('-').map(Number);

    const startD = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
    const endD = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

    const startDayName = INDO_DAYS[startD.getUTCDay()];
    const endDayName = INDO_DAYS[endD.getUTCDay()];

    if (startParts[0] === endParts[0] && startParts[1] === endParts[1]) {
      const monthName = INDO_MONTHS[startParts[1] - 1];
      return `${startDayName} - ${endDayName}, ${startParts[2]} - ${endParts[2]} ${monthName} ${startParts[0]}`;
    }

    const startMonth = INDO_MONTHS[startParts[1] - 1];
    const endMonth = INDO_MONTHS[endParts[1] - 1];
    if (startParts[0] === endParts[0]) {
      return `${startDayName}, ${startParts[2]} ${startMonth} - ${endDayName}, ${endParts[2]} ${endMonth} ${startParts[0]}`;
    }

    return `${startDayName}, ${startParts[2]} ${startMonth} ${startParts[0]} - ${endDayName}, ${endParts[2]} ${endMonth} ${endParts[0]}`;
  },

  /**
   * Format time: "07.00 WIB s.d. selesai" or "09.00 - 11.00 WIB"
   */
  formatTimeRange(startTime, endTime) {
    const clean = t => (t ? t.replace(':', '.') : '');
    const s = clean(startTime);
    const e = clean(endTime);

    if (!s) return 's.d. selesai';
    if (!e) return `${s} WIB s.d. selesai`;
    return `${s} - ${e} WIB`;
  },

  /**
   * Returns today's date in WIB as YYYY-MM-DD
   */
  getTodayWib(now = new Date()) {
    const wibMs = now.getTime() + TimeUtils.WIB_OFFSET_HOURS * 3600000;
    const wibDate = new Date(wibMs);
    const y = wibDate.getUTCFullYear();
    const m = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(wibDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeUtils;
}
if (typeof globalThis !== 'undefined') {
  globalThis.TimeUtils = TimeUtils;
}
