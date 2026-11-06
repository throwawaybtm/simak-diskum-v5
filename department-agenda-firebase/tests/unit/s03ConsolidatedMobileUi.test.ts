/**
 * Unit Tests for S03: Consolidated Mobile UI/UX Remediation & Responsive Architecture
 * Tests Public Week Stacked View, Cari Agenda date formatting & attendee chips,
 * Admin Agenda Mobile Management Cards, Master Data Mobile Cards,
 * Reports Mobile Preview Cards, and Settings Reconciliation.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { PublicActivityDTO, ActivityDocument } from '../../shared/src';
import { renderCalendarView } from '../../apps/public/src/pages/CalendarView';
import { renderAgendaView } from '../../apps/public/src/pages/AgendaView';
import { renderActivitiesPage } from '../../apps/admin/src/pages/ActivitiesPage';
import { mountSettingsPage } from '../../apps/admin/src/pages/SettingsPage';

describe('S03 Consolidated Mobile UI/UX Remediation', () => {
  const samplePublicActivity: PublicActivityDTO = {
    id: 'act_s03_01',
    title: 'Rapat Koordinasi Evaluasi Program Koperasi Triwulan III',
    startDate: '2026-10-26',
    startTime: '09:00',
    endDate: '2026-10-26',
    endTime: '11:30',
    openEnded: false,
    timeDisplay: '09:00 - 11:30 WIB',
    dateDisplay: 'Senin, 26 Oktober 2026',
    status: 'SCHEDULED',
    locationName: 'Ruang Rapat Kadis (Lantai 2)',
    locationType: 'OFFICE',
    organizerName: 'Sekretariat Dinas',
    categoryName: 'Rapat Internal',
    attendeeLabels: ['Drs. Hendri Arifin, M.Si (Kepala Dinas)', 'Rini Marlina, S.Sos (Sekretaris Dinas)'],
    version: 1,
    updatedAt: '2026-10-20T08:00:00Z'
  };

  const samplePublicActivity2: PublicActivityDTO = {
    id: 'act_s03_02',
    title: 'Pelatihan Kewirausahaan Produk Olahan Laut',
    startDate: '2026-10-26',
    startTime: '13:00',
    endDate: '2026-10-26',
    endTime: '15:30',
    openEnded: false,
    timeDisplay: '13:00 - 15:30 WIB',
    dateDisplay: 'Senin, 26 Oktober 2026',
    status: 'COMPLETED',
    locationName: 'Aula PLUT Batam',
    locationType: 'OFFICE',
    organizerName: 'Bidang Pemberdayaan Koperasi',
    categoryName: 'Pelatihan',
    attendeeLabels: ['Dewi Sartika, S.Si (Kabid Pengawasan)'],
    version: 1,
    updatedAt: '2026-10-20T08:00:00Z'
  };

  const sampleAdminActivity: ActivityDocument = {
    id: 'act_admin_01',
    title: 'Verifikasi Dokumen Kelayakan Bantuan Modal Usaha Mikro',
    startDate: '2026-10-30',
    startTime: '14:00',
    endDate: '2026-10-30',
    endTime: '16:30',
    openEnded: false,
    status: 'SCHEDULED',
    administrativeStage: 'DETAILS_COMPLETED',
    locationId: 'loc_01',
    organizerId: 'org_01',
    categoryId: 'cat_01',
    attendeeIds: ['emp_01'],
    privateNotes: 'Ada catatan privat penting pimpinan',
    invitationLetter: {
      agendaNumber: 'AG-2026-X-042',
      missingDocumentReason: null
    },
    version: 1,
    createdAt: '2026-10-20T08:00:00Z',
    updatedAt: '2026-10-25T08:00:00Z',
    createdBy: 'admin',
    updatedBy: 'admin'
  };

  it('renders Public Week View with both desktop grid and mobile stacked day sections', () => {
    const html = renderCalendarView({
      mode: 'week',
      year: 2026,
      month: 10,
      selectedDate: '2026-10-26',
      visibleStart: '2026-10-26',
      visibleEnd: '2026-11-01',
      activities: [samplePublicActivity2, samplePublicActivity], // out of order
      categories: ['Rapat Internal', 'Pelatihan']
    });

    // Contains both desktop and mobile containers
    expect(html).toContain('class="week-grid-container desktop-only"');
    expect(html).toContain('class="week-stacked-container mobile-only"');

    // Mobile stacked sections contain Indonesian day headings
    expect(html).toContain('class="week-stacked-day-section');
    expect(html).toContain('Senin, 26 Oktober 2026');

    // Mobile stacked cards contain activities in chronological order (09:00 before 13:00)
    const idxFirst = html.indexOf('Rapat Koordinasi Evaluasi Program Koperasi Triwulan III');
    const idxSecond = html.indexOf('Pelatihan Kewirausahaan Produk Olahan Laut');
    expect(idxFirst).toBeGreaterThan(0);
    expect(idxSecond).toBeGreaterThan(idxFirst);

    // Empty state on days without activities
    expect(html).toContain('☕ Tidak ada kegiatan kedinasan');

    // Action buttons with rincian
    expect(html).toContain('data-open-detail="act_s03_01"');
    expect(html).toContain('data-open-detail="act_s03_02"');
  });

  it('renders Public Cari Agenda with human-readable Indonesian dates and attendee chips', () => {
    const html = renderAgendaView({
      activities: [samplePublicActivity],
      categories: ['Rapat Internal'],
      filters: { keyword: '', category: 'ALL', status: 'ALL', startDate: '', endDate: '', sort: 'NEWEST' },
      totalActivitiesCount: 1
    });

    // Human-readable Indonesian date in badge (not raw ISO 2026-10-26)
    expect(html).toContain('Senin, 26 Oktober 2026');

    // Attendee chip formatting with bold name and parenthesized role
    expect(html).toContain('<strong class="attendee-name">Drs. Hendri Arifin, M.Si</strong>');
    expect(html).toContain('<span class="attendee-role">(Kepala Dinas)</span>');

    // Date range inputs use renderDateInputField (dd/mm/yyyy placeholder)
    expect(html).toContain('placeholder="dd/mm/yyyy"');
    expect(html).toContain('inputFilterStartDate');
    expect(html).toContain('inputFilterEndDate');
  });

  it('renders Admin Activities Page with desktop table and mobile management cards', () => {
    const html = renderActivitiesPage([sampleAdminActivity]);

    // Desktop table container
    expect(html).toContain('class="desktop-only"');
    expect(html).toContain('table-responsive');
    expect(html).toContain('class="data-table activities-table"');

    // Mobile management cards container
    expect(html).toContain('class="mobile-only"');
    expect(html).toContain('class="activities-cards-container" id="activitiesCardsContainer"');
    expect(html).toContain('class="activity-mgmt-card');

    // Card contains all required fields
    expect(html).toContain('Verifikasi Dokumen Kelayakan Bantuan Modal Usaha Mikro');
    expect(html).toContain('Jumat, 30 Oktober 2026');
    expect(html).toContain('14.00 - 16.30 WIB');
    expect(html).toContain('Detail Dilengkapi');
    expect(html).toContain('Terjadwal');
    expect(html).toContain('Versi 1');
    expect(html).toContain('🔒 Ada Catatan Privat');
    expect(html).toContain('📜 No. Agenda: <strong>AG-2026-X-042</strong>');

    // Action buttons in card
    expect(html).toContain('href="#activities/edit/act_admin_01"');
    expect(html).toContain('data-duplicate-id="act_admin_01"');
    expect(html).toContain('data-delete-id="act_admin_01"');
  });

  it('renders Admin Settings Page as a clean read-only informational specification page', async () => {
    const dummyContainer = { innerHTML: '' } as unknown as HTMLElement;
    const mockDb = {
      _fake: true
    };

    await mountSettingsPage(dummyContainer, {
      db: mockDb,
      onSettingsSaved: async () => {}
    });

    const html = dummyContainer.innerHTML;

    // Headings
    expect(html).toContain('Pengaturan Sistem & Parameter Operasional');

    // S01-QA-R2 8-column export specification details
    expect(html).toContain('Spesifikasi Ekspor Laporan Resmi 8 Kolom (Standar S01-QA-R2)');
    expect(html).toContain('Struktur 8 Kolom Resmi');
    expect(html).toContain('Judul Dokumen 3 Baris');
    expect(html).toContain('tanpa blok tanda tangan pejabat, tanpa NIP, dan tanpa blok persetujuan');

    // Operational parameters
    expect(html).toContain('Asia/Jakarta (WIB)');
    expect(html).toContain('dd/mm/yyyy');
    expect(html).toContain('YYYY-MM-DD (ISO)');

    // Historical signatory records displayed read-only
    expect(html).toContain('Arsip Profil Instansi & Pejabat Historis');
    expect(html).toContain('Drs. HENDRI ARIFIN, M.Si');
    expect(html).toContain('19710312 199803 1 004');

    // Zero editable form inputs (no misleading edit form)
    expect(html).not.toContain('<form id="signatorySettingsForm"');
    expect(html).not.toContain('id="btnSaveSignatorySettings"');
  });

  it('verifies CSS rules in public.css and admin.css maintain mobile-only, desktop-only, and touch targets', () => {
    const pubCss = fs.readFileSync(path.resolve(__dirname, '../../apps/public/src/styles/public.css'), 'utf-8');
    const admCss = fs.readFileSync(path.resolve(__dirname, '../../apps/admin/src/styles/admin.css'), 'utf-8');

    // Public CSS rules
    expect(pubCss).toContain('.mobile-only');
    expect(pubCss).toContain('.desktop-only');
    expect(pubCss).toContain('.week-stacked-container');
    expect(pubCss).toContain('.week-stacked-card');
    expect(pubCss).toContain('.attendee-chip');

    // Admin CSS rules
    expect(admCss).toContain('.mobile-only');
    expect(admCss).toContain('.desktop-only');
    expect(admCss).toContain('.activities-cards-container');
    expect(admCss).toContain('.activity-mgmt-card');
    expect(admCss).toContain('.master-cards-container');
    expect(admCss).toContain('.master-record-card');
    expect(admCss).toContain('.report-cards-container');
    expect(admCss).toContain('.report-preview-card');
    expect(admCss).toContain('.export-grid-2col');
    expect(admCss).toContain('.custom-date-field-wrap');
    expect(admCss).toContain('.not-found-panel');
  });
});
