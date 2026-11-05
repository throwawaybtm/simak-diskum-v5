# SIMAK DISKUM v5.0 — Deployment & Rollback Runbook

**Dinas Koperasi dan Usaha Mikro Kota Batam**  
**Document Version:** 1.0  
**Effective Date:** November 2026  
**Infrastructure Target:** Firebase Spark (No-Cost) Plan  
**Target Project ID:** `simakdiskum`  
**Public Hosting Target:** `simakdiskum` (`simakdiskum.web.app`)  
**Admin Hosting Target:** `simakdiskum-admin` (`simakdiskum-admin.web.app`)

---

## 1. Safety Notice & Invariant Boundary

> [!CAUTION]
> **PREPARATION & REHEARSAL ONLY.**
> Do NOT execute live deployment commands until formal deployment authorization is granted by the department project lead. Live deployment alters cloud infrastructure, edge caching, and security enforcement.

---

## 2. Preflight Checklist (Mandatory Gates)

Before running any deployment command, the deploying engineer must check off all items in the following checklist:

- [ ] **Git Working Tree Clean:**
  `git status --porcelain` returns no uncommitted modifications or untracked sensitive files.
- [ ] **On Approved Release Tag / Branch:**
  Repository is on `master` or a designated release tag (e.g. `v5.0.0-rc1`).
- [ ] **All Automated Tests Pass:**
  Run `npx vitest run` in `department-agenda-firebase`. All unit and integration test suites must pass (170+ tests, 0 failures).
- [ ] **Firestore Rules Regression Tests Pass:**
  Rules tests against the Firestore emulator must pass 100% (32/32 tests passed).
- [ ] **Full Production Build Completes Cleanly:**
  Run `npm run build` from `department-agenda-firebase`. Verify both `apps/public/dist` and `apps/admin/dist` are compiled with no errors.
- [ ] **Build Artifacts Verified:**
  - `apps/public/dist/index.html` exists and references hashed assets.
  - `apps/admin/dist/index.html` exists and references hashed assets.
  - No secret keys or `.env` files are bundled into distribution folders.
- [ ] **Current State Backed Up (If Updating Existing System):**
  Run logical backup: `node scripts/backupRestore.mjs export ./backups/pre_deploy_$(Get-Date -Format 'yyyyMMdd_HHmm')`
- [ ] **Firebase Authentication & Target Verified:**
  - Run `firebase login:list` to ensure authorized account is active.
  - Verify project target: `firebase use simakdiskum`.

---

## 3. Production Build Execution

Execute the clean build across all monorepo packages:

```bash
cd department-agenda-firebase

# 1. Clean previous build output (optional but recommended)
# PowerShell:
Remove-Item -Recurse -Force apps/public/dist, apps/admin/dist, shared/dist -ErrorAction SilentlyContinue

# 2. Build shared library, public portal, and admin portal
npm run build
```

Verify build output directory structure:
```text
department-agenda-firebase/
├── apps/
│   ├── public/
│   │   └── dist/
│   │       ├── index.html
│   │       └── assets/
│   │           ├── index-*.js
│   │           └── index-*.css
│   └── admin/
│       └── dist/
│           ├── index.html
│           └── assets/
│               ├── index-*.js
│               └── index-*.css
```

---

## 4. Live Deployment Commands

### 4.1 Full Production Deployment (Standard)
Deploys both Hosting targets, Firestore Security Rules, and Firestore Compound Indexes simultaneously:

```bash
firebase deploy --project simakdiskum --only hosting:public,hosting:admin,firestore:rules,firestore:indexes
```

### 4.2 Targeted Deployments (Isolated Changes)

#### When deploying web application updates only (no rules changes):
```bash
# Deploy both public and admin portals:
firebase deploy --project simakdiskum --only hosting

# Deploy public portal only:
firebase deploy --project simakdiskum --only hosting:public

# Deploy admin portal only:
firebase deploy --project simakdiskum --only hosting:admin
```

#### When deploying security rules updates only:
```bash
# WARNING: Live rules take effect immediately globally!
firebase deploy --project simakdiskum --only firestore:rules
```

#### When deploying Firestore index changes only:
```bash
firebase deploy --project simakdiskum --only firestore:indexes
```

---

## 5. Post-Deployment Verification (Smoke Tests)

Immediately after deployment completes:

1. **Verify Public Portal Online:**
   Open `https://simakdiskum.web.app` (or `https://simakdiskum.firebaseapp.com`):
   - Confirm Indonesian branding: "Dinas Koperasi dan Usaha Mikro Kota Batam".
   - Confirm Barelang Bridge banner displays.
   - Confirm 4 summary cards render.
   - Navigate to **Kalender Kegiatan**, **Cari Agenda**, and **Pengumuman**.
   - Check browser DevTools console: 0 JavaScript exceptions.

2. **Verify Admin Portal Online:**
   Open `https://simakdiskum-admin.web.app` (or `https://simakdiskum-admin.firebaseapp.com`):
   - Confirm Admin Portal login page displays.
   - Test login with authorized operator credentials.
   - Confirm 5 workflow summary cards display accurate numbers.
   - Check administrative status ring chart and upcoming agenda list.

3. **Verify Security Rules Invariant:**
   - Attempt unauthenticated access to private `activities` collection via console: expect `PERMISSION_DENIED`.
   - Confirm public read access to `publicActivities` succeeds with zero errors.

---

## 6. Rollback Procedures

### 6.1 Distinguishing Asset Rollback vs Data Recovery

> [!IMPORTANT]
> - **Hosting Asset Rollback** reverts the static HTML/CSS/JavaScript files served to user browsers. It does NOT touch, revert, or modify any database records in Firestore.
> - **Firestore Rules Rollback** reverts security access policies. It does NOT alter data stored in documents.
> - **Data Recovery** (restoring modified/deleted documents) requires executing `scripts/backupRestore.mjs restore <backupDir>`.

---

### 6.2 Procedure A: Instant Hosting Rollback

If a critical frontend bug or breaking UI defect is discovered in production:

#### Method 1: Via Firebase Console (Recommended — Instant 1-Click)
1. Open [Firebase Console](https://console.firebase.google.com/) -> Select Project `simakdiskum`.
2. Navigate to **Build** -> **Hosting**.
3. Under the affected site (`simakdiskum` or `simakdiskum-admin`):
   - Locate **Release History**.
   - Find the previous known-good release.
   - Click the three dots `⋮` on the right side of the release row.
   - Select **Rollback**.
4. Rollback takes effect globally within seconds at Google CDN edge nodes.

#### Method 2: Via Firebase CLI
```bash
# Clone the previous deployment release version to live:
# Syntax: firebase hosting:clone <sourceSite>:<versionId> <targetSite>:live
firebase hosting:clone simakdiskum:<PREVIOUS_VERSION_ID> simakdiskum:live --project simakdiskum
```

---

### 6.3 Procedure B: Firestore Security Rules Rollback

If newly deployed security rules inadvertently block legitimate department operations:

#### Method 1: Via Firebase Console
1. Navigate to **Firestore Database** -> **Rules** tab.
2. In the top right of the rules editor, click **Rules history**.
3. Locate the previous operational version timestamp.
4. Click **Restore version** and then **Publish**.

#### Method 2: Via Git and Firebase CLI
1. Checkout the previous Git release tag:
   ```bash
   git checkout tags/v5.0.0-rc1 -- firebase/firestore.rules
   ```
2. Deploy the restored rules immediately:
   ```bash
   firebase deploy --project simakdiskum --only firestore:rules
   ```
3. Verify test suite passes locally.

---

### 6.4 Procedure C: Database State Rollback

If unauthorized or corrupt batch updates occurred in the Firestore database:
1. Identify the most recent clean backup directory created under `backups/`.
2. Run the recovery utility:
   ```bash
   node scripts/backupRestore.mjs restore ./backups/<timestamp>_clean
   ```
3. Inform logged-in operators to refresh their browser sessions.
