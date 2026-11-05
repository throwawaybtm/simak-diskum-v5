# P01 — Pre-Production Readiness, Configuration Audit & Deployment Rehearsal Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all pre-production readiness audits, configuration checks, local authentication rehearsal, Spark quota modeling, backup runbooks, user acceptance test plan, and corrected release documentation for SIMAK DISKUM Kota Batam v5.0, while strictly adhering to local-only execution (zero live deployment or cloud configuration changes).

---

## Task Decomposition & Milestones

### Task 1: Correct Release Documentation
- [ ] Correct `docs/V01_C_RELEASE_READINESS.md` and its monorepo counterpart:
  - Remove mandatory Blaze billing statement; assert Firebase Spark (free tier) as the target plan.
  - Document actual Spark quotas (50k reads/day, 20k writes/day, 10 GB/month Hosting transfer) and consequences of exceeding.
  - Correct `deviceScaleFactor=2` claim: clarify it tests Retina display density, whereas 200% zoom reflow requires viewport scaling (e.g. 640px width on 1280px display).
  - Clarify WCAG 2.1 AA claims to specify the exact tested accessibility features (:focus-visible rings, modal focus traps, Escape dismissal, touch target sizing).
  - Distinguish local emulator latency from real-world internet performance.
  - Remove out-of-scope references to Cloud Functions, mandatory SSO, custom domains, and e-signatures (labeling any future enhancements as optional).

### Task 2: Firebase Configuration & Environment Audit
- [ ] Inspect `.firebaserc`, `firebase.json`, `firebase.emulator.json`, `firebase/firestore.rules`, and `firebase/firestore.indexes.json`.
- [ ] Update client Firebase initializers (`apps/public/src/firebase.ts` and `apps/admin/src/firebase.ts`) to consume `import.meta.env` with safe fallbacks.
- [ ] Verify zero committed service account credentials or secrets.
- [ ] Verify production builds (`apps/public/dist` and `apps/admin/dist`) cannot execute emulator connections on non-localhost hosts.
- [ ] Add automated configuration audit tests in `tests/unit/stagingReadiness.test.ts`.

### Task 3: Local Authentication Activation Plan & Rehearsal
- [ ] Update `docs/gate5_auth_specification.md` to reflect Spark plan, local Admin SDK workflow, and console user setup.
- [ ] Author local Auth rehearsal script `scripts/manageRoles.mjs` using Firebase Admin SDK to demonstrate:
  - Creating mock Admin and Editor users.
  - Setting custom claims (`role: 'admin'`, `role: 'editor'`).
  - Simulating password reset and account disabling.
  - Verifying claims refresh behavior (`getIdTokenResult(true)`).
- [ ] Run automated test suite validating that Firestore rules reject unauthorized writes and direct malicious API calls.
- [ ] Document secure service-account credential management (storing outside git, using `GOOGLE_APPLICATION_CREDENTIALS`).

### Task 4: Spark-Compatible Backup, Recovery & Seeding Strategy
- [ ] Create `docs/BACKUP_RECOVERY_RUNBOOK.md` (and monorepo copy):
  - Document that Cloud Firestore managed automated export to GCS requires Blaze; for Spark, logical exports via client/Admin SDK are used.
  - Author and verify logical backup script `scripts/backupRestore.mjs` (exporting collections to JSON/NDJSON and importing).
  - Document initial master data seeding procedure.
  - Document schema rollback and disaster recovery protocols.

### Task 5: Deployment Rehearsal & Runbook (Local Only)
- [ ] Create `docs/DEPLOYMENT_RUNBOOK.md` (and monorepo copy):
  - Step-by-step preflight checklist identifying destructive operations.
  - Explicit deployment commands targeting `simakdiskum` (`--project simakdiskum --only hosting:public,hosting:admin,firestore:rules,firestore:indexes`).
  - Safe rollback procedures for Hosting and Firestore rules.
  - Clear architectural distinction between Hosting rollbacks and database data restoration.

### Task 6: Performance & Quota Modeling (Spark Tier)
- [ ] Model and document Firestore reads/writes for ordinary operational days vs public spike days.
- [ ] Model Hosting data transfer under 10 GB/month limit.
- [ ] Document effects of quota exhaustion (HTTP 429 ResourceExhausted).
- [ ] Document mitigation strategies (HTTP Cache-Control headers, local sessionStorage caches, date query bounding).

### Task 7: User Acceptance Test Plan
- [ ] Create `docs/USER_ACCEPTANCE_TEST_PLAN.md` (and monorepo copy) covering 11 realistic department scenarios:
  - Scenario 1: Input Awal creation
  - Scenario 2: Offline processing progression
  - Scenario 3: Completing attendees and remarks
  - Scenario 4: Invitation letter registration (No. Agenda, Google Drive URL)
  - Scenario 5: Editing and cancelling agendas
  - Scenario 6: Room and attendee conflict resolution
  - Scenario 7: Official 8-column government report generation
  - Scenario 8: Downloading XLSX and opening in Microsoft Excel
  - Scenario 9: Public citizen portal schedule access
  - Scenario 10: Multi-operator concurrent edits
  - Scenario 11: Error recovery and validation
  - Physical A4 print check procedure
  - True 200% zoom reflow test procedure (640px viewport)

### Task 8: Pre-Production Readiness Report & Checkpoint Stop
- [ ] Create `docs/P01_PREPRODUCTION_READINESS.md` (and monorepo copy).
- [ ] Update `docs/TASK_REPORT.md` and `docs/TASK_PROGRESS.md`.
- [ ] Run full Vitest and Playwright regression suites.
- [ ] Commit implementation and documentation.
- [ ] Stop at P01 Review Checkpoint.
