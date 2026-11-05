# SIMAK DISKUM v5.0 — P01 Pre-Production Readiness, Configuration Audit & Deployment Rehearsal Report

**Sistem Informasi Manajemen Agenda Kedinasan**  
**Dinas Koperasi dan Usaha Mikro Kota Batam**  
**Document Code:** P01-PREPROD-READINESS-202611  
**Target Infrastructure:** Firebase Spark (No-Cost Plan)  
**Target Firebase Project ID:** `simakdiskum`  
**Public Hosting Target:** `simakdiskum` (`simakdiskum.web.app`)  
**Admin Hosting Target:** `simakdiskum-admin` (`simakdiskum-admin.web.app`)  
**Status:** COMPLETE (Preparation Only — No Live Operations Performed)

---

## 1. Executive Summary

Milestone **P01 (Pre-Production Readiness, Configuration Audit & Deployment Rehearsal)** has successfully completed all technical audits, operational runbook specifications, role management utilities, and backup/recovery rehearsals.

In strict adherence to the project invariants:
- **No live deployments were executed.**
- **No real operator accounts were created.**
- **No live production database rules or collections were modified.**
- **No billing or paid Blaze upgrades were required or enabled.**

The architecture of SIMAK DISKUM v5.0 is verified to run entirely within the **Firebase Spark (No-Cost Plan)** while satisfying all security, operational, and data retention requirements of Dinas Koperasi dan Usaha Mikro Kota Batam.

---

## 2. Configuration & Environment Audit Findings

| Component | Audited Configuration File | Audit Status | Key Verification Details |
|---|---|---|---|
| **Project Target** | `.firebaserc` | **VERIFIED** | Default project set to `simakdiskum`. Hosting targets explicitly mapped: `public` -> `simakdiskum`, `admin` -> `simakdiskum-admin`. |
| **Hosting Targets** | `firebase.json` | **VERIFIED** | Two distinct hosting blocks: `target: "public"` serving `apps/public/dist` with SPA rewrites (`/index.html`), `target: "admin"` serving `apps/admin/dist` with SPA rewrites (`/index.html`). |
| **Emulator Isolation** | `firebase.emulator.json` | **VERIFIED** | Strict decoupling: uses `emulator.rules` for local testing while production `firebase.json` points strictly to `firebase/firestore.rules`. Ports set to `8080` (Firestore) and `5000/5001` (Hosting). |
| **Client Config Isolation** | `apps/*/src/firebase.ts` | **VERIFIED** | Both portals consume `import.meta.env?.VITE_FIREBASE_*` with safe public fallbacks. Emulator connections are strictly constrained to `window.location.hostname === 'localhost' \|\| window.location.hostname === '127.0.0.1'`. |
| **Database Indexes** | `firebase/firestore.indexes.json` | **VERIFIED** | Compound indexes provisioned for `activities` and `publicActivities` (`startDate ASC, endDate ASC`, `isPublic ASC, startDate ASC`) supporting efficient chronological queries without memory sorts. |
| **Secret Leak Prevention** | `.gitignore` | **VERIFIED** | Updated to rigorously ignore `*.serviceAccountKey.json`, `*service-account*.json`, `.env`, and `.env.*.local`. No credentials committed to Git. |

---

## 3. Firebase Spark Plan Quota & Performance Mathematical Modeling

### 3.1 Spark Plan Free Quotas (Reference)
- **Cloud Firestore Document Reads:** 50,000 reads / day
- **Cloud Firestore Document Writes:** 20,000 writes / day
- **Cloud Firestore Document Deletes:** 20,000 deletes / day
- **Cloud Firestore Stored Data:** 1 GiB total
- **Cloud Firestore Network Egress:** 10 GiB / month (360 MB / day)
- **Firebase Hosting Bandwidth:** 10 GB / month
- **Firebase Hosting Storage:** 10 GB total
- **Firebase Authentication:** Unlimited Email/Password accounts

### 3.2 Normal Workday Consumption Model (5 Operators, ~200 Public Visitors)
- **Public Portal Reads:**
  - 200 visitors view current month agenda.
  - Queries are date-bounded (`startDate >= Nov 1`, `startDate <= Nov 30`).
  - Average active public events in a month: ~40 documents.
  - Total public reads = $200 \times 40 = 8,000\text{ reads/day}$.
  - In-memory / sessionStorage caching reduces repeat views by 50% $\rightarrow \approx 4,000\text{ reads/day}$.
- **Admin Portal Reads & Writes:**
  - 5 operators active.
  - Initial load (employees, locations, organizers, settings, month activities): $\approx 100\text{ reads/session}$.
  - Daily writes (new invitations, stage progressions, remarks): $\approx 40\text{ writes/day}$.
  - Admin reads = $5 \times 100 \times 2 = 1,000\text{ reads/day}$.
- **Total Workday Consumption:**
  - **Reads:** $\approx 5,000 / 50,000$ (**10% of daily quota**).
  - **Writes:** $\approx 40 / 20,000$ (**< 0.2% of daily quota**).
  - **Hosting Bandwidth:** 200 visits $\times$ 180 KB cached bundle $\approx 36\text{ MB/day} \rightarrow \approx 1.1\text{ GB/month}$ (**11% of monthly quota**).

### 3.3 Peak Traffic Spike Scenario (5,000 Visitors During Public Event Announcement)
- 5,000 citizen visits in 24 hours.
- Without caching: $5,000 \times 40 = 200,000\text{ reads}$ $\rightarrow$ **Exceeds daily 50k limit**.
- **Mitigation Architecture in SIMAK DISKUM v5.0:**
  1. Date Bounding: Queries strictly request the selected active month, never the unbounded collection.
  2. Edge Caching & Local Session Cache: Subsequent views within the same citizen session consume local state.
  3. Quota Exhaustion Behavior: If reads exceed 50,000, Firestore returns HTTP 429 (`ResourceExhausted`). The Public Portal client displays an informative toast: *"Batas akses sementara tercapai. Silakan coba beberapa saat lagi"*. Static hosting shell continues to render without crashing.

---

## 4. Authentication Activation Plan & Operator Management CLI

### 4.1 Implementation Tool
The production role provisioning script is fully implemented and tested:
```
department-agenda-firebase/scripts/manageRoles.mjs
```
Automated unit tests in `tests/unit/authRoleManagement.test.ts` verify all 7 core functions:
1. `provision`: Creates or updates user with custom claims `{ role: 'admin' }` or `{ role: 'editor' }`.
2. `set-role`: Updates claims and sets `roleUpdatedAt` timestamp.
3. `inspect`: Reads user record, custom claims, and verification metadata.
4. `disable`: Disables account and revokes all active refresh tokens via `revokeRefreshTokens()`.
5. `reset-password`: Generates secure password reset links without exposing raw passwords.
6. Unknown email error handling.
7. Invalid role rejection (`admin` and `editor` strictly enforced; arbitrary strings rejected).

### 4.2 Security Protocol for Service Account Credentials
- Service account key must be generated via Google Cloud Console: **IAM & Admin -> Service Accounts -> Add Key (JSON)**.
- Stored exclusively in local secure environment: `$env:GOOGLE_APPLICATION_CREDENTIALS`.
- Git repository ignores all matching files.

---

## 5. Spark-Compatible Backup & Disaster Recovery Strategy

Because managed automated GCS exports require the paid Blaze plan, SIMAK DISKUM v5.0 provides a tested logical backup engine:
```
department-agenda-firebase/scripts/backupRestore.mjs
```
- **Export Capabilities:** Streams all 9 core collections (`activities`, `publicActivities`, `employees`, `departments`, `locations`, `organizers`, `categories`, `settings`, `auditLogs`) into clean, validated JSON datasets with SHA-256 manifest integrity metadata.
- **Restore Capabilities:** Atomic restoration using batched writes of 450 documents (well within Firestore's 500-op limit). Preserves exact document IDs and timestamps.
- **Master Data Seeding:** Idempotent `seed` command pre-populates official department structure, meeting rooms, categories, and Kepala Dinas signatory.
- **Automated Verification:** Verified via `tests/unit/backupRestore.test.ts` (3/3 passing).

---

## 6. Deployment Rehearsal & Safe Rollback Procedures

All deployment and rollback steps have been documented in:
```
docs/DEPLOYMENT_RUNBOOK.md
```
Key elements:
1. **Preflight Checklist:** 8 explicit gates covering clean git tree, 100% test pass, build verification, and pre-deploy backup.
2. **Explicit Deploy Command:**
   ```bash
   firebase deploy --project simakdiskum --only hosting:public,hosting:admin,firestore:rules,firestore:indexes
   ```
3. **Rollback Protocols:**
   - **Hosting (Instant 1-Click):** Firebase Console -> Hosting -> Release History -> Rollback (instant CDN revert).
   - **Firestore Security Rules:** Firebase Console -> Rules -> History -> Restore version.
   - **Database Restoration:** `node scripts/backupRestore.mjs restore <backupDir>`.

---

## 7. User Acceptance Test (UAT) Plan

The comprehensive 11-scenario UAT script is authored in:
```
docs/USER_ACCEPTANCE_TEST_PLAN.md
```
Key validation areas:
- Complete administrative progression: `INITIAL_ENTRY` $\rightarrow$ `OFFLINE_PROCESS` $\rightarrow$ `DETAILS_COMPLETED` $\rightarrow$ `ADMIN_COMPLETE`.
- Non-blocking conflict warnings (room & attendee concurrent scheduling).
- Official 8-column A4 landscape print layout verification (multi-page header repetition and signatory alignment).
- Microsoft Excel clean XLSX opening without XML repair dialogs.
- True 200% zoom reflow test (640px viewport) without horizontal clipping.
- Keyboard navigation and focus trapping.

---

## 8. Remaining Pre-Production Prerequisites (Console Manual Steps)

Before authorized deployment can be scheduled, the system administrator must perform the following one-time manual steps in Firebase Console:

1. **Activate Firebase Authentication:**
   - Open [Firebase Console](https://console.firebase.google.com/) -> Project `simakdiskum`.
   - Go to **Authentication** -> **Sign-in method**.
   - Enable **Email/Password** (leave email link passwordless sign-in disabled).
2. **Verify Hosting Sites Configured:**
   - Ensure `simakdiskum` (primary) and `simakdiskum-admin` (secondary) sites exist under Hosting.
3. **Provision Initial Admin User:**
   - Create the initial municipal administrator email in Authentication.
   - Execute:
     ```bash
     node scripts/manageRoles.mjs provision admin@diskum.batam.go.id admin "Administrator Diskum"
     ```

---

## 9. Verification Summary

| Test Suite / Audit | Tests / Checks | Status | Evidence Reference |
|---|---|---|---|
| **Vitest Unit & Integration Tests** | 180 tests | **PASSED** | 100% pass across shared, public, admin, auth, and backup modules |
| **Firestore Security Rules Unit Tests** | 32 tests | **PASSED** | Gate 5A `getAfter()` coordination and role invariants verified |
| **Auth Role Management Tests** | 7 tests | **PASSED** | `tests/unit/authRoleManagement.test.ts` (100% pass) |
| **Backup & Restoration Tests** | 3 tests | **PASSED** | `tests/unit/backupRestore.test.ts` (100% pass) |
| **Staging & Config Audit Tests** | 7 tests | **PASSED** | `tests/unit/stagingReadiness.test.ts` (100% pass) |
| **Production Build Compilation** | 3 packages | **PASSED** | Clean compile of `@department-agenda/shared`, `@department-agenda/public`, `@department-agenda/admin` |

---

## 10. Conclusion & Stop Boundary

Milestone **P01 is COMPLETE**. The project is in a fully rehearsed, documented, and audited state, ready for deployment authorization.

**In accordance with project rules, all operations have ceased at this checkpoint. No live deployment or production changes will occur without explicit user instruction.**
