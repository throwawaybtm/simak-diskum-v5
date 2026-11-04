# Feature F01: Agenda Administrative Workflow & Invitation Letter Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 4-stage administrative workflow (`administrativeStage`) decoupled from operational event status and add private structured invitation letter metadata (`invitationLetter` with No. Agenda, Tanggal Surat, Perihal, and Google Drive URL) to the Batam Department Activity Scheduling System v5.0 without exposing confidential information to public channels or breaking the Gate 5A version-lockstep Firestore rules.

**Architecture:** Pure TypeScript domain models in `shared` with strict validation separating blocking errors from nonblocking warnings; coordinated Firestore repository transactions preserving atomic version bumps and sanitized public projections; hardened Firestore CEL security rules validating `administrativeStage` and `invitationLetter`; enhanced Admin UI forms, filters, and dashboard counts styled within current design tokens; preserved official 8-column reporting and zero-leak public projections.

**Tech Stack:** TypeScript 5.6, Firebase Firestore (Web SDK v10 & Modular CEL Rules), Vite 6, Vitest 3, Playwright, ExcelJS.

**Spec:** `docs/FEATURE_F01_SPEC.md`

## Global Constraints

- **100% Spark Free Tier:** Zero Cloud Functions, zero Firebase Storage, zero Blaze billing dependencies.
- **Strict Privacy Isolation:** Zero invitation letter metadata or Google Drive URLs exposed in `publicActivities`, public DOM, public DTOs, or official 8-column reports.
- **Gate 5A Version Lockstep:** Every private activity update must coordinate atomically with its public projection and increment `version` in lockstep.
- **Backward Compatibility:** Legacy activities lacking `administrativeStage` must default safely to `INITIAL_ENTRY`.
- **Immutable Activity UUID:** Advancing or regressing through administrative stages retains the exact same activity UUID and historical snapshots.

## Review Focus

1. **Untouched Public Projection on Private Metadata Update:** When only `invitationLetter` or `administrativeStage` is updated, the coordinated transaction must still bump the public projection's `version` to satisfy Gate 5A rules.
2. **Drive URL Scheme Injection:** Attempting to submit `javascript:alert(1)`, `http://`, or arbitrary non-Google domains into `driveUrl` must be blocked by both client-side validator and Firestore security rules.
3. **Empty Attendees on `INITIAL_ENTRY`:** Activities in `INITIAL_ENTRY` must be savable with 0 attendees and 0 remarks without blocking submission, generating only nonblocking warnings.
4. **Enforcing Letter Data on `ADMIN_COMPLETE`:** An activity cannot transition to `ADMIN_COMPLETE` if `agendaNumber`, `letterDate`, `letterTopic`, or `driveUrl` is missing unless an explicit `missingDocumentReason` is provided.
5. **Stage Regression Audit Trail:** Transitioning an activity backward to an earlier administrative stage must capture a reason and record an audit log event.

---

### Task 1: Schema Extensions, Types, and Pure TypeScript Validation Engine

**Files:**
- Modify: `department-agenda-firebase/shared/src/schema/activity.ts`
- Modify: `department-agenda-firebase/shared/src/validation/activityValidator.ts`
- Test: `department-agenda-firebase/tests/unit/activityValidator.test.ts`

**Interfaces:**
- Consumes: `ActivityDocument` from `shared/src/schema/activity.ts`
- Produces:
  - `AdministrativeStage`: `'INITIAL_ENTRY' | 'OFFLINE_PROCESS' | 'DETAILS_COMPLETED' | 'ADMIN_COMPLETE'`
  - `DocumentVisibility`: `'INTERNAL' | 'PUBLIC'`
  - `InvitationLetterMetadata`: `{ agendaNumber?: string; letterDate?: string; letterTopic?: string; driveUrl?: string; documentVisibility?: DocumentVisibility; missingDocumentReason?: string; }`
  - `isValidGoogleDriveUrl(url: string): boolean`
  - `validateActivity(activity: Partial<ActivityDocument>): ValidationResult`

- [ ] **Step 1: Write the failing unit tests for F01 validation in `tests/unit/activityValidator.test.ts`**
  - Test initial entry allows missing attendees and empty remarks without error.
  - Test valid Google Drive and Docs HTTPS URLs pass (`https://drive.google.com/file/d/123/view`, `https://docs.google.com/document/d/123/edit`).
  - Test unsafe URLs fail (`http://drive.google.com`, `javascript:void(0)`, `https://evil.com/drive`).
  - Test `ADMIN_COMPLETE` validation blocks if letter fields are missing without `missingDocumentReason`.
  - Test `ADMIN_COMPLETE` passes when letter fields are present or explicit `missingDocumentReason` is supplied.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `npm test tests/unit/activityValidator.test.ts`
  - Expected: FAIL with missing fields or validation functions.

- [ ] **Step 3: Implement types and validator functions**
  - In `shared/src/schema/activity.ts`, export `AdministrativeStage`, `DocumentVisibility`, `InvitationLetterMetadata`, and extend `ActivityDocument`.
  - In `shared/src/validation/activityValidator.ts`, add `isValidGoogleDriveUrl`, validate `administrativeStage`, validate `invitationLetter`, and enforce stage requirements.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `npm test tests/unit/activityValidator.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - `git add shared/src/schema/activity.ts shared/src/validation/activityValidator.ts tests/unit/activityValidator.test.ts`
  - `git commit -m "feat(shared): add F01 administrative workflow types and validation rules"`

---

### Task 2: Firestore Security Rules Updates for `administrativeStage` & `invitationLetter`

**Files:**
- Modify: `department-agenda-firebase/firebase/firestore.rules`
- Modify: `department-agenda-firebase/tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: `isValidActivity` in `firebase/firestore.rules`
- Produces:
  - CEL helper `isValidDriveUrl(url)`
  - CEL helper `isValidInvitationLetter(letter)`
  - Updated `isValidActivity(data, activityId)` allowing `administrativeStage` and `invitationLetter`

- [ ] **Step 1: Write failing security rules tests in `tests/rules/firestore.rules.test.ts`**
  - Test Editor can create/update activity with valid `administrativeStage` and valid `invitationLetter`.
  - Test write fails if `administrativeStage` is an unrecognized string.
  - Test write fails if `driveUrl` has unsafe protocol (`http://` or `javascript:`) or invalid host.
  - Test write fails if `invitationLetter` contains unauthorized extra fields.
  - Test public projection still omits `invitationLetter` and `administrativeStage`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `npm test tests/rules/firestore.rules.test.ts`
  - Expected: FAIL due to strict keys/types check in existing `isValidActivity`.

- [ ] **Step 3: Update `firebase/firestore.rules`**
  - Add `administrativeStage` and `invitationLetter` to allowed keys in `isValidActivity`.
  - Add CEL validator functions `isValidDriveUrl` and `isValidInvitationLetter`.
  - Enforce `(!('administrativeStage' in data) || data.administrativeStage in ['INITIAL_ENTRY', 'OFFLINE_PROCESS', 'DETAILS_COMPLETED', 'ADMIN_COMPLETE'])`.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `npm test tests/rules/firestore.rules.test.ts`
  - Expected: PASS across all 27+ rules tests.

- [ ] **Step 5: Commit**
  - `git add firebase/firestore.rules tests/rules/firestore.rules.test.ts`
  - `git commit -m "feat(rules): harden firestore rules for administrativeStage and invitationLetter"`

---

### Task 3: Activity Repository & Audit Logging Alignment

**Files:**
- Modify: `department-agenda-firebase/shared/src/repository/activityRepository.ts`
- Test: `department-agenda-firebase/tests/integration/repository.emulator.test.ts`

**Interfaces:**
- Consumes: `saveActivity(db, activity, lookups, options)`
- Produces:
  - `options.stageChangeReason?: string`
  - Audit log captures `administrativeStage` in `beforeSummary` and `afterSummary`
  - If stage moves backward, audit log records action `STAGE_REGRESSION` or details `stageChangeReason`
  - Default `administrativeStage: 'INITIAL_ENTRY'` when undefined

- [ ] **Step 1: Write integration tests in `tests/integration/repository.emulator.test.ts`**
  - Test creating activity without `administrativeStage` defaults it to `'INITIAL_ENTRY'`.
  - Test progressing through all four stages with atomic version bumps.
  - Test moving stage backward records `stageChangeReason` in audit log.
  - Test updating only `invitationLetter` correctly bumps version on both private activity and public projection.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `npm test tests/integration/repository.emulator.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement repository updates in `shared/src/repository/activityRepository.ts`**
  - Populate default `administrativeStage: activity.administrativeStage || 'INITIAL_ENTRY'`.
  - Include `administrativeStage` in audit summaries.
  - Handle `options.stageChangeReason`.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `npm test tests/integration/repository.emulator.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - `git add shared/src/repository/activityRepository.ts tests/integration/repository.emulator.test.ts`
  - `git commit -m "feat(repo): coordinate F01 administrative stages and audit logging in atomic transactions"`

---

### Task 4: Admin Form Controller, UI Components & Safe Google Drive Link

**Files:**
- Modify: `department-agenda-firebase/apps/admin/src/components/ActivityFormController.ts`
- Modify: `department-agenda-firebase/apps/admin/src/pages/ActivityEditPage.ts`
- Modify: `department-agenda-firebase/apps/admin/src/pages/ActivityEditWorkflow.ts`
- Modify: `department-agenda-firebase/apps/admin/src/styles/admin.css`
- Test: `department-agenda-firebase/tests/unit/adminUi.test.ts`

**Interfaces:**
- Consumes: `ActivityFormState`, `validateActivityForm`
- Produces:
  - Form state supporting `administrativeStage` and `invitationLetter`
  - Form markup with Administrative Stage Selector (radio/pills)
  - Dedicated Section "6. Berkas & Rujukan Surat Undangan": No. Agenda, Tanggal Surat, Perihal, Tautan Drive, Link button
  - Real-time Drive URL validation and warning feedback
  - Stage backward change reason prompt modal or input

- [ ] **Step 1: Write unit tests in `tests/unit/adminUi.test.ts`**
  - Test initial form state includes default `administrativeStage: 'INITIAL_ENTRY'`.
  - Test form validation returns warning if `ADMIN_COMPLETE` is selected without letter metadata.
  - Test rendering `ActivityEditPage` contains stage selector and letter metadata fields.
  - Test Google Drive URL renders with `rel="noopener noreferrer" target="_blank"`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `npm test tests/unit/adminUi.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement UI components and controller logic**
  - Extend `ActivityFormState` with `administrativeStage` and `invitationLetter`.
  - Update `renderActivityEditPage` with stage selector and invitation letter panel.
  - In `ActivityEditWorkflow.ts`, bind stage change listeners, validate Drive URL on change, handle backward stage warning/reason, and save to Firestore.
  - Add styling in `admin.css` for stage badges, letter panel, and external link button.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `npm test tests/unit/adminUi.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - `git add apps/admin/src/ apps/admin/src/styles/ tests/unit/adminUi.test.ts`
  - `git commit -m "feat(admin): add F01 administrative workflow form, letter reference panel, and drive url link"`

---

### Task 5: Admin Dashboard & Activity Table Integration (Badges, Filter, Search & Counts)

**Files:**
- Modify: `department-agenda-firebase/apps/admin/src/pages/DashboardPage.ts`
- Modify: `department-agenda-firebase/apps/admin/src/pages/ActivitiesPage.ts`
- Modify: `department-agenda-firebase/apps/admin/src/main.ts`
- Test: `department-agenda-firebase/tests/unit/adminUi.test.ts`

**Interfaces:**
- Consumes: `activities: ActivityDocument[]`
- Produces:
  - Dashboard stat cards for the 4 administrative stages
  - Activity table column/badge for administrative stage
  - Filter dropdown by administrative stage in `ActivitiesPage`
  - Search input matching title OR `invitationLetter.agendaNumber`
  - Visual indicators for incomplete/missing items (`⚠️ Peserta kosong`, `⚠️ Berkas belum lengkap`)

- [ ] **Step 1: Write unit tests in `tests/unit/adminUi.test.ts`**
  - Test Dashboard calculates counts for all 4 stages correctly.
  - Test table filter logic filters by `administrativeStage`.
  - Test search logic matches `agendaNumber`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `npm test tests/unit/adminUi.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement Dashboard and Table features**
  - In `DashboardPage.ts`, add stats row for administrative stages.
  - In `ActivitiesPage.ts`, add stage badge in table row, search input, stage filter dropdown, and missing indicators.
  - In `main.ts`, bind search and filter event handlers.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `npm test tests/unit/adminUi.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - `git add apps/admin/src/pages/DashboardPage.ts apps/admin/src/pages/ActivitiesPage.ts apps/admin/src/main.ts tests/unit/adminUi.test.ts`
  - `git commit -m "feat(admin): integrate administrative stage badges, filtering, search, and dashboard metrics"`

---

### Task 6: Full Verification, Browser E2E Scenarios, Performance Telemetry & Documentation

**Files:**
- Create: `department-agenda-firebase/tests/e2e/f01WorkflowVerification.mjs`
- Modify: `docs/TASK_REPORT.md`
- Modify: `docs/TASK_PROGRESS.md`
- Modify: `department-agenda-firebase/docs/TASK_REPORT.md`
- Modify: `department-agenda-firebase/docs/TASK_PROGRESS.md`

**Interfaces:**
- Consumes: All updated components, Firestore Emulator, Admin and Public portals
- Produces:
  - 13-point automated verification checklist
  - Playwright browser test verifying the complete F01 administrative workflow in Chromium
  - Bundle size and data latency metrics
  - Fully documented task report and progress ledger

- [ ] **Step 1: Author Playwright E2E verification script `tests/e2e/f01WorkflowVerification.mjs`**
  - Scenario 1: Initial activity creation without attendees, remarks, or letter metadata succeeds with nonblocking warning.
  - Scenario 2: Activity appears on Public Portal without leaking internal state or private notes.
  - Scenario 3: Update activity to `DETAILS_COMPLETED` with attendees and verify snapshot freeze.
  - Scenario 4: Update activity to `ADMIN_COMPLETE` with No. Agenda, Tanggal Surat, Perihal, and Google Drive URL.
  - Scenario 5: External Google Drive link is clickable and properly formatted with `target="_blank"`.
  - Scenario 6: Test search by No. Agenda in Admin activities table.
  - Scenario 7: Test stage filtering (INITIAL_ENTRY, ADMIN_COMPLETE).
  - Scenario 8: Test stage regression to earlier stage with reason dialog.
  - Scenario 9: Verify official 8-column reports remain strictly 8 columns without extra metadata columns.

- [ ] **Step 2: Execute full Vitest automated test suite**
  - Run: `npm test`
  - Expected: 100% pass across all unit, integration, and security rules test files.

- [ ] **Step 3: Execute Playwright verification suites**
  - Run: `node tests/e2e/f01WorkflowVerification.mjs`
  - Run: `node tests/e2e/runPublicVerification.mjs`
  - Run: `node tests/e2e/runVerification.mjs`
  - Run: `node tests/e2e/reportsVerification.mjs`
  - Expected: 100% pass across all browser scenarios.

- [ ] **Step 4: Measure bundle size and performance telemetry**
  - Run: `npm run build`
  - Verify public initial JS entry remains under 150 kB budget.

- [ ] **Step 5: Update documentation and commit**
  - Update `docs/TASK_REPORT.md` and `docs/TASK_PROGRESS.md` with complete evidence.
  - `git add .`
  - `git commit -m "feat(f01): complete agenda administrative workflow, invitation letter reference, and verification"`
