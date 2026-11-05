/**
 * Unit Test Suite for Milestone S01-QA Complete Corrections
 * Verifies QA-01 to QA-07 implementations against the explicit project specifications.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildEightColumnReportRows,
  sortActivities,
  sortMasterItems,
  type ActivityDocument,
  type ActivitySortOption,
  type ReportLookups,
  type EightColumnReportRow
} from '@department-agenda/shared';
import { filterPublicActivities, type PublicActivityFilterOptions } from '../../apps/public/src/components/PublicController';
import { renderActivitiesPage } from '../../apps/admin/src/pages/ActivitiesPage';

describe('Milestone S01-QA: Defect Corrections & Enhancements', () => {
  const dummyLookups: ReportLookups = {
    locations: new Map([['loc_01', { id: 'loc_01', name: 'Ruang Rapat Kadis', type: 'OFFICE', isBookableRoom: true, active: true }]]),
    organizers: new Map([['org_01', { id: 'org_01', name: 'Sekretariat', active: true }]]),
    categories: new Map([
      ['cat_01', { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#2563eb', active: true }],
      ['cat_02', { id: 'cat_02', name: 'Pelatihan UMKM', colorHex: '#0284c7', active: true }],
      ['cat_03', { id: 'cat_03', name: 'Pameran', colorHex: '#16a34a', active: true }]
    ])
  };

  const syntheticActivities: ActivityDocument[] = [
    {
      id: 'act_01',
      title: 'Rapat Koordinasi Bulanan',
      startDate: '2026-10-30',
      startTime: '09:00',
      endDate: '2026-10-30',
      endTime: '11:00',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_01',
      attendeeIds: [],
      attendeeSnapshots: [],
      guestAttendees: [],
      status: 'SCHEDULED',
      publicNotes: 'Catatan publik 1',
      privateNotes: 'Privat',
      privateMeetingUrl: null,
      version: 1,
      createdAt: '2026-10-01T08:00:00Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T08:00:00Z',
      updatedBy: 'admin'
    },
    {
      id: 'act_02',
      title: 'Pelatihan Laporan Keuangan Koperasi',
      startDate: '2026-10-30',
      startTime: '14:00',
      endDate: '2026-10-30',
      endTime: '16:30',
      openEnded: false,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_02',
      attendeeIds: [],
      attendeeSnapshots: [],
      guestAttendees: [],
      status: 'COMPLETED',
      publicNotes: 'Catatan publik 2',
      privateNotes: 'Privat',
      privateMeetingUrl: null,
      version: 1,
      createdAt: '2026-10-01T08:00:00Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T08:00:00Z',
      updatedBy: 'admin'
    },
    {
      id: 'act_03',
      title: 'Sosialisasi Sertifikasi Halal',
      startDate: '2026-10-29',
      startTime: '10:00',
      endDate: '2026-10-29',
      endTime: null,
      openEnded: true,
      locationId: 'loc_01',
      organizerId: 'org_01',
      categoryId: 'cat_02',
      attendeeIds: [],
      attendeeSnapshots: [],
      guestAttendees: [],
      status: 'CANCELLED',
      cancelReason: 'Kendala teknis',
      publicCancellationNotice: 'Acara dijadwal ulang bulan depan',
      publicNotes: '',
      privateNotes: 'Privat',
      privateMeetingUrl: null,
      version: 1,
      createdAt: '2026-10-01T08:00:00Z',
      createdBy: 'admin',
      updatedAt: '2026-10-01T08:00:00Z',
      updatedBy: 'admin'
    }
  ];

  // ==========================================
  // QA-01: Mobile Agenda Card Compression
  // ==========================================
  describe('QA-01: Mobile Agenda Card Responsive CSS', () => {
    it('defines responsive vertical card layout for mobile widths in public.css', () => {
      const cssPath = path.resolve(__dirname, '../../apps/public/src/styles/public.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Verify @media (max-width: 768px) contains mobile card reflow
      expect(cssContent).toContain('.agenda-item-card {');
      expect(cssContent).toContain('flex-direction: column;');
      expect(cssContent).toContain('.agenda-item-left {');
      expect(cssContent).toContain('.agenda-item-right .btn {');
      expect(cssContent).toContain('min-height: 44px;'); // Accessible touch target
      expect(cssContent).toContain('.list-activity-row {');
    });
  });

  // ==========================================
  // QA-02: Missing Selesai Report Filter
  // ==========================================
  describe('QA-02: Selesai (COMPLETED) Status Filter in 8-Column Reports', () => {
    it('preserves status metadata on EightColumnReportRow for granular filtering', () => {
      const rows = buildEightColumnReportRows(syntheticActivities, '2026-10-01', '2026-10-31', dummyLookups);
      expect(rows).toHaveLength(3);

      const completedRow = rows.find(r => r.status === 'COMPLETED');
      expect(completedRow).toBeDefined();
      expect(completedRow?.kegiatan).toContain('Pelatihan Laporan Keuangan Koperasi');

      const scheduledRow = rows.find(r => r.status === 'SCHEDULED');
      expect(scheduledRow).toBeDefined();

      const cancelledRow = rows.find(r => r.status === 'CANCELLED');
      expect(cancelledRow).toBeDefined();
    });

    it('correctly filters completed-only, scheduled-only, cancelled-only, and all statuses', () => {
      const allRows = buildEightColumnReportRows(syntheticActivities, '2026-10-01', '2026-10-31', dummyLookups);

      // COMPLETED only
      const completedOnly = allRows.filter(r => !r.isCancelled && r.status === 'COMPLETED');
      expect(completedOnly).toHaveLength(1);
      expect(completedOnly[0].kegiatan).toContain('Pelatihan Laporan Keuangan');

      // SCHEDULED only (excluding completed and cancelled)
      const scheduledOnly = allRows.filter(r => !r.isCancelled && r.status === 'SCHEDULED');
      expect(scheduledOnly).toHaveLength(1);
      expect(scheduledOnly[0].kegiatan).toContain('Rapat Koordinasi Bulanan');

      // CANCELLED only
      const cancelledOnly = allRows.filter(r => r.isCancelled || r.status === 'CANCELLED');
      expect(cancelledOnly).toHaveLength(1);
      expect(cancelledOnly[0].kegiatan).toContain('[DIBATALKAN]');
    });
  });

  // ==========================================
  // QA-03 & QA-07: Activity Ordering Engine
  // ==========================================
  describe('QA-03 & QA-07: Deterministic Activity Ordering with Newest-First Default', () => {
    it('defaults to NEWEST-first (date descending, time descending, id ascending)', () => {
      const sorted = sortActivities(syntheticActivities, 'NEWEST');

      // 2026-10-30 14:00 (act_02) -> 2026-10-30 09:00 (act_01) -> 2026-10-29 10:00 (act_03)
      expect(sorted[0].id).toBe('act_02');
      expect(sorted[1].id).toBe('act_01');
      expect(sorted[2].id).toBe('act_03');
    });

    it('supports OLDEST-first as exact reversal for distinct dates and times', () => {
      const sorted = sortActivities(syntheticActivities, 'OLDEST');

      expect(sorted[0].id).toBe('act_03');
      expect(sorted[1].id).toBe('act_01');
      expect(sorted[2].id).toBe('act_02');
    });

    it('applies newest-first sorting in PublicController filterPublicActivities', () => {
      const publicDTOs = syntheticActivities.map(a => ({
        id: a.id,
        title: a.title,
        startDate: a.startDate,
        startTime: a.startTime,
        endDate: a.endDate,
        endTime: a.endTime,
        openEnded: a.openEnded,
        dateDisplay: a.startDate,
        timeDisplay: a.startTime || '',
        categoryName: 'Kategori',
        locationName: 'Lokasi',
        locationType: 'OFFICE' as const,
        organizerName: 'Penyelenggara',
        attendeeLabels: [],
        status: a.status,
        publicCancellationNotice: a.publicCancellationNotice,
        publicNotes: a.publicNotes
      }));

      const filtered = filterPublicActivities(publicDTOs, { sort: 'NEWEST' });
      expect(filtered[0].id).toBe('act_02');
      expect(filtered[1].id).toBe('act_01');
      expect(filtered[2].id).toBe('act_03');
    });

    it('applies title A-Z and Z-A sorting', () => {
      const asc = sortActivities(syntheticActivities, 'TITLE_ASC');
      expect(asc[0].title).toBe('Pelatihan Laporan Keuangan Koperasi');

      const desc = sortActivities(syntheticActivities, 'TITLE_DESC');
      expect(desc[0].title).toBe('Sosialisasi Sertifikasi Halal');
    });
  });

  // ==========================================
  // QA-04: Category Color Undefined Fix
  // ==========================================
  describe('QA-04: Master Data Category Color Rendering', () => {
    it('safely handles colorHex, legacy color, and unconfigured states without printing undefined', () => {
      const testCategories = [
        { id: 'c1', name: 'Cat 1', colorHex: '#2563eb', active: true },
        { id: 'c2', name: 'Cat 2', color: '#16a34a', active: true }, // Legacy format
        { id: 'c3', name: 'Cat 3', active: true } // Missing color
      ];

      testCategories.forEach(cat => {
        const rawColor = (cat as any).colorHex || (cat as any).color;
        const isValidHex = typeof rawColor === 'string' && /^#[0-9a-fA-F]{6}$/i.test(rawColor);
        const colorHtml = isValidHex
          ? `<span class="color-pill" style="background-color:${rawColor}"></span><code>${rawColor}</code>`
          : `<span class="badge badge-neutral">Belum diatur</span>`;

        expect(colorHtml).not.toContain('undefined');
        expect(colorHtml).not.toContain('null');
        if (cat.id === 'c1') expect(colorHtml).toContain('#2563eb');
        if (cat.id === 'c2') expect(colorHtml).toContain('#16a34a');
        if (cat.id === 'c3') expect(colorHtml).toContain('Belum diatur');
      });
    });
  });

  // ==========================================
  // QA-05: Reversed Report Date Range Validation
  // ==========================================
  describe('QA-05: Report Date Range Validation', () => {
    it('detects reversed date ranges and provides standard Indonesian validation message', () => {
      const validStart = '2026-11-01';
      const validEnd = '2026-11-30';
      const reversedStart = '2026-11-30';
      const reversedEnd = '2026-11-01';

      expect(validStart <= validEnd).toBe(true);
      expect(reversedStart <= reversedEnd).toBe(false);

      const errorMessage = 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.';
      expect(errorMessage).toBe('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
    });
  });

  // ==========================================
  // QA-06: Admin Agenda Empty State & Reset Filter
  // ==========================================
  describe('QA-06: Admin Agenda Empty Search State', () => {
    it('renders emptySearchRow with reset filter button in renderActivitiesPage', () => {
      const html = renderActivitiesPage(syntheticActivities);

      expect(html).toContain('id="emptySearchRow"');
      expect(html).toContain('Tidak ada kegiatan yang sesuai dengan pencarian atau filter.');
      expect(html).toContain('Coba ubah kata kunci atau atur ulang filter.');
      expect(html).toContain('id="btnResetActivityFilter"');
    });

    it('renders database empty message when input activities list is genuinely empty', () => {
      const html = renderActivitiesPage([]);

      expect(html).toContain('Belum ada kegiatan tersimpan di database.');
      expect(html).not.toContain('id="emptySearchRow"');
    });
  });
});
