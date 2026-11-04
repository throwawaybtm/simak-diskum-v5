# Detailed Task Report: Task 4

**Task Number:** Task 4  
**Title:** Firestore Collections, Rules, Composite Indexes & Benchmark  
**Date:** 2026-11-04  
**Status:** Completed & Approved (Review Checkpoint 2)  
**Author:** Senior Software Architect & Firebase Full-Stack Engineer  

---

## 1. Summary of Implementation

Task 4 established the complete data persistence and query tier for the Department Activity Scheduling System v5.0:
1. Developed the **Admin Activity Repository** (`activityRepository.ts`) executing atomic transactions that coordinate private master activities (`activities/{id}`), sanitized public projections (`publicActivities/{id}`), and private audit logs (`auditLogs/{id}`).
2. Implemented **optimistic concurrency control** via `expectedVersion`, rejecting conflicting writes with `VERSION_CONFLICT`.
3. Handled **cancellations safely**, retaining public documents with `status: "CANCELLED"` and public cancellation notices while excluding them from active query views.
4. Preserved **historical attendee snapshots** on unrelated activity edits (e.g. title/notes) even when employee master records change.
5. Implemented the **Public Repository** (`publicRepository.ts`) with composite index range queries (`startDate <= visibleEnd && endDate >= visibleStart`) and client telemetry.
6. Verified live **Firestore Security Rules** against the local Firestore Emulator using `@firebase/rules-unit-testing`, proving strict deny-by-default for hosted environments and permissive rules for local development.
7. Conducted a **performance query benchmark** with 520 synthetic documents, proving fast sub-100ms retrieval and economical read usage.

---

## 2. Files Created & Modified

### Files Created
- `shared/src/repository/activityRepository.ts`: Admin repository coordinating atomic transactions, version increments, snapshot preservation, and audit logging.
- `shared/src/repository/publicRepository.ts`: Public repository executing range intersection queries and capturing query telemetry.
- `tests/rules/firestore.rules.test.ts`: Live rules test suite executing against the Firestore Emulator via `@firebase/rules-unit-testing`.
- `tests/integration/repository.emulator.test.ts`: Integration test suite for atomic transactions, concurrency, cancellation retention, and conflict overrides.
- `tests/integration/queryBenchmark.emulator.test.ts`: Benchmark suite measuring range query latency and read counts with 520 synthetic records.

### Files Modified
- `shared/src/validation/activityValidator.ts`: Updated attendee check to be optional with a nonblocking warning instead of a blocking error.
- `shared/src/scheduling/attendeeSnapshot.ts`: Added `resolveActivitySnapshots()` to preserve historical snapshots unless participants are intentionally edited.
- `shared/src/projection/publicProjector.ts`: Stripped undefined fields (`undefined` $\rightarrow$ omitted or `null`) to prevent Firestore serialization errors.
- `shared/src/index.ts`: Exported repository functions.
- `tests/unit/activityValidator.test.ts`: Added test for optional attendee warning.
- `tests/unit/attendeeSnapshot.test.ts`: Added test for snapshot preservation on unrelated field updates.
- `package.json` & `package-lock.json`: Added `@firebase/rules-unit-testing` and `firebase-tools`.

---

## 3. Technical Decisions & Explanations

1. **Undefined Field Serialization in Firestore Transactions:**
   - *Issue:* Calling `transaction.set()` with JavaScript `undefined` values causes Firestore to reject the write with `FirebaseError: Function Transaction.set() called with invalid data`.
   - *Decision:* Implemented `sanitizeDocumentData()` in `activityRepository.ts` to prune undefined fields before writing. In `publicProjector.ts`, optional fields (like `publicCancellationNotice`) are conditionally attached only when present.
2. **Snapshot Preservation on Edit:**
   - *Issue:* If an operator corrects a typo in an activity's title or notes months after creation, re-querying the employee directory could rewrite historical participant titles (e.g. if an official retired or was reassigned).
   - *Decision:* Implemented `resolveActivitySnapshots()`, which compares `currentAttendeeIds` to `previousAttendeeIds` and inspects `isAttendeeEdited`. If participants were not explicitly modified, the existing frozen snapshot is preserved intact.
3. **Cancellation Document Retention:**
   - *Decision:* Cancelling an event updates `publicActivities/{id}` with `status: "CANCELLED"` and sanitized `publicCancellationNotice`, while keeping the private `cancelReason` inside `activities/{id}`. Cancelled events are never deleted from public history.
4. **Live Rules Verification:**
   - *Decision:* Replaced purely static configuration assertions with live `@firebase/rules-unit-testing` against the Firestore emulator, proving that anonymous users cannot write to public collections or read/write private collections.

---

## 4. Actual Test Results

### A. Unit, Rules, and Integration Test Suite
Executed via: `vitest run department-agenda-firebase/tests/`
```
 RUN  v5.1.0 D:/Temp

 ✓ department-agenda-firebase/tests/unit/schemas.test.ts (3 tests) 9ms
 ✓ department-agenda-firebase/tests/monorepo_config.test.ts (7 tests) 9ms
 ✓ department-agenda-firebase/tests/unit/timeUtils.test.ts (19 tests) 10ms
 ✓ department-agenda-firebase/tests/unit/publicProjector.test.ts (3 tests) 7ms
 ✓ department-agenda-firebase/tests/unit/attendeeSnapshot.test.ts (3 tests) 7ms
 ✓ department-agenda-firebase/tests/unit/conflictDetector.test.ts (6 tests) 7ms
 ✓ department-agenda-firebase/tests/unit/privacyScanner.test.ts (5 tests) 6ms
 ✓ department-agenda-firebase/tests/unit/activityValidator.test.ts (9 tests) 7ms
 ✓ department-agenda-firebase/tests/rules/firestore.rules.test.ts (7 tests) 423ms
 ✓ department-agenda-firebase/tests/integration/repository.emulator.test.ts (4 tests) 440ms
 ✓ department-agenda-firebase/tests/integration/queryBenchmark.emulator.test.ts (1 test) 600ms

 Test Files  11 passed (11)
      Tests  67 passed (67)
   Start at  10:01:39
   Duration  1.07s
```

### B. Benchmark Performance Telemetry
- **Database Scale:** 520 synthetic public activities.
- **Query Filter:** `where("startDate", "<=", "2026-10-31")` and `where("endDate", ">=", "2026-10-01")`.
- **Latency:** **76.78 ms** (warm) / **150.51 ms** (cold).
- **Documents Read:** **40 documents** (100% precision: retrieved all 40 intersecting activities including long-running multi-month events; excluded all 480 non-intersecting events).

---

## 5. Build Results & Bundle Sizes

Executed via: `npm run build` in `department-agenda-firebase/`
- **`@department-agenda/shared`**: Clean `tsc` compilation to `dist/`.
- **`@department-agenda/public`**:
  - `dist/index.html`: `0.81 kB` (gzip: `0.42 kB`)
  - `dist/assets/index-DEiab0-t.css`: `0.95 kB` (gzip: `0.50 kB`)
  - `dist/assets/index-CYYMaIFO.js`: `378.76 kB` (gzip: **`106.68 kB`**)
  - *Budget Assessment:* **Well within the < 150 kB gzip budget.**
- **`@department-agenda/admin`**:
  - `dist/index.html`: `1.57 kB` (gzip: `0.68 kB`)
  - `dist/assets/index-QyaN6JHW.css`: `1.72 kB` (gzip: `0.72 kB`)
  - `dist/assets/index-HxTdRqRF.js`: `378.91 kB` (gzip: **`106.75 kB`**)
  - *Budget Assessment:* **Well within the < 150 kB gzip budget.**

---

## 6. Bugs Discovered & Fixes Applied

1. **Undefined Field Crash in Firestore Transactions:**
   - *Bug:* `Transaction.set()` failed with `unsupported field value: undefined` when `publicCancellationNotice` was omitted.
   - *Fix:* Added `sanitizeDocumentData()` to strip undefined properties before transaction commit.
2. **Missing Java Runtime for Firestore Emulator:**
   - *Bug:* Running `firebase emulators:start` failed due to missing Java.
   - *Fix:* Installed Microsoft OpenJDK 21 via `winget`, configured environment variables, and verified execution.

---

## 7. Known Limitations, Risks & Outstanding Issues

1. **Client Read Telemetry Approximation:** Telemetry measures client-observed document transfers (40 documents). Billing for composite index evaluation is handled at the Google Cloud infrastructure level.
2. **Advisory Client Validation:** Client-side regex checking and conflict warnings remain ergonomics. Deny-by-default Firestore rules represent the sole enforceable security boundary prior to Gate 5.

---

## 8. Git Commit Information
- **Commit Hash:** `22aec2c`
- **Commit Message:** `feat(firestore): Task 4 - repositories, emulator rules verification, atomic transactions, and query benchmarks`
- **Review Checkpoint Status:** **Review Checkpoint 2 (Task 4) PASSED & APPROVED.**

---

## 9. Recommendation for Next Task

Proceed to **Task 5: Admin UI: Dashboard, Add/Edit Activity & Conflict Workflow**.
