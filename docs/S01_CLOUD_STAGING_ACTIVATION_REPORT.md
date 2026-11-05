# S01 — Safe Cloud Staging Activation Report

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**System:** SIMAK DISKUM v5.0 (Sistem Informasi Manajemen Agenda Kedinasan)  
**Target Environment:** Firebase Cloud Staging (Isolated Environment)  
**Date:** 2026-11-05  
**Release Plan Authority:** `docs/S01_STAGING_PLAN.md`  
**Current Milestone Status:** **STAGING INFRASTRUCTURE DEPLOYED, SEEDED & VERIFIED — PENDING OWNER AUTH ACTIVATION IN CONSOLE**

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

### Visual Staging Banner
Both applications display the prominent staging ribbon:
```
[UJI COBA] LINGKUNGAN UJI COBA / STAGING — DATA SIMULASI
```
This guarantees that any reviewer or visitor is immediately aware that data is simulated and isolated.

---

## 5. Administrator Provisioning Verification (Completed)

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

### Action Required by Project Owner to Set Password & Log In:
1. Open the Staging Password Recovery page:  
   👉 **[https://simakdiskum-staging-admin.web.app/#recover](https://simakdiskum-staging-admin.web.app/#recover)**
2. Enter your email: **`riyanbwirawanto@gmail.com`** and click **Kirim Tautan Pemulihan**.
3. Check your Gmail inbox for the official password reset email from Google Identity / Firebase (`noreply@simakdiskum-staging.firebaseapp.com`).
4. Click the link in your email to choose your personal secret password.
5. Return to the Staging Admin Portal to log in:  
   👉 **[https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app)**

---

## 6. Resource Usage & Spark Plan Verification

- **Current Billing Account:** None (Unlinked).
- **Plan:** Firebase Spark Free Tier ($0.00/month).
- **Daily Document Quotas:**
  - Reads: 38 documents loaded per cold public calendar view (well within the 50,000/day limit).
  - Writes: 0 writes during ordinary public browsing (well within the 20,000/day limit).
- **Hosting Bandwidth:** 2 applications deployed (Public: ~1.5 MB uncompressed, Admin: ~1.8 MB uncompressed); well within the 10 GB/month limit.

---

## 7. Next Steps

1. Owner completes the 4 console steps in Section 5 and shares their authorized email.
2. Provision the single staging Administrator user via Admin SDK.
3. Owner logs in to [https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app) to test administrative CRUD, report generation, and print functions.
4. Conduct stakeholder acceptance review from desktop and mobile devices.
