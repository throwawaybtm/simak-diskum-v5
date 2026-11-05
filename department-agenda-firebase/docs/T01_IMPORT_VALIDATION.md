# SIMAK DISKUM Kota Batam v5.0 — T01 Historical Import Validation & Rehearsal Report

**Milestone:** T01 — Temporary Data Preparation, Single-Admin Testing & October 2026 Agenda Import Rehearsal  
**Execution Date:** 2026-11-05T19:10:00+07:00  
**Target Environment:** Local Disposable Emulators (`demo-department-agenda`)  
**Status:** APPROVED & VERIFIED (Local Rehearsal, Safety Audit & Credential Remediation Complete)  
**Strict Safety Guard:** Zero Production Cloud Deployments / Zero Live Mutations / $0.00 Spark Plan Preserved  

---

## 1. Executive Summary

This milestone establishes the end-to-end data ingestion, operational verification, and security preflight of **October 2026 Historical Agenda Data** and the **Temporary Departmental Personnel Roster (70 Personnel across 8 Units)**.

All procedures were rehearsed against the local Firebase emulator environment (`127.0.0.1:8080` Firestore, `127.0.0.1:9099` Auth). The entire data lifecycle — source reading, schema validation, multi-day linkage, privacy quarantine, idempotent ingestion, browser rendering across four viewports (320px, 375px, 425px, 1440px), append-only audit trail logging, and immediate credential rotation — completed with **100% test pass rates**.

---

## 2. Immediate Credential Remediation & Security Audit

### 2.1 Compromised Test Password Remediation
During the initial T01 completion summary, a plaintext local administrator password was inadvertently exposed in chat reporting and local test fixtures:
- **Exposure Assessment:** Tracked Git commit `46f6b5f` introduced the local test credential into test scripts. While this credential was executed exclusively against the local Auth emulator (`127.0.0.1:9099`) on `demo-department-agenda` and was never deployed to any Google Cloud project, per strict security protocol it was immediately declared **COMPROMISED**.
- **Account Revocation:** The previous demonstration account (`admin.t01@batam.go.id`) was permanently deleted from the local Auth emulator via `scripts/rotateLocalCredentials.mjs`.
- **Approved Domain Enforcement:** In accordance with security directives, demonstration and local test accounts must **never use an unapproved real municipal domain (`@batam.go.id`)**. The local test suite has been updated to use the non-routable demonstration domain `@diskum.local` (default: `admin.demo@diskum.local`).
- **Dynamic Credential Generation:** Hardcoded passwords have been completely eliminated from all scripts, fixtures, and documentation. Local tests and CLI provisioning now utilize high-entropy dynamic credential generation (`scripts/rotateLocalCredentials.mjs` using Node.js `crypto.randomBytes(16)`) or read from ambient local environment variables (`LOCAL_ADMIN_PASSWORD`).
- **Cloud Isolation Invariant:** Under zero circumstances will any local test password or demonstration credential be reused in cloud staging or production.

### 2.2 Masked Meeting Credentials & Contact Details
All console loggers (`scripts/auditAllOctoberTabs.mjs`) and technical reports have been sanitized to mask meeting credentials and contact information:
- Zoom Passcodes: Masked as `ppdn***`, `173***`, `kem***`, `BIN***`, `765***` or `[REDACTED]`.
- Zoom URLs: Stripped of query authentication (`pwd=[REDACTED]`).
- Personal Mobile Numbers: Masked as `0812-****-****` across all reports.

---

## 3. Source Roster & Master Data Validation

### 3.1 Personnel Taxonomy & Reconciliation (70 Personnel Total)
The provided personnel markdown roster was parsed and directly verified against statutory Civil Service (BKN) formats:

| Category | Previously Assumed | Verified Actual Count | Verification Method & Format |
|---|:---:|:---:|---|
| **PNS (Pegawai Negeri Sipil)** | 44 | **42** | Traditional 18-digit NIP: `YYYYMMDD YYYYMM M NNN` (CPNS appointment month digits `01`–`12`). |
| **PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)** | 15 | **17** | NI PPPK format: `YYYYMMDD YYYY21 M NNN` (appointment marker `21`). Note: Two records holding Roman numeral functional grades (`Ahli Pertama - IX`) carry code `21` and are classified as PPPK. |
| **Non-ASN (Tenaga Non-ASN)** | 11 | **11** | Zero fabricated NIPs; assigned clean internal deterministic keys (`emp_nonasn_01` to `emp_nonasn_11`). |
| **Total Personnel** | **70** | **70** | **100% Reconciliation across all 8 organizational units** |

### 3.2 Department Distribution (8 Units)
1. **Dinas (Executive Leadership):** 2 (Salim, S.Sos, M.Si — Kadis; Adrial, S.K.M, M.K.M. — Sekdis)
2. **Bidang Kewirausahaan:** 7 (4 PNS, 3 PPPK)
3. **Bidang Pemberdayaan dan Pelindungan Koperasi:** 9 (5 PNS, 2 PPPK, 2 PMO Non-ASN)
4. **Bidang Pengawasan Koperasi:** 8 (7 PNS, 1 PPPK)
5. **Bidang Pengembangan Usaha Mikro:** 8 (6 PNS, 2 PPPK)
6. **UPTD Pengelolaan Dana Bergulir:** 8 (5 PNS, 3 PPPK)
7. **UPTD PLUT KUMKM:** 13 (3 PNS, 1 PPPK, 5 Konsultan PLUT, 4 Rumah Kemasan)
8. **Sekretariat:** 15 (10 PNS, 5 PPPK)

### 3.3 Firestore Schema Strictness & Metadata Availability
In accordance with Gate 5A `firestore.rules`, `isValidEmployee` strictly permits only:
`keys().hasOnly(['id', 'name', 'position', 'departmentId', 'active'])`.

- **Firestore Storage:** Client documents in `employees/{id}` conform strictly to this 5-key schema.
- **Offline Companion Template:** Auxiliary personnel metadata (`nip`, `rank`, `golongan`, `appointmentType`, `category`) is preserved losslessly in `templates/temporaryEmployeeMaster.json`.
- **Live Admin UI Availability:**
  - **Available in Admin UI:** Employee Name, Position (Jabatan), Department Assignment, and Active Status.
  - **Unavailable in Admin UI:** NIP, Rank/Golongan (e.g. `Pembina Utama Muda (IV/c)`), and Employment Category (`PNS`, `PPPK`, `Non-ASN`). These fields are omitted from live Firestore storage to respect strict security rules and will become available only when a dedicated schema revision or companion collection is authorized.

---

## 4. Normalization, Deduplication & Actual Ingestion Reconciliation

### 4.1 Ingestion Reconciliation Metrics

| Metric | Count | Reconciliation Notes & Provenance |
|---|:---:|---|
| **Raw Source Activity Rows** | **153** | Extracted across all 31 daily worksheets (`011026` to `311026`) in `temp_october_2026.xlsx`. |
| **Canonical Activities Ingested** | **152** | Ingested into `activities` and `publicActivities`. |
| **Confirmed Merged Duplicates** | **1** | Sheet `191026` Row 10 merged into Row 7 (same meeting, venue, time, organizer, and Zoom ID `835 7776 5800`; merged Kadis and departmental delegation into `act_20261019_02`). |
| **Linked Recurring Sessions** | **23** | 23 sessions linked across 11 recurring series (HCDP, AoC Bimtek, PLUT Consultation Clinic). |
| **Flagged Privacy Records** | **16** | 16 rows containing Zoom links with passwords, passcodes, or mobile numbers quarantined. |
| **Skipped Records** | **0** | Zero records dropped or skipped. |
| **Imported Employees** | **70** | Distributed across 8 divisions (conforming to `isValidEmployee`). |
| **Imported Departments** | **8** | Active municipal divisions. |

### 4.2 Actual Firestore Emulator Collection Counts & Audit Log Behavior
The ingestion engine (`scripts/executeT01Import.mjs`) was evaluated across two consecutive runs against the live Firestore emulator (`demo-department-agenda`):

| Collection Name | Run 1 (Initial Ingest) | Run 2 (Idempotent Re-Run) | Reconciliation Status & Explanation |
|---|:---:|:---:|---|
| `departments` | 8 | 8 | **IDENTICAL** — Idempotent deterministic set. |
| `employees` | 70 | 70 | **IDENTICAL** — Idempotent deterministic set. |
| `locations` | 10 | 10 | **IDENTICAL** — Idempotent deterministic set. |
| `organizers` | 8 | 8 | **IDENTICAL** — Idempotent deterministic set. |
| `categories` | 5 | 5 | **IDENTICAL** — Idempotent deterministic set. |
| `activities` | 152 | 152 | **IDENTICAL** — Idempotent deterministic set. |
| `publicActivities` | 152 | 152 | **IDENTICAL** — Idempotent deterministic set. |
| `settings` | 1 | 1 | **IDENTICAL** — Provisional signatory setting. |
| **`auditLogs`** | **1** | **2** | **APPEND-ONLY BY DESIGN** — Ingestion audit trail. |

### 4.3 Resolution of Audit Log Count Discrepancy
- **Actual Collection Identifier:** The canonical collection is named **`auditLogs`** (not `activityAuditLogs`).
- **Append-Only Invariant:** Every execution of `scripts/executeT01Import.mjs` logs an immutable compliance audit record (`audit_t01_${Date.now()}`) capturing operator, timestamp, elapsed duration, and document reconciliation metrics.
- **Why One Report Listed 1 while Another Listed 2:**
  - After Run 1, exactly **1 record** was written to `auditLogs`.
  - After Run 2 (the idempotency rehearsal), exactly **1 additional record** was appended to `auditLogs`, bringing the total count to **2 records**.
  - A previous chat summary table mistakenly labeled the collection as `activityAuditLogs` and copy-pasted `1` for both runs. That was an erroneous documentation summary typo; the actual database behavior strictly adheres to the append-only compliance specification, resulting in 2 audit records.
  - Core domain data (`activities`, `publicActivities`, `employees`, `departments`) achieved 100% mathematical idempotency with zero duplicate records.

---

## 5. Privacy & Confidentiality Protection

### 5.1 Strict Quarantining of Credentials
Source spreadsheet inspection discovered **16 rows** containing confidential meeting access details:
- **4 Zoom meeting URLs** containing embedded plaintext password parameters (`pwd=...`).
- **8 Meeting Passcodes & Sandi** (`ppdn***`, `173***`, `kem***`, `BIN***`, `765***`).
- **6 Personal mobile phone numbers** (`0812-****-****`, `0881-****-****`).

### 5.2 Public Projection Integrity
- **Private Collection (`activities`):** Retains `privateMeetingUrl` and `privateNotes` containing internal credentials for authorized municipal operators.
- **Public Collection (`publicActivities`):**
  - All credentials replaced with safe generic notices (`[TAUTAN VIRTUAL DIAMANKAN]`, `[KREDENSIAL DIKANTOR]`, `[KONTAK RESMI DIARSIP]`).
  - Completely omits `privateNotes`, `privateMeetingUrl`, `cancelReason`, and `attendeeIds`.
  - Attendee labels omit all internal database IDs (`emp_...`) and NIPs.
- **Automated Verification:** Verified across all 152 public documents using automated regex security assertions (`tests/integration/t01PrivacyProjection.test.ts`).

---

## 6. Single-Admin Account Local Verification

- **Provisioned Demonstration Account:** `admin.demo@diskum.local` (Approved non-routable demo domain)
- **Role Claim:** `{ role: "admin", department: "Dinas Koperasi dan Usaha Mikro Kota Batam" }`
- **Verification Results:**
  1. Successful login and token claims refresh.
  2. Authenticated access to private `activities` and `employees`.
  3. Strict rejection of unauthenticated/anonymous access to private collections (`PERMISSION_DENIED`).
  4. Session termination (logout) completely unmounts administrative shell and wipes session caches.

---

## 7. Multi-Viewport Browser Verification (Playwright)

Both portals were verified across four standardized viewports using the real imported October 2026 dataset:

| Viewport | Device Profile | Public Portal Status | Admin Portal Status | Measured Horizontal Overflow |
|---|---|:---:|:---:|:---:|
| **320px** | Mobile Mini | PASS | PASS | **0px** |
| **375px** | Mobile Standard | PASS | PASS | **0px** |
| **425px** | Mobile Large | PASS | PASS | **0px** |
| **1440px** | Desktop Standard | PASS | PASS | **0px** |

*All 14 Playwright verification scenarios in `tests/e2e/t01ImportVerification.mjs` passed cleanly with 0px horizontal overflow.*
