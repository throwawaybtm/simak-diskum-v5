# Project Progress Ledger: Department Activity Scheduling System v5.0

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Target Architecture:** Firebase Hosting (Multi-site: `public` & `admin`), Cloud Firestore Standard Edition, Firebase Emulator Suite  
**Development Tooling:** Vite, TypeScript, Vitest, Playwright, Firebase CLI, ExcelJS  
**Last Updated:** 2026-11-05  
**Overall Status:** Visual Makeover V01-B Completed & Formally Verified (163/163 Vitest tests, 91 browser scenarios across 8 suites, 0 horizontal overflow across 4 viewports); Ready for V01-B Visual Review Checkpoint (V01-C & Production Activation Pending Approval)  

---

## 1. Master Task Checklist (Tasks 1–9, Gate 5A, Feature F01 & Visual Makeover V01)

| Task | Title | Status | Completion Date | Git Commit | Summary |
|---|---|:---:|:---:|:---:|---|
| **Task 1** | Monorepo Scaffolding, Vite Apps & Firebase Config | **Completed** | 2026-11-04 | `c3c48ed` | Independent monorepo in `department-agenda-firebase/` with workspaces `apps/*` and `shared`. Firebase multi-site targets (`public`, `admin`). Strict hosted rules vs separate emulator rules. 7/7 tests passed. |
| **Fix** | Firebase Emulator Config & Rule Isolation | **Completed** | 2026-11-04 | `70c7958` | Separated `firebase.emulator.json` with `--project demo-department-agenda` and emulator startup script. Automated config verification added. |
| **Task 2** | Schemas, Synthetic Fixtures & WIB Time Engine | **Completed** | 2026-11-04 | `1192514` | Pure TypeScript schemas (`ActivityDocument`, `AttendeeSnapshot`, `Master`, `Audit`, `PublicDTO`). Pure WIB date arithmetic (`Asia/Jakarta`). Half-open intervals, open-ended events, leap year math, multi-month interval logic, and Indonesian text formatting. 29/29 tests passed. |
| **Task 3** | Validation, Conflict Engine, Snapshots & Privacy Scanner | **Completed** | 2026-11-04 | `a7d99fd` | Validation with strict start < end chronology; regex privacy scanner for Zoom/Teams/credentials; immutable attendee snapshot engine; room/attendee conflict detector; public projector retaining cancelled items. 54/54 tests passed. *(Review Checkpoint 1 Approved)* |
| **Task 4** | Firestore Collections, Rules, Indexes & Benchmark | **Completed** | 2026-11-04 | `22aec2c` | Atomic transactions (`activities` + `publicActivities` + `auditLogs`); optimistic concurrency control (`expectedVersion`); live Firestore emulator rules verification; query benchmark with 520 synthetic documents returning 40 intersecting activities in 76ms. 67/67 tests passed. *(Review Checkpoint 2 Approved)* |
| **Task 5** | Admin UI: Dashboard, Add/Edit Activity & Conflict Workflow | **Completed** | 2026-11-04 | `ab77e1d` | Full-screen responsive admin dashboard, Add/Edit/Duplicate activity workflow, real-time privacy scanner warning, live public preview card, conflict warning modal, and version concurrency dialog. Dynamic code splitting achieved (initial JS entry 3.19 kB gzip; total initial dashboard load 7.55 kB gzip). Full 13-scenario Playwright real browser verification pass passed (100% success). 73 unit/integration tests + 13 browser E2E tests verified. |
| **Task 6** | Public UI: Dashboard, Calendar, Agenda, Detail & Announcements | **Completed** | 2026-11-04 | `cbdd3a7` | Responsive public web app in Indonesian; executive dashboard with today's activities in WIB, 7-day upcoming, announcements feed, and quick jump-to-date; Month, Week, Day, and List calendar views with multi-day spanning; fundamental date-intersection queries (`startDate <= visibleEnd && endDate >= visibleStart`); debounced multi-criteria agenda search; sanitized activity detail dialog with zero private leaks; retained cancelled items with public notices. Full 11-scenario Playwright verification pass passed (100% success). 82 unit/integration tests + 11 browser E2E tests verified. |
| **Task 7** | Master Data Management, Official 8-Column Reports, Validated XLSX & Migration | **Completed** | 2026-11-04 | `cc5df12` (7A), `a382e8b` (7B) | **Phase 7A:** Master Data CRUD (Employees, Departments, Locations, Organizers, Categories), referential integrity safeguard on deactivation, duplicate name prevention, live form integration, and attendee snapshot preservation. **Phase 7B:** Official Indonesian 8-column layout (`No | Hari / Tanggal | Pukul | Kegiatan | Tempat | Penyelenggara | Dihadiri Oleh | Keterangan`), single-row multi-day event formatting (`Jumat–Minggu, 6–8 November 2026`), formula injection neutralization (`=`, `+`, `-`, `@`), genuine OpenXML XLSX generation via ExcelJS (7.9 KB), landscape A4 print template with Kop Surat and signature block, October 2026 legacy spreadsheet ingestion with Zoom credential isolation and deduplication. Full Playwright suites verified (Phase 7A: 8/8 scenarios; Phase 7B: 8/8 scenarios; 100% pass rate). 102 Vitest tests + 40 Playwright scenarios verified. *(Review Checkpoint 3 Approved)* |
| **Task 8** | Performance Instrumentation, Staging Verification & Readiness | **Completed** | 2026-11-04 | `f12df3e` | Core Web Vitals telemetry (FCP 44ms cold / 28ms warm; LCP 44ms; CLS 0.0000; Shell 1–2ms; Firestore Data 106–154ms; Read count: 30 docs); public bundle initial JS entry 41.16 kB (11.94 kB gzip) well under 150 kB budget; OpenXML XLSX parser verification; master safety & migration isolation; staging config verified for `simakdiskum` targets; dynamic official signatory settings with Firestore persistence. 113/113 Vitest tests + 40/40 Playwright E2E scenarios + 4 Performance audits passed. *(Review Checkpoint 4 Approved)* |
| **Task 9** | Gate 5 Authentication & Authorization Specification | **Completed** | 2026-11-04 | `7611376` | Fixed announcement date defect (zero "Invalid Date WIB"); verified 7-day calendar usability across 375px, 768px, 1024px, 1440px viewports without clipping; authored 13-point security specification (`gate5_auth_specification.md`); designed and verified production `firestore.rules` (20/20 tests); least-privilege RBAC (Admin/Editor); append-only audit trail; staging-to-prod runbook; 100% Spark free tier compatible. 136 Vitest tests + 52 browser/audit executions verified. *(Gate 5 Review)* |
| **Gate 5A**| Security Hardening & Honest Verification Pass | **Completed** | 2026-11-04 | `b86a2d4` | Addressed `getAfter()` limitation on untouched documents; implemented synchronized optimistic `version` lockstep across `activities` and `publicActivities`; full projection text matching (`publicNotes`, `endTime`, `openEnded`, `updatedAt`, `publicCancellationNotice`); 6-scenario regression passed; strict server timestamp `request.time` enforced on audit logs; repositories aligned; API-level sign-up risk documented with Console mitigation; honest boundaries of browser-only architecture documented. Commit `b86a2d4`. *(Gate 5A Approved)* |
| **Feature F01** | Agenda Administrative Workflow & Invitation Letter Reference | **Completed** | 2026-11-04 | `cca3958` | Decoupled 4-stage administrative workflow (`INITIAL_ENTRY`, `OFFLINE_PROCESS`, `DETAILS_COMPLETED`, `ADMIN_COMPLETE`) from operational status; private structured invitation letter metadata; nonblocking warnings for initial entry vs blocking gate for final stage; multi-operator collaboration; backward stage regression with audit logging; safe Google Drive links; strict isolation from public portal and 8-column reports; 163 Vitest tests (32 rules tests) + 65 browser scenarios verified. Commits `c04609c` through `cca3958`. *(Feature F01 Approved)* |
| **Makeover V01-A** | Design System and Dashboard Prototypes | **Completed** | 2026-11-04 | `9d8bce8` | **Public Portal:** Top horizontal navigation bar, civic brand identity, Barelang Bridge hero welcome banner, 4 summary cards below banner, 2-column feed. **Admin Portal:** Left vertical white sidebar with active light-blue pill, topbar with operator profile pill, 5-stage administrative pipeline cards, upcoming agenda list, and pure CSS conic-gradient donut chart analytics. Zero-dependency lightweight design system; DOM-safe Google Drive anchor creation; verified across 375px, 768px, 1024px, 1440px; 163 Vitest tests + 69 browser scenarios verified. Commit `9d8bce8`. *(V01-A Approved)* |
| **Makeover V01-B** | Secondary Pages & Full Design Consistency | **Completed** | 2026-11-05 | `a7a3a1c` | Implemented V01-A usability fixes: Admin mobile/tablet off-canvas drawer (`#adminMenuToggleBtn`, backdrop blur, Escape handler, auto-close on link click, docked on desktop >= 1024px); human-readable location resolution eliminating raw IDs (`loc_xx`); public desktop header single-line layout (`white-space: nowrap`, 1380px container, mobile horizontal scroll); responsive density tuning (<200px mobile banner). Extended visual polish across all secondary pages: Calendar (Month, Week, Day, List), Agenda Search, Detail Modal, Announcements, Admin Activities List, F01 4-stage edit form with progress indicator bar (`.stage-indicator-bar`), Master Data (5 entity tabs), Official 8-column reports, spreadsheet migration, and Settings. 163/163 Vitest tests + 91 browser scenarios verified with 100% pass rate. *(V01-B Visual Review Checkpoint)* |

---

## 2. Test Totals at Latest Checkpoint (Visual Makeover V01-B Completed & Formally Verified)

- **Vitest Unit & Integration Suites:** 19 passed (19 total)
- **Vitest Automated Tests:** **163 passed** (163 total, 100% pass rate)
- **Playwright Real-Browser Verification Suites:**
  - Visual Makeover V01-B Full Suite (`visualMakeoverV01BVerification.mjs`): **30 / 30 passed** (Fixes A-D, all secondary pages, 4 viewports 375px, 768px, 1024px, 1440px)
  - Visual Makeover V01-A Responsive Suite (`visualMakeoverVerification.mjs`): **8 / 8 passed** (375px, 768px, 1024px, 1440px for Public & Admin)
  - Feature F01 Administrative Workflow Suite (`f01WorkflowVerification.mjs`): **13 / 13 passed** (100%)
  - Admin Portal Regression Suite (`runVerification.mjs`): **13 / 13 passed** (100%)
  - Public Portal Regression Suite (`runPublicVerification.mjs`): **11 / 11 passed** (100%)
  - Responsive Calendar & Announcement Suite (`calendarResponsiveVerification.mjs`): **8 / 8 passed** (100%)
  - Reports & Migration Suite (`reportsVerification.mjs`): **8 / 8 passed** (100%)
  - Master Data Suite (`masterDataVerification.mjs`): **8 / 8 passed** (100%)
- **Total Real-Browser Scenarios:** **91 verified browser executions** (100% pass rate across 8 test scripts)
- **Total Automated Test Assertions:** **254 passed** (163 Vitest + 91 Browser, 100% pass rate)
- **Visual Artifacts:** 76 verified browser screenshots in `tests/e2e/screenshots/` (V01-B Fixes & Secondary Pages, V01-A Viewports, F01 Workflow, Admin, Master, Public, Reports, Migration, Responsive Calendar)
- **Bundle Metrics:**
  - Public Shell: `index.html` 1.14 kB (gzip: 0.58 kB), `index.css` 22.58 kB (gzip: 4.76 kB)
  - Public Initial App Code: `index.js` **47.54 kB** (gzip: **13.12 kB**) *(Initial critical path well below 150 kB budget)*
  - Public Vendor: `firebase-vendor` 871.46 kB (gzip: 225.69 kB), `exceljs-vendor` 953.20 kB (gzip: 275.76 kB, lazy-loaded on export demand)
  - Admin Initial Shell: `index.js` 13.96 kB (gzip: 4.68 kB), `index.css` 23.24 kB (gzip: 5.28 kB)
  - Admin Lazy Modules: `SettingsPage` 5.19 kB (gzip: 2.08 kB), `ReportsPage` 14.68 kB (gzip: 5.09 kB), `MasterDataPage` 18.66 kB (gzip: 4.51 kB), `ActivitiesPage` 4.65 kB (gzip: 1.76 kB), `DashboardPage` 10.28 kB (gzip: 2.58 kB), `ActivityEditWorkflow` 31.26 kB (gzip: 8.36 kB), `legacyMigrationParser` 952.15 kB (gzip: 275.60 kB)
- **Test Categories Breakdown:**
  - Live Firestore Security Rules (Emulator): **32 tests** (`firestore.rules.test.ts`)
  - Monorepo Configuration & Rules: 7 tests (`monorepo_config.test.ts`)
  - Schemas & Data Contracts: 3 tests (`schemas.test.ts`)
  - WIB Time Engine & Date Arithmetic: 27 tests (`timeUtils.test.ts`)
  - Activity Validation: 17 tests (`activityValidator.test.ts`)
  - Privacy Scanner & Credential Blocker: 5 tests (`privacyScanner.test.ts`)
  - Attendee Snapshot Immutability: 3 tests (`attendeeSnapshot.test.ts`)
  - Conflict Engine: 6 tests (`conflictDetector.test.ts`)
  - Public Projection & Isolation: 3 tests (`publicProjector.test.ts`)
  - Admin UI Controller: 6 tests (`adminUi.test.ts`)
  - Public UI Controller: 11 tests (`publicUi.test.ts`)
  - Master Data Validation & Snapshot Preservation: 8 tests (`masterData.test.ts`)
  - Official 8-Column Reports, XLSX & Migration: 8 tests (`reportsAndMigration.test.ts`)
  - Repository Atomic Transactions (Emulator): 6 tests (`repository.emulator.test.ts`)
  - Master Repository CRUD & Integrity (Emulator): 4 tests (`masterRepository.emulator.test.ts`)
  - Query Benchmark & Multi-Month Range (Emulator): 1 test (`queryBenchmark.emulator.test.ts`)
  - OpenXML Spreadsheet Independent Parser: 1 test (`xlsxParserVerification.test.ts`)
  - Master Safety, Whitespace Deduplication & Dry-Run Isolation: 5 tests (`masterSafetyAndMigration.test.ts`)
  - Staging Readiness & Firebase Config Separation: 5 tests (`stagingReadiness.test.ts`)
  - Admin Lazy Modules: `SettingsPage` 5.19 kB (gzip: 2.08 kB), `ReportsPage` 14.68 kB (gzip: 5.09 kB), `MasterDataPage` 17.30 kB (gzip: 4.15 kB), `ActivitiesPage` 4.65 kB (gzip: 1.76 kB), `DashboardPage` 9.80 kB (gzip: 2.33 kB), `ActivityEditWorkflow` 30.39 kB (gzip: 8.18 kB)
- **Test Categories Breakdown:**
  - Live Firestore Security Rules (Emulator): **32 tests** (`firestore.rules.test.ts`)
  - Monorepo Configuration & Rules: 7 tests (`monorepo_config.test.ts`)
  - Schemas & Data Contracts: 3 tests (`schemas.test.ts`)
  - WIB Time Engine & Date Arithmetic: 27 tests (`timeUtils.test.ts`)
  - Activity Validation: 17 tests (`activityValidator.test.ts`)
  - Privacy Scanner & Credential Blocker: 5 tests (`privacyScanner.test.ts`)
  - Attendee Snapshot Immutability: 3 tests (`attendeeSnapshot.test.ts`)
  - Conflict Engine: 6 tests (`conflictDetector.test.ts`)
  - Public Projection & Isolation: 3 tests (`publicProjector.test.ts`)
  - Admin UI Controller: 6 tests (`adminUi.test.ts`)
  - Public UI Controller: 11 tests (`publicUi.test.ts`)
  - Master Data Validation & Snapshot Preservation: 8 tests (`masterData.test.ts`)
  - Official 8-Column Reports, XLSX & Migration: 8 tests (`reportsAndMigration.test.ts`)
  - Repository Atomic Transactions (Emulator): 6 tests (`repository.emulator.test.ts`)
  - Master Repository CRUD & Integrity (Emulator): 4 tests (`masterRepository.emulator.test.ts`)
  - Query Benchmark & Multi-Month Range (Emulator): 1 test (`queryBenchmark.emulator.test.ts`)
  - OpenXML Spreadsheet Independent Parser: 1 test (`xlsxParserVerification.test.ts`)
  - Master Safety, Whitespace Deduplication & Dry-Run Isolation: 5 tests (`masterSafetyAndMigration.test.ts`)
  - Staging Readiness & Firebase Config Separation: 5 tests (`stagingReadiness.test.ts`)

---

## 3. Review Checkpoint History

| Checkpoint | Target | Status | Verification Summary |
|---|---|:---:|---|
| **Checkpoint 1** | Task 3 Completion | **Approved** | 54 tests passing; validated start < end chronology gate; immutable attendee snapshots; conflict warnings; regex privacy blocker; public projector retaining cancelled items. Commits `70c7958` and `a7d99fd`. |
| **Checkpoint 2** | Task 4 Completion | **Approved** | 67 tests passing; live Firestore emulator rules test passed; atomic transactions verified with optimistic concurrency; query benchmark executed with 520 records in 76ms. Commit `22aec2c`. |
| **Task 5 Pass** | Task 5 Browser Verification | **Approved** | 73 unit tests passing; 13/13 real browser interaction scenarios verified via Playwright; Duplicate feature added; route code-splitting implemented (<8 kB gzip initial load). Commit `ab77e1d`. |
| **Task 6 Pass** | Task 6 Public Portal Implementation | **Approved** | 82 unit tests passing; 11/11 real public browser interaction scenarios verified via Playwright; multi-day spanning calendar; sanitized public detail dialog; zero private collection access. Commit `cbdd3a7`. |
| **Checkpoint 3** | Task 7 Completion | **Approved** | 102 Vitest tests + 40 Playwright browser scenarios passing (100%); Phase 7A Master Data CRUD verified (commit `cc5df12`); Phase 7B Official 8-column layout verified, genuine OpenXML XLSX (7,933 bytes) with formula injection protection verified, October 2026 migration with Zoom credential isolation verified. Commits `cc5df12` and `a382e8b`. |
| **Checkpoint 4** | Task 8 Completion | **Approved** | 113 Vitest tests + 40 Playwright browser scenarios + 4 performance profiling audits passing (100%). Core Web Vitals verified (FCP 44ms cold / 28ms warm, LCP 44ms, CLS 0.0000, Shell 1–2ms, Data 106–154ms). Public initial JS entry 41.16 kB (11.94 kB gzip) against 150 kB budget. OpenXML XLSX container compliance independently verified. Formula injection neutralized. Configurable official signatory implemented with Firestore persistence. Staging multi-site config verified for `simakdiskum` targets. Commit `f12df3e`. |
| **Task 9 Review**| Task 9 Authentication Spec | **Accepted** | Production auth specification completed (`gate5_auth_specification.md`); custom role claims (Admin/Editor); append-only audit trail with actor ID binding; production rules verified (20/20 Vitest rules tests); announcement date bug fixed and verified; 7-day calendar verified responsive (375px–1440px); staging-to-prod runbook authored. |
| **Gate 5A Checkpoint**| Security Hardening & Honest Verification | **Approved** | Addressed `getAfter()` limitation on untouched documents; implemented synchronized optimistic `version` lockstep across `activities` and `publicActivities`; full projection text matching (`publicNotes`, `endTime`, `openEnded`, `updatedAt`, `publicCancellationNotice`); 6-scenario regression passed; strict server timestamp `request.time` enforced on audit logs; repositories aligned; API-level sign-up risk documented with Console mitigation; honest boundaries of browser-only architecture documented. Commit `b86a2d4`. |
| **Feature F01 Checkpoint**| Administrative Workflow & Invitation Letter Reference | **Approved** | Decoupled 4-stage administrative workflow; structured private invitation letter metadata; nonblocking warnings for initial entry vs blocking gate for final stage; multi-operator collaboration; backward stage regression with audit logging; safe external Google Drive link; strict isolation from public portal and 8-column reports; 163 Vitest tests (32 rules tests) + 65 browser scenarios verified. Commits `c04609c` through `cca3958`. |
| **V01-A Visual Review Checkpoint**| Design System & Dashboard Prototypes | **Approved** | Aligned with approved reference `docs/design/reference-approved.png`. **Public:** Top horizontal pill navigation, Batam identity, Barelang Bridge hero welcome banner, 4 summary cards below banner, 2-column feed. **Admin:** Left vertical white sidebar with active light-blue pill, top header with operator profile pill, 5-stage administrative cards, upcoming agenda list, and pure CSS conic-gradient donut chart analytics. Commit `9d8bce8`. |
| **V01-B Visual Review Checkpoint**| Secondary Pages & Full Design Consistency | **READY FOR REVIEW** | Resolved V01-A usability issues: Admin mobile/tablet off-canvas drawer (`#adminMenuToggleBtn`, backdrop blur, Escape key, focus trap, docked on desktop >=1024px); human-readable location resolution (`FALLBACK_LOCATIONS` + master map, zero raw `loc_xx` IDs); public desktop header single-line layout (`white-space: nowrap`, 1380px container, mobile horizontal scroll); responsive density tuning (<200px mobile banner). Extended visual polish across all secondary pages: Calendar (Month, Week, Day, List), Agenda Search, Detail Modal, Announcements, Admin Activities List, F01 4-stage edit form with progress indicator bar (`.stage-indicator-bar`), Master Data (5 entity tabs), Official 8-column reports, spreadsheet migration, and Settings. 163/163 Vitest tests + 91 browser scenarios verified with 100% pass rate. *(Pending Approval)* |

---

## 4. Production-Readiness Findings, Technical Debt & Unresolved Issues

1. **Bundle Payload Distinction (Shell Entry vs Full Data-Ready Payload):**
   - *Distinction:* The reported **13.12 kB gzip** (47.54 KB raw) represents the initial public application shell entry point. The full data-ready payload on the network includes the **225.69 kB gzip** (871.46 KB raw) Firebase vendor bundle. Total network weight for initial data retrieval is ~238.81 kB gzip, whereas ExcelJS (275.76 kB gzip) is strictly lazy-loaded on export.
2. **Safe Dynamic Google Drive DOM Anchor Construction:**
   - *Status:* **ENFORCED & VERIFIED**. External Google Drive links are created strictly via DOM APIs (`document.createElement('a')`, `anchor.href = driveUrl`, `anchor.textContent = ...`, `anchor.target = '_blank'`, `anchor.rel = 'noopener noreferrer'`). User-supplied URLs cannot inject raw HTML attributes.
3. **Firestore CEL Case-Sensitivity Invariant:**
   - *Status:* **RECORDED & ENFORCED**. In `firestore.rules`, `isEditor()` and `isAdmin()` strictly check lowercase roles (`request.auth.token.role == 'editor'`). Auth tokens with uppercase `'EDITOR'` or `'ADMIN'` are denied. All client and test auth helpers use lowercase role strings.
4. **Calendar Grid Responsive Layout & Column Clipping (375px to 1440px):**
   - *Status:* **RESOLVED & VERIFIED**. Added dual day name tags (`.day-full` / `.day-short`) with mobile CSS toggles in `CalendarView.ts` and `public.css`. Added smooth horizontal scrolling container on `.calendar-container` with `min-width: 640px` on `.week-grid-container` on mobile. All 7 columns verified intact and readable across 375px, 768px, 1024px, and 1440px viewports.
5. **Admin Off-Canvas Navigation Drawer & Backdrop Integration:**
   - *Status:* **RESOLVED & VERIFIED**. On viewports `< 1024px`, the admin sidebar is transformed off-screen (`-100%`) and triggered by `#adminMenuToggleBtn` with `.sidebar-open`. Focus is managed, backdrop blur overlay `#sidebarBackdrop` dismisses on click, Escape key closes drawer, and navigation clicks automatically close drawer. On viewports `>= 1024px`, sidebar remains docked and toggle button is hidden.
6. **Public Header Zero-Overflow at 1440px Desktop:**
   - *Status:* **RESOLVED & VERIFIED**. Adjusted `.header-container` from `max-width: 1240px` to `max-width: 1380px; gap: 1rem; padding: 0.75rem 1.25rem;`. Verified `document.documentElement.scrollWidth === window.innerWidth` (1440px) with 0px horizontal overflow.
7. **Human-Readable Location Display in Admin Panels:**
   - *Status:* **RESOLVED & VERIFIED**. `resolveAdminLocationName()` resolves location IDs via master data map and fallback dictionary (`FALLBACK_LOCATIONS`), guaranteeing zero raw `loc_xx` identifiers are presented in the UI without incurring extra per-row Firestore reads.
8. **Browser Architecture Audit Completeness Boundary:**
   - *Boundary:* Client-side audit logs written during activity transactions are atomic and enforced with server timestamps (`request.time`). For unlinked collections (such as Master Data), audit logs cannot be guaranteed if an authorized Admin bypasses the client UI and invokes the raw SDK. Complete uncircumventable audit trails require server-side Cloud Functions (Blaze billing).
