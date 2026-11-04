import { describe, it, expect } from 'vitest';
import {
  createInitialActivityFormState,
  validateActivityForm,
  generateLivePreviewDto,
  evaluateActivityConflicts
} from '../../apps/admin/src/components/ActivityFormController';
import type { Location, Organizer, Category, Employee } from '../../shared/src/schema/master';
import type { ActivityDocument } from '../../shared/src/schema/activity';

describe('Admin UI Controller & Workflow Logic', () => {
  const masterLocations: Location[] = [
    { id: 'loc_01', name: 'Ruang Rapat Kadis', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_02', name: 'Zoom Cloud Meeting', type: 'ONLINE', isBookableRoom: false, active: true }
  ];
  const masterOrganizers: Organizer[] = [
    { id: 'org_01', name: 'Sekretariat Dinas', active: true }
  ];
  const masterCategories: Category[] = [
    { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true }
  ];
  const masterEmployees: Employee[] = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris Dinas', departmentId: 'dept_01', active: true }
  ];

  it('initializes a fresh activity form state with sensible defaults', () => {
    const form = createInitialActivityFormState();
    expect(form.id).toBeDefined();
    expect(form.status).toBe('SCHEDULED');
    expect(form.openEnded).toBe(false);
    expect(form.attendeeIds).toEqual([]);
    expect(form.guestAttendees).toEqual([]);
    expect(form.version).toBe(0);
  });

  it('validates form state and flags end time earlier than or equal to start time', () => {
    const form = createInitialActivityFormState();
    form.title = 'Rapat Pembahasan Anggaran';
    form.startDate = '2026-10-01';
    form.endDate = '2026-10-01';
    form.startTime = '10:00';
    form.endTime = '09:00'; // Invalid!
    form.locationId = 'loc_01';
    form.organizerId = 'org_01';
    form.categoryId = 'cat_01';

    const result = validateActivityForm(form);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Waktu selesai'))).toBe(true);
  });

  it('permits empty attendee list with an advisory nonblocking warning', () => {
    const form = createInitialActivityFormState();
    form.title = 'Pameran Terbuka UMKM';
    form.startDate = '2026-10-01';
    form.endDate = '2026-10-01';
    form.startTime = '08:00';
    form.endTime = '12:00';
    form.locationId = 'loc_01';
    form.organizerId = 'org_01';
    form.categoryId = 'cat_01';
    form.attendeeIds = [];
    form.guestAttendees = [];

    const result = validateActivityForm(form);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('peserta'))).toBe(true);
  });

  it('blocks publication when credentials or meeting URLs are detected in public notes', () => {
    const form = createInitialActivityFormState();
    form.title = 'Rapat Tim Koordinasi';
    form.startDate = '2026-10-01';
    form.endDate = '2026-10-01';
    form.startTime = '08:00';
    form.endTime = '10:00';
    form.locationId = 'loc_01';
    form.organizerId = 'org_01';
    form.categoryId = 'cat_01';
    form.publicNotes = 'Silakan join di https://us02web.zoom.us/j/8500005418?pwd=secretPassword Passcode: 123456';

    const result = validateActivityForm(form);
    expect(result.valid).toBe(false);
    expect(result.privacyViolations.length).toBeGreaterThan(0);
    expect(result.privacyViolations.some(v => v.includes('Zoom') || v.includes('tautan'))).toBe(true);
  });

  it('generates real-time public preview DTO strictly excluding secrets', () => {
    const form = createInitialActivityFormState();
    form.title = 'Rapat Pimpinan Dinas';
    form.startDate = '2026-10-01';
    form.endDate = '2026-10-02';
    form.startTime = '09:00';
    form.endTime = '16:00';
    form.locationId = 'loc_01';
    form.organizerId = 'org_01';
    form.categoryId = 'cat_01';
    form.attendeeIds = ['emp_01'];
    form.publicNotes = 'Pakaian: Batik';
    form.privateNotes = 'Catatan rahasia pimpinan internal';
    form.privateMeetingUrl = 'https://zoom.us/private';

    const preview = generateLivePreviewDto(
      form,
      masterLocations,
      masterOrganizers,
      masterCategories,
      masterEmployees
    );

    // Verify sanitized preview fields
    expect(preview.title).toBe('Rapat Pimpinan Dinas');
    expect(preview.locationName).toBe('Ruang Rapat Kadis');
    expect(preview.timeDisplay).toBe('09.00 - 16.00 WIB');
    expect(preview.dateDisplay).toBe('Kamis–Jumat, 1–2 Oktober 2026');
    expect(preview.attendeeLabels).toEqual(['1. Kadis (Drs. Hendri Arifin, M.Si)']);

    // Verify secrets are strictly absent
    expect((preview as any).privateNotes).toBeUndefined();
    expect((preview as any).privateMeetingUrl).toBeUndefined();
    expect((preview as any).attendeeIds).toBeUndefined();
  });

  it('evaluates venue and attendee conflicts against existing activities', () => {
    const existing: ActivityDocument[] = [
      {
        id: 'act_exist_1',
        title: 'Rapat Evaluasi Triwulan',
        startDate: '2026-10-01',
        startTime: '09:00',
        endDate: '2026-10-01',
        endTime: '11:00',
        openEnded: false,
        locationId: 'loc_01',
        organizerId: 'org_01',
        categoryId: 'cat_01',
        attendeeIds: ['emp_01'],
        attendeeSnapshots: [],
        guestAttendees: [],
        status: 'SCHEDULED',
        publicNotes: '',
        privateNotes: '',
        privateMeetingUrl: null,
        version: 1,
        createdAt: '2026-10-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-10-01T00:00:00.000Z',
        updatedBy: 'admin'
      }
    ];

    const candidateForm = createInitialActivityFormState();
    candidateForm.id = 'act_new_candidate';
    candidateForm.startDate = '2026-10-01';
    candidateForm.endDate = '2026-10-01';
    candidateForm.startTime = '10:00';
    candidateForm.endTime = '12:00';
    candidateForm.locationId = 'loc_01'; // Same bookable room!
    candidateForm.attendeeIds = ['emp_02'];

    const warnings = evaluateActivityConflicts(candidateForm, existing, masterLocations);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('VENUE_CONFLICT');
  });

  describe('Feature F01: Admin Form Controller & UI Rendering', () => {
    it('initializes form state with administrativeStage INITIAL_ENTRY and empty invitationLetter', () => {
      const form = createInitialActivityFormState();
      expect(form.administrativeStage).toBe('INITIAL_ENTRY');
      expect(form.invitationLetter).toBeDefined();
      expect(form.invitationLetter?.agendaNumber).toBe('');
      expect(form.invitationLetter?.driveUrl).toBe('');
    });

    it('validates form state for ADMIN_COMPLETE stage requiring letter metadata or exception', () => {
      const form = createInitialActivityFormState();
      form.title = 'Rapat Lengkap Administrasi';
      form.startDate = '2026-11-01';
      form.endDate = '2026-11-01';
      form.startTime = '09:00';
      form.endTime = '11:00';
      form.locationId = 'loc_01';
      form.organizerId = 'org_01';
      form.categoryId = 'cat_01';
      form.administrativeStage = 'ADMIN_COMPLETE';

      // 1. Without letter or exception -> invalid
      const resIncomplete = validateActivityForm(form);
      expect(resIncomplete.valid).toBe(false);
      expect(resIncomplete.errors.some(e => e.includes('Administrasi Lengkap'))).toBe(true);

      // 2. With valid letter data -> valid
      form.invitationLetter = {
        agendaNumber: '045/DKUM/2026',
        letterDate: '2026-10-28',
        letterTopic: 'Undangan Rapat Koordinasi',
        driveUrl: 'https://drive.google.com/file/d/123/view',
        documentVisibility: 'INTERNAL'
      };
      const resComplete = validateActivityForm(form);
      expect(resComplete.valid).toBe(true);
      expect(resComplete.errors).toHaveLength(0);
    });

    it('renders ActivityEditPage with administrative stage selector and invitation letter panel', async () => {
      const { renderActivityEditPage } = await import('../../apps/admin/src/pages/ActivityEditPage');
      const form = createInitialActivityFormState();
      form.invitationLetter = {
        agendaNumber: '088/DKUM/XI/2026',
        letterDate: '2026-11-02',
        letterTopic: 'Undangan Sosialisasi Perizinan',
        driveUrl: 'https://drive.google.com/file/d/abc_test_url/view',
        documentVisibility: 'INTERNAL'
      };

      const validation = validateActivityForm(form);
      const html = renderActivityEditPage(
        form,
        validation,
        masterLocations,
        masterOrganizers,
        masterCategories,
        masterEmployees
      );

      // Verify Administrative Stage selector exists
      expect(html).toContain('Tahap Administrasi Kegiatan');
      expect(html).toContain('INITIAL_ENTRY');
      expect(html).toContain('OFFLINE_PROCESS');
      expect(html).toContain('DETAILS_COMPLETED');
      expect(html).toContain('ADMIN_COMPLETE');

      // Verify Invitation Letter panel exists with fields
      expect(html).toContain('Berkas & Rujukan Surat Undangan');
      expect(html).toContain('inputAgendaNumber');
      expect(html).toContain('inputLetterDate');
      expect(html).toContain('inputLetterTopic');
      expect(html).toContain('inputDriveUrl');

      // Verify safe Google Drive external link
      expect(html).toContain('href="https://drive.google.com/file/d/abc_test_url/view"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });
  });
});
