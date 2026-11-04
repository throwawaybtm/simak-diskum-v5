/**
 * Pure TypeScript WIB Date/Time and Scheduling Utilities
 * Operates strictly in Asia/Jakarta (WIB = UTC+7)
 * Zero external runtime or Firebase dependencies.
 */

export const WIB_OFFSET_HOURS = 7;
export const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 60 * 60 * 1000;

export const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
] as const;

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
] as const;

export interface CalendarComponents {
  year: number;
  month: number;
  day: number;
}

export interface TimeInterval {
  startMs: number;
  endMs: number;
}

/**
 * Parses YYYY-MM-DD into integer calendar components
 * Avoids browser timezone interpretation
 */
export function parseWibDate(dateStr: string): CalendarComponents {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format, expected YYYY-MM-DD: ${dateStr}`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Non-numeric date components in: ${dateStr}`);
  }

  return { year, month, day };
}

/**
 * Formats calendar components into YYYY-MM-DD string
 */
export function formatWibDate(comp: CalendarComponents): string {
  const y = String(comp.year).padStart(4, '0');
  const m = String(comp.month).padStart(2, '0');
  const d = String(comp.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string
 * Uses UTC epoch date arithmetic to completely eliminate timezone and DST drift
 */
export function addDaysToWibDate(dateStr: string, days: number): string {
  const { year, month, day } = parseWibDate(dateStr);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  return formatWibDate({
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate()
  });
}

/**
 * Converts a WIB calendar date (YYYY-MM-DD) and time (HH:mm) into a UTC millisecond timestamp
 * WIB is UTC+7, so UTC hour = WIB hour - 7
 */
export function wibDateTimeToUtcInstant(dateStr: string, timeStr: string): number {
  const { year, month, day } = parseWibDate(dateStr);
  const [hourStr, minStr] = timeStr.split(':');
  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format, expected HH:mm: ${timeStr}`);
  }

  // Calculate UTC millisecond instant directly:
  // Date.UTC(year, monthIndex, day, hour, min, sec, ms) - 7 hours in ms
  return Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - WIB_OFFSET_MS;
}

/**
 * Calculates the exact half-open [start, end) interval in UTC milliseconds
 * If openEnded is true, exclusive end is 00:00:00 WIB on (endDate + 1)
 */
export function getExclusiveInterval(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string | null,
  openEnded: boolean
): TimeInterval {
  const startMs = wibDateTimeToUtcInstant(startDate, startTime);

  let endMs: number;
  if (openEnded || !endTime) {
    const nextDay = addDaysToWibDate(endDate, 1);
    endMs = wibDateTimeToUtcInstant(nextDay, '00:00');
  } else {
    endMs = wibDateTimeToUtcInstant(endDate, endTime);
  }

  return { startMs, endMs };
}

/**
 * Half-open interval intersection: [a.start, a.end) overlaps [b.start, b.end)
 * Returns true if and only if: a.start < b.end && b.start < a.end
 * Adjacent intervals (e.g. 09:00-10:00 and 10:00-11:00) return FALSE.
 */
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/**
 * Fundamental range intersection condition:
 * Checks if interval [startA, endA] intersects [startB, endB] at calendar date granularity
 * Used for calendar month/range queries: startDate <= visibleEnd && endDate >= visibleStart
 */
export function intersectsRange(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA <= endB && endA >= startB;
}

/**
 * Enumerates all discrete dates between startDate and endDate inclusive
 */
export function getIntersectingDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDaysToWibDate(current, 1);
  }

  return dates;
}

/**
 * Calculates day of the week in WIB (0 = Minggu, 1 = Senin, ..., 6 = Sabtu)
 */
export function getWibDayOfWeek(dateStr: string): number {
  const { year, month, day } = parseWibDate(dateStr);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

/**
 * Formats a single date into Indonesian standard format
 * e.g. "Kamis, 1 Oktober 2026"
 */
export function formatIndonesianDate(dateStr: string): string {
  const { year, month, day } = parseWibDate(dateStr);
  const dayOfWeek = getWibDayOfWeek(dateStr);
  const dayName = INDONESIAN_DAYS[dayOfWeek];
  const monthName = INDONESIAN_MONTHS[month - 1];

  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Formats a multi-day span into Indonesian date range format
 * Same month: "Kamis–Sabtu, 1–3 Oktober 2026"
 * Different month: "Jumat–Senin, 30 Oktober – 2 November 2026"
 * Different year: "Rabu–Sabtu, 30 Desember 2026 – 2 Januari 2027"
 */
export function formatIndonesianDateSpan(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatIndonesianDate(startDate);
  }

  const start = parseWibDate(startDate);
  const end = parseWibDate(endDate);

  const startDayName = INDONESIAN_DAYS[getWibDayOfWeek(startDate)];
  const endDayName = INDONESIAN_DAYS[getWibDayOfWeek(endDate)];
  const startMonthName = INDONESIAN_MONTHS[start.month - 1];
  const endMonthName = INDONESIAN_MONTHS[end.month - 1];

  if (start.year === end.year) {
    if (start.month === end.month) {
      // e.g. "Kamis–Sabtu, 1–3 Oktober 2026"
      return `${startDayName}–${endDayName}, ${start.day}–${end.day} ${startMonthName} ${start.year}`;
    }
    // e.g. "Jumat–Senin, 30 Oktober – 2 November 2026"
    return `${startDayName}–${endDayName}, ${start.day} ${startMonthName} – ${end.day} ${endMonthName} ${start.year}`;
  }

  // Different year
  return `${startDayName}–${endDayName}, ${start.day} ${startMonthName} ${start.year} – ${end.day} ${endMonthName} ${end.year}`;
}

/**
 * Formats month and year into Indonesian standard format
 * e.g. "Oktober 2026"
 */
export function formatIndonesianMonthYear(year: number, month: number): string {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}, must be between 1 and 12`);
  }
  return `${INDONESIAN_MONTHS[month - 1]} ${year}`;
}

/**
 * Formats time display for Indonesian government layout
 * e.g. "07.00 WIB s.d. selesai" or "09.00 - 11.00 WIB"
 */
export function formatTimeDisplay(
  startTime: string,
  endTime: string | null,
  openEnded: boolean
): string {
  const formatTimeToken = (t: string) => t.replace(':', '.');
  const startFmt = formatTimeToken(startTime);

  if (openEnded || !endTime) {
    return `${startFmt} WIB s.d. selesai`;
  }

  const endFmt = formatTimeToken(endTime);
  return `${startFmt} - ${endFmt} WIB`;
}

/**
 * Robustly formats an announcement date into Indonesian WIB display format
 * (e.g. "4 November 2026 WIB").
 * Safely handles Firestore Timestamp objects, ISO strings, YYYY-MM-DD,
 * Date instances, empty/null values, and invalid inputs without ever producing
 * "Invalid Date WIB".
 */
export function formatAnnouncementDate(
  dateInput: unknown,
  fallback: string = '-'
): string {
  if (dateInput === null || dateInput === undefined) {
    return fallback;
  }

  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  let dateMs: number | null = null;

  if (typeof dateInput === 'object') {
    const obj = dateInput as Record<string, unknown>;
    if (typeof obj.toDate === 'function') {
      try {
        const d = (obj.toDate as () => unknown)();
        if (d instanceof Date && !isNaN(d.getTime())) {
          dateMs = d.getTime();
        }
      } catch {
        return fallback;
      }
    } else if (typeof obj.seconds === 'number' && !isNaN(obj.seconds)) {
      dateMs = obj.seconds * 1000;
    } else if (typeof obj._seconds === 'number' && !isNaN(obj._seconds)) {
      dateMs = obj._seconds * 1000;
    } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      dateMs = dateInput.getTime();
    }
  } else if (typeof dateInput === 'number' && !isNaN(dateInput)) {
    dateMs = dateInput > 1e11 ? dateInput : dateInput * 1000;
  } else if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed || trimmed.toLowerCase() === 'invalid date') {
      return fallback;
    }
    // Check for standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      try {
        const { year, month, day } = parseWibDate(trimmed);
        const monthName = INDONESIAN_MONTHS[month - 1];
        return `${day} ${monthName} ${year} WIB`;
      } catch {
        return fallback;
      }
    }
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      dateMs = parsed;
    }
  }

  if (dateMs === null || isNaN(dateMs)) {
    return fallback;
  }

  // Convert UTC timestamp to WIB calendar date
  const wibDate = new Date(dateMs + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const month = wibDate.getUTCMonth(); // 0-indexed
  const day = wibDate.getUTCDate();
  const monthName = INDONESIAN_MONTHS[month];

  return `${day} ${monthName} ${year} WIB`;
}
