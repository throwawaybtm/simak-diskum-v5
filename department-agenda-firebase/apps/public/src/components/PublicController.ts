/**
 * Public Controller & Calendar Engine
 * Pure TypeScript functions for filtering, grouping, and calendar boundary calculation.
 */

import type { PublicActivityDTO } from '@department-agenda/shared';

export interface PublicActivityFilterOptions {
  keyword?: string;
  category?: string;
  status?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

/**
 * Filter public activities by keyword, category, status, and intersecting date range
 */
export function filterPublicActivities(
  activities: PublicActivityDTO[],
  options: PublicActivityFilterOptions = {}
): PublicActivityDTO[] {
  const kw = options.keyword?.trim().toLowerCase();
  const cat = options.category?.trim().toLowerCase();
  const status = options.status?.trim().toUpperCase();

  return activities.filter(act => {
    // 1. Keyword search (title, location, organizer, category, notes, attendees)
    if (kw) {
      const matchTitle = act.title.toLowerCase().includes(kw);
      const matchLoc = act.locationName.toLowerCase().includes(kw);
      const matchOrg = act.organizerName.toLowerCase().includes(kw);
      const matchCat = act.categoryName.toLowerCase().includes(kw);
      const matchNotes = (act.publicNotes || '').toLowerCase().includes(kw);
      const matchAttendees = (act.attendeeLabels || []).some(label => label.toLowerCase().includes(kw));

      if (!matchTitle && !matchLoc && !matchOrg && !matchCat && !matchNotes && !matchAttendees) {
        return false;
      }
    }

    // 2. Category filter
    if (cat && cat !== 'semua' && cat !== 'all') {
      if (!act.categoryName.toLowerCase().includes(cat)) {
        return false;
      }
    }

    // 3. Status filter
    if (status && status !== 'ALL' && status !== 'SEMUA') {
      if (act.status !== status) {
        return false;
      }
    }

    // 4. Date range filter (intersection: act.startDate <= rangeEnd && act.endDate >= rangeStart)
    if (options.startDate && options.endDate) {
      if (act.startDate > options.endDate || act.endDate < options.startDate) {
        return false;
      }
    } else if (options.startDate) {
      if (act.endDate < options.startDate) {
        return false;
      }
    } else if (options.endDate) {
      if (act.startDate > options.endDate) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Map activities across intersecting dates in [rangeStart, rangeEnd]
 * Multi-day activities cleanly appear on each date they span without duplicate entries on the same day.
 */
export function groupActivitiesByDay(
  activities: PublicActivityDTO[],
  rangeStart: string,
  rangeEnd: string
): Map<string, PublicActivityDTO[]> {
  const map = new Map<string, PublicActivityDTO[]>();

  // Iterate day by day from rangeStart to rangeEnd
  let curr = new Date(rangeStart + 'T00:00:00Z');
  const end = new Date(rangeEnd + 'T00:00:00Z');

  while (curr <= end) {
    const yyyy = curr.getUTCFullYear();
    const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(curr.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const matching = activities.filter(act => act.startDate <= dateStr && act.endDate >= dateStr);
    map.set(dateStr, matching);

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return map;
}

/**
 * Calculates calendar grid bounds for a month in WIB (Monday-start)
 */
export function getVisibleMonthBounds(year: number, month: number): {
  monthStart: string;
  monthEnd: string;
  visibleStart: string;
  visibleEnd: string;
} {
  const mm = String(month).padStart(2, '0');
  const monthStart = `${year}-${mm}-01`;

  // Last day of month
  const lastDayDate = new Date(Date.UTC(year, month, 0));
  const lastDayStr = String(lastDayDate.getUTCDate()).padStart(2, '0');
  const monthEnd = `${year}-${mm}-${lastDayStr}`;

  // Start date day of week (0 is Sunday, 1 is Monday ... 6 is Saturday)
  const firstDate = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDate.getUTCDay(); // 0 (Sun) to 6 (Sat)
  // Monday start: if day is Sunday (0), distance is 6. If Monday (1), distance is 0.
  const distToMonday = (firstDayOfWeek + 6) % 7;
  const gridStartDate = new Date(Date.UTC(year, month - 1, 1 - distToMonday));

  const vsYyyy = gridStartDate.getUTCFullYear();
  const vsMm = String(gridStartDate.getUTCMonth() + 1).padStart(2, '0');
  const vsDd = String(gridStartDate.getUTCDate()).padStart(2, '0');
  const visibleStart = `${vsYyyy}-${vsMm}-${vsDd}`;

  // End date day of week
  const lastDate = new Date(Date.UTC(year, month - 1, lastDayDate.getUTCDate()));
  const lastDayOfWeek = lastDate.getUTCDay();
  // Monday start: distance to next Sunday
  const distToSunday = (7 - lastDayOfWeek) % 7;
  const gridEndDate = new Date(Date.UTC(year, month - 1, lastDayDate.getUTCDate() + distToSunday));

  const veYyyy = gridEndDate.getUTCFullYear();
  const veMm = String(gridEndDate.getUTCMonth() + 1).padStart(2, '0');
  const veDd = String(gridEndDate.getUTCDate()).padStart(2, '0');
  const visibleEnd = `${veYyyy}-${veMm}-${veDd}`;

  return {
    monthStart,
    monthEnd,
    visibleStart,
    visibleEnd
  };
}

/**
 * Calculates calendar week bounds (Monday to Sunday) for any target date
 */
export function getVisibleWeekBounds(targetDate: string): {
  weekStart: string;
  weekEnd: string;
} {
  const d = new Date(targetDate + 'T00:00:00Z');
  const dayOfWeek = d.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const distToMonday = (dayOfWeek + 6) % 7;

  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - distToMonday);

  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);

  const format = (date: Date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    weekStart: format(mon),
    weekEnd: format(sun)
  };
}
