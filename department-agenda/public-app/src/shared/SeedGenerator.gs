/**
 * shared/SeedGenerator.js
 * Generates initial database seed for Dinas Koperasi dan Usaha Mikro Kota Batam.
 * Fully populates master data and the 3 official sample activities from the client's October 2026 agenda.
 */

const SeedGenerator = {
  getInitialDatabase() {
    return {
      Departments: [
        { department_id: 'dept-1', name: 'Sekretariat Dinas', active: true },
        { department_id: 'dept-2', name: 'Bidang Pemberdayaan & Fasilitasi Usaha Mikro', active: true },
        { department_id: 'dept-3', name: 'Bidang Kelembagaan & Pengawasan Koperasi', active: true }
      ],

      Employees: [
        { employee_id: 'emp-1', full_name: 'Dr. Hendri Arulan, S.Pd., M.M.', position: 'Kepala Dinas', department_id: 'dept-1', active: true },
        { employee_id: 'emp-2', full_name: 'Rahmat Sugiarto, S.E.', position: 'Sekretaris Dinas', department_id: 'dept-1', active: true },
        { employee_id: 'emp-3', full_name: 'Siti Nurhaliza, S.E.', position: 'Kepala Bidang Koperasi', department_id: 'dept-3', active: true },
        { employee_id: 'emp-4', full_name: 'Budi Santoso, S.Kom.', position: 'Kepala Bidang Usaha Mikro', department_id: 'dept-2', active: true },
        { employee_id: 'emp-5', full_name: 'Riska Harmonis, S.H.', position: 'Pejabat Fungsional / Pengawas Koperasi', department_id: 'dept-3', active: true },
        { employee_id: 'emp-6', full_name: 'Meydiana Esterawaty Jastina, S.E', position: 'Pengelola Pemberdayaan UMKM', department_id: 'dept-2', active: true },
        { employee_id: 'emp-7', full_name: 'Markholis Waldi, S.E., M.Ec.Dev', position: 'Analis Kebijakan Usaha Mikro', department_id: 'dept-2', active: true },
        { employee_id: 'emp-8', full_name: 'Maslinda, S.E.', position: 'Penyusun Program Anggaran dan Pelaporan', department_id: 'dept-1', active: true },
        { employee_id: 'emp-9', full_name: 'Wahyuni Sya\'arany, S.Kom.', position: 'Pranata Komputer Pelaksana', department_id: 'dept-1', active: true },
        { employee_id: 'emp-10', full_name: 'Emilia Kontesa, S.IP.', position: 'Pengadministrasi Umum', department_id: 'dept-1', active: true }
      ],

      Locations: [
        { location_id: 'loc-1', name: 'Ruang Rapat Kadis (Lantai 2)', location_type: 'OFFICE', active: true },
        { location_id: 'loc-2', name: 'Ruang Rapat Utama Gedung Diskum Batam', location_type: 'OFFICE', active: true },
        { location_id: 'loc-3', name: 'Dataran Engku Putri, Kantor Wali Kota Batam', location_type: 'EXTERNAL', active: true },
        { location_id: 'loc-4', name: 'Zoom Cloud Meeting', location_type: 'ONLINE', active: true },
        { location_id: 'loc-5', name: 'Ruang Rapat Inspektorat Daerah Kota Batam', location_type: 'EXTERNAL', active: true }
      ],

      Organizers: [
        { organizer_id: 'org-1', name: 'Sekretariat Daerah Kota Batam', active: true },
        { organizer_id: 'org-2', name: 'Dinas Koperasi dan Usaha Mikro Kota Batam', active: true },
        { organizer_id: 'org-3', name: 'Dinas Perindustrian dan Perdagangan Pemerintah Propinsi Jawa Barat', active: true },
        { organizer_id: 'org-4', name: 'Inspektorat Daerah Kota Batam', active: true }
      ],

      Categories: [
        { category_id: 'cat-1', name: 'Upacara & Protokoler', active: true },
        { category_id: 'cat-2', name: 'Rapat Koordinasi & Pendampingan', active: true },
        { category_id: 'cat-3', name: 'Sosialisasi & Pelatihan', active: true },
        { category_id: 'cat-4', name: 'Misi Dagang & Promosi', active: true }
      ],

      Activities: [
        {
          activity_id: 'act-sample-1',
          title: 'Upacara Peringatan Hari Kesaktian Pancasila Tingkat Kota Batam Tahun 2026',
          start_date: '2026-10-01',
          start_time: '07:00',
          end_date: '2026-10-01',
          end_time: null,
          location_id: 'loc-3',
          organizer_id: 'org-1',
          category_id: 'cat-1',
          status: 'SCHEDULED',
          public_notes: 'Pakaian : PSL',
          private_notes: 'Standby kendaraan dinas pukul 06.15 WIB di lobi',
          private_meeting_url: '',
          cancel_reason: '',
          version: 1,
          created_at: '2026-09-28T08:00:00Z',
          created_by: 'Operator Admin Staging',
          updated_at: '2026-09-28T08:00:00Z',
          updated_by: 'Operator Admin Staging'
        },
        {
          activity_id: 'act-sample-2',
          title: 'Pitching Misi Dagang Provinsi Jawa Barat dengan Provinsi Kepulauan Riau',
          start_date: '2026-10-01',
          start_time: '09:00',
          end_date: '2026-10-01',
          end_time: null,
          location_id: 'loc-4',
          organizer_id: 'org-3',
          category_id: 'cat-4',
          status: 'SCHEDULED',
          public_notes: 'para pelaku usaha yang dapat diisi melalui tautan berikut: https://s.id/KehadiranPitchingPUKepri-Jabar',
          private_notes: 'Meeting ID: 850 000 5418 Passcode: ppdn146',
          private_meeting_url: 'https://us06web.zoom.us/j/8500005418?pwd=KobKrNRKzadXbSNj69WthpMIhoFaKb.1&omn=83747924524',
          cancel_reason: '',
          version: 1,
          created_at: '2026-09-28T08:15:00Z',
          created_by: 'Operator Admin Staging',
          updated_at: '2026-09-28T08:15:00Z',
          updated_by: 'Operator Admin Staging'
        },
        {
          activity_id: 'act-sample-3',
          title: 'Pelaksanaan Pendampingan SAKIP Perangkat Daerah di Lingkungan Pemerintah Kota Batam',
          start_date: '2026-10-01',
          start_time: '09:00',
          end_date: '2026-10-01',
          end_time: null,
          location_id: 'loc-5',
          organizer_id: 'org-4',
          category_id: 'cat-2',
          status: 'SCHEDULED',
          public_notes: '',
          private_notes: 'Membawa draft laporan capaian IKU triwulan III',
          private_meeting_url: '',
          cancel_reason: '',
          version: 1,
          created_at: '2026-09-28T08:30:00Z',
          created_by: 'Operator Admin Staging',
          updated_at: '2026-09-28T08:30:00Z',
          updated_by: 'Operator Admin Staging'
        }
      ],

      ActivityAttendees: [
        // Attendees act-sample-1
        { attendee_id: 'att-s1-1', activity_id: 'act-sample-1', employee_id: 'emp-1', guest_name: '', attendee_role: 'Kadis', name_snapshot: 'Dr. Hendri Arulan, S.Pd., M.M.', position_snapshot: 'Kepala Dinas', public_label: '1. Kadis' },
        { attendee_id: 'att-s1-2', activity_id: 'act-sample-1', employee_id: 'emp-2', guest_name: '', attendee_role: 'Sekretaris', name_snapshot: 'Rahmat Sugiarto, S.E.', position_snapshot: 'Sekretaris Dinas', public_label: '2. Sekretaris' },
        { attendee_id: 'att-s1-3', activity_id: 'act-sample-1', employee_id: 'emp-3', guest_name: '', attendee_role: 'Kabid', name_snapshot: 'Siti Nurhaliza, S.E.', position_snapshot: 'Kepala Bidang Koperasi', public_label: '3. Kabid' },

        // Attendees act-sample-2
        { attendee_id: 'att-s2-1', activity_id: 'act-sample-2', employee_id: 'emp-5', guest_name: '', attendee_role: 'Peserta', name_snapshot: 'Riska Harmonis, S.H.', position_snapshot: 'Pengawas Koperasi', public_label: '1. Riska Harmonis, S.H.' },
        { attendee_id: 'att-s2-2', activity_id: 'act-sample-2', employee_id: 'emp-6', guest_name: '', attendee_role: 'Peserta', name_snapshot: 'Meydiana Esterawaty Jastina, S.E', position_snapshot: 'Pengelola Pemberdayaan UMKM', public_label: '2. Meydiana Esterawaty Jastina, S.E' },
        { attendee_id: 'att-s2-3', activity_id: 'act-sample-2', employee_id: 'emp-7', guest_name: '', attendee_role: 'Peserta', name_snapshot: 'Markholis Waldi, S.E., M.Ec.Dev', position_snapshot: 'Analis Kebijakan', public_label: '3. Markholis Waldi, S.E., M.Ec.Dev' },

        // Attendees act-sample-3
        { attendee_id: 'att-s3-1', activity_id: 'act-sample-3', employee_id: 'emp-8', guest_name: '', attendee_role: 'Peserta', name_snapshot: 'Maslinda, S.E.', position_snapshot: 'Penyusun Program', public_label: '1. Maslinda, S.E.' },
        { attendee_id: 'att-s3-2', activity_id: 'act-sample-3', employee_id: 'emp-9', guest_name: '', attendee_role: 'Peserta', name_snapshot: 'Wahyuni Sya\'arany, S.Kom.', position_snapshot: 'Pranata Komputer', public_label: '3. Wahyuni Sya\'arany, S.Kom.' },
        { attendee_id: 'att-s3-3', activity_id: 'act-sample-3', employee_id: 'emp-10', guest_name: '', attendee_role: 'Peserta', name_snapshot: 'Emilia Kontesa, S.IP.', position_snapshot: 'Pengadministrasi Umum', public_label: '4. Emilia Kontesa, S.IP.' }
      ],

      Announcements: [
        {
          announcement_id: 'ann-batam-1',
          title: 'Himbauan Pakaian Dinas Hari Kesaktian Pancasila',
          body: 'Seluruh pegawai eselon II dan III di lingkungan Pemko Batam mengenakan Pakaian Sipil Lengkap (PSL).',
          publish_at: '2026-09-25T00:00:00Z',
          expires_at: '2026-10-02T23:59:59Z',
          active: true
        }
      ],

      AuditLogs: [
        {
          log_id: 'audit-init-1',
          request_id: 'req-init',
          timestamp: '2026-09-28T08:00:00Z',
          actor_label: 'System Initializer',
          action: 'SEED_INITIAL_DATA',
          entity_id: 'DATABASE',
          before_json: '',
          after_json: '{"status":"INITIALIZED","identity_source":"UNVERIFIED"}'
        }
      ],

      Settings: [
        { key: 'DEPARTMENT_NAME', value: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM' },
        { key: 'EXPORT_TITLE', value: 'JADWAL KEGIATAN DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM' },
        { key: 'TIMEZONE', value: 'Asia/Jakarta' }
      ]
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeedGenerator;
}
if (typeof globalThis !== 'undefined') {
  globalThis.SeedGenerator = SeedGenerator;
}
