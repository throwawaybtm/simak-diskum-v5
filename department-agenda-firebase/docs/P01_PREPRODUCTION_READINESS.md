# SIMAK DISKUM v5.0 — P01-A Operational Safety & Pre-Production Readiness Report

**Sistem Informasi Manajemen Agenda Kedinasan**  
**Dinas Koperasi dan Usaha Mikro Kota Batam**  
**Document Code:** P01-A-SAFETY-READINESS-202611  
**Target Infrastructure:** Firebase Spark (No-Cost Plan)  
**Target Firebase Project ID:** `simakdiskum`  
**Public Hosting Target:** `simakdiskum` (`simakdiskum.web.app`)  
**Admin Hosting Target:** `simakdiskum-admin` (`simakdiskum-admin.web.app`)  
**Status:** COMPLETE (Local Preparation & Operational Safety Verification Only)

---

## 1. Executive Summary & Verification Boundary

Milestone **P01-A (Operational Safety Correction Pass)** has comprehensively resolved all operational safety risks identified in backup and restoration, production master data seeding, operator role management, deployment sequence, and Spark quota mathematical modeling.

> [!IMPORTANT]
> **STRICT PRODUCTION INVARIANTS PRESERVED:**
> - **Zero live deployment commands (`firebase deploy`) were executed.**
> - **Zero live Firebase Authentication services or real operator accounts were created in production.**
> - **Zero cloud production database rules or live collections were modified.**
> - **Zero billing or paid Blaze upgrades were required or enabled.**
> - Operations have paused at the **P01-A Review Checkpoint** awaiting your formal written progression approval.

---

## 2. Hardened Backup & Disaster Recovery Architecture

### 2.1 The Merge Assumption Correction
The earlier assumption that `batch.set(..., { merge: true })` restores a database was audited and corrected:
- `merge: true` only merges fields present in the backup. It leaves orphaned documents created after the backup intact, and leaves modified or newly added fields untouched.
- `scripts/backupRestore.mjs` now implements **two distinct, explicit restore modes**:
  1. **Non-Destructive Import (`--mode=merge`):** Merges backup fields without deleting live documents or fields.
  2. **Controlled Full Restoration (`--mode=full`):** Performs complete document replacement (`{ merge: false }`) and identifies orphaned documents created after the backup.

### 2.2 Safety Gates: Dry-Run Diff & Mandatory Confirmation
- **Dry-Run Analysis (`--dry-run`):** Analyzes and outputs a complete diff report (backup count, live count, documents to restore, orphaned documents to delete) without modifying Firestore.
- **Mandatory Deletion Confirmation (`--force`):** If orphaned live documents exist in Firestore, `--mode=full` **refuses to run** unless `--force` is explicitly provided.

### 2.3 Lossless Firestore Type Serialization
Native Firestore types are preserved using documented type tagging:
- `Firestore.Timestamp`: Preserves seconds and nanoseconds.
- `Firestore.DocumentReference`: Preserves internal collection and document paths.
- Reconstructed losslessy upon deserialization.

### 2.4 Cryptographic SHA-256 Validation & Post-Restore Verification
- Exports compute SHA-256 checksums stored in `manifest.json`.
- Restores validate SHA-256 hashes before reading any data; corrupted files trigger an immediate fatal abort.
- A post-restoration verification pass verifies both document counts and field-level scalar equality against the backup JSON.

### 2.5 Audit Log Protection & Privileged Maintenance Logging
- `auditLogs` is strictly protected: even in `--mode=full`, **orphaned audit logs are never deleted**.
- Every execution of `restore` or `seed` automatically writes a tamper-evident maintenance record into `auditLogs` (`action: 'MAINTENANCE_RESTORE'`).

### 2.6 Partial Batch Failure Progress Ledger
- 450-document batches are atomic individually, but not globally.
- In case of a mid-restore interruption, `scripts/backupRestore.mjs` writes `restore-progress.json` logging completed batches and exact failure parameters to guide operator recovery.

---

## 3. Production Seeding Safety Architecture

### 3.1 Separation of Dev Fixtures vs Production Templates
- **Development Fixtures (`seed:dev` / `--env=dev`):** Synthetic fixtures clearly marked with `[DEMO]` for local testing in the Firestore emulator.
- **Production Master Data Template:** Authored `templates/productionMasterDataTemplate.json` containing the official Dinas structure with explicit placeholders (`[NAMA PEJABAT SESUAI SK RESMI]`, `[NIP RESMI]`) and `"clientApproved": false`.

### 3.2 Production Import Approval Enforcement
The default command:
```bash
node scripts/backupRestore.mjs seed
```
will **REJECT** execution unless passed an approved template (`--template=<path>`) with:
1. `"clientApproved": true`
2. Valid official decree reference (`"approvalReference": "SK/..."`)
3. Zero unresolved placeholder markers (`[NAMA`, `[NIP`).

---

## 4. Authentication & Operator Management Hardening

### 4.1 Implementation Tool (`scripts/manageRoles.mjs`)
- Roles constrained strictly to lowercase `admin` and `editor` matching `firestore.rules`.
- `REQUIRED_PROJECT_ID = 'simakdiskum'` enforces target project validation, rejecting accidental runs against foreign Firebase projects.
- Prefers Application Default Credentials (ADC via `gcloud auth application-default login`) or secure local environment keys over committed service account JSON files.

### 4.2 Documented Authentication Boundaries
1. **Token Lifetime Limitation:** Firebase ID tokens have a fixed 1-hour expiration. Calling `auth.revokeRefreshTokens(uid)` revokes the refresh token immediately, but an already issued JWT remains valid until expiration unless client-side or rule-side session checks invalidate it.
2. **Password Reset Delivery Limitation:** On the Spark plan, automated email sending is not available without external SMTP. Password reset links generated via `generatePasswordResetLink()` must be transmitted out-of-band via secure official municipal communications.
3. **API-Level Account Registration Safeguard:** By default, Firebase Web API keys permit user sign-ups unless disabled in the Firebase Console Identity Platform settings (**"Allow users to sign up" toggle must be set to DISABLED**). In Firestore rules, unassigned users have zero write permissions and zero access to private records.

---

## 5. Deployment & Rollback Safety Overhaul

Documented in [`docs/DEPLOYMENT_RUNBOOK.md`](file:///d:/Temp/docs/DEPLOYMENT_RUNBOOK.md):
- **Non-Atomicity Reality:** Firebase Hosting, Firestore Rules, and Firestore Indexes deploy via distinct APIs and regions.
- **Asset Rollback vs Data Recovery:** Hosting rollback reverts static files; it does not touch database records.
- **Rollback Realities:** Hosting CDN propagation requires 1–5 minutes; rules take seconds; rollback must be verified with smoke tests.
- **Ordered Deployment Sequence:**
  1. Preflight checklist & pre-deployment backup.
  2. Firestore Security Rules deploy & smoke test.
  3. Firestore Indexes deploy & status check.
  4. Hosting Portals deploy & live endpoint smoke verification.
  5. Rollback decision matrix.

---

## 6. Realistic Firebase Spark Quota & Traffic Mathematical Modeling

### 6.1 Complete Cold-Load Resource Accounting (Measured from Production Build)

| Portal / Resource | Raw Size | Compressed / Transfer Weight | Cache Policy |
|---|---|---|---|
| **Public Portal HTML** (`index.html`) | 1.14 kB | **0.57 kB gzip** | `no-cache` / ETag revalidation |
| **Public Portal CSS** (`index-*.css`) | 24.77 kB | **5.05 kB gzip** | 1 year immutable (`max-age=31536000`) |
| **Public App Code** (`index-*.js`) | 49.16 kB | **13.67 kB gzip** | 1 year immutable (`max-age=31536000`) |
| **Public Firebase Vendor** (`firebase-vendor-*.js`)| 874.42 kB | **226.02 kB gzip** | 1 year immutable (`max-age=31536000`) |
| **Barelang Hero Image** (`barelang-bridge.png`) | 108.60 kB | **108.60 kB binary** | 1 year immutable |
| **Batam Crest Emblem** (`batam-emblem.png`) | 34.20 kB | **34.20 kB binary** | 1 year immutable |
| **Total Public Cold Load** | **1,092.29 kB** | **~388.11 kB transfer** | Complete first-visit cost |
| **Public Warm Visit** (Cached Assets) | - | **< 3 kB** (HTTP 304 ETag) | Cached in browser disk |
| **ExcelJS Vendor** (`exceljs-vendor-*.js`) | 953.20 kB | **275.76 kB gzip** | Lazy-loaded on export only |
| **Admin Total Cold Load** | 1,148.60 kB | **~344.20 kB transfer** | Complete operator first-visit cost |

### 6.2 Firebase CDN Edge Caching vs Browser Caching
- **Firebase CDN Edge POPs:** Static assets are cached at Google Edge POPs globally. Subsequent visitors in Southeast Asia retrieve assets from Singapore/Jakarta POPs without hitting the primary storage origin.
- **Browser Caching:** Hashed files in `/assets/` are cached permanently on the user's device (`Cache-Control: max-age=31536000, immutable`). Only `index.html` revalidates with ETag headers (~0.5 kB transfer).

### 6.3 Daily & Monthly Traffic Scenarios

#### Scenario A: Normal Municipal Workday (200 Citizens, 5 Operators)
- **Public Visitors:** 200 citizens/day.
  - Cold Visitors (30% = 60 visitors): $60 \times 388\text{ kB} \approx 23.3\text{ MB}$.
  - Warm / Returning Visitors (70% = 140 visitors): $140 \times 3\text{ kB} \approx 0.42\text{ MB}$.
- **Admin Operators:** 5 operators $\times$ 344 kB $\approx 1.7\text{ MB}$.
- **Total Hosting Bandwidth:** $\approx 25.4\text{ MB/day} \rightarrow \approx 762\text{ MB/month}$ (**7.6% of 10 GB Spark monthly quota**).
- **Firestore Reads:** 200 visitors $\times$ ~40 month activities $\approx 8,000$ reads; session caching reduces repeat reads to $\approx 4,000$ reads/day; admin reads $\approx 1,000$ reads/day.
- **Total Firestore Reads:** $\approx 5,000 / 50,000$ reads/day (**10% of daily quota**).
- **Total Firestore Writes:** $\approx 40 / 20,000$ writes/day (**< 0.2% of daily quota**).

#### Scenario B: Public Event Spike Day (5,000 Citizens in 24 Hours)
- **Hosting Bandwidth:**
  - 50% Cold Visitors (2,500 visitors): $2,500 \times 388\text{ kB} \approx 970\text{ MB}$.
  - 50% Warm Visitors (2,500 visitors): $2,500 \times 3\text{ kB} \approx 7.5\text{ MB}$.
  - Total Spike Bandwidth $\approx 978\text{ MB}$ (fits safely within 10 GB monthly budget).
- **Firestore Reads:**
  - With Date Bounding and in-memory cache: $\approx 25,000$ reads (**50% of 50k daily quota**).
  - Unbounded reads without date bounding would exceed 50k reads.

### 6.4 Quota Exhaustion Comparison
- **Firestore Daily Limits (50,000 reads / 20,000 writes):** Resets daily at midnight US Pacific Time (14:00 WIB standard / 15:00 WIB daylight saving). Exhaustion triggers HTTP 429 (`ResourceExhausted`). Public UI gracefully displays an informative Indonesian toast without crashing the application shell.
- **Hosting Monthly Bandwidth (10 GB):** Resets on the 1st of each calendar month. Exhaustion causes Firebase Hosting to return HTTP 503 until the next month unless billing is upgraded.

---

## 7. Automated Test Verification Summary

| Test Suite / Category | Suite Location | Tests / Assertions | Status |
|---|---|:---:|:---:|
| **Firestore Security Rules Unit Tests** | `tests/rules/firestore.rules.test.ts` | 32 tests | **PASSED** (100%) |
| **Operator Role Management Tests** | `tests/unit/authRoleManagement.test.ts` | 7 tests | **PASSED** (100%) |
| **Hardened Backup & Restoration Tests** | `tests/unit/backupRestore.test.ts` | **8 tests** (+5 new) | **PASSED** (100%) |
| **Staging Readiness & Config Audit** | `tests/unit/stagingReadiness.test.ts` | 7 tests | **PASSED** (100%) |
| **Public Privacy & DTO Audit Tests** | `tests/integration/publicPrivacyAudit.emulator.test.ts` | 3 tests | **PASSED** (100%) |
| **WIB Time Engine & Date Arithmetic** | `tests/unit/timeUtils.test.ts` | 27 tests | **PASSED** (100%) |
| **Activity Validation & Chronology** | `tests/unit/activityValidator.test.ts` | 17 tests | **PASSED** (100%) |
| **Other Unit & Integration Suites** | `tests/unit/*` | 86 tests | **PASSED** (100%) |
| **Total Vitest Automated Tests** | Across 22 test files | **187 / 187 passed** | **PASSED** (100%) |
| **Playwright Real-Browser Verification** | 5 active Playwright suites | **79 / 79 passed** | **PASSED** (100%) |
| **Grand Total Automated Assertions** | Vitest + Browser | **266 passed** | **PASSED** (100%) |
| **Production Monorepo Build** | `npm run build` | `@department-agenda/shared`, `public`, `admin` | **PASSED** (Exit Code 0) |

---

## 8. Conclusion & Stop Boundary

Milestone **P01-A is COMPLETE**. The operational safety and pre-production posture of SIMAK DISKUM v5.0 is formally verified and ready for client review.

**Operations remain halted at this checkpoint. No live deployments, accounts, or cloud database modifications will occur without explicit authorization.**
