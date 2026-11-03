# Department Activity Scheduling System (v4.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two standalone Google Apps Script (GAS) web applications (Public Portal & Admin Manager) sharing one private Google Sheets database for Dinas Koperasi dan Usaha Mikro Kota Batam, with full offline testability and clasp deployment readiness.

**Architecture:** A modular multi-app architecture (`public-app/` and `admin-app/`) with a `shared/` core module containing pure business logic (schema, WIB interval math, conflict detection, DTO sanitization, and legacy 8-column migration/export). A fast build script synchronizes the shared core into both Apps Script projects for deployment via clasp.

**Tech Stack:** Google Apps Script (V8 runtime), HTML Service, Vanilla JavaScript (ES6+), Node.js (for local test runner and sync tooling), Google Sheets API.

**Spec:** [docs/superpowers/specs/2026-11-03-department-agenda-design.md](file:///d:/Temp/department-agenda/docs/superpowers/specs/2026-11-03-department-agenda-design.md)

## Global Constraints

- Standalone Apps Script projects only (NOT spreadsheet-bound scripts).
- Public app OAuth scope is restricted strictly to `spreadsheets.readonly`; public app contains no mutation functions.
- Admin app executes full CRUD using `LockService.getScriptLock()`, `expectedVersion` optimistic concurrency checks, and `requestId` idempotency.
- Prototype identity uses `actor_label` with `identity_source="UNVERIFIED"`; Gate 5 blocks live production deployment until access restriction is enforced.
- Half-open `[start, end)` intervals with WIB (`Asia/Jakarta`, UTC+7) timezone; open-ended ("s.d. selesai") events use `00:00 WIB` on the day following `end_date` as exclusive boundary.
- Zero leakage of `private_notes`, `private_meeting_url` (Zoom credentials), internal IDs, or audit logs to public DTOs.
- Official 8-column layout (*No, Hari / Tanggal, Pukul, Kegiatan, Tempat, Penyelenggara, Dihadiri Oleh, Keterangan*) strictly preserved in print/PDF and XLSX exports.

## Review Focus

1. **Zoom password/credential leakage:** If `Keterangan` contains Meeting ID and Passcode, does public DTO or export leak them? *Expected:* `private_meeting_url` and sensitive credentials completely stripped from public DTOs and reports.
2. **Timezone displacement in browser:** If a user views the calendar from UTC+0 or UTC+8, do event dates shift to the wrong day? *Expected:* Date strings remain fixed to WIB (`Asia/Jakarta`).
3. **Open-ended conflict false positives:** Does a 09:00 "s.d. selesai" event collision block an unrelated event at another venue? *Expected:* Only shared bookable venues (office rooms) or shared staff raise warnings; distinct venues and participants proceed without warning.
4. **Adjacent time slot boundary collision:** Do events from 09:00–10:00 and 10:00–11:00 for the same room collide? *Expected:* Half-open interval `[start, end)` evaluates as non-overlapping (no collision).
5. **Version conflict overwrite:** If two editors edit the same event concurrently, does the second overwrite silently? *Expected:* Throws `VERSION_CONFLICT` and prompts the editor to reload.

---

### Task 1: Project Scaffolding & Shared Build Tooling

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `scripts/sync-shared.js`
- Create: `public-app/.clasp.json`
- Create: `public-app/src/appsscript.json`
- Create: `admin-app/.clasp.json`
- Create: `admin-app/src/appsscript.json`

**Interfaces:**
- Produces: `npm run test` command, `npm run sync` command.

- [ ] **Step 1: Write `package.json` with Node test script and sync script**
Set up project metadata, native Node test runner (`node --test`), and file sync scripts.

- [ ] **Step 2: Create `.gitignore`**
Ignore `node_modules/`, `.clasprc.json`, `.DS_Store`, build artifacts.

- [ ] **Step 3: Create `scripts/sync-shared.js`**
Implement Node script that copies files from `shared/` into `public-app/src/shared/` and `admin-app/src/shared/`.

- [ ] **Step 4: Create Apps Script manifests (`appsscript.json`)**
- `public-app/src/appsscript.json`: timezone `Asia/Jakarta`, runtime `V8`, oauthScope `https://www.googleapis.com/auth/spreadsheets.readonly`.
- `admin-app/src/appsscript.json`: timezone `Asia/Jakarta`, runtime `V8`, oauthScope `https://www.googleapis.com/auth/spreadsheets`.

- [ ] **Step 5: Verify build script and manifests**
Run: `node scripts/sync-shared.js`
Expected: Successfully synchronizes shared directory without errors.

---

### Task 2: Schema Definitions, Fixtures & Time Utilities

**Files:**
- Create: `shared/Schema.js`
- Create: `shared/TimeUtils.js`
- Create: `tests/fixtures/synthetic_agenda.json`
- Create: `tests/time_utils.test.js`

**Interfaces:**
- Produces: `Schema.TABLES`, `TimeUtils.parseWibDate`, `TimeUtils.formatIndonesianDate`, `TimeUtils.formatIndonesianDateRange`, `TimeUtils.makeInterval`, `TimeUtils.formatTimeRange`.

- [ ] **Step 1: Write failing tests in `tests/time_utils.test.js`**
Test:
1. `parseWibDate("2026-10-01", "07:00")` produces correct UTC instant.
2. `makeInterval("2026-10-01", "09:00", "2026-10-01", "10:00", false)` returns `[startMs, endMs)`.
3. Open-ended `makeInterval("2026-10-01", "09:00", "2026-10-01", null, true)` returns `[startMs, endOfNextDay00Ms)`.
4. Adjacent intervals `[09:00, 10:00)` and `[10:00, 11:00)` have zero overlap.
5. `formatIndonesianDate("2026-10-01")` returns `"Kamis, 1 Oktober 2026"`.
6. `formatIndonesianDateRange("2026-10-01", "2026-10-03")` returns `"Kamis - Sabtu, 1 - 3 Oktober 2026"`.
7. `formatTimeRange("07:00", null)` returns `"07.00 WIB s.d. selesai"`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/time_utils.test.js`
Expected: FAIL (Cannot find module / functions undefined).

- [ ] **Step 3: Implement `shared/Schema.js` & `shared/TimeUtils.js`**
- `Schema.js`: Table column definitions (Activities, ActivityAttendees, Employees, Departments, Locations, Organizers, Categories, Announcements, AuditLogs, Settings).
- `TimeUtils.js`: Pure functions for WIB interval calculations, date-time formatting, and multi-day range formatting.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/time_utils.test.js`
Expected: PASS with 7/7 assertions passing.

---

### Task 3: Validation, Overlap Detection & Conflict Engine

**Files:**
- Create: `shared/Validation.js`
- Create: `shared/ConflictDetector.js`
- Create: `tests/conflict.test.js`
- Create: `tests/validation.test.js`

**Interfaces:**
- Consumes: `TimeUtils`, `Schema`.
- Produces: `Validation.validateActivity(input)`, `ConflictDetector.findConflicts(activity, existingActivities, participants, locations)`.

- [ ] **Step 1: Write failing tests in `tests/conflict.test.js` and `tests/validation.test.js`**
Test:
1. Validation requires `title`, `start_date`, valid status, and `expectedVersion` for edits.
2. Adjacent intervals for same room return NO conflict.
3. Two events overlapping in time but with DIFFERENT staff and DIFFERENT locations return NO conflict.
4. Two events overlapping in time with SAME attendee return `OVERLAP_WARNING` (attendee collision).
5. Two events overlapping in time in SAME office venue return `OVERLAP_WARNING` (room collision).
6. Open-ended morning event ("s.d. selesai") flags potential warning for afternoon meeting in same room.
7. Acknowledged conflict with override reason bypasses error blocking.

- [ ] **Step 2: Run tests to verify they fail**
Run: `node --test tests/conflict.test.js tests/validation.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `shared/Validation.js` & `shared/ConflictDetector.js`**
Pure logic implementing half-open interval checking, venue collision filtering (locations with `location_type === 'OFFICE'`), attendee ID intersection, and payload sanitation.

- [ ] **Step 4: Run tests to verify they pass**
Run: `node --test tests/conflict.test.js tests/validation.test.js`
Expected: All tests PASS.

---

### Task 4: Public DTO Projection & Privacy Boundary

**Files:**
- Create: `shared/Projection.js`
- Create: `tests/projection.test.js`

**Interfaces:**
- Consumes: `Schema`, `TimeUtils`.
- Produces: `Projection.projectPublicActivity(rawActivity, lookups)`, `Projection.projectPublicList(rawList, lookups)`.

- [ ] **Step 1: Write failing tests in `tests/projection.test.js`**
Test:
1. Public projection contains `id`, `title`, `startDate`, `endDate`, `timeDisplay`, `locationName`, `categoryName`, `attendeeLabels`, `publicNotes`.
2. Public projection strictly OMITs `private_notes`, `private_meeting_url`, `cancel_reason`, `created_by`, `updated_by`, and raw employee database IDs.
3. If an activity is updated within the last 48 hours, `recentlyUpdated` is `true`.
4. Public attendee labels format correctly (e.g., `"1. Kadis"`, `"2. Sekretaris"`).

- [ ] **Step 2: Run test to verify it fails**
Run: `node --test tests/projection.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `shared/Projection.js`**
Write sanitizer guaranteeing that sensitive data never leaks into the public DTO.

- [ ] **Step 4: Run test to verify it passes**
Run: `node --test tests/projection.test.js`
Expected: All tests PASS.

---

### Task 5: Official 8-Column Export & Migration Engine

**Files:**
- Create: `shared/ExportFormatter.js`
- Create: `shared/Migration.js`
- Create: `tests/fixtures/legacy_october_sample.json`
- Create: `tests/migration.test.js`
- Create: `tests/export.test.js`

**Interfaces:**
- Produces: `ExportFormatter.formatEightColumnRows(activities, lookups)`, `ExportFormatter.generateHtmlPrintView(activities, headerInfo)`, `ExportFormatter.generateXmlSpreadsheet(activities, headerInfo)`, `Migration.parseLegacySpreadsheet(rows)`.

- [ ] **Step 1: Write failing tests in `tests/migration.test.js` and `tests/export.test.js`**
Test:
1. Migration parser takes raw legacy October 2026 rows (from client's image):
   - Row 1: Upacara Hari Kesaktian Pancasila -> extracts title, date `2026-10-01`, `07.00 WIB s.d. selesai`, attendees `["Kadis", "Sekretaris", "Kabid"]`, `Pakaian: PSL` as `public_notes`.
   - Row 2: Pitching Misi Dagang -> extracts Zoom meeting ID & passcode into `private_meeting_url`/`private_notes` and keeps only public-safe text in `public_notes`.
2. `ExportFormatter` outputs exact 8 headings: `No`, `Hari / Tanggal`, `Pukul`, `Kegiatan`, `Tempat`, `Penyelenggara`, `Dihadiri Oleh`, `Keterangan`.
3. `No` is calculated sequentially 1..N based on report sorting, not internal UUIDs.
4. Multi-day activity renders exactly 1 row with date range text (e.g. `Kamis - Sabtu, 1 - 3 Oktober 2026`).
5. Output XML spreadsheet escapes formulas (`=`, `+`, `-`, `@`) to prevent CSV/formula injection.

- [ ] **Step 2: Run tests to verify they fail**
Run: `node --test tests/migration.test.js tests/export.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement `shared/ExportFormatter.js` and `shared/Migration.js`**
Implement the official 8-column table generator, printable landscape HTML template, XML Excel exporter, and legacy row parser.

- [ ] **Step 4: Run tests to verify they pass**
Run: `node --test tests/migration.test.js tests/export.test.js`
Expected: All tests PASS.

---

### Task 6: Admin Apps Script Backend & Sheets Repository

**Files:**
- Create: `admin-app/src/Repository.gs`
- Create: `admin-app/src/ActivityApi.gs`
- Create: `admin-app/src/MasterApi.gs`
- Create: `admin-app/src/Code.gs`

**Interfaces:**
- Produces: `doGet(e)`, `createActivity(input, requestId)`, `updateActivity(id, input, expectedVersion, requestId)`, `cancelActivity(id, reason, expectedVersion, requestId)`, `completeActivity(id, expectedVersion, requestId)`, `duplicateActivity(id)`, `getAdminActivities(filters)`, `saveMasterData(kind, input)`.

- [ ] **Step 1: Implement `admin-app/src/Repository.gs`**
Provide Google Sheets storage access using Script Properties (`SPREADSHEET_ID`), `LockService.getScriptLock()`, row lookup by UUID, batch reads, atomic updates, and audit logging with `identity_source: "UNVERIFIED"`.

- [ ] **Step 2: Implement `admin-app/src/ActivityApi.gs`**
Implement CRUD handlers, conflict warning flow with override confirmation, optimistic locking (`expectedVersion`), and duplicate retry protection (`requestId`).

- [ ] **Step 3: Implement `admin-app/src/MasterApi.gs`**
Implement management endpoints for Employees, Departments, Locations, Organizers, Categories (soft-deactivation via `active=false`), and Announcements.

- [ ] **Step 4: Implement `admin-app/src/Code.gs`**
Serve `Index.html` via `HtmlService.createTemplateFromFile('Index').evaluate()` with full-screen viewport, meta tags, and title "Admin - Agenda Kegiatan Dinas Koperasi Batam".

---

### Task 7: Admin Full-Screen Responsive Frontend

**Files:**
- Create: `admin-app/src/Index.html`
- Create: `admin-app/src/AdminStyles.html`
- Create: `admin-app/src/AdminScripts.html`

**Interfaces:**
- Produces: Full-screen responsive management web app interface.

- [ ] **Step 1: Build `admin-app/src/Index.html` structure**
Navigation header with branding, tab switcher:
- **Dashboard:** Today's activities, upcoming 7 days, summary cards, quick add button.
- **Schedule Manager:** Search, date range filter, status filter, table view with actions (Edit, Reschedule, Duplicate, Cancel, Complete).
- **Master Data:** Tabs for Employees, Locations, Organizers, Categories.
- **Announcements & Audit:** Active notices manager and recent audit log viewer.
- **Settings:** Department header and public view options.

- [ ] **Step 2: Build `admin-app/src/AdminStyles.html`**
Clean modern municipal theme (navy blue `#1e3a8a`, emerald `#059669`, amber `#d97706`, rose `#e11d48`, neutral gray slate), responsive flexbox and CSS grid layouts, accessible modal overlays.

- [ ] **Step 3: Build `admin-app/src/AdminScripts.html`**
Client-side state manager and `google.script.run` wrappers:
- Form validation for WIB dates and times.
- "s.d. selesai" checkbox toggling end-time field.
- Conflict warning modal presenting overlapping events and requiring override justification.
- Toast notifications for save pending, success, version conflicts, and errors.

---

### Task 8: Public Portal Apps Script Backend & Frontend

**Files:**
- Create: `public-app/src/PublicApi.gs`
- Create: `public-app/src/Code.gs`
- Create: `public-app/src/Index.html`
- Create: `public-app/src/Styles.html`
- Create: `public-app/src/Scripts.html`

**Interfaces:**
- Produces: Read-only public portal with dashboard, monthly/weekly/daily calendar, agenda search, and 8-column export.

- [ ] **Step 1: Implement `public-app/src/PublicApi.gs` & `Code.gs`**
- `getDashboardData()`: Today's items, upcoming 7 days, active notices, summary stats.
- `getPublicActivities(filters)`: Paginated, filtered list of approved public DTOs.
- `getPublicExport(filters, format)`: Returns formatted 8-column report data or HTML print view.
- `doGet(e)`: Serves responsive full-screen portal with `X-Frame-Options: ALLOWALL` or standard web view.

- [ ] **Step 2: Build `public-app/src/Index.html`**
Public banner: "Dinas Koperasi dan Usaha Mikro Kota Batam - Agenda Resmi Kegiatan".
Views:
- **Dashboard Tab:** Highlights today's agenda, week outlook, and notices.
- **Calendar Tab:** Month view, Week view, Day view with clear event chips.
- **Agenda Tab:** Search bar, date range picker, category filter, clean list view.
- **Export / Print Modal:** Date range selector with "Cetak / Print PDF" and "Unduh Excel (XLSX)".

- [ ] **Step 3: Build `public-app/src/Styles.html` & `public-app/src/Scripts.html`**
- Clean CSS grid calendar supporting multi-day event spans.
- Mobile-first responsive card views.
- Landscape print styles `@media print { @page { size: landscape; margin: 15mm; } ... }` rendering the exact official 8-column layout with repeating headers.

---

### Task 9: Seed Generator, End-to-End Verification & Clasp Deployment Guide

**Files:**
- Create: `shared/SeedGenerator.js`
- Create: `tests/system_flow.test.js`
- Create: `README.md`
- Create: `DEPLOYMENT.md`

**Interfaces:**
- Produces: `npm run seed`, `npm test` passing 100%, step-by-step clasp push instructions.

- [ ] **Step 1: Implement `shared/SeedGenerator.js`**
Generates realistic initial data including the October 2026 client samples, master records (Employees, Departments, Locations, Organizers, Categories), and initial Settings.

- [ ] **Step 2: Implement `tests/system_flow.test.js`**
Simulate complete lifecycle:
1. Seed initial database.
2. Admin creates activity with conflict detection.
3. Edit activity with version check.
4. Public reads dashboard and agenda (assert zero private fields).
5. Generate official 8-column export matching client sample.

- [ ] **Step 3: Run entire test suite**
Run: `npm test`
Expected: 100% test pass across all unit and integration fixtures.

- [ ] **Step 4: Synchronize shared modules into Apps Script projects**
Run: `npm run sync`
Expected: `public-app/src/shared/` and `admin-app/src/shared/` populated with latest tested files.

- [ ] **Step 5: Write `README.md` and `DEPLOYMENT.md`**
Detailed documentation covering:
- Repository layout and architecture.
- How to test locally.
- How to set up Google Sheet and configure Script Properties.
- How to run `clasp login` and `clasp push` for both `public-app` and `admin-app`.
- Gate 5 Production security checklist.
