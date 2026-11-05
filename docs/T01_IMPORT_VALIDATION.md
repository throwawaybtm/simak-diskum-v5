# SIMAK DISKUM Kota Batam v5.0 — T01 Historical Import Validation & Rehearsal Report

**Milestone:** T01 — Temporary Data Preparation, Single-Admin Testing & October 2026 Agenda Import Rehearsal  
**Execution Date:** 2026-11-05T18:35:00+07:00  
**Target Environment:** Local Disposable Emulators (`demo-department-agenda`)  
**Status:** APPROVED & VERIFIED (Local Rehearsal & Testing Complete)  
**Strict Safety Guard:** Zero Production Cloud Deployments / Zero Live Mutations / $0.00 Spark Plan Preserved  

---

## 1. Executive Summary

This milestone establishes the end-to-end data ingestion and operational verification of **October 2026 Historical Agenda Data** and the **Temporary Departmental Personnel Roster (70 Personnel across 8 Units)**.

All procedures were rehearsed against the local Firebase emulator environment (`127.0.0.1:8080` Firestore, `127.0.0.1:9099` Auth). The entire data lifecycle — source reading, schema validation, multi-day linkage, privacy quarantine, idempotent ingestion, browser rendering across four viewports, and audit trail verification — completed with **100% test pass rates**.

---

## 2. Source Roster & Master Data Validation

### 2.1 Personnel Counts & Verification
The provided personnel markdown roster was parsed and directly verified against source records:

| Category | Previously Assumed | Verified Actual Count | Verification Method |
|---|:---:|:---:|---|
| **PNS (Pegawai Negeri Sipil)** | 44 | **42** | Verified CPNS appointment month digits (01–12) in 18-digit NIP |
| **PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)** | 15 | **17** | Verified NI PPPK appointment marker code (`21`) and Roman numeral grades (IX, V, VII) |
| **Non-ASN (Tenaga Kontrak / Konsultan)** | 11 | **11** | Verified zero fabricated NIPs (5 PLUT Consultants, 4 Rumah Kemasan, 2 PMO) |
| **Total Personnel** | **70** | **70** | **100% Reconciliation across all 8 organizational units** |

### 2.2 Department Distribution (8 Units)
1. **Dinas (Executive Leadership):** 2 (Salim, S.Sos, M.Si — Kadis; Adrial, S.K.M, M.K.M. — Sekdis)
2. **Bidang Kewirausahaan:** 7 (4 PNS, 3 PPPK)
3. **Bidang Pemberdayaan dan Pelindungan Koperasi:** 9 (5 PNS, 2 PPPK, 2 PMO Non-ASN)
4. **Bidang Pengawasan Koperasi:** 8 (7 PNS, 1 PPPK)
5. **Bidang Pengembangan Usaha Mikro:** 8 (6 PNS, 2 PPPK)
6. **UPTD Pengelolaan Dana Bergulir:** 8 (5 PNS, 3 PPPK)
7. **UPTD PLUT KUMKM:** 13 (3 PNS, 1 PPPK, 5 Konsultan PLUT, 4 Rumah Kemasan)
8. **Sekretariat:** 15 (10 PNS, 5 PPPK)

### 2.3 Firestore Rules Compliance
In accordance with Gate 5A `firestore.rules`, `isValidEmployee` strictly permits:
`keys().hasOnly(['id', 'name', 'position', 'departmentId', 'active'])`.
- Client documents in `employees/{id}` conform exactly to this schema.
- Auxiliary metadata (NIP, rank, category) is preserved in `templates/temporaryEmployeeMaster.json` and traceable documentation.

---

## 3. Normalization, Deduplication & Reconciliation

### 3.1 Reconciliation Metrics

| Metric | Count | Reconciliation Notes |
|---|:---:|---|
| **Raw Source Activity Rows** | **153** | Extracted from 31 daily worksheets (`011026` to `311026`) |
| **Canonical Activities Ingested** | **152** | Ingested into `activities` and `publicActivities` |
| **Confirmed Merged Duplicates** | **1** | Sheet `191026` Row 10 merged into Row 7 (same date, time, location, title, and Zoom ID; merged attendee delegation) |
| **Linked Recurring Sessions** | **23** | 23 rows across 11 recurring series (e.g. HCDP 3-day series, AoC Bimtek 3-day series, Semarak UMKM) |
| **Flagged for Review** | **16** | 16 rows containing Zoom links, passcodes, or phone numbers quarantined to private fields |
| **Skipped Records** | **0** | Zero records dropped or skipped |
| **Imported Employees** | **70** | Conforming to Gate 5A schema |
| **Imported Departments** | **8** | Active municipal divisions |
| **Unresolved Attendee References** | **0** | Generic terms (`Kabid`, `Tim`) preserved in guest attendees without data fabrication |

### 3.2 Idempotency Demonstration
The ingestion pipeline was executed **twice** consecutively against the Firestore emulator:
- **Run 1:** Created 8 departments, 70 employees, 10 locations, 8 organizers, 5 categories, 152 activities, 152 public projections, 1 audit log.
- **Run 2:** Document counts remained **identical** (8 depts, 70 emps, 152 activities, 152 public projections). Zero duplicate documents created. Only the append-only compliance audit trail logged the second migration operation (`auditLogs`: 2).

---

## 4. Privacy & Confidentiality Protection

### 4.1 Strict Quarantining of Credentials
Source spreadsheet inspection discovered **16 rows** containing confidential meeting access details:
- **4 Zoom meeting URLs** containing embedded plaintext password parameters (`pwd=...`).
- **8 Meeting Passcodes & Sandi** (`ppdn146`, `173783`, `kemenkop`, `BINAPEMDES`, `765651`).
- **6 Personal mobile phone numbers** (`0812...`, `0881...`).

### 4.2 Public Projection Integrity
- **Private Collection (`activities`):** Retains `privateMeetingUrl` and `privateNotes` containing internal credentials for authorized operators.
- **Public Collection (`publicActivities`):**
  - All credentials replaced with safe generic notices (`[TAUTAN VIRTUAL DIAMANKAN]`, `[KREDENSIAL DIKANTOR]`, `[KONTAK RESMI DIARSIP]`).
  - Completely omits `privateNotes`, `privateMeetingUrl`, `cancelReason`, and `attendeeIds`.
  - Attendee labels omit all database IDs (`emp_...`) and NIPs.
- **Automated Verification:** Verified across all 152 public documents using automated regex security assertions (`tests/integration/t01PrivacyProjection.test.ts`).

---

## 5. Single-Admin Account Local Verification

- **Provisioned Account:** `admin.t01@batam.go.id`
- **Role Claim:** `{ role: "admin", department: "Dinas Koperasi dan Usaha Mikro Kota Batam" }`
- **Verification Results:**
  1. Successful login and token claims refresh.
  2. Authenticated access to private `activities` and `employees`.
  3. Strict rejection of unauthenticated/anonymous access to private collections (`PERMISSION_DENIED`).
  4. Session termination (logout) completely unmounts administrative shell and wipes session caches.

---

## 6. Multi-Viewport Browser Verification (Playwright)

Both portals were verified across four standardized viewports using the real imported October 2026 dataset:

| Viewport | Device Profile | Public Portal Status | Admin Portal Status | Overflow Detected |
|---|---|:---:|:---:|:---:|
| **320px** | Mobile Mini | PASS | PASS | **0px** |
| **375px** | Mobile Standard | PASS | PASS | **0px** |
| **425px** | Mobile Large | PASS | PASS | **0px** |
| **1440px** | Desktop Standard | PASS | PASS | **0px** |

### Screenshots Captured:
- `t01-public-320px.png`, `t01-public-375px.png`, `t01-public-425px.png`, `t01-public-1440px.png`
- `t01-admin-320px.png`, `t01-admin-375px.png`, `t01-admin-425px.png`, `t01-admin-1440px.png`

---

## 7. Provisional Signatory Safeguard

Candidate Kepala Dinas:
- **Name:** Salim, S.Sos, M.Si
- **NIP:** 19681021 199010 1 001
- **Safeguard Status:** All official report previews and signatory settings are marked:  
  **`[PROVISIONAL — NOT VERIFIED FOR OFFICIAL USE]`**  
  Official legal accreditation remains deferred until signed client decree validation.

---

## 8. Test Execution Evidence

- **Vitest Unit & Integration Tests:** **237 / 237 passed** (27 test files)
- **Firestore Security Rules Tests:** **32 / 32 passed**
- **A01 Admin Authentication Scenarios:** **45 / 45 passed**
- **T01 Browser Verification Scenarios:** **14 / 14 passed**
- **Production Build:** Clean compilation across `@department-agenda/shared`, `@department-agenda/public`, and `@department-agenda/admin`.
- **Live Cloud Deployments:** **0 (STRICTLY PROHIBITED)**
