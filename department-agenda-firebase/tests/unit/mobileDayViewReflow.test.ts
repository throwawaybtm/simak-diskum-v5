/**
 * Unit Tests for S03-M01: Targeted Mobile Daily Agenda Card Layout Correction
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { PublicActivityDTO } from '../../shared/src/schema/publicDto';
import { renderCalendarView } from '../../apps/public/src/pages/CalendarView';

describe('S03-M01: Mobile Daily Agenda Card Reflow & DOM Structure', () => {
  const sampleActivity: PublicActivityDTO = {
    id: 'act_oct_30_01',
    title: 'Koordinasi Penyusunan Kalender Agenda Kedinasan November 2026',
    startDate: '2026-10-30',
    startTime: '09:00',
    endDate: '2026-10-30',
    endTime: '11:00',
    openEnded: false,
    timeDisplay: '09:00 - 11:00 WIB',
    dateDisplay: 'Jumat, 30 Oktober 2026',
    status: 'SCHEDULED',
    locationName: 'Ruang Rapat Kadis (Lantai 2)',
    locationType: 'OFFICE',
    organizerName: 'Sekretariat Diskum Kota Batam',
    categoryName: 'Rapat Internal',
    publicNotes: 'Koordinasi rutin.',
    attendeeLabels: ['Drs. Hendri Arifin, M.Si (Kepala Dinas)', 'Siti Purwarupa, M.Si (Sekretaris Dinas)'],
    version: 1,
    updatedAt: '2026-10-25T08:00:00Z'
  };

  const sampleCancelled: PublicActivityDTO = {
    id: 'act_oct_30_02',
    title: 'Sosialisasi Bantuan Modal Usaha Mikro Wilayah Sekupang',
    startDate: '2026-10-30',
    startTime: '13:30',
    endDate: '2026-10-30',
    endTime: '16:00',
    openEnded: false,
    timeDisplay: '13:30 - 16:00 WIB',
    dateDisplay: 'Jumat, 30 Oktober 2026',
    status: 'CANCELLED',
    locationName: 'Aula Kantor Camat Sekupang',
    locationType: 'EXTERNAL',
    organizerName: 'Bidang Usaha Mikro',
    categoryName: 'Sosialisasi',
    publicNotes: 'Dibatalkan karena jadwal pimpinan bertabrakan.',
    publicCancellationNotice: 'Kegiatan ditunda hingga penetapan jadwal pimpinan berikutnya.',
    attendeeLabels: [],
    version: 2,
    updatedAt: '2026-10-29T10:00:00Z'
  };

  it('renders Day View with correct heading and event card components', () => {
    const html = renderCalendarView({
      mode: 'day',
      year: 2026,
      month: 10,
      selectedDate: '2026-10-30',
      visibleStart: '2026-10-01',
      visibleEnd: '2026-10-31',
      activities: [sampleActivity, sampleCancelled],
      categories: ['Rapat Internal', 'Sosialisasi']
    });

    // Heading format: Jadwal Agenda: [Formatted Date] ([N] Kegiatan)
    expect(html).toContain('Jadwal Agenda: Jumat, 30 Oktober 2026 (2 Kegiatan)');

    // Elements inside each card
    expect(html).toContain('class="day-view-item');
    expect(html).toContain('class="day-item-time"');
    expect(html).toContain('class="day-item-content"');
    expect(html).toContain('class="day-item-action"');

    // Title and content
    expect(html).toContain('Koordinasi Penyusunan Kalender Agenda Kedinasan November 2026');
    expect(html).toContain('📍 Tempat: <strong>Ruang Rapat Kadis (Lantai 2)</strong> (Kantor Dinas)');
    expect(html).toContain('🏛️ Penyelenggara: Sekretariat Diskum Kota Batam');
    expect(html).toContain('👥 Dihadiri: Drs. Hendri Arifin, M.Si (Kepala Dinas), Siti Purwarupa, M.Si (Sekretaris Dinas)');

    // Status badges
    expect(html).toContain('<span class="status-pill status-scheduled">Terjadwal</span>');
    expect(html).toContain('<span class="status-pill status-cancelled">Dibatalkan</span>');

    // Cancellation notice
    expect(html).toContain('Kegiatan ditunda hingga penetapan jadwal pimpinan berikutnya.');

    // Action button
    expect(html).toContain('data-open-detail="act_oct_30_01"');
    expect(html).toContain('data-open-detail="act_oct_30_02"');
    expect(html).toContain('>Rincian</button>');
  });

  it('handles edge cases: empty attendee list, long titles, and missing notices gracefully', () => {
    const edgeActivity: PublicActivityDTO = {
      id: 'act_edge_01',
      title: 'A'.repeat(120), // very long title
      startDate: '2026-10-30',
      startTime: '08:00',
      endDate: '2026-10-30',
      endTime: null,
      openEnded: true,
      timeDisplay: '08:00 WIB s.d. selesai',
      dateDisplay: 'Jumat, 30 Oktober 2026',
      status: 'COMPLETED',
      locationName: 'Batam Centre Plaza',
      locationType: 'ONLINE',
      organizerName: 'Dinas Koperasi Batam',
      categoryName: 'Umum',
      attendeeLabels: [], // empty attendees
      version: 1,
      updatedAt: '2026-10-30T10:00:00Z'
    };

    const html = renderCalendarView({
      mode: 'day',
      year: 2026,
      month: 10,
      selectedDate: '2026-10-30',
      visibleStart: '2026-10-01',
      visibleEnd: '2026-10-31',
      activities: [edgeActivity],
      categories: ['Umum']
    });

    expect(html).toContain(edgeActivity.title);
    expect(html).toContain('<span class="status-pill status-completed">Selesai</span>');
    expect(html).toContain('(Daring)');
    // Empty attendees should not render attendee row
    expect(html).not.toContain('👥 Dihadiri:');
  });

  it('renders clean empty state when there are no activities on selected day', () => {
    const html = renderCalendarView({
      mode: 'day',
      year: 2026,
      month: 10,
      selectedDate: '2026-10-31',
      visibleStart: '2026-10-01',
      visibleEnd: '2026-10-31',
      activities: [],
      categories: ['Umum']
    });

    expect(html).toContain('Tidak Ada Agenda pada Hari Ini');
    expect(html).toContain('Sabtu, 31 Oktober 2026');
  });

  it('verifies CSS rules in public.css enforce mobile single-column reflow and touch-target invariants', () => {
    const cssPath = path.resolve(__dirname, '../../apps/public/src/styles/public.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Desktop invariants (outside @media)
    expect(cssContent).toMatch(/\.day-view-item\s*\{[^}]*display:\s*flex/);
    expect(cssContent).toMatch(/\.day-item-time\s*\{[^}]*width:\s*140px/);

    // Mobile media query block
    const mediaQueryIndex = cssContent.indexOf('@media (max-width: 768px)');
    expect(mediaQueryIndex).toBeGreaterThan(0);
    const mobileCss = cssContent.slice(mediaQueryIndex);

    // Mobile reflow rules for .day-view-item
    expect(mobileCss).toMatch(/\.day-view-item\s*\{[^}]*flex-direction:\s*column/);
    expect(mobileCss).toMatch(/\.day-view-item\s*\{[^}]*align-items:\s*stretch/);

    // Mobile reflow for .day-item-time (full-width horizontal header)
    expect(mobileCss).toMatch(/\.day-item-time\s*\{[^}]*width:\s*100%/);
    expect(mobileCss).toMatch(/\.day-item-time\s*\{[^}]*justify-content:\s*space-between/);

    // Mobile reflow for .day-item-content (full width, natural wrapping)
    expect(mobileCss).toMatch(/\.day-item-content\s*\{[^}]*width:\s*100%/);
    expect(mobileCss).toMatch(/\.day-item-content\s*\{[^}]*min-width:\s*0/);
    expect(mobileCss).toMatch(/\.day-item-content\s*h4\s*\{[^}]*word-break:\s*break-word/);

    // Mobile reflow for .day-item-action (full width, min 44px touch target)
    expect(mobileCss).toMatch(/\.day-item-action\s*\{[^}]*width:\s*100%/);
    expect(mobileCss).toMatch(/\.day-item-action\s*\.btn\s*\{[^}]*width:\s*100%/);
    expect(mobileCss).toMatch(/\.day-item-action\s*\.btn\s*\{[^}]*min-height:\s*44px/);
  });
});
