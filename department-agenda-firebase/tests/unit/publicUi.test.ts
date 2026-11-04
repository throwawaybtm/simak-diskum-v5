/**
 * Public UI Logic & Calendar Engine Unit Tests (TDD)
 */

import { describe, it, expect } from 'vitest';
import type { PublicActivityDTO } from '../../shared/src/schema/publicDto';
import {
  filterPublicActivities,
  groupActivitiesByDay,
  getVisibleMonthBounds,
  getVisibleWeekBounds,
  type PublicActivityFilterOptions
} from '../../apps/public/src/components/PublicController';

describe('Public UI Logic & Calendar Engine', () => {
  const sampleActivities: PublicActivityDTO[] = [
    {
      id: 'pub_01',
      title: 'Pelatihan Manajemen Koperasi Modern',
      startDate: '2026-11-04',
      startTime: '09:00',
      endDate: '2026-11-04',
      endTime: '12:00',
      openEnded: false,
      timeDisplay: '09.00 - 12.00 WIB',
      dateDisplay: 'Rabu, 4 November 2026',
      status: 'SCHEDULED',
      locationName: 'Aula PLUT Batam',
      locationType: 'OFFICE',
      organizerName: 'Bidang Pemberdayaan Koperasi',
      categoryName: 'Pelatihan',
      publicNotes: 'Pakaian: Bebas Rapi. Membawa laptop.',
      attendeeLabels: ['Kepala Dinas — Drs. Hendri Arifin, M.Si', 'Kabid Koperasi — Ahmad Fauzi, SE'],
      updatedAt: '2026-11-01T08:00:00Z'
    },
    {
      id: 'pub_02',
      title: 'Batam Expo UMKM 2026',
      startDate: '2026-11-05',
      startTime: '08:00',
      endDate: '2026-11-07', // 3-day event
      endTime: null,
      openEnded: true,
      timeDisplay: '08.00 WIB s.d. selesai',
      dateDisplay: 'Kamis, 5 November 2026 s.d. Sabtu, 7 November 2026',
      status: 'SCHEDULED',
      locationName: 'Mega Mall Batam Centre',
      locationType: 'EXTERNAL',
      organizerName: 'Bidang Pengembangan Usaha Mikro',
      categoryName: 'Pameran',
      publicNotes: 'Terbuka untuk umum.',
      attendeeLabels: ['Kepala Dinas — Drs. Hendri Arifin, M.Si'],
      updatedAt: '2026-11-02T10:00:00Z'
    },
    {
      id: 'pub_03',
      title: 'Rapat Koordinasi Pengawasan Koperasi',
      startDate: '2026-11-04',
      startTime: '14:00',
      endDate: '2026-11-04',
      endTime: '16:00',
      openEnded: false,
      timeDisplay: '14.00 - 16.00 WIB',
      dateDisplay: 'Rabu, 4 November 2026',
      status: 'CANCELLED',
      publicCancellationNotice: 'Dibatalkan karena narasumber kementerian berhalangan.',
      locationName: 'Ruang Rapat Kadis',
      locationType: 'OFFICE',
      organizerName: 'Sekretariat Dinas',
      categoryName: 'Rapat',
      publicNotes: 'Peserta wajib membawa laporan audit.',
      attendeeLabels: ['Sekretaris Dinas — Rini Marlina, S.Sos'],
      updatedAt: '2026-11-03T12:00:00Z'
    }
  ];

  describe('filterPublicActivities', () => {
    it('returns all activities when no filters are set', () => {
      const result = filterPublicActivities(sampleActivities, {});
      expect(result).toHaveLength(3);
    });

    it('filters by keyword matching title case-insensitively', () => {
      const result = filterPublicActivities(sampleActivities, { keyword: 'koperasi modern' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pub_01');
    });

    it('filters by keyword matching location or attendee labels', () => {
      const locMatch = filterPublicActivities(sampleActivities, { keyword: 'Mega Mall' });
      expect(locMatch).toHaveLength(1);
      expect(locMatch[0].id).toBe('pub_02');

      const attendeeMatch = filterPublicActivities(sampleActivities, { keyword: 'Ahmad Fauzi' });
      expect(attendeeMatch).toHaveLength(1);
      expect(attendeeMatch[0].id).toBe('pub_01');
    });

    it('filters by status, retaining cancelled activities when requested', () => {
      const cancelledOnly = filterPublicActivities(sampleActivities, { status: 'CANCELLED' });
      expect(cancelledOnly).toHaveLength(1);
      expect(cancelledOnly[0].id).toBe('pub_03');
      expect(cancelledOnly[0].publicCancellationNotice).toContain('narasumber kementerian');

      const scheduledOnly = filterPublicActivities(sampleActivities, { status: 'SCHEDULED' });
      expect(scheduledOnly).toHaveLength(2);
    });

    it('filters by category', () => {
      const result = filterPublicActivities(sampleActivities, { category: 'Pameran' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pub_02');
    });

    it('filters by date range intersecting activity intervals', () => {
      // Activity 2 is 2026-11-05 to 2026-11-07. If querying 2026-11-06 to 2026-11-06:
      const result = filterPublicActivities(sampleActivities, {
        startDate: '2026-11-06',
        endDate: '2026-11-06'
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pub_02');
    });
  });

  describe('groupActivitiesByDay (Calendar Multi-Day Mapping)', () => {
    it('correctly maps multi-day activities across every intersecting day without duplicating entries on the same day', () => {
      const dayMap = groupActivitiesByDay(sampleActivities, '2026-11-04', '2026-11-08');

      // Nov 4 should have pub_01 and pub_03
      const nov4 = dayMap.get('2026-11-04') || [];
      expect(nov4.map(a => a.id)).toEqual(['pub_01', 'pub_03']);

      // Multi-day pub_02 (Nov 5 to Nov 7) must appear on Nov 5, Nov 6, and Nov 7
      const nov5 = dayMap.get('2026-11-05') || [];
      expect(nov5.map(a => a.id)).toContain('pub_02');

      const nov6 = dayMap.get('2026-11-06') || [];
      expect(nov6.map(a => a.id)).toContain('pub_02');

      const nov7 = dayMap.get('2026-11-07') || [];
      expect(nov7.map(a => a.id)).toContain('pub_02');

      // Nov 8 should not have pub_02
      const nov8 = dayMap.get('2026-11-08') || [];
      expect(nov8.map(a => a.id)).not.toContain('pub_02');
    });
  });

  describe('Visible Bounds Calculations', () => {
    it('calculates full visible grid bounds for month including calendar buffer', () => {
      // November 2026: Nov 1 is Sunday. In Monday-start calendar, visible grid starts Oct 26 and ends Dec 6
      const { visibleStart, visibleEnd, monthStart, monthEnd } = getVisibleMonthBounds(2026, 11);
      expect(monthStart).toBe('2026-11-01');
      expect(monthEnd).toBe('2026-11-30');
      expect(visibleStart <= monthStart).toBe(true);
      expect(visibleEnd >= monthEnd).toBe(true);
    });

    it('calculates visible week bounds (Monday to Sunday) for any target date', () => {
      // 2026-11-04 is Wednesday. Week starts Monday 2026-11-02 and ends Sunday 2026-11-08
      const { weekStart, weekEnd } = getVisibleWeekBounds('2026-11-04');
      expect(weekStart).toBe('2026-11-02');
      expect(weekEnd).toBe('2026-11-08');
    });
  });
});
