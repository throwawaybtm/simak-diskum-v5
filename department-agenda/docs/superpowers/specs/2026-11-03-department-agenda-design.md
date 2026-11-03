# Department Activity Scheduling System (v4.0) - Design Document

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Target Environment:** Google Apps Script (GAS) Web Applications & Private Google Sheets Database  
**Timezone:** Asia/Jakarta (WIB)  
**Date:** 2026-11-03  
**Status:** Pending Approval  

---

## 1. Intent & The Why

Dinas Koperasi dan Usaha Mikro Kota Batam requires an official, reliable, and accessible activity scheduling system. Previously maintained manually in a monthly spreadsheet (with 8 official columns), the schedule needs modernization without adding external SaaS dependencies, custom authentication portals, or recurring server costs.

The solution provides two independent, full-screen Google Apps Script web applications sharing one private Google Sheets database:
1. **Public Web App:** Enables citizens, external partners, and staff to view the verified official schedule anonymously across desktop and mobile devices. Sensitive meeting credentials and internal notes are strictly filtered out.
2. **Admin Web App:** Enables 2–5 designated departmental operators to manage schedules, track conflicts, maintain master data, and generate official monthly reports and genuine XLSX exports.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Full Separation of Scopes & Deployment:** Public app operates under read-only permissions (`spreadsheets.readonly`) with no mutation endpoints. Admin app operates in a dedicated deployment with write permissions.
- **Strict Privacy Isolation:** Public DTO projections must strictly exclude internal notes (`private_notes`), meeting credentials/passcodes (`private_meeting_url`), raw employee IDs, and audit records.
- **Concurrency & Idempotency:** Admin writes enforce `LockService.getScriptLock()`, optimistic locking with `expectedVersion`, and client `requestId` tracking to prevent double submissions.
- **Intelligent Time & Conflict Rules:** Full support for single-day, multi-day, midnight-spanning, and open-ended ("s.d. selesai") events in WIB timezone. Overlap detection warns when shared staff or office rooms collide.
- **Legacy Fidelity:** Exporting and printing reproduces the official 8-column layout (*No, Hari / Tanggal, Pukul, Kegiatan, Tempat, Penyelenggara, Dihadiri Oleh, Keterangan*) with Indonesian formatting and official headers.
- **Automated Local Verification:** Pure business logic (parsers, validators, conflict analyzers, sanitizers, and migration helpers) is 100% testable locally via Node.js before deploying to GAS.

### Non-Goals
- Real-time WebSockets or push notifications.
- Direct synchronization with Google Calendar (deferred per v4 roadmap).
- Complex custom username/password login system or third-party OAuth (Auth0/Firebase).
- Recurring cron rule engines (e.g. RRULE recurring events).

### Anti-Goals
- **No Google Sheets Sidebar:** The admin interface must be a full-screen, standalone web app, not an embedded sidebar in the spreadsheet UI.
- **No Direct Sheet Sharing with End Users:** Neither public readers nor admin operators need direct access or sharing permissions to the underlying Google Sheet. Access is brokered exclusively by Apps Script server scripts executing as the deployer.
- **No "Security by Obscurity":** The system acknowledges that an unauthenticated admin web app executing as owner is suitable only for disposable staging/prototyping. Production authorization must be enforced prior to live data launch.

---

## 3. Constraints

1. **Google Ecosystem Only:** Google Apps Script (V8 runtime), HTML Service, and Google Sheets.
2. **Timezone:** Strict adherence to `Asia/Jakarta` (WIB / UTC+7). Date math and rendering must never shift due to the viewer's local browser timezone.
3. **Storage Performance:** Google Sheets is the database. Queries must minimize roundtrips by batching range reads and caching reference data during request lifetimes.
4. **Apps Script Execution Quotas:** Execution time limit (6 minutes max) requires bounded paginated reads and batch writes.
5. **No Node runtime on GAS:** Shared code must be compatible with vanilla ES6/V8 and client-side browser JavaScript.

---

## 4. Evaluated Approaches & Selected Architecture

### Approach 1: Lightweight Modular Multi-App with Shared Sync (Selected)
- **Structure:** Two standalone Apps Script directories (`public-app/` and `admin-app/`), each with its own `appsscript.json` and `.clasp.json`, sharing pure modules in `shared/`.
- **Build/Deploy:** A clean Node sync script copies shared business logic into both project `src/` folders before `clasp push`.
- **Pros:** Native Apps Script compatibility, clean code readability inside the Google Script Editor, no heavyweight bundler dependencies, fast local testing with Node's native test runner.
- **Cons:** Shared code must follow standard ES modules/commonJS patterns that transpile cleanly to GAS globals/scripts.

### Approach 2: Full Bundler Setup (Vite / Rollup + GAS Plugin)
- **Structure:** TypeScript monorepo with compilation pipelines creating single-bundle JS files.
- **Pros:** Allows complex npm package usage.
- **Cons:** Generates minified/obfuscated code in the Apps Script editor, severely impairing debugging and long-term maintenance by client staff.

---

## 5. System Architecture & Component Design

### 5.1 Repository Layout
```text
department-agenda/
├── admin-app/
│   ├── .clasp.json
│   └── src/
│       ├── appsscript.json          # Scopes: spreadsheets, script.container.ui
│       ├── Code.gs                  # doGet (serves Admin HTML), routing
│       ├── ActivityApi.gs           # Admin RPC handlers (CRUD, actions)
│       ├── MasterApi.gs             # Master data management RPC handlers
│       ├── ReportApi.gs             # Report and audit query RPC handlers
│       ├── Repository.gs            # Sheet access, LockService, transactions
│       ├── Index.html               # Full-screen responsive admin dashboard
│       ├── AdminStyles.html         # CSS styling (Tailwind-like utility or scoped CSS)
│       └── AdminScripts.html        # Client-side state, UI components, google.script.run
├── public-app/
│   ├── .clasp.json
│   └── src/
│       ├── appsscript.json          # Minimal scope: spreadsheets.readonly
│       ├── Code.gs                  # doGet (serves Public HTML)
│       ├── PublicApi.gs             # Read-only RPC handlers
│       ├── Index.html               # Public responsive portal (Dashboard, Calendar, Agenda)
│       ├── Styles.html              # Clean public UI CSS
│       └── Scripts.html             # Client-side rendering, filters, export triggers
├── shared/
│   ├── Schema.js                    # Sheet definitions, column indexes, table models
│   ├── TimeUtils.js                 # WIB parsing, formatting, interval math, "s.d. selesai"
│   ├── Validation.js                # Activity & Master data validation rules
│   ├── ConflictDetector.js          # Attendee and venue overlap detection
│   ├── Projection.js                # Public DTO sanitizer (strips private fields)
│   ├── ExportFormatter.js           # 8-column official layout, Indonesian date text
│   └── Migration.js                 # Legacy tabular parser, alias resolver, deduplicator
├── tests/
│   ├── fixtures/
│   │   ├── legacy_sample.json       # Extracted from client's October 2026 agenda
│   │   └── mock_database.json       # Synthetic seed data
│   ├── time_utils.test.js           # Timezone & interval tests
│   ├── conflict.test.js             # Overlap & warning tests
│   ├── validation.test.js           # Schema & payload validation tests
│   ├── projection.test.js           # Privacy & credential leakage prevention tests
│   └── migration.test.js            # Legacy import parsing tests
├── package.json
└── README.md
```

### 5.2 Database Schema (9 Sheets in Private Workbook)

1. **`Activities`**:
   `activity_id`, `title`, `start_date`, `start_time`, `end_date`, `end_time`, `location_id`, `organizer_id`, `category_id`, `status` (`SCHEDULED`, `CANCELLED`, `COMPLETED`), `public_notes`, `private_notes`, `private_meeting_url`, `cancel_reason`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`
2. **`ActivityAttendees`**:
   `attendee_id`, `activity_id`, `employee_id`, `guest_name`, `attendee_role`, `name_snapshot`, `position_snapshot`, `public_label`
3. **`Employees`**:
   `employee_id`, `full_name`, `position`, `department_id`, `active`
4. **`Departments`**:
   `department_id`, `name`, `active`
5. **`Locations`**:
   `location_id`, `name`, `location_type` (`OFFICE`, `EXTERNAL`, `ONLINE`), `active`
6. **`Organizers`**:
   `organizer_id`, `name`, `active`
7. **`Categories`**:
   `category_id`, `name`, `active`
8. **`Announcements`**:
   `announcement_id`, `title`, `body`, `publish_at`, `expires_at`, `active`
9. **`AuditLogs`**:
   `log_id`, `request_id`, `timestamp`, `actor_label`, `action`, `entity_id`, `before_json`, `after_json`
10. **`Settings`**:
    `key`, `value` (branding, official header title, export preferences)

### 5.3 Public API & DTO Security Boundary
The Public Web App server endpoints return **only** sanitized DTOs:
```typescript
interface PublicActivityDTO {
  id: string;
  title: string;
  startDate: string;         // YYYY-MM-DD
  startTime: string | null;  // HH:mm or null
  endDate: string;           // YYYY-MM-DD
  endTime: string | null;    // HH:mm or null (null implies "s.d. selesai")
  timeDisplay: string;       // e.g. "07.00 WIB s.d. selesai"
  dateDisplay: string;       // e.g. "Kamis, 1 Oktober 2026"
  locationName: string;
  locationType: "OFFICE" | "EXTERNAL" | "ONLINE";
  organizerName: string;
  categoryName: string;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  publicNotes: string;
  attendeeLabels: string[];  // Formatted public labels, e.g. ["1. Kadis", "2. Sekretaris"]
  recentlyUpdated: boolean;
}
```
**Strict Invariant:** `private_notes`, `private_meeting_url` (Zoom passcodes/links), internal IDs, and audit records are excluded before transmission to client.

### 5.4 Admin Concurrency, Security Staging & Transaction Protocol
All admin write operations execute through `saveActivity(payload, opts)`:
1. **Staging Identity & Security Baseline:** No authentication in prototype. Accept `actor_label` solely for unverified audit attribution, never authorization. Explicitly include `identity_source = "UNVERIFIED"`. No custom login UI is built. Gate 5 requires production access enforcement before real data or public admin deployment.
2. Acquire script lock (`LockService.getScriptLock().waitLock(10000)`).
3. Check `requestId` against existing `AuditLogs` to handle idempotent retries safely.
4. Read current record version. If `current.version !== expectedVersion`, throw `VERSION_CONFLICT`.
5. **Conflict Detection Semantics:**
   - Use half-open `[start, end)` intervals.
   - For open-ended events (`end_time === null` / "s.d. selesai"), use 00:00 WIB on the day following `end_date` as the exclusive internal boundary.
   - Adjacent intervals (e.g. 09:00–10:00 and 10:00–11:00) do NOT overlap.
   - Only warn when a participant or bookable venue (office room) is shared.
   - Open-ended overlap results are treated as potential warnings and allow a documented, audited override (`acknowledgeConflict = true` with reason).
6. If overlapping and `acknowledgeConflict !== true`, return `OVERLAP_WARNING` with conflict details.
7. Write activity updates, update attendee records, record audit entry with `before_json`, `after_json`, `actor_label`, and `identity_source="UNVERIFIED"`.
8. Increment `version` and release lock in `finally` block.

### 5.5 Official 8-Column Export & Migration Engine
The legacy agenda format comprises:
`No` | `Hari / Tanggal` | `Pukul` | `Kegiatan` | `Tempat` | `Penyelenggara` | `Dihadiri Oleh` | `Keterangan`

- **Multi-Day Display & Representation:**
  - Keep exactly one `activity_id` and one database record.
  - Calendar and agenda day views display the activity on every intersecting date.
  - Official eight-column reports and Excel export render exactly one row per activity with Indonesian date range (e.g. `Kamis–Sabtu, 1–3 Oktober 2026`) and one sequential `No`.
  - Date-range reports include any intersecting event without duplicating rows.
- **Print/PDF View:** Clean printable HTML with CSS `@page { size: landscape; margin: 15mm; }`, official department header (`JADWAL KEGIATAN DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM`), repeating table headers, and page break controls.
- **XLSX Export:** Generates clean XML-based spreadsheet or tabular workbook with typed string cells to eliminate formula injection risks.
- **Migration Script:** Parses the sample October 2026 spreadsheet rows, separating Zoom credentials (e.g. `Meeting ID: 850 000 5418 Passcode: ppdn146` and URL) into `private_meeting_url` and general attire notices (`Pakaian : PSL`) into `public_notes`.

---

## 6. What's Left to the Builder

- Exact CSS color palette and typography matching Dinas Koperasi Batam's visual identity (navy/teal municipal aesthetic).
- Selection of lightweight client-side calendar rendering (pure CSS grid month/week/day view without heavy dependencies).
- Implementation details of XLSX generation in GAS (HTML table with MIME type or XML Spreadsheet 2003 / Sheets export URL).
- Staging seed generation script with rich realistic test cases.
