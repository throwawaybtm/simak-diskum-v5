# SIMAK DISKUM Kota Batam v5.0 — T01 Temporary Data Audit & Spreadsheet Inspection

**Document Version:** 1.0.0  
**Inspection Date:** 2026-11-05T16:45:00+07:00  
**Status:** COMPLETE — READ-ONLY VERIFICATION & AUDIT  
**Target Environment:** Local Disposable Emulators (demo-department-agenda)  
**Production Boundary:** ZERO Live Cloud Deployments / Zero Live Mutations / Spark Tier Preserved ($0.00/mo)

---

## 1. Executive Summary & Source Provenance

This document records the exhaustive structural and data audit of the **October 2026 Historical Agenda Spreadsheet** for the Department of Cooperatives and Micro Enterprises (Dinas Koperasi dan Usaha Mikro) Kota Batam.

- **Source Document:** Google Sheets (Agenda Bulan Oktober 2026)
- **Public Viewer URL:** `https://docs.google.com/spreadsheets/d/1wyO-z0EQp_Fzflw6Q0MlxmydRqz7cY6qaHGu2ZoYSrQ/edit?gid=2127344970`
- **Access Protocol Verified:** Direct read-only HTTP GET via Google Visualization API CSV endpoints (`/gviz/tq?tqx=out:csv&sheet=<tab>`) and full OpenXML workbook export (`/export?format=xlsx`).
- **Access Verification Result:** HTTP 200 OK across both direct endpoints; zero write requests issued; source data preserved intact without any mutations.

---

## 2. Spreadsheet Architecture & Geometry

### 2.1 Tab Layout
The workbook consists of **31 individual worksheets**, exactly matching each calendar day of October 2026 (`011026` to `311026` in `DDMMYY` format).

- **Total Worksheets:** 31
- **Active Worksheets:** 31 (100% of tabs contain at least one scheduled event)
- **Empty Worksheets:** 0 (Even weekend days contain civic events, ceremonies, or outreach sessions)
- **Total Raw Activity Records:** 153

### 2.2 Standard 8-Column Schema
For 30 out of 31 tabs, headers reside in **Row 5**, spanning Columns 1 to 8:

| Col # | Excel Col | Header Label | Data Field in SIMAK DISKUM |
|---|---|---|---|
| 1 | A | `No` | Sequence number |
| 2 | B | `Hari / Tanggal` | Event date (`YYYY-MM-DD`) |
| 3 | C | `Pukul` | Scheduled time / duration |
| 4 | D | `Kegiatan` | Activity title / description |
| 5 | E | `Tempat` | Location / Venue |
| 6 | F | `Penyelenggara` | Organizing unit or external host |
| 7 | G | `Dihadiri Oleh` | Attendees roster (multiline) |
| 8 | H | `Keterangan` | Remarks, contact info, or links |

### 2.3 Structural Anomaly Discovered: Tab `211026`
During automated cell inspection, a column offset was discovered on worksheet **`211026` (21 Oktober 2026)**:
- Column A (Column 1) is completely blank (`null`).
- Headers begin at Column B (Column 2): `B5="No"`, `C5="Hari / Tanggal"`, `D5="Pukul"`, `E5="Kegiatan"`, `F5="Tempat"`, `G5="Penyelenggara"`, `H5="Dihadiri Oleh"`, `I5="Keterangan"`.
- A naive static column index parser would misidentify Column C (`"2026-10-21T00:00:00.000Z"`) as the `Pukul` (Time) column, corrupting all 6 rows for October 21.
- **Remediation Implemented:** Dynamic header detection inspects Row 5 cell values on every tab before parsing, ensuring tab `211026` is parsed with 100% accuracy.

---

## 3. Daily Tab Activity Inventory

| Tab Name | Date | Day (ID) | Records | Key Activities Summary |
|---|---|---|---|---|
| `011026` | 2026-10-01 | Kamis | 3 | Hari Kesaktian Pancasila, Pitching Misi Dagang Jabar-Kepri, Pendampingan SAKIP |
| `021026` | 2026-10-02 | Jumat | 4 | Diklat Uji Kompetensi Pengurus Koperasi, TL LHP Inspektorat, Audiensi BKPSDM, Silaturahmi Wako |
| `031026` | 2026-10-03 | Sabtu | 1 | Pembukaan Festival Halal Yayasan Ponpes Hidayatullah |
| `041026` | 2026-10-04 | Minggu | 1 | Silaturahmi Wali Kota dan Wawako Batam di SMP Kartini |
| `051026` | 2026-10-05 | Senin | 5 | Bimtek Kelembagaan Koperasi, Sosialisasi KOMCAD ASN, Sinergi Stakeholder PLUT, Rektor IPDN, Nobar FIFA |
| `061026` | 2026-10-06 | Selasa | 6 | Verifikasi DPPA & RAK SKPD, Sosialisasi Perwako 34, Sosialisasi BPO, HCDP Day 1, Evaluasi TW III, Silaturahmi VIP |
| `071026` | 2026-10-07 | Rabu | 7 | Monitoring Renstra, HCDP Day 2, FGD Blueprint Diskum, Pengawasan Koperasi Assalam, Klarifikasi OJK, Paripurna DPRD, Proyek Strategis |
| `081026` | 2026-10-08 | Kamis | 8 | Konsultasi Verifikasi Koperasi, Rapat Bank Jatim, HCDP Day 3, Silaturahmi Wako, Pengawasan Koperasi, Rakor Ketahanan Pangan |
| `091026` | 2026-10-09 | Jumat | 7 | Peringatan Maulid Nabi, Verifikasi Fisik Usaha Mikro, Rakor Percepatan KDKMP Nasional, Rapat Desk Pilkada |
| `101026` | 2026-10-10 | Sabtu | 2 | Pelatihan Barista & Roasting Kopi, Silaturahmi Wako di Batu Aji |
| `111026` | 2026-10-11 | Minggu | 2 | Bazar UMKM CFD Batam Center, Silaturahmi Komunitas Paguyuban |
| `121026` | 2026-10-12 | Senin | 7 | Apel Pagi Gabungan, Rapat Koordinasi Pimpinan, Sosialisasi NIB, Pengawasan Koperasi Syariah, Bimtek Laporan Keuangan |
| `131026` | 2026-10-13 | Selasa | 6 | Bimtek Agent of Change (AoC) Day 1, Pelatihan Seni Kreatif Day 1, Meeting KKMP Binapemdes, RAT Koperasi Guru |
| `141026` | 2026-10-14 | Rabu | 5 | Bimtek AoC Day 2, Pelatihan Seni Kreatif Day 2, Monitoring Bantuan Alat UMKM, Sosialisasi Pajak Koperasi |
| `151026` | 2026-10-15 | Kamis | 7 | Bimtek AoC Day 3, Seminar HKI Day 1, Pelayanan Kesehatan Kerja, Wawancara Iklim Usaha Kemendag, Pembinaan Koperasi |
| `161026` | 2026-10-16 | Jumat | 10 | Senam Pagi, Gotong Royong Kantor, Seminar HKI Day 2, Pengawasan Koperasi, Verifikasi Bansos UMKM, Rapat Kominda |
| `171026` | 2026-10-17 | Sabtu | 1 | Expo Produk Unggulan Rumah Kemasan di Megamall |
| `181026` | 2026-10-18 | Minggu | 3 | Senam Massal HUT Koperasi, Bazar Sembako Murah, Silaturahmi Wako Sei Beduk |
| `191026` | 2026-10-19 | Senin | 7 | Sosialisasi RAT Koperasi Day 1, Rakor Koperasi Kelurahan Merah Putih, Sosialisasi KOMCAD ASN, Persiapan Pembentukan KOMCAD |
| `201026` | 2026-10-20 | Selasa | 7 | Gotong Royong Kebun Day 1, Pendataan Inkubasi Day 1, Sosialisasi RAT Day 2, Monitoring Sertifikasi Halal |
| `211026` | 2026-10-21 | Rabu | 6 | Pelatihan Seni Kreatif Batch 5 & 6, Rakor Pengawasan Kearsipan (LAKI), RAT KPRI Bina Cipta, Paripurna DPRD Propemperda, Rasionalisasi APBD |
| `221026` | 2026-10-22 | Kamis | 4 | Pelatihan Anti Korupsi ASN (KPK/BKPSDM), Peninjauan Sentra Keripik Belakang Padang, Sosialisasi E-Katalog V6 |
| `231026` | 2026-10-23 | Jumat | 5 | Gotong Royong Kebun Day 2, Konsultasi Piutang Macet Dana Bergulir (BKAD Kepri), Semarak UMKM Day 1 |
| `241026` | 2026-10-24 | Sabtu | 3 | Pelantikan Pengurus DPW Perumkmindo, Semarak UMKM Day 2, Temu Bisnis Buyer Singapura |
| `251026` | 2026-10-25 | Minggu | 3 | Semarak UMKM Day 3 & Awarding, Fun Walk Koperasi, Penutupan Bazar |
| `261026` | 2026-10-26 | Senin | 4 | Peresmian Rumah Budidaya Rumput Laut Day 1, Pengawasan Koperasi Simpan Pinjam, Evaluasi DAK Non-Fisik |
| `271026` | 2026-10-27 | Selasa | 6 | Verifikasi Gerai Koperasi Merah Putih Day 1, Pengawasan Koperasi Simpan Pinjam, Sosialisasi PIRT Dinkes |
| `281026` | 2026-10-28 | Rabu | 8 | Upacara Hari Sumpah Pemuda Ke-98, Verifikasi Gerai Day 2, Monev Penyaluran Dana Bergulir, Konsultasi LKPP |
| `291026` | 2026-10-29 | Kamis | 10 | Verifikasi Gerai Day 3, Pendataan Inkubasi Day 2, Sosialisasi Perlindungan Konsumen, Sidang Penilaian Koperasi Berprestasi |
| `301026` | 2026-10-30 | Jumat | 4 | Pendataan Inkubasi Day 3, Rekonsiliasi Aset BMD, Senam Bersama, Evaluasi Kinerja Bulanan |
| `311026` | 2026-10-31 | Sabtu | 1 | Penutupan Bulan Mutu Koperasi & UMKM Kota Batam |

**Total Scheduled Events:** **153 activities** across **31 days**.

---

## 4. Time Parsing & Open-Ended Formats

Analysis of Column 3 (`Pukul`) reveals **72 distinct time string variations**.

### 4.1 Time Patterns Identified
1. **Open-Ended Activities (`openEnded: true`):**
   - Format: `HH.MM WIB s.d Selesai`, `HH,MM WIB s.d. selesai`, `HH:MM WIB s/d Selesai`
   - Examples: `07.00 WIB s.d. selesai`, `08.30 WIB s.d selesai`, `14.00 WIB s.d  Selesai`
   - Normalization: `startTime: "HH:MM"`, `endTime: null`, `isOpenEnded: true`.
2. **Fixed Time Windows:**
   - Format: `HH.MM WIB s.d HH.MM WIB`
   - Examples: `08.00 WIB s.d 16.00 WIB`, `09.00 WIB s.d 11.15 WIB`, `13.00 WIB s.d 15.00 WIB`
   - Normalization: `startTime: "08:00"`, `endTime: "16:00"`, `isOpenEnded: false`.
3. **Punctuation Variants:**
   - Periods (`08.30`), commas (`08,30`), and colons (`08:30`) are all used interchangeably. The parser normalizes all delimiters to standard colon notation (`08:30`).

---

## 5. Multi-Day Activity Chains

A deduplication analysis identified **12 recurring / multi-day event series** spanning across multiple worksheets:

| Chain ID | Activity Title | Duration | Sheet Occurrences & Rows | Normalization Handling |
|---|---|---|---|---|
| `CH-01` | *Sosialisasi KOMCAD ASN Kota Batam* | 2 days | `051026` (Row 7), `191026` (Row 8) | Multi-session series linked to KOMCAD Batam initiative |
| `CH-02` | *Penyusunan Dokumen Human Capital Development Plan (HCDP)* | 3 days | `061026` (Row 9), `071026` (Row 7), `081026` (Row 9) | Consecutive 3-day workshop via Zoom |
| `CH-03` | *Pengawasan Koperasi* | 4 days | `071026` (Row 9), `161026` (Row 8), `261026` (Row 9), `271026` (Row 10) | Field compliance inspection audits |
| `CH-04` | *Pelatihan Seni Kreatif dan Panduan Perizinan Usaha yang Mudah* | 2 days | `131026` (Row 8), `141026` (Row 6) | 2-day entrepreneurship training |
| `CH-05` | *Bimbingan Teknis Peningkatan Kapasitas Agent of Change (AoC)* | 3 days | `131026` (Row 14), `141026` (Row 12), `151026` (Row 15) | Consecutive 3-day bureaucratic reform training |
| `CH-06` | *Seminar Penegakan Hukum Kekayaan Intelektual* | 2 days | `151026` (Row 8), `161026` (Row 10) | 2-day IPR seminar (Kemenkumham) |
| `CH-07` | *Sosialisasi Laporan Keuangan Terhadap Koperasi yang Belum RAT* | 2 days | `191026` (Row 6), `201026` (Row 8) | 2-day cooperative financial accountability drive |
| `CH-08` | *Rapat Koordinasi Percepatan Operasionalisasi Koperasi Kelurahan Merah Putih* | 2 days | `191026` (Row 7), `191026` (Row 10) | Morning & afternoon sessions on the same date |
| `CH-09` | *Gotong Royong Kebun* | 2 days | `201026` (Row 6), `231026` (Row 6) | Physical departmental community gardening sessions |
| `CH-10` | *Pendataan Pelaku Usaha dan Monitoring Pasca Kegiatan Inkubasi* | 3 days | `201026` (Row 7), `291026` (Row 17), `301026` (Row 7) | Incubation cohort field follow-up |
| `CH-11` | *Semarak UMKM Tahun 2026* | 3 days | `231026` (Row 9), `241026` (Row 8), `251026` (Row 7) | 3-day festival, exhibition, and business matching |
| `CH-12` | *Verifikasi Fisik Gerai Pergudangan Koperasi Kelurahan Merah Putih* | 3 days | `271026` (Row 6), `281026` (Row 7), `291026` (Row 8) | Consecutive warehouse and physical site verifications |

---

## 6. Privacy & Security Leak Isolation Audit

The automated privacy scanner screened all cells across all 31 worksheets for sensitive links, credentials, and personal contact numbers.

**Total Privacy Leaks Detected in Source:** **16 incidents** across 16 rows.

| # | Tab | Row | Activity Title | Leak Type | Exposed Value | Isolation Action |
|---|---|---|---|---|---|---|
| 1 | `011026` | 7 | Pitching Misi Dagang Jabar-Kepri | Zoom URL & Passcode | `Meeting ID: 850 000 5418`, `Passcode: ppdn146`, `pwd=KobKrNRKzadXbSNj69` | Quarantined to `privateMeetingUrl` & `privateNotes` |
| 2 | `031026` | 6 | Pembukaan Festival Halal | Phone Number | `081269106335`, `0895401869545` | Quarantined to `privateNotes` |
| 3 | `051026` | 7 | Sosialisasi KOMCAD ASN | Zoom URL & Passcode | `https://zoom.us/launch/jc/94480068357`, `PASSCODE : 173783` | Quarantined to `privateMeetingUrl` & `privateNotes` |
| 4 | `061026` | 8 | Sosialisasi Pengendalian BPO | Phone Number | `081261027619` | Quarantined to `privateNotes` |
| 5 | `071026` | 10 | Klarifikasi Dealer Motor OJK | Phone Number | `08113812289` | Quarantined to `privateNotes` |
| 6 | `091026` | 12 | Rakor Percepatan KDKMP | Passcode | `Passcode: kemenkop` | Quarantined to `privateNotes` |
| 7 | `131026` | 9 | Meeting KKMP Binapemdes | Passcode | `Passcode BINAPEMDES` | Quarantined to `privateNotes` |
| 8 | `151026` | 6 | Pelayanan Kesehatan Kerja | Phone Number | `08116667876` | Quarantined to `privateNotes` |
| 9 | `151026` | 9 | Wawancara Iklim Usaha | Phone Number | `081213719490` | Quarantined to `privateNotes` |
| 10 | `191026` | 7 | Rakor Koperasi Merah Putih | Passcode | `Passcode 765651` | Quarantined to `privateNotes` |
| 11 | `191026` | 8 | Sosialisasi KOMCAD ASN | Passcode | `Passcode : 173783` | Quarantined to `privateNotes` |
| 12 | `191026` | 9 | Persiapan KOMCAD ASN Batam | Zoom URL & Sandi | `https://zoom.us/j/94480068357?pwd=...`, `Sandi: 173783` | Quarantined to `privateMeetingUrl` & `privateNotes` |
| 13 | `191026` | 10 | Rakor Koperasi Merah Putih | Passcode | `Passcode 765651` | Quarantined to `privateNotes` |
| 14 | `221026` | 8 | Pelatihan Anti Korupsi ASN | Zoom URL & Pwd | `https://zoom.us/j/98165550205?pwd=...` | Quarantined to `privateMeetingUrl` & `privateNotes` |
| 15 | `261026` | 6 | Peresmian Budidaya Rumput Laut | Phone Number | `0881023230348` | Quarantined to `privateNotes` |
| 16 | `291026` | 9 | Sosialisasi Perlindungan Konsumen | Phone Number | `081275183202` | Quarantined to `privateNotes` |

> [!CAUTION]
> **Data Privacy Enforcement:** In the public portal, all fields containing Zoom passwords, Meeting IDs, and personal phone numbers must be stripped completely from `publicNotes`. Only authorized authenticated administrators may view `privateNotes` and `privateMeetingUrl`.

---

## 7. Temporary Employee Master Data Cross-Reference

The source attendee listings were correlated against the **70-person staff roster** of Dinas Koperasi dan Usaha Mikro Kota Batam:

### 7.1 Personnel Distribution (70 Personnel Total)
- **Dinas (Executive Leadership):** 2 (Salim, S.Sos, M.Si — Kadis; Adrial, S.K.M, M.K.M. — Sekdis)
- **Bidang Kewirausahaan:** 7 (4 PNS, 3 PPPK)
- **Bidang Pemberdayaan dan Pelindungan Koperasi:** 9 (5 PNS, 2 PPPK, 2 PMO Non-ASN)
- **Bidang Pengawasan Koperasi:** 8 (7 PNS, 1 PPPK)
- **Bidang Pengembangan Usaha Mikro:** 8 (6 PNS, 2 PPPK)
- **UPTD Pengelolaan Dana Bergulir:** 8 (5 PNS, 3 PPPK)
- **UPTD PLUT KUMKM:** 13 (3 PNS, 1 PPPK, 5 Konsultan PLUT Non-ASN, 4 Rumah Kemasan Non-ASN)
- **Sekretariat:** 15 (10 PNS, 5 PPPK)

### 7.2 Matching Performance
- **Activities with Attendee Entries:** 150 out of 153 activities (98.0%)
- **Activities with Direct Staff Match:** 124 activities (82.7%)
- **Unambiguous Role Synonyms Resolved:**
  - `Kadis` / `Kepala Dinas` $\rightarrow$ Salim, S.Sos, M.Si
  - `Sekdis` / `Sekretaris` $\rightarrow$ Adrial, S.K.M, M.K.M.
  - `Ka. PLUT` $\rightarrow$ Meydiana Esterawaty Jastina, S.E.
  - `PMO` $\rightarrow$ Muhammad Irfan Baharudin / Randy Wirapratama
  - `Konsultan PLUT` $\rightarrow$ Tim Konsultan PLUT (Marlina, Nurul, Elfiyanti, Galih, Bayu)
- **Ambiguous Role Tokens Flagged for Review:**
  - `Kabid` (unspecified division head)
  - `Subbag Keuangan` (sub-bag finance team)
  - `Bidang Program` / `Subbag Program`
  - `Tim` / `Dinas` (generic organizational tokens)

---

## 8. Provisional Signatory & Official Decree Safeguards

The candidate Kepala Dinas identified in the roster is:
- **Name:** Salim, S.Sos, M.Si
- **NIP:** 19681021 199010 1 001
- **Pangkat / Golongan:** Pembina Utama Muda - IV/c
- **Jabatan:** Kepala Dinas

> [!IMPORTANT]
> **Provisional Signatory Guard:** In accordance with municipal administrative protocols, all signatory blocks rendered for Salim, S.Sos, M.Si during local testing and report generation are explicitly watermarked and tagged:  
> **`[PROVISIONAL — NOT VERIFIED FOR OFFICIAL USE]`**  
> No client-certified official SK decree has been uploaded or authenticated in production. Official legal validity requires formal decree confirmation prior to live production handoff.

---

## 9. Operational Safety Verification

- **Live Deployment Command Execution:** ZERO (`firebase deploy` was NOT run)
- **Production Firestore Mutations:** ZERO (All queries and inspections performed locally / in memory)
- **Hosting Sites Changed:** ZERO
- **Billing Changes:** ZERO (Spark $0.00/month tier preserved)
- **Local Emulator Binding:** `127.0.0.1:8080` (Firestore) & `127.0.0.1:9099` (Auth)
