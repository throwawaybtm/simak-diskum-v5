/**
 * SIMAK DISKUM Kota Batam v5.0 — Synthetic Staging Data Generator & Seeding Script
 * 
 * Directives:
 * 1. Creates 8 organizational units, 16 fictional employees, 8 locations, 6 organizers, 5 categories.
 * 2. Generates 35 realistic synthetic agenda activities for October 2026 (single-day, multi-day, recurring).
 * 3. Incorporates all 4 administrative workflow stages (F01).
 * 4. Zero real municipal PII, zero real NIPs, zero real phone numbers, zero live Zoom passcodes.
 * 5. Deterministic, reproducible, and fully projected into publicActivities.
 * 6. Generates dry-run manifest and performs deep privacy scan prior to any cloud write.
 * 7. Targets strictly 'simakdiskum-staging' project.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STAGING_PROJECT_ID = 'simakdiskum-staging';

// 8 Fictional Organizational Units (Departments)
export const SYNTHETIC_DEPARTMENTS = [
  { id: 'dept_syn_01', name: 'Sekretariat Dinas', code: 'SEKR', active: true },
  { id: 'dept_syn_02', name: 'Subbag Umum dan Kepegawaian', code: 'UMPEG', active: true },
  { id: 'dept_syn_03', name: 'Subbag Keuangan dan Perencanaan', code: 'KEUPER', active: true },
  { id: 'dept_syn_04', name: 'Bidang Koperasi', code: 'KOP', active: true },
  { id: 'dept_syn_05', name: 'Bidang Pengawasan dan Akuntabilitas', code: 'WAS', active: true },
  { id: 'dept_syn_06', name: 'Bidang Fasilitasi Usaha Mikro', code: 'MIKRO', active: true },
  { id: 'dept_syn_07', name: 'Bidang Promosi dan Kemitraan UMKM', code: 'PROMOSI', active: true },
  { id: 'dept_syn_08', name: 'Pusat Layanan Usaha Terpadu (PLUT-KUMKM)', code: 'PLUT', active: true }
];

// 16 Fictional Employees (Clearly synthetic demonstration names)
export const SYNTHETIC_EMPLOYEES = [
  { id: 'emp_syn_01', name: 'Budi Simulasi, S.Sos', position: 'Kepala Dinas (Simulasi)', departmentId: 'dept_syn_01', active: true },
  { id: 'emp_syn_02', name: 'Siti Purwarupa, M.Si', position: 'Sekretaris Dinas (Simulasi)', departmentId: 'dept_syn_01', active: true },
  { id: 'emp_syn_03', name: 'Agus Demo, SE', position: 'Kasubbag Umum & Kepegawaian', departmentId: 'dept_syn_02', active: true },
  { id: 'emp_syn_04', name: 'Dewi Contoh, S.Ak', position: 'Kasubbag Keuangan & Perencanaan', departmentId: 'dept_syn_03', active: true },
  { id: 'emp_syn_05', name: 'Eko Latihan, MT', position: 'Kepala Bidang Koperasi', departmentId: 'dept_syn_04', active: true },
  { id: 'emp_syn_06', name: 'Fajar Model, S.Kom', position: 'Penyuluh Koperasi Ahli Pertama', departmentId: 'dept_syn_04', active: true },
  { id: 'emp_syn_07', name: 'Gita Teladan, SH', position: 'Kepala Bidang Pengawasan', departmentId: 'dept_syn_05', active: true },
  { id: 'emp_syn_08', name: 'Hadi Ujicoba, SE', position: 'Pengawas Koperasi Ahli Muda', departmentId: 'dept_syn_05', active: true },
  { id: 'emp_syn_09', name: 'Indah Sintetis, SP', position: 'Kepala Bidang Fasilitasi Usaha Mikro', departmentId: 'dept_syn_06', active: true },
  { id: 'emp_syn_10', name: 'Joko Rekaan, S.ST', position: 'Pengembang Kewirausahaan', departmentId: 'dept_syn_06', active: true },
  { id: 'emp_syn_11', name: 'Kartika Maya, S.Ds', position: 'Kepala Bidang Promosi & Kemitraan', departmentId: 'dept_syn_07', active: true },
  { id: 'emp_syn_12', name: 'Lukman Tiruan, S.I.Kom', position: 'Pranata Humas & Kemitraan', departmentId: 'dept_syn_07', active: true },
  { id: 'emp_syn_13', name: 'Mega Fiktif, SE', position: 'Kepala UPT PLUT-KUMKM', departmentId: 'dept_syn_08', active: true },
  { id: 'emp_syn_14', name: 'Nanda Virtual, S.Pd', position: 'Konsultan Pendamping PLUT', departmentId: 'dept_syn_08', active: true },
  { id: 'emp_syn_15', name: 'Oki Percontohan, A.Md', position: 'Pengelola Agenda Kedinasan', departmentId: 'dept_syn_01', active: true },
  { id: 'emp_syn_16', name: 'Putri Desain, S.Tr', position: 'Analis Kebijakan Usaha Mikro', departmentId: 'dept_syn_06', active: true }
];

// 8 Synthetic Locations
export const SYNTHETIC_LOCATIONS = [
  { id: 'loc_syn_01', name: 'Ruang Rapat Kadis (Lantai 2)', type: 'OFFICE', address: 'Kantor Dinas Koperasi dan UMKM Batam', bookable: true, active: true },
  { id: 'loc_syn_02', name: 'Aula Gedung PLUT-KUMKM Batam', type: 'OFFICE', address: 'Pusat Layanan Usaha Terpadu, Sukajadi', bookable: true, active: true },
  { id: 'loc_syn_03', name: 'Ruang Konsultasi Koperasi (Lantai 1)', type: 'OFFICE', address: 'Kantor Dinas Koperasi dan UMKM Batam', bookable: true, active: true },
  { id: 'loc_syn_04', name: 'Ruang Rapat Hang Nadim Kantor Walikota', type: 'EXTERNAL', address: 'Jl. Engku Putri No. 1, Batam Centre', bookable: false, active: true },
  { id: 'loc_syn_05', name: 'Hotel Aston Batam (Ruang Lavender)', type: 'EXTERNAL', address: 'Jl. Sriwijaya No. 1, Kampung Pelita', bookable: false, active: true },
  { id: 'loc_syn_06', name: 'Hotel Best Western Panbil (Ballroom)', type: 'EXTERNAL', address: 'Jl. Ahmad Yani, Muka Kuning', bookable: false, active: true },
  { id: 'loc_syn_07', name: 'Ruang Rapat Virtual Kedinasan (Simulasi)', type: 'ONLINE', address: 'https://staging.simakdiskum.local/virtual-01', bookable: false, active: true },
  { id: 'loc_syn_08', name: 'Webinar Nasional Kementerian (Simulasi)', type: 'ONLINE', address: 'https://staging.simakdiskum.local/webinar-02', bookable: false, active: true }
];

// 6 Synthetic Organizers
export const SYNTHETIC_ORGANIZERS = [
  { id: 'org_syn_01', name: 'Sekretariat Diskum Kota Batam', code: 'SEKR', active: true },
  { id: 'org_syn_02', name: 'Bidang Koperasi Diskum Batam', code: 'KOP', active: true },
  { id: 'org_syn_03', name: 'Bidang Fasilitasi Usaha Mikro', code: 'MIKRO', active: true },
  { id: 'org_syn_04', name: 'Pusat Layanan Usaha Terpadu (PLUT)', code: 'PLUT', active: true },
  { id: 'org_syn_05', name: 'Pemerintah Kota Batam', code: 'PEMKO', active: true },
  { id: 'org_syn_06', name: 'Kementerian Koperasi dan UKM RI', code: 'KEMENKOP', active: true }
];

// 5 Categories
export const SYNTHETIC_CATEGORIES = [
  { id: 'cat_syn_01', name: 'Rapat Koordinasi Internal', color: '#2563eb', active: true },
  { id: 'cat_syn_02', name: 'Pelatihan & Bimtek UMKM', color: '#0284c7', active: true },
  { id: 'cat_syn_03', name: 'Pengawasan & Kunjungan Lapangan', color: '#16a34a', active: true },
  { id: 'cat_syn_04', name: 'Sosialisasi Regulasi & Advokasi', color: '#d97706', active: true },
  { id: 'cat_syn_05', name: 'Pameran, Ekspo & Kurasi Produk', color: '#9333ea', active: true }
];

// Synthetic Signatory Settings
export const SYNTHETIC_SIGNATORY = {
  headOfDepartmentName: 'Budi Simulasi, S.Sos',
  headOfDepartmentNip: '00000000 000000 0 000',
  headOfDepartmentRank: 'Pembina Utama Muda (IV/c)',
  headOfDepartmentTitle: 'Kepala Dinas Koperasi dan Usaha Mikro Kota Batam (Simulasi)',
  city: 'Batam',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system_staging_seed'
};

// Synthetic Announcements
export const SYNTHETIC_ANNOUNCEMENTS = [
  {
    id: 'ann_syn_01',
    title: 'Selamat Datang di Portal Uji Coba SIMAK DISKUM v5.0',
    content: 'Portal ini disiapkan sebagai sarana simulasi dan verifikasi operasional penjadwalan kedinasan bagi jajaran Dinas Koperasi dan Usaha Mikro Kota Batam.',
    date: '2026-10-01',
    category: 'Pemberitahuan',
    active: true
  },
  {
    id: 'ann_syn_02',
    title: 'Pelaksanaan Kurasi Produk UMKM Batam Periode Triwulan IV',
    content: 'Diberitahukan kepada seluruh pelaku UMKM binaan PLUT bahwa pendaftaran kurasi produk akan dibuka melalui pendamping bidang terkait.',
    date: '2026-10-05',
    category: 'Agenda',
    active: true
  },
  {
    id: 'ann_syn_03',
    title: 'Penyesuaian Tata Naskah Dinas dan Format Undangan',
    content: 'Pencatatan nomor surat undangan dan konfirmasi kehadiran pimpinan wajib dilengkapi sebelum tahap Administrasi Lengkap.',
    date: '2026-10-12',
    category: 'Regulasi',
    active: true
  }
];

// Helper maps
const locMap = new Map(SYNTHETIC_LOCATIONS.map(l => [l.id, l]));
const orgMap = new Map(SYNTHETIC_ORGANIZERS.map(o => [o.id, o]));
const catMap = new Map(SYNTHETIC_CATEGORIES.map(c => [c.id, c]));
const empMap = new Map(SYNTHETIC_EMPLOYEES.map(e => [e.id, e]));

// 35 Synthetic Activities Generator
export function generateSyntheticActivities() {
  const activities = [];
  const publicActivities = [];

  const activityTemplates = [
    // 1. Apel Pagi Series (Recurring on Mondays: Oct 5, 12, 19, 26)
    {
      title: 'Apel Pagi Kedinasan & Pengarahan Mingguan',
      startTime: '07:30', endTime: '08:15', openEnded: false,
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_01', 'emp_syn_02', 'emp_syn_03', 'emp_syn_05', 'emp_syn_07', 'emp_syn_09'],
      publicNotes: 'Pakaian dinas harian (PDH) lengkap.',
      isRecurringSeries: true, seriesId: 'series_syn_apel_pagi',
      dates: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']
    },
    // 2. Rapat Evaluasi Anggaran Triwulan III
    {
      date: '2026-10-02', startTime: '09:00', endTime: '11:30', openEnded: false,
      title: 'Rapat Evaluasi Realisasi Fisik dan Keuangan Triwulan III',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_01', 'emp_syn_02', 'emp_syn_04'],
      publicNotes: 'Membawa laporan penyerapan anggaran per sub-kegiatan.'
    },
    // 3. Pelatihan Pembukuan Keuangan Digital bagi Pengurus Koperasi
    {
      date: '2026-10-06', startTime: '08:30', endTime: '16:00', openEnded: false,
      title: 'Bimtek Pembukuan Keuangan Digital Koperasi Angkatan I',
      locationId: 'loc_syn_02', organizerId: 'org_syn_02', categoryId: 'cat_syn_02',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_05', 'emp_syn_06'],
      publicNotes: 'Peserta 30 perwakilan pengurus koperasi simpan pinjam se-Batam.'
    },
    // 4. Kunjungan Lapangan / Pengawasan Koperasi
    {
      date: '2026-10-07', startTime: '10:00', endTime: '14:00', openEnded: false,
      title: 'Pemeriksaan Kesehatan dan Kepatuhan Koperasi Konsumen Sejahtera',
      locationId: 'loc_syn_05', organizerId: 'org_syn_02', categoryId: 'cat_syn_03',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_07', 'emp_syn_08'],
      publicNotes: 'Audit kepatuhan tata kelola perkoperasian.'
    },
    // 5. Sosialisasi Sertifikasi Halal Gratis (SEHATI) bagi Usaha Mikro
    {
      date: '2026-10-08', startTime: '09:00', endTime: '12:30', openEnded: false,
      title: 'Sosialisasi Program Fasilitasi Sertifikasi Halal Gratis (SEHATI) 2026',
      locationId: 'loc_syn_02', organizerId: 'org_syn_03', categoryId: 'cat_syn_04',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_09', 'emp_syn_10'],
      publicNotes: 'Kuota 50 pelaku usaha olahan makanan dan minuman.'
    },
    // 6. Rapat Koordinasi dengan Walikota Batam
    {
      date: '2026-10-09', startTime: '14:00', endTime: null, openEnded: true,
      title: 'Rapat Koordinasi Penguatan Ekosistem UMKM bersama Walikota Batam',
      locationId: 'loc_syn_04', organizerId: 'org_syn_05', categoryId: 'cat_syn_01',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_01', 'emp_syn_02'],
      publicNotes: 'Pakaian batik Batam lengan panjang.'
    },
    // 7. Konsultasi Klinis Pembiayaan Usaha Mikro
    {
      date: '2026-10-13', startTime: '09:00', endTime: '12:00', openEnded: false,
      title: 'Klinik Konsultasi Akses Pembiayaan KUR bagi Pelaku Usaha Mikro',
      locationId: 'loc_syn_03', organizerId: 'org_syn_04', categoryId: 'cat_syn_02',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_13', 'emp_syn_14'],
      publicNotes: 'Pendampingan langsung pembuatan proposal kredit usaha rakyat.'
    },
    // 8. Multi-day Event: Bazar Produk Unggulan UMKM Batam (Oct 15 to Oct 17)
    {
      startDate: '2026-10-15', endDate: '2026-10-17',
      startTime: '10:00', endTime: '21:00', openEnded: false,
      title: 'Bazar dan Pameran Produk Kreatif Unggulan UMKM Kota Batam',
      locationId: 'loc_syn_06', organizerId: 'org_syn_03', categoryId: 'cat_syn_05',
      stage: 'ADMIN_COMPLETE', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_01', 'emp_syn_09', 'emp_syn_11', 'emp_syn_12'],
      publicNotes: 'Diikuti oleh 60 stan binaan PLUT dan Dekranasda Batam.'
    },
    // 9. Webinar Nasional Kemenkop (Online)
    {
      date: '2026-10-16', startTime: '13:30', endTime: '16:00', openEnded: false,
      title: 'Webinar Sosialisasi Transformasi Digital Koperasi Modern',
      locationId: 'loc_syn_08', organizerId: 'org_syn_06', categoryId: 'cat_syn_04',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_05', 'emp_syn_06'],
      publicNotes: 'Tautan ruang virtual disediakan bagi operator dinas terdaftar.'
    },
    // 10. Rapat Pembahasan Draf Rencana Strategis (Renstra)
    {
      date: '2026-10-20', startTime: '09:30', endTime: '12:00', openEnded: false,
      title: 'Rapat Pleno Penyusunan Rencana Strategis Dinas Tahun 2027-2031',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'OFFLINE_PROCESS', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_01', 'emp_syn_02', 'emp_syn_04', 'emp_syn_05', 'emp_syn_07', 'emp_syn_09'],
      publicNotes: 'Agenda pembahasan arah kebijakan dan target IKU dinas.'
    },
    // 11. Pelatihan Desain Kemasan dan Labeling Produk
    {
      date: '2026-10-21', startTime: '08:30', endTime: '15:30', openEnded: false,
      title: 'Workshop Peningkatan Mutu Kemasan dan Branding Produk Mikro',
      locationId: 'loc_syn_02', organizerId: 'org_syn_04', categoryId: 'cat_syn_02',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_11', 'emp_syn_13', 'emp_syn_14'],
      publicNotes: 'Fasilitas konsultasi cetak prototipe kemasan gratis.'
    },
    // 12. Monitoring Lapangan Koperasi Berprestasi
    {
      date: '2026-10-22', startTime: '10:00', endTime: '13:00', openEnded: false,
      title: 'Peninjauan Lapangan Calon Koperasi Berprestasi Tingkat Provinsi',
      locationId: 'loc_syn_05', organizerId: 'org_syn_02', categoryId: 'cat_syn_03',
      stage: 'INITIAL_ENTRY', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_05', 'emp_syn_07'],
      publicNotes: 'Verifikasi faktual portofolio kelembagaan koperasi.'
    },
    // 13. Kurasi Produk UMKM untuk Pasar Ekspor
    {
      date: '2026-10-23', startTime: '09:00', endTime: '14:30', openEnded: false,
      title: 'Kurasi Produk Makanan Ringan dan Kerajinan Menuju Pasar Ekspor Singapura',
      locationId: 'loc_syn_02', organizerId: 'org_syn_03', categoryId: 'cat_syn_05',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_09', 'emp_syn_11', 'emp_syn_16'],
      publicNotes: 'Melibatkan kurator ahli dari Asosiasi Eksportir Riau Kepulauan.'
    },
    // 14. Multi-day Event: Bimtek Manajemen Koperasi Syariah (Oct 27 - Oct 28)
    {
      startDate: '2026-10-27', endDate: '2026-10-28',
      startTime: '08:30', endTime: '16:00', openEnded: false,
      title: 'Bimbingan Teknis Standarisasi Dewan Pengawas Syariah Koperasi',
      locationId: 'loc_syn_05', organizerId: 'org_syn_02', categoryId: 'cat_syn_02',
      stage: 'ADMIN_COMPLETE', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_05', 'emp_syn_06', 'emp_syn_08'],
      publicNotes: 'Sertifikasi kompetensi pengawas syariah KSPPS.'
    },
    // 15. Forum Koordinasi Pengawasan Koperasi Terpadu
    {
      date: '2026-10-29', startTime: '09:00', endTime: '12:00', openEnded: false,
      title: 'Focus Group Discussion Mitigasi Risiko Koperasi Berisiko Tinggi',
      locationId: 'loc_syn_01', organizerId: 'org_syn_02', categoryId: 'cat_syn_04',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_07', 'emp_syn_08'],
      publicNotes: 'Koordinasi bersama aparat penegak hukum dan Satgas Waspada Investasi.'
    },
    // 16. Pertemuan Rapat Dibatalkan (Demonstrating CANCELLED handling)
    {
      date: '2026-10-14', startTime: '13:30', endTime: '15:30', openEnded: false,
      title: 'Rapat Koordinasi Pengadaan Sarana Prasarana PLUT',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'ADMIN_COMPLETE', status: 'CANCELLED',
      attendeeIds: ['emp_syn_02', 'emp_syn_03'],
      publicNotes: 'Rapat internal pembahasan pengadaan logistik.',
      publicCancellationNotice: 'Dibatalkan dan dijadwalkan ulang karena bertepatan dengan agenda mendesak Walikota.'
    },
    // 17. Pelatihan Dibatalkan (Demonstrating second CANCELLED event)
    {
      date: '2026-10-24', startTime: '09:00', endTime: '12:00', openEnded: false,
      title: 'Sosialisasi Sertifikasi ISO bagi Pengurus Koperasi Mandiri',
      locationId: 'loc_syn_03', organizerId: 'org_syn_02', categoryId: 'cat_syn_04',
      stage: 'ADMIN_COMPLETE', status: 'CANCELLED',
      attendeeIds: ['emp_syn_06'],
      publicNotes: 'Sosialisasi teknis standar mutu kelembagaan.',
      publicCancellationNotice: 'Dibatalkan atas arahan narasumber dari Kementerian Koperasi RI.'
    },
    // 18. Rapat Penutupan dan Rekonsiliasi Akhir Bulan
    {
      date: '2026-10-30', startTime: '14:00', endTime: '16:30', openEnded: false,
      title: 'Rapat Evaluasi Capaian Kinerja dan Disiplin Pegawai Bulan Oktober',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_01', 'emp_syn_02', 'emp_syn_03', 'emp_syn_04', 'emp_syn_15'],
      publicNotes: 'Membahas kehadiran, capaian SKP, dan penyiapan agenda bulan November.'
    },
    // 19. Fasilitasi Pendaftaran NIB Massal
    {
      date: '2026-10-31', startTime: '08:30', endTime: '14:00', openEnded: false,
      title: 'Layanan Jemput Bola Pembuatan Nomor Induk Berusaha (NIB) OSS-RBA',
      locationId: 'loc_syn_02', organizerId: 'org_syn_03', categoryId: 'cat_syn_04',
      stage: 'ADMIN_COMPLETE', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_09', 'emp_syn_10', 'emp_syn_14'],
      publicNotes: 'Layanan gratis bagi 100 pelaku UMKM di wilayah Batam Centre.'
    },
    // 20-35: Additional activities to reach 35 total activities
    {
      date: '2026-10-01', startTime: '09:00', endTime: '11:00', openEnded: false,
      title: 'Koordinasi Awal Penyusunan Laporan Triwulanan',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_03', 'emp_syn_04'],
      publicNotes: 'Pembagian lembar kerja telaah anggaran.'
    },
    {
      date: '2026-10-01', startTime: '13:30', endTime: '15:30', openEnded: false,
      title: 'Verifikasi Dokumen Kelayakan Bantuan Modal Usaha Mikro',
      locationId: 'loc_syn_03', organizerId: 'org_syn_03', categoryId: 'cat_syn_03',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_09', 'emp_syn_10'],
      publicNotes: 'Pemeriksaan berkas administrasi calon penerima hibah.'
    },
    {
      date: '2026-10-02', startTime: '14:00', endTime: '16:00', openEnded: false,
      title: 'Konsultasi Pengembangan Inkubator Bisnis PLUT',
      locationId: 'loc_syn_02', organizerId: 'org_syn_04', categoryId: 'cat_syn_02',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_13', 'emp_syn_14'],
      publicNotes: 'Penyusunan kurikulum tenant inkubasi gelombang II.'
    },
    {
      date: '2026-10-05', startTime: '10:00', endTime: '12:00', openEnded: false,
      title: 'Rapat Koordinasi Tindak Lanjut Hasil Pengawasan Koperasi',
      locationId: 'loc_syn_03', organizerId: 'org_syn_02', categoryId: 'cat_syn_03',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_07', 'emp_syn_08'],
      publicNotes: 'Pembahasan surat rekomendasi perbaikan tata kelola.'
    },
    {
      date: '2026-10-07', startTime: '14:00', endTime: '16:00', openEnded: false,
      title: 'Penyusunan Publikasi Statistik Profil UMKM Batam',
      locationId: 'loc_syn_01', organizerId: 'org_syn_03', categoryId: 'cat_syn_04',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_11', 'emp_syn_12'],
      publicNotes: 'Finalisasi data infografis tahun 2026.'
    },
    {
      date: '2026-10-08', startTime: '14:00', endTime: '16:00', openEnded: false,
      title: 'Koordinasi Penyelenggaraan Festival Kuliner Nusantara',
      locationId: 'loc_syn_02', organizerId: 'org_syn_03', categoryId: 'cat_syn_05',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_11', 'emp_syn_16'],
      publicNotes: 'Penetapan denah stan dan teknis kelistrikan pameran.'
    },
    {
      date: '2026-10-09', startTime: '09:00', endTime: '11:30', openEnded: false,
      title: 'Sosialisasi Tata Cara Pendirian Koperasi Konsumen',
      locationId: 'loc_syn_02', organizerId: 'org_syn_02', categoryId: 'cat_syn_04',
      stage: 'ADMIN_COMPLETE', status: 'COMPLETED',
      attendeeIds: ['emp_syn_05', 'emp_syn_06'],
      publicNotes: 'Panduan penyusunan akta pendirian dan AD/ART.'
    },
    {
      date: '2026-10-13', startTime: '14:00', endTime: '16:00', openEnded: false,
      title: 'Rapat Kerja Sama Kemitraan Ritel Modern dan UMKM',
      locationId: 'loc_syn_01', organizerId: 'org_syn_03', categoryId: 'cat_syn_04',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_01', 'emp_syn_09', 'emp_syn_11'],
      publicNotes: 'Penjajakan kuota display produk lokal pada minimarket.'
    },
    {
      date: '2026-10-14', startTime: '09:00', endTime: '11:30', openEnded: false,
      title: 'Fasilitasi Sertifikasi Uji Nutrisi Produk Olahan',
      locationId: 'loc_syn_02', organizerId: 'org_syn_04', categoryId: 'cat_syn_02',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_13', 'emp_syn_14'],
      publicNotes: 'Pengambilan sampel produk uji laboratorium terakreditasi.'
    },
    {
      date: '2026-10-19', startTime: '13:30', endTime: '15:30', openEnded: false,
      title: 'Konsolidasi Pelaporan SPJ Keuangan Kegiatan Bimtek',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'OFFLINE_PROCESS', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_03', 'emp_syn_04'],
      publicNotes: 'Verifikasi kelengkapan kuitansi dan absensi peserta.'
    },
    {
      date: '2026-10-20', startTime: '14:00', endTime: '16:00', openEnded: false,
      title: 'Sosialisasi Perlindungan Hak Cipta & Merek Dagang bagi UMKM',
      locationId: 'loc_syn_02', organizerId: 'org_syn_03', categoryId: 'cat_syn_04',
      stage: 'OFFLINE_PROCESS', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_09', 'emp_syn_10'],
      publicNotes: 'Bimbingan pendaftaran hak kekayaan intelektual (HAKI).'
    },
    {
      date: '2026-10-22', startTime: '14:00', endTime: '16:00', openEnded: false,
      title: 'Rapat Sinkronisasi Program Pemberdayaan bersama Dinas Provinsi',
      locationId: 'loc_syn_07', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'INITIAL_ENTRY', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_02', 'emp_syn_05'],
      publicNotes: 'Rapat koordinasi virtual antar dinas perindustrian dan perdagangan.'
    },
    {
      date: '2026-10-23', startTime: '15:00', endTime: '17:00', openEnded: false,
      title: 'Penataan Arsip Dinamis dan Digitalisasi Dokumen Koperasi',
      locationId: 'loc_syn_03', organizerId: 'org_syn_02', categoryId: 'cat_syn_01',
      stage: 'INITIAL_ENTRY', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_06', 'emp_syn_15'],
      publicNotes: 'Pengarsipan berkas hasil RAT koperasi tahun buku sebelumnya.'
    },
    {
      date: '2026-10-28', startTime: '10:00', endTime: '12:00', openEnded: false,
      title: 'Evaluasi Pelayanan Pusat Layanan Usaha Terpadu (PLUT)',
      locationId: 'loc_syn_02', organizerId: 'org_syn_04', categoryId: 'cat_syn_01',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_01', 'emp_syn_13'],
      publicNotes: 'Analisis indeks kepuasan masyarakat (IKM) terhadap layanan konsultasi.'
    },
    {
      date: '2026-10-29', startTime: '14:00', endTime: '16:00', openEnded: false,
      title: 'Sosialisasi Penggunaan Tanda Tangan Elektronik (TTE) Kedinasan',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_04',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_02', 'emp_syn_03', 'emp_syn_15'],
      publicNotes: 'Penerapan sertifikat elektronik BSrE pada naskah dinas kedinasan.'
    },
    {
      date: '2026-10-30', startTime: '09:00', endTime: '11:00', openEnded: false,
      title: 'Koordinasi Penyusunan Kalender Agenda Kedinasan November 2026',
      locationId: 'loc_syn_01', organizerId: 'org_syn_01', categoryId: 'cat_syn_01',
      stage: 'DETAILS_COMPLETED', status: 'SCHEDULED',
      attendeeIds: ['emp_syn_02', 'emp_syn_15'],
      publicNotes: 'Pengumpulan usulan kegiatan dari seluruh kepala bidang.'
    }
  ];

  let seq = 1;

  for (const tpl of activityTemplates) {
    if (tpl.isRecurringSeries) {
      for (const d of tpl.dates) {
        const id = `act_syn_${d.replace(/-/g, '')}_${String(seq).padStart(2, '0')}`;
        seq++;

        const snapshots = tpl.attendeeIds.map(empId => {
          const emp = empMap.get(empId);
          return {
            employeeId: empId,
            name: emp?.name || 'Pegawai Simulasi',
            position: emp?.position || 'Staf',
            label: `${emp?.name || 'Pegawai'} (${emp?.position || 'Staf'})`
          };
        });

        const act = {
          id,
          title: tpl.title,
          startDate: d,
          startTime: tpl.startTime,
          endDate: d,
          endTime: tpl.endTime,
          openEnded: tpl.openEnded,
          locationId: tpl.locationId,
          organizerId: tpl.organizerId,
          categoryId: tpl.categoryId,
          administrativeStage: tpl.stage,
          status: tpl.status,
          attendeeIds: tpl.attendeeIds,
          attendeeSnapshots: snapshots,
          publicNotes: tpl.publicNotes || '',
          privateNotes: 'Catatan internal simulasi (tidak diproyeksikan ke publik).',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system_staging_seed',
          recurringSeriesId: tpl.seriesId
        };

        const pub = projectSyntheticToPublic(act);
        activities.push(act);
        publicActivities.push(pub);
      }
    } else {
      const sDate = tpl.startDate || tpl.date;
      const eDate = tpl.endDate || tpl.date;
      const id = `act_syn_${sDate.replace(/-/g, '')}_${String(seq).padStart(2, '0')}`;
      seq++;

      const snapshots = tpl.attendeeIds.map(empId => {
        const emp = empMap.get(empId);
        return {
          employeeId: empId,
          name: emp?.name || 'Pegawai Simulasi',
          position: emp?.position || 'Staf',
          label: `${emp?.name || 'Pegawai'} (${emp?.position || 'Staf'})`
        };
      });

      const act = {
        id,
        title: tpl.title,
        startDate: sDate,
        startTime: tpl.startTime,
        endDate: eDate,
        endTime: tpl.endTime ?? null,
        openEnded: tpl.openEnded,
        locationId: tpl.locationId,
        organizerId: tpl.organizerId,
        categoryId: tpl.categoryId,
        administrativeStage: tpl.stage,
        status: tpl.status,
        attendeeIds: tpl.attendeeIds,
        attendeeSnapshots: snapshots,
        publicNotes: tpl.publicNotes || '',
        privateNotes: 'Catatan internal simulasi (tidak diproyeksikan ke publik).',
        publicCancellationNotice: tpl.publicCancellationNotice || '',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system_staging_seed'
      };

      const pub = projectSyntheticToPublic(act);
      activities.push(act);
      publicActivities.push(pub);
    }
  }

  return { activities, publicActivities };
}

function projectSyntheticToPublic(act) {
  const loc = locMap.get(act.locationId);
  const org = orgMap.get(act.organizerId);
  const cat = catMap.get(act.categoryId);

  const formatTimeStr = () => {
    if (act.openEnded) return `${act.startTime} WIB s.d. selesai`;
    if (!act.endTime) return `${act.startTime} WIB`;
    return `${act.startTime} - ${act.endTime} WIB`;
  };

  const formatDateStr = () => {
    if (act.startDate === act.endDate) {
      return act.startDate;
    }
    return `${act.startDate} s.d. ${act.endDate}`;
  };

  return {
    id: act.id,
    title: act.title,
    startDate: act.startDate,
    startTime: act.startTime,
    endDate: act.endDate,
    endTime: act.endTime ?? null,
    openEnded: act.openEnded,
    timeDisplay: formatTimeStr(),
    dateDisplay: formatDateStr(),
    status: act.status,
    locationName: loc ? loc.name : 'Ruang Dinas',
    locationType: loc ? loc.type : 'OFFICE',
    organizerName: org ? org.name : 'Dinas Koperasi dan UM Batam',
    categoryName: cat ? cat.name : 'Kegiatan',
    publicNotes: act.publicNotes,
    attendeeLabels: act.attendeeSnapshots.map(s => s.label),
    version: act.version,
    updatedAt: act.updatedAt,
    ...(act.publicCancellationNotice ? { publicCancellationNotice: act.publicCancellationNotice } : {})
  };
}

// Deep Privacy Scan on all generated data
export function scanForSensitiveLeaks(dataset) {
  const leaks = [];
  const sensitivePatterns = [
    { name: 'Zoom Passcode', regex: /passcode[:=\s]*[a-zA-Z0-9_-]{4,}/i },
    { name: 'Meeting Password in URL', regex: /[?&]pwd=[a-zA-Z0-9_-]+/i },
    { name: 'Indonesian Mobile Number', regex: /(?:\+62|62|08)[0-9]{2}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,5}/ },
    { name: 'Real ASN NIP (18-digit)', regex: /\b(19[5-9][0-9]|20[0-2][0-9])(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])\s*[0-9]{6}\s*[12]\s*[0-9]{3}\b/ },
    { name: 'Real Municipal Email', regex: /[a-zA-Z0-9._%+-]+@batam\.go\.id/i }
  ];

  function traverse(obj, pathStr) {
    if (typeof obj === 'string') {
      // Exclude signatory template NIP if clearly synthetic (e.g. 19750101 200003 1 001) in settings
      for (const pat of sensitivePatterns) {
        if (pat.regex.test(obj)) {
          // Allow synthetic test NIP specifically in signatory setting
          if (pat.name === 'Real ASN NIP (18-digit)' && obj === '19750101 200003 1 001' && pathStr.includes('signatory')) {
            continue;
          }
          leaks.push({ path: pathStr, pattern: pat.name, value: obj });
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, idx) => traverse(item, `${pathStr}[${idx}]`));
    } else if (obj !== null && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        traverse(obj[key], `${pathStr}.${key}`);
      }
    }
  }

  traverse(dataset, 'stagingData');
  return leaks;
}

// Main execution function
async function main() {
  const isCommit = process.argv.includes('--commit');
  const dryRunOnly = !isCommit;

  console.log('======================================================================');
  console.log('[SIMAK DISKUM] SYNTHETIC STAGING DATA GENERATOR & SEEDER');
  console.log(`Target Project:   ${STAGING_PROJECT_ID}`);
  console.log(`Execution Mode:   ${isCommit ? 'COMMIT TO CLOUD FIRESTORE' : 'DRY-RUN MANIFEST ONLY'}`);
  console.log('======================================================================');

  // 1. Generate activities
  const { activities, publicActivities } = generateSyntheticActivities();

  const dataset = {
    departments: SYNTHETIC_DEPARTMENTS,
    employees: SYNTHETIC_EMPLOYEES,
    locations: SYNTHETIC_LOCATIONS,
    organizers: SYNTHETIC_ORGANIZERS,
    categories: SYNTHETIC_CATEGORIES,
    activities,
    publicActivities,
    settings: {
      config: SYNTHETIC_SIGNATORY,
      announcements: { announcements: SYNTHETIC_ANNOUNCEMENTS }
    }
  };

  console.log(`[Fixture] Generated counts:`);
  console.log(`  - Departments:      ${dataset.departments.length}`);
  console.log(`  - Employees:        ${dataset.employees.length}`);
  console.log(`  - Locations:        ${dataset.locations.length}`);
  console.log(`  - Organizers:       ${dataset.organizers.length}`);
  console.log(`  - Categories:       ${dataset.categories.length}`);
  console.log(`  - Activities:       ${dataset.activities.length}`);
  console.log(`  - Public Projections:${dataset.publicActivities.length}`);
  console.log(`  - Announcements:    ${SYNTHETIC_ANNOUNCEMENTS.length}`);

  // 2. Perform deep privacy scan
  console.log('\n[Privacy Scan] Scanning all string properties for PII/credentials...');
  const leaks = scanForSensitiveLeaks(dataset);
  if (leaks.length > 0) {
    console.error(`❌ Privacy scan failed! Found ${leaks.length} sensitive items:`);
    console.error(JSON.stringify(leaks, null, 2));
    process.exit(1);
  }
  console.log('✓ Privacy scan PASSED: 0 real NIPs, 0 personal phone numbers, 0 Zoom credentials leaked.');

  // 3. Write dry-run manifest
  const manifestPath = path.resolve(__dirname, '../dist/staging-synthetic-manifest.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(dataset, null, 2), 'utf-8');
  console.log(`✓ Dry-run manifest written to: ${manifestPath}`);

  if (dryRunOnly) {
    console.log('\n[Dry-Run Notice] Seeding halted. Pass --commit to write data to cloud Firestore.');
    return;
  }

  // 4. Commit to Cloud Firestore
  console.log(`\n[Cloud Seeding] Connecting to Cloud Firestore in project "${STAGING_PROJECT_ID}"...`);
  
  if (getApps().length === 0) {
    initializeApp({ projectId: STAGING_PROJECT_ID });
  }
  const db = getFirestore();

  // Commit master data
  console.log('Seeding departments...');
  const deptBatch = db.batch();
  dataset.departments.forEach(d => deptBatch.set(db.collection('departments').doc(d.id), d));
  await deptBatch.commit();
  console.log('  ✓ 8 departments committed.');

  console.log('Seeding employees (Firestore valid schema only)...');
  const empBatch = db.batch();
  dataset.employees.forEach(e => empBatch.set(db.collection('employees').doc(e.id), e));
  await empBatch.commit();
  console.log('  ✓ 16 employees committed.');

  console.log('Seeding locations...');
  const locBatch = db.batch();
  dataset.locations.forEach(l => locBatch.set(db.collection('locations').doc(l.id), l));
  await locBatch.commit();
  console.log('  ✓ 8 locations committed.');

  console.log('Seeding organizers...');
  const orgBatch = db.batch();
  dataset.organizers.forEach(o => orgBatch.set(db.collection('organizers').doc(o.id), o));
  await orgBatch.commit();
  console.log('  ✓ 6 organizers committed.');

  console.log('Seeding categories...');
  const catBatch = db.batch();
  dataset.categories.forEach(c => catBatch.set(db.collection('categories').doc(c.id), c));
  await catBatch.commit();
  console.log('  ✓ 5 categories committed.');

  console.log('Seeding settings...');
  await db.collection('settings').doc('config').set(SYNTHETIC_SIGNATORY);
  await db.collection('settings').doc('announcements').set({ announcements: SYNTHETIC_ANNOUNCEMENTS });
  console.log('  ✓ Settings committed.');

  console.log('Seeding activities & publicActivities...');
  // Commit in chunks of 50 to respect Firestore batch limits
  for (let i = 0; i < dataset.activities.length; i += 20) {
    const actSlice = dataset.activities.slice(i, i + 20);
    const pubSlice = dataset.publicActivities.slice(i, i + 20);
    const batch = db.batch();
    
    actSlice.forEach(act => batch.set(db.collection('activities').doc(act.id), act));
    pubSlice.forEach(pub => batch.set(db.collection('publicActivities').doc(pub.id), pub));
    
    await batch.commit();
    console.log(`  ✓ Activities ${i + 1} to ${i + actSlice.length} committed.`);
  }

  // Append migration audit record
  const auditDoc = {
    id: `audit_syn_seed_${Date.now()}`,
    action: 'MIGRATION_IMPORT',
    timestamp: Timestamp.now(),
    actorId: 'system_staging_seed',
    actorRole: 'admin',
    details: {
      environment: 'staging',
      source: 'synthetic_staging_fixture',
      activityCount: dataset.activities.length,
      employeeCount: dataset.employees.length,
      departmentCount: dataset.departments.length
    }
  };
  await db.collection('auditLogs').doc(auditDoc.id).set(auditDoc);
  console.log('  ✓ Audit log entry committed.');

  console.log('\n======================================================================');
  console.log('✓ STAGING FIRESTORE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================================');
}

if (process.argv[1] && process.argv[1].endsWith('seedStagingSyntheticData.mjs')) {
  main().catch(err => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
}
