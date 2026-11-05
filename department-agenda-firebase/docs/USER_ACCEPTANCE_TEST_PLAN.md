# SIMAK DISKUM v5.0 — User Acceptance Test (UAT) Plan (Operational Safety Aligned)

**Dinas Koperasi dan Usaha Mikro Kota Batam**  
**Document Code:** UAT-SIMAK-5.0-202611  
**Target Audience:** Department Leadership, Administrative Operators, Verification Team  
**Evaluation Scope:** Dual-Portal Activity Scheduling System (Public & Admin)  
**Execution Posture:** All 11 scenarios are **REHEARSED & AUTOMATED IN LOCAL EMULATOR**, currently **PENDING PHYSICAL DEPARTMENT EXECUTION** prior to live activation.

---

## 1. Introduction & Acceptance Objectives

This User Acceptance Test (UAT) Plan defines the formal evaluation scenarios for **SIMAK DISKUM v5.0** (Sistem Informasi Manajemen Agenda Kedinasan Dinas Koperasi dan Usaha Mikro Kota Batam).

### Acceptance Criteria
A scenario is marked **PASSED** only when:
1. The observed behavior strictly matches the expected outcome.
2. No uncaught JavaScript errors or UI layout breakage occur.
3. Indonesian civil service terminologies, formatting, and time standards (WIB / Asia/Jakarta) are consistently respected.
4. Security and privacy boundaries between Public and Admin portals are rigorously preserved.

---

## 2. Testing Environment & Test Accounts

| Portal | URL (Staging / Production) | Authorized Tester Roles | Access Policy |
|---|---|---|---|
| **Public Portal** | `https://simakdiskum.web.app` | Citizen, Public Employee, Any Browser | Unauthenticated public read (`publicActivities`) |
| **Admin Portal** | `https://simakdiskum-admin.web.app` | Department Operator (`editor`), Kasubbag/Admin (`admin`) | Email/Password with custom role claim (`request.auth.token.role`) |

---

## 3. Core Acceptance Scenarios (11 Test Cases)

### Scenario 1: Initial Agenda Creation (`INITIAL_ENTRY` / Input Awal)
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Verify that an incoming invitation letter arriving at the front desk can be saved immediately with core details, without requiring immediate attendee assignment or full administrative filing.
* **Prerequisites:** Logged in to Admin Portal as Operator (`editor`).
* **Test Steps:**
  1. Click **+ Tambah Agenda** on the Admin sidebar or dashboard.
  2. Enter Agenda Title: `Rapat Koordinasi Evaluasi Koperasi Se-Kota Batam`.
  3. Select Category: `Rapat Koordinasi`.
  4. Select Date: Tomorrow; Time: `09:00 - 11:30 WIB`.
  5. Select Location: `Ruang Rapat Kadis (Lantai 2)`.
  6. Enter Organizer: `Sekretariat Dinas Koperasi & UM`.
  7. Leave `Dihadiri Oleh` (Attendees) and `Keterangan` (Remarks) empty.
  8. Click **Simpan Agenda**.
* **Expected Result:**
  - Agenda is saved successfully.
  - Administrative Status is automatically set to **Input Awal** (`INITIAL_ENTRY`).
  - The agenda immediately appears on the Admin Dashboard and the Public Portal (with status "Menunggu Konfirmasi Kehadiran").

---

### Scenario 2: Offline Administrative Stage Progression (`OFFLINE_PROCESS` / Proses Offline)
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Track that the letter is physically routed to leadership for disposition.
* **Prerequisites:** Agenda created in Scenario 1.
* **Test Steps:**
  1. Open the Agenda Details in the Admin Portal.
  2. Change the Administrative Stage dropdown to **Proses Offline**.
  3. Enter internal note in Private Notes: `Surat undangan sedang dinaikkan ke meja Kepala Dinas untuk disposisi pejabat yang mendampingi`.
  4. Click **Perbarui Status**.
* **Expected Result:**
  - Administrative badge updates to orange `Proses Offline`.
  - Administrative ring chart increments the `Proses Offline` counter.
  - The private note is strictly invisible on the Public Portal.

---

### Scenario 3: Completing Attendees & Remarks (`DETAILS_COMPLETED` / Detail Dilengkapi)
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Record leadership disposition results (assigned officials and dress code/requirements).
* **Prerequisites:** Agenda in `OFFLINE_PROCESS` stage.
* **Test Steps:**
  1. Open the Agenda Edit modal.
  2. Select assigned attendees from master directory.
  3. In Remarks (`Keterangan`), enter: `Pakaian Batik Lengan Panjang. Membawa bahan paparan evaluasi semester II`.
  4. Advance stage to **Detail Dilengkapi** (`DETAILS_COMPLETED`).
  5. Save changes.
* **Expected Result:**
  - Status advances to blue `Detail Dilengkapi`.
  - Public Portal now displays assigned attendees sanitized as official title/role without exposing private NIP or internal contact numbers.

---

### Scenario 4: Full Administrative Filing (`ADMIN_COMPLETE` / Administrasi Lengkap)
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Complete the official registry filing with No. Agenda, letter metadata, and digital archive link.
* **Prerequisites:** Agenda in `DETAILS_COMPLETED` stage.
* **Test Steps:**
  1. Open Agenda Edit modal.
  2. Enter **Nomor Agenda Surat**: `005/DKUM-SEKR/XI/2026`.
  3. Enter **Tanggal Surat Undangan**: Select date of letter issuance.
  4. Enter **Hal / Perihal Surat**: `Undangan Rapat Koordinasi Pembinaan Koperasi`.
  5. Enter **Tautan Berkas Drive**: `https://drive.google.com/file/d/1abcXYZ_official_agenda_file/view`.
  6. Select stage: **Administrasi Lengkap** (`ADMIN_COMPLETE`).
  7. Click **Simpan**.
* **Expected Result:**
  - Status advances to green `Administrasi Lengkap`.
  - Administrative 5-card summary on Admin Dashboard updates.
  - The Drive URL is clickable from the Admin Portal details modal for internal staff with `rel="noopener noreferrer" target="_blank"`.
  - **Drive Permissions Boundary:** SIMAK DISKUM verifies valid HTTPS structure and safely opens the link in a new tab. Actual document access permissions (viewing/downloading the file) are managed directly by Google Drive IAM settings configured by the department letter archivist.
  - The Drive URL is omitted from the Public Portal projection.

---

### Scenario 5: Editing and Cancelling Agendas with Citizen Notice
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Verify proper audit logging and citizen cancellation notices when events change.
* **Test Steps:**
  1. Open an existing scheduled agenda.
  2. Click **Batalkan Kegiatan**.
  3. In the cancellation dialog, enter internal reason: `Ditunda sesuai arahan pimpinan menyusul agenda mendadak Wali Kota`.
  4. Enter public cancellation notice: `PEMBERITAHUAN RESMI: Kegiatan ditunda sampai pemberitahuan lebih lanjut.`
  5. Confirm cancellation.
* **Expected Result:**
  - Status changes to `Dibatalkan` (Cancelled).
  - Admin audit log records the cancellation timestamp and operator identity.
  - Public Portal prominently displays a cancellation warning badge and public reason so citizens/attendees are not misinformed.

---

### Scenario 6: Room and Attendee Conflict Detection & Override
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Warn operators when booking overlapping rooms or assigning officials to concurrent events.
* **Test Steps:**
  1. Click **+ Tambah Agenda**.
  2. Set the same date and overlapping time window (`10:00 - 12:00 WIB`) as an existing event.
  3. Select the same location: `Ruang Rapat Kadis (Lantai 2)`.
  4. Assign the same official attendee.
  5. Attempt to save.
* **Expected Result:**
  - Conflict warning banner appears:
    - *Peringatan Konflik Ruangan:* Ruang Rapat Kadis telah digunakan oleh agenda lain pada waktu yang sama.
    - *Peringatan Konflik Pejabat:* Pejabat terkait telah memiliki agenda lain.
  - The system offers a non-blocking administrative override: `Tetap Simpan dengan Catatan Konflik`.

---

### Scenario 7: Official 8-Column Government Report Generation (A4 Landscape Print)
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Produce the official 8-column physical schedule adhering to Kepmendagri and Dinas standards.
* **Test Steps:**
  1. Navigate to **Laporan** (Reports) in Admin Portal.
  2. Select Date Range: 1 November 2026 to 7 November 2026.
  3. Select Signatory: Choose official department signatory (from client-approved template).
  4. Click **Cetak Laporan (Print / PDF)**.
  5. In the browser print dialog:
     - Set Destination: `Save as PDF` or Physical Laser Printer.
     - Layout: `Landscape`.
     - Paper Size: `A4`.
     - Margins: `Default` or `Minimum`.
* **Expected Result (Physical Inspection Criteria):**
  - [ ] **Kop Surat:** Official Dinas Koperasi dan Usaha Mikro Kota Batam letterhead centered at top.
  - [ ] **Exact 8 Columns Present:**
    1. No
    2. Hari / Tanggal
    3. Waktu
    4. Tempat
    5. Kegiatan / Acara
    6. Penyelenggara
    7. Dihadiri Oleh
    8. Keterangan
  - [ ] **Multi-Page Handling:** The table header row (`<thead>`) repeats automatically at the top of page 2+.
  - [ ] **No Row Splitting:** Table rows do not cut text horizontally across page margins (`page-break-inside: avoid`).
  - [ ] **Official Signatory Block:** Located at the bottom right with "Batam, [Tanggal]", "Kepala Dinas Koperasi dan Usaha Mikro Kota Batam", formal signature space, and verified official NIP.

---

### Scenario 8: XLSX Spreadsheet Export & Microsoft Excel Desktop Verification
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Export agenda records to Excel and verify clean formatting without XML repair warnings.
* **Test Steps:**
  1. In **Laporan**, click **Export Excel (.xlsx)**.
  2. Save file: `Jadwal_Kegiatan_Dinas_Koperasi_Batam_Nov2026.xlsx`.
  3. Open the file directly in **Microsoft Excel (Desktop 2019/365)** on Windows.
* **Expected Result:**
  - [ ] Opens cleanly with zero "corrupt file" or "repaired records" XML warnings.
  - [ ] Title banner and period metadata occupy the top rows.
  - [ ] Table columns have bold headers with light blue background styling.
  - [ ] Dates and times are properly formatted text/date cells.
  - [ ] Formula injection characters (`=`, `+`, `-`, `@`) in notes are safely neutralized with leading quotes (`'`).
  - [ ] Column widths accommodate Indonesian text without truncating.

---

### Scenario 9: Public Portal Responsive Navigation & Visual Fidelity
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Validate citizen portal experience across desktop and mobile devices.
* **Test Steps:**
  1. Open Public Portal on Desktop (1440px):
     - Verify top horizontal menu: `Beranda`, `Kalender Kegiatan`, `Cari Agenda`, `Pengumuman`.
     - Confirm Barelang Bridge banner with Batam imagery.
     - Confirm 4 statistic cards (Hari Ini, Minggu Ini, Bulan Ini, Total Agenda).
  2. Open on Mobile (375px) / Smartphone:
     - Verify navigation collapses cleanly into hamburger/mobile menu.
     - Verify 7-day calendar converts to readable list/agenda cards without horizontal overflow.
     - Tap each card to inspect activity details modal.
* **Expected Result:**
  - Zero horizontal page overflow scrollbars on mobile.
  - Touch targets for navigation and search filters exceed 44×44px.

---

### Scenario 10: Multi-Operator Concurrent Modification Handling
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Verify database consistency when two operators view and update activities simultaneously.
* **Test Steps:**
  1. Operator A opens Activity #101 on Workstation 1.
  2. Operator B opens Activity #101 on Workstation 2.
  3. Operator A modifies location and saves.
  4. Operator B modifies remarks and saves 10 seconds later.
* **Expected Result:**
  - Optimistic concurrency control intercepts the version conflict (`expectedVersion`).
  - Operator B is presented with a non-destructive conflict modal: *"Perubahan Terdeteksi — Data telah diperbarui oleh operator lain"*.
  - Operator B can inspect diff and reload without corrupting Operator A's changes.

---

### Scenario 11: Error Recovery & Validation Failure Handling
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Objective:** Verify intuitive error messages when network drops or invalid data is entered.
* **Test Steps:**
  1. Attempt to create an activity with `Waktu Selesai` earlier than `Waktu Mulai`.
  2. Attempt to upload a malformed or non-HTTPS Drive link.
  3. Disconnect network cable/Wi-Fi and attempt to save.
* **Expected Result:**
  - Form validation stops submission with clear Indonesian inline helper text:
    - *"Waktu selesai tidak boleh lebih awal dari waktu mulai"*.
    - *"Tautan berkas harus berupa URL valid (https://...)"*.
  - When offline, a clear toast notification appears: *"Gagal menghubungi server. Periksa koneksi internet Anda"*. No infinite spinning indicators.

---

## 4. Special Display & Accessibility Acceptance Checks

### 4.1 True 200% Zoom Reflow Check (WCAG SC 1.4.10)
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Methodology:** On a 1280px display, set browser zoom to **200%** (yielding an effective CSS viewport width of **640px**).
* **Criteria:**
  - [ ] The Public Portal and Admin Portal reflow content vertically into a single/double column.
  - [ ] No horizontal scrolling is required to read text or operate controls.
  - [ ] Modal dialogs remain completely within the screen boundary and can be closed via the `Escape` key or close button.

### 4.2 Keyboard Accessibility & Focus Trapping
* **Status:** `PENDING DEPARTMENT EXECUTION (Automated Rehearsal: PASSED)`
* **Methodology:** Navigate entire Public and Admin portals using only `Tab`, `Shift+Tab`, `Enter`, and `Escape`.
* **Criteria:**
  - [ ] Active interactive elements display visible blue focus rings (`:focus-visible`).
  - [ ] When opening modals, focus moves inside the modal.
  - [ ] Tabbing wraps within the modal without leaking into background page content.
  - [ ] Pressing `Escape` closes the modal and restores keyboard focus to the opening button.

---

## 5. UAT Sign-Off & Approval Record

| Role | Required Approver | Title | Department Decision | Signature & Date |
|---|---|---|:---:|---|
| **Department Operator** | ................................ | Pengadministrasi Umum | [ ] Lulus / [ ] Catatan | PENDING EXECUTION |
| **Kasubbag Umum & Kepegawaian** | ................................ | Kasubbag Umum & Kepegawaian | [ ] Lulus / [ ] Catatan | PENDING EXECUTION |
| **Kepala Dinas** | ................................ | Kepala Dinas Koperasi & UM | [ ] Diterima / [ ] Revisi | PENDING EXECUTION |
