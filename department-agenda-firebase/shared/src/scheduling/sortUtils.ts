/**
 * Shared Activity & Master Data Sorting Utilities
 * Pure TypeScript implementation with zero DOM/Firebase dependencies.
 * Guarantees immutability (does not mutate input arrays or objects).
 */

export type ActivitySortOption =
  | 'NEWEST'     // Start date & time descending (DEFAULT)
  | 'OLDEST'     // Start date & time ascending
  | 'TITLE_ASC'  // Alphabetical title A-Z
  | 'TITLE_DESC' // Alphabetical title Z-A
  | 'STATUS';    // Status hierarchy: SCHEDULED -> COMPLETED -> CANCELLED

export interface ActivitySortable {
  id: string;
  title: string;
  startDate: string;  // YYYY-MM-DD
  startTime?: string | null; // HH:mm
  endDate?: string;
  endTime?: string | null;
  status?: string;
}

const STATUS_PRIORITY: Record<string, number> = {
  SCHEDULED: 1,
  COMPLETED: 2,
  CANCELLED: 3
};

/**
 * Sorts activities according to the specified ActivitySortOption.
 * Returns a new array; never mutates the original array or elements.
 *
 * Primary comparison:
 * - NEWEST: startDate desc, startTime desc, id asc
 * - OLDEST: startDate asc, startTime asc, id asc
 * - TITLE_ASC: title asc (Indonesian locale), startDate desc, id asc
 * - TITLE_DESC: title desc (Indonesian locale), startDate desc, id asc
 * - STATUS: status priority asc, startDate desc, startTime desc, id asc
 */
export function sortActivities<T extends ActivitySortable>(
  activities: readonly T[],
  sortOption: ActivitySortOption = 'NEWEST'
): T[] {
  const copy = [...activities];

  return copy.sort((a, b) => {
    const timeA = a.startTime || '00:00';
    const timeB = b.startTime || '00:00';

    switch (sortOption) {
      case 'NEWEST': {
        // Date descending
        const dateCmp = b.startDate.localeCompare(a.startDate);
        if (dateCmp !== 0) return dateCmp;
        // Time descending
        const timeCmp = timeB.localeCompare(timeA);
        if (timeCmp !== 0) return timeCmp;
        // Stable deterministic tie-breaker
        return a.id.localeCompare(b.id);
      }

      case 'OLDEST': {
        // Date ascending
        const dateCmp = a.startDate.localeCompare(b.startDate);
        if (dateCmp !== 0) return dateCmp;
        // Time ascending
        const timeCmp = timeA.localeCompare(timeB);
        if (timeCmp !== 0) return timeCmp;
        // Stable deterministic tie-breaker
        return a.id.localeCompare(b.id);
      }

      case 'TITLE_ASC': {
        const titleCmp = a.title.localeCompare(b.title, 'id', { sensitivity: 'base' });
        if (titleCmp !== 0) return titleCmp;
        const dateCmp = b.startDate.localeCompare(a.startDate);
        if (dateCmp !== 0) return dateCmp;
        return a.id.localeCompare(b.id);
      }

      case 'TITLE_DESC': {
        const titleCmp = b.title.localeCompare(a.title, 'id', { sensitivity: 'base' });
        if (titleCmp !== 0) return titleCmp;
        const dateCmp = b.startDate.localeCompare(a.startDate);
        if (dateCmp !== 0) return dateCmp;
        return a.id.localeCompare(b.id);
      }

      case 'STATUS': {
        const prioA = STATUS_PRIORITY[a.status || 'SCHEDULED'] || 99;
        const prioB = STATUS_PRIORITY[b.status || 'SCHEDULED'] || 99;
        if (prioA !== prioB) return prioA - prioB;
        // Secondary: newest first
        const dateCmp = b.startDate.localeCompare(a.startDate);
        if (dateCmp !== 0) return dateCmp;
        const timeCmp = timeB.localeCompare(timeA);
        if (timeCmp !== 0) return timeCmp;
        return a.id.localeCompare(b.id);
      }

      default:
        return 0;
    }
  });
}

export type MasterSortDirection = 'ASC' | 'DESC';

/**
 * Sorts master data items alphabetically by name (or other key).
 * Returns a new array; never mutates the original.
 */
export function sortMasterItems<T extends { id: string; name: string }>(
  items: readonly T[],
  direction: MasterSortDirection = 'ASC',
  key: keyof T = 'name'
): T[] {
  const copy = [...items];

  return copy.sort((a, b) => {
    const valA = String(a[key] ?? '');
    const valB = String(b[key] ?? '');

    const cmp = valA.localeCompare(valB, 'id', { sensitivity: 'base' });
    if (cmp !== 0) {
      return direction === 'ASC' ? cmp : -cmp;
    }
    return a.id.localeCompare(b.id);
  });
}
