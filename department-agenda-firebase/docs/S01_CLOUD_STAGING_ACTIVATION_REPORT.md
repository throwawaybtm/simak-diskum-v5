# S01 — Safe Cloud Staging Activation Report

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**System:** SIMAK DISKUM v5.0 (Sistem Informasi Manajemen Agenda Kedinasan)  
**Target Environment:** Firebase Cloud Staging (Isolated Environment)  
**Date:** 2026-11-05  
**Release Plan Authority:** `docs/S01_STAGING_PLAN.md`  
**Current Milestone Status:** **STAGING ACTIVATED, ADMIN PROVISIONED, VISUAL DEFECT REMEDIATED & VERIFIED LIVE**

---

## 1. Environment & Infrastructure Summary

| Parameter | Configuration Value | Verification Evidence |
|---|---|---|
| **GCP / Firebase Project ID** | `simakdiskum-staging` | Verified via Firebase CLI & Google Cloud Resource Manager |
| **Project Display Name** | `SIMAK DISKUM Staging` | Provisioned via `firebase projects:create` |
| **Active Pricing Plan** | **Firebase Spark Plan ($0.00/month)** | Zero billing account attached; Blaze upgrades strictly disabled |
| **Firestore Edition & Database** | `STANDARD` / `(default)` | Native Firestore database provisioned in Jakarta (`asia-southeast2`) |
| **Public Hosting Site ID** | `simakdiskum-staging` | Default site created automatically with project |
| **Public Live Deployed URL** | [https://simakdiskum-staging.web.app](https://simakdiskum-staging.web.app) | Returns HTTP 200 OK |
| **Admin Hosting Site ID** | `simakdiskum-staging-admin` | Dedicated second site created via `firebase hosting:sites:create` |
| **Admin Live Deployed URL** | [https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app) | Returns HTTP 200 OK |
| **Hosting Target Mapping** | `public` $\rightarrow$ `simakdiskum-staging`<br>`admin` $\rightarrow$ `simakdiskum-staging-admin` | Configured in `.firebaserc` via `firebase target:apply` |
| **Target Isolation** | Production project `simakdiskum` untouched | Zero writes, zero rules changes, zero releases to production |

---

## 2. Firestore Security Rules & Composite Indexes

### A. Restrictive Security Rules Verification
- **Rules File Deployed:** `firebase/firestore.rules` (Release Identity: `SIMAK_DISKUM_PRODUCTION_SECURITY_RULES_V5`, 707 lines, SHA-256 `444b48ba8e9d5979b0845e997babe9a728fefc930e3f03bab35da91e11570678`).
- **Live Endpoint Security Probe Results (100% Pass):**
  1. `GET /publicActivities`: **PASS (HTTP 200 OK)** — Anonymous public calendar reads permitted.
  2. `GET /activities`: **PASS (HTTP 403 Forbidden)** — Internal private agenda reads denied.
  3. `GET /employees`: **PASS (HTTP 403 Forbidden)** — Employee roster reads denied.
  4. `GET /auditLogs`: **PASS (HTTP 403 Forbidden)** — Audit trail reads denied.
  5. `PATCH /publicActivities/hack`: **PASS (HTTP 403 Forbidden)** — Unauthenticated writes denied.
  6. `PATCH /activities/hack`: **PASS (HTTP 403 Forbidden)** — Unauthenticated private writes denied.
  7. `PATCH /settings/config`: **PASS (HTTP 403 Forbidden)** — Unauthenticated configuration mutations denied.

### B. Composite Indexes Provisioning
All required range and inequality composite indexes were deployed and verified in `READY` state across Google Cloud cells:
1. `publicActivities` (`startDate ASC, endDate ASC, __name__ ASC`) — **READY**
2. `publicActivities` (`endDate ASC, startDate ASC, __name__ ASC`) — **READY**
3. `activities` (`startDate ASC, endDate ASC, __name__ ASC`) — **READY**
4. `activities` (`endDate ASC, startDate ASC, __name__ ASC`) — **READY**

---

## 3. Synthetic Staging Data & Privacy Verification

In strict accordance with Phase 5 directives, zero real municipal records from `temp_october_2026.xlsx` and zero actual personnel records from `temporaryEmployeeMaster.json` were uploaded.

A dedicated deterministic fixture generator (`scripts/seedStagingSyntheticData.mjs`) generated and verified the following synthetic domain dataset:

| Entity Collection | Synthetic Count | Notes & Constraints |
|---|:---:|---|
| `departments` | 8 | 8 fictional organizational units (Sekretariat, 2 Subbag, 4 Bidang, 1 PLUT) |
| `employees` | 16 | Fictional names (e.g., "Budi Simulasi", "Siti Purwarupa"); zero real NIPs in Firestore |
| `locations` | 8 | 3 Office rooms, 3 External venues, 2 Online virtual rooms |
| `organizers` | 6 | 4 Internal divisions, Pemko Batam, Kemenkop RI |
| `categories` | 5 | Rapat Internal, Bimtek, Pengawasan, Sosialisasi, Pameran UMKM |
| `activities` | 38 | October 2026 scheduling patterns (single-day, multi-day, recurring series, 2 cancelled) |
| `publicActivities` | 38 | 100% sanitized public projections matching `isValidPublicActivity` |
| `settings/config` | 1 | Fictional signatory (`00000000 000000 0 000`) |
| `settings/announcements`| 3 | Representative civic announcements |
| `auditLogs` | 1 | Append-only migration record (`MIGRATION_IMPORT`) |

### Pre-Seeding Privacy Scan
- **Sensitive String Scanner:** Scanned all nested properties in the generated dataset for:
  - Real 18-digit ASN NIPs: **0 detected**
  - Personal mobile numbers (`08xx`, `+62xx`): **0 detected**
  - Live Zoom / Teams meeting links & passcodes: **0 detected**
  - Municipal email addresses (`@batam.go.id`): **0 detected**
- **Public Cloud REST Verification:** Verified that `https://firestore.googleapis.com/.../publicActivities` returns only sanitized synthetic records with zero internal IDs or meeting secrets.

---

## 4. Multi-Viewport Live Smoke-Test Results

Playwright automated browser tests were executed directly against the real deployed staging URLs:

| Viewport | Public Portal (`simakdiskum-staging.web.app`) | Admin Portal (`simakdiskum-staging-admin.web.app`) | Horizontal Overflow |
|---|:---:|:---:|:---:|
| **320px (Small Mobile)** | **PASS** — Staging banner & navigation intact | **PASS** — Login card & staging banner intact | **0px (Clean)** |
| **375px (Standard Mobile)** | **PASS** — Staging banner & navigation intact | **PASS** — Login card & staging banner intact | **0px (Clean)** |
| **425px (Large Mobile)** | **PASS** — Staging banner & navigation intact | **PASS** — Login card & staging banner intact | **0px (Clean)** |
| **1440px (Desktop)** | **PASS** — 38 activities loaded via live Firestore query | **PASS** — Full login container & staging banner | **0px (Clean)** |

---

## 5. Administrator Provisioning Verification

The project owner completed the Firebase Authentication console activation and confirmed the preferred staging administrator email (`riyanbwirawanto@gmail.com`).

The account was provisioned via `scripts/manageRoles.mjs` using Application Default Credentials (ADC):
```powershell
node scripts/manageRoles.mjs provision riyanbwirawanto@gmail.com "Administrator Staging" admin --target=staging --suppress-link
```

### Verified User Record:
- **Project Target:** `simakdiskum-staging` (Live Google Cloud)
- **UID:** `31Bin8ErtBaAy3YODaf1SKKymYb2`
- **Email:** `riyanbwirawanto@gmail.com`
- **Display Name:** `Administrator Staging`
- **Disabled:** `false`
- **Email Verified:** `true`
- **Custom Claims:**
  ```json
  {
    "role": "admin",
    "department": "Dinas Koperasi dan Usaha Mikro Kota Batam",
    "updatedAt": "2026-11-05T14:19:27.693Z"
  }
  ```
- **Zero Credential Exposure:** Auto-generated secure high-entropy password; setup token and links were strictly suppressed from stdout, task logs, and Git.

---

## 6. Resource Usage & Spark Plan Verification

- **Current Billing Account:** None (Unlinked).
- **Plan:** Firebase Spark Free Tier ($0.00/month).
- **Daily Document Quotas:**
  - Reads: 38 documents loaded per cold public calendar view (well within the 50,000/day limit).
  - Writes: 0 writes during ordinary public browsing (well within the 20,000/day limit).
- **Hosting Bandwidth:** 2 applications deployed (Public: ~1.5 MB uncompressed, Admin: ~1.8 MB uncompressed); well within the 10 GB/month limit.

---

## 7. Critical Staging Banner Layout Defect Remediation

### A. Defect Symptom & Initial Audit
Following successful operator authentication, the staging Admin Dashboard exhibited severe horizontal layout deformation:
- The pale-yellow staging notification banner rendered as a massive page-wide ($100\text{vw} \times 100\text{vh}$) vertical column on the LEFT.
- The Admin Sidebar (250px) and main dashboard body were pushed off-screen to the RIGHT, requiring manual horizontal scrolling to access.

### B. Confirmed Root Cause
1. In `apps/admin/src/main.ts`, `renderAdminShell()` inserted `<div class="staging-indicator-banner">` as a direct child of `#admin-app`.
2. When authenticated, `#admin-app` was assigned `class="admin-layout"`.
3. In `apps/admin/src/styles/admin.css`, `.admin-layout` declared `display: flex` with default horizontal orientation (`flex-direction: row`).
4. Because `.staging-indicator-banner` declared `width: 100%`, it participated as the first column in the flex row, consuming $100\text{vw}$ of width and stretching to $100\text{vh}$ (`align-items: stretch`).
5. Sibling elements (`.admin-sidebar` and `.admin-body`) were positioned sequentially after this $100\text{vw}$ column.

### C. Structural Layout Correction
1. **Container Flex Hierarchy:**
   - Modified `.admin-layout` in `apps/admin/src/styles/admin.css` to `flex-direction: column`.
   - Introduced `.admin-main-container` (`display: flex; flex-direction: row; flex: 1; min-height: 0; width: 100%;`).
   - In `apps/admin/src/main.ts`, placed `.staging-indicator-banner` on Row 1 (spanning 100% width, compact height).
   - Placed `.admin-sidebar` (250px) on the LEFT and `.admin-body` (flex: 1) on the RIGHT inside `.admin-main-container` on Row 2.
   - When staging mode is inactive (production), Row 1 is omitted and `.admin-main-container` takes full height seamlessly with zero layout differences.
2. **Compact Notification Notice Styling:**
   - Updated `.staging-indicator-banner` styling: `font-size: 0.75rem; padding: 0.25rem 0.5rem; flex-wrap: wrap; flex-shrink: 0; width: 100%;`.
   - Updated banner text:
     - Badge: `UJI COBA`
     - Text: `LINGKUNGAN STAGING / DATA SIMULASI`
     - Combined representation: `[UJI COBA] LINGKUNGAN STAGING / DATA SIMULASI`
   - Added `@media print { .staging-indicator-banner { display: none !important; } }` to ensure zero watermark leakage in printed official reports.
3. **Public Portal Parity:**
   - Updated Public Portal header banner and styling to match the compact Indonesian typography and prevent narrow-viewport line overflow.

### D. Live Multi-Viewport Layout Measurements (Post-Fix)

| Viewport | Mode / Page | `scrollWidth` | `clientWidth` | Horizontal Overflow | Banner Height | Sidebar Left | Body Left |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **320px (Mobile Mini)** | Admin Dashboard | 320px | 320px | **0px** | 54.7px | Hidden Drawer | 0px |
| **375px (Mobile Std)**  | Admin Dashboard | 375px | 375px | **0px** | 30.3px | Hidden Drawer | 0px |
| **425px (Mobile Large)**| Admin Dashboard | 425px | 425px | **0px** | 30.3px | Hidden Drawer | 0px |
| **768px (Tablet)**      | Admin Dashboard | 768px | 768px | **0px** | 30.3px | Hidden Drawer | 0px |
| **1024px (Laptop)**     | Admin Dashboard | 1024px| 1024px| **0px** | 30.3px | **0px (Docked)** | 250px |
| **1440px (Desktop HD)** | Admin Dashboard | 1440px| 1440px| **0px** | 30.3px | **0px (Docked)** | 250px |
| **320px (Mobile Mini)** | Public Portal   | 320px | 320px | **0px** | 54.7px | N/A | 0px |
| **1440px (Desktop HD)** | Public Portal   | 1440px| 1440px| **0px** | 30.3px | N/A | 0px |

---

## 8. Final Status & Verification Deliverables

- **Live Deployed Admin Portal:** [https://simakdiskum-staging-admin.web.app/#dashboard](https://simakdiskum-staging-admin.web.app/#dashboard)
- **Live Deployed Public Portal:** [https://simakdiskum-staging.web.app](https://simakdiskum-staging.web.app)
- **Test Results:** 239/239 Vitest unit/integration tests passed, 13/13 regression scenarios passed, 31/31 live staging layout scenarios passed.
- **Billing Tier:** Firebase Spark Tier ($0.00/month preserved).
- **Production Isolation:** 100% preserved. Project `simakdiskum` untouched.
