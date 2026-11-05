# SIMAK DISKUM v5.0 — Visual Makeover V01-C Implementation Plan

**Goal:** Final Responsive, Accessibility, Performance & Functional Quality Assurance across Public and Admin portals, culminating in the V01-C Release Readiness gate before production activation.

---

## Task Decomposition

### Phase 1: Outstanding V01-B Corrections & Usability Hardening
- **Task 1A: Admin Activities Table Action Accessibility & Zero Clipping**
  - Configure `.table-responsive` with `overflow-x: auto`, `scrollbar-width: thin`, and a subtle Indonesian scroll hint (`👉 Geser tabel ke kanan untuk melihat semua kolom & aksi`) visible on screens `<= 1024px`.
  - Set `.data-table` `min-width: 880px` in `admin.css` to prevent column squashing.
  - Ensure `.action-cell` guarantees all three buttons (`Edit`, `Duplikat`, `Hapus`) are fully visible, non-overlapping, with minimum touch targets (`>= 32px` desktop, `>= 44px` mobile).
  - Verify confirmation safeguards on `Hapus` action.
- **Task 1B: Mobile Month Calendar Hint & Touch Interaction**
  - Add `<div class="calendar-scroll-hint"><span>👉 Geser untuk melihat hari lainnya</span></div>` above `.month-grid-wrapper` in `CalendarView.ts`.
  - Style hint in `public.css` to display on mobile viewports (`<= 768px`).
  - Verify touch/pointer scrolling reveals Sunday and remaining days with intact click handlers.
- **Task 1C: Documentation Commit Hash Correction**
  - Replace `Pending` commit entries in `TASK_PROGRESS.md` with `7785825` and `7d01568`.

### Phase 2: Public Attendee Privacy & DTO Serialization Verification
- **Task 2A: Deep DTO & Firestore Document Invariant Tests**
  - Create `tests/unit/publicPrivacyAudit.test.ts` verifying `PublicActivityDTO` objects:
    - Strictly exclude `attendeeIds`, `attendeeSnapshots`, `invitationLetter`, `driveUrl`, `privateNotes`, `privateMeetingUrl`, `administrativeStage`, `cancelReason`.
    - No `emp_` strings or internal database IDs in `attendeeLabels`.
    - Deduplication confirmed at data object level.
    - Historical immutability of past attendee snapshots when master records change.
  - Run live Firestore emulator document inspection verifying persisted `publicActivities` documents.

### Phase 3: Full Functional 12-Step Lifecycle Walkthrough
- **Task 3A: End-to-End Lifecycle Verification Suite (`tests/e2e/v01cFullLifecycleVerification.mjs`)**
  - Execute complete Admin-to-Public lifecycle:
    1. INITIAL_ENTRY stage creation.
    2. Safe public projection verification.
    3. OFFLINE_PROCESS progression.
    4. Attendees & remarks completion.
    5. Invitation letter reference (nomor, date, subject, valid Google Drive URL).
    6. ADMIN_COMPLETE progression.
    7. Version-concurrency editing.
    8. Public projection update & audit trail logging.
    9. Cancellation with public cancellation notice.
    10. Official 8-column reports, XLSX export & A4 print output.
    11. Multi-operator stale-version conflict detection.
    12. Security rules authorization checks (Admin, Editor, Anonymous contexts).

### Phase 4: Responsive, Accessibility & Keyboard Quality Pass
- **Task 4A: Focus Management & Keyboard Trap**
  - Add global `:focus-visible` styling (`outline: 2px solid var(--color-primary); outline-offset: 2px;`) in `public.css` and `admin.css`.
  - Add modal focus trapping, initial focus placement, and focus restoration upon close in `ActivityDetailModal.ts` and `MasterDataPage.ts`.
  - Ensure all icon buttons have explicit `aria-label` attributes.
- **Task 4B: Viewport Usability (375px, 768px, 1024px, 1280px, 1440px + 200% Zoom)**
  - Verify zero document-level horizontal overflow across all 5 viewports.
  - Verify `Edit`, `Duplikat`, and `Hapus` buttons are fully reachable and clickable at all 5 viewports.
  - Verify 200% browser zoom readability and reflow.

### Phase 5: Performance Telemetry, Bundle Audits & Print Verification
- **Task 5A: Performance Profiling**
  - Measure cold and warm page load times, data-visible latency, and navigation timings.
  - Measure FCP, LCP, CLS, and INP metrics.
  - Report complete initial JS critical path (shell + Firebase vendor chunk) and lazy modules.
- **Task 5B: Print, Reporting & Document Handling**
  - Generate and inspect browser print PDF.
  - Re-verify formula injection neutralization and OpenXML XLSX compliance.

### Phase 6: Release Readiness Deliverables & Review Checkpoint
- **Task 6A: Author `docs/V01_C_RELEASE_READINESS.md`**
- **Task 6B: Update `TASK_REPORT.md`, `TASK_PROGRESS.md`, `VISUAL_DESIGN_SYSTEM.md`**
- **Task 6C: Git Commits & Formal Stop at V01-C Review Checkpoint**
