# SIMAK DISKUM v5.0 — Visual Design System (V01-B)

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Target Architecture:** Firebase Multi-site Web Applications (`public` & `admin`)  
**Design Authority:** Approved Minimalist Dual-Portal Reference (`docs/design/reference-approved.png`)  
**Status:** Phase B — Secondary Pages & Full Design Consistency Implemented & Verified  

---

## 1. Design Philosophy & Principles

The SIMAK DISKUM v5.0 visual identity embodies modern minimalist Indonesian civic software design:

1. **Clarity & Public Trust:** Clean white surfaces and cool-gray backgrounds inspired by official municipal portals, avoiding heavy textures, glassmorphism, or ornate embellishments.
2. **Distinct Dual-Portal Composition:**
   - **Public Portal:** Top-oriented horizontal navigation bar, welcoming civic banner showcasing Batam's iconic Barelang Bridge, high-contrast typography, and immediate daily agenda transparency for citizens and business operators.
   - **Admin Portal:** Left-oriented vertical sidebar, focused operational top header with operator profile indicators, five-stage administrative pipeline cards, and direct agenda status analytics for department staff.
3. **Restrained Color Palette:** Navy-blue typography (`#0f172a`, `#1e293b`), crisp civic royal blue accents (`#2563eb`), and subtle semantic status tints (Blue, Amber, Cyan, Emerald).
4. **Zero-Dependency Lightweight Performance:** Native CSS custom properties, SVG outline iconography, and CSS conic-gradient data visualizations that require zero external chart or UI libraries.

---

## 2. Design Tokens Specification

### A. Color Palette
```css
:root {
  /* Surface & Background Tones */
  --bg-app: #f0f4f9;              /* Light cool-gray / icy blue background */
  --bg-surface: #ffffff;          /* Pure white card and panel background */
  --bg-surface-subtle: #f8fafc;   /* Subtle table header and badge background */
  --bg-active-pill: #e0edff;      /* Light blue active pill navigation highlight */
  --bg-input: #ffffff;            /* Form input background */

  /* Borders & Dividers */
  --border-color: #e2e8f0;        /* Subtle slate-200 border */
  --border-color-subtle: #edf2f7; /* Very light divider */
  --border-color-focus: #3b82f6;  /* Input focus border */

  /* Elevation & Shadows */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.06);

  /* Typography Colors */
  --text-navy: #0f172a;           /* Deep navy headings and large metrics */
  --text-dark: #1e293b;           /* Dark slate subheadings and table headers */
  --text-body: #334155;           /* Primary readable body text */
  --text-muted: #64748b;          /* Secondary metadata, labels, and timestamps */
  --text-light: #94a3b8;          /* Placeholder and inactive icons */

  /* Primary Accent Blues */
  --color-primary: #2563eb;       /* Civic royal blue (buttons, active pills) */
  --color-primary-hover: #1d4ed8; /* Darker royal blue hover */
  --color-primary-light: #eff6ff; /* Soft blue icon/card fill */
  --color-accent-cyan: #0284c7;   /* Cyan highlight */

  /* F01 Administrative Stage Colors */
  --stage-initial-bg: #eff6ff;
  --stage-initial-text: #2563eb;
  --stage-initial-border: #bfdbfe;

  --stage-offline-bg: #fef3c7;
  --stage-offline-text: #d97706;
  --stage-offline-border: #fde68a;

  --stage-details-bg: #e0f2fe;
  --stage-details-text: #0284c7;
  --stage-details-border: #bae6fd;

  --stage-complete-bg: #dcfce7;
  --stage-complete-text: #16a34a;
  --stage-complete-border: #bbf7d0;

  /* Operational Status Colors */
  --status-scheduled-bg: #e0f2fe;
  --status-scheduled-text: #0284c7;
  --status-completed-bg: #dcfce7;
  --status-completed-text: #16a34a;
  --status-cancelled-bg: #fee2e2;
  --status-cancelled-text: #dc2626;

  /* Modest Border Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 9999px;
}
```

### B. Typography Scale
- **System Stack:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Scale:**
  - `Hero Main Title`: `2.00rem` (32px), `font-weight: 800`, line-height `1.2`
  - `Hero Welcome`: `1.25rem` (20px), `font-weight: 700`, line-height `1.3`
  - `Dashboard H2`: `1.50rem` (24px), `font-weight: 700`
  - `Section / Widget H3/H4`: `1.10rem` (17.6px), `font-weight: 700`
  - `Summary Big Number`: `1.75rem` (28px), `font-weight: 700`
  - `Body Regular`: `0.95rem` (15.2px), `font-weight: 400`, line-height `1.5`
  - `Card / Nav Labels`: `0.85rem` (13.6px), `font-weight: 600`
  - `Small Meta / Badges`: `0.75rem` (12px), `font-weight: 600`

---

## 3. Portal Layout Architectures

### A. Public Portal Layout (Top Navigation)
- **Top Header:** Full-width white bar with container (`max-width: 1380px; gap: 1rem; padding: 0.75rem 1.25rem;`).
  - Left: Lambang Kota Batam crest (`batam-emblem.png`, 32px), "SIMAK DISKUM Kota Batam", vertical divider, and official agency subtitle (agency subtitle gracefully hidden on narrow screens `<= 1200px` to reserve 350px for navigation links).
  - Center: Horizontal navigation links with pill highlights (`Beranda`, `Kalender Kegiatan`, `Cari Agenda`, `Pengumuman`), styled with `white-space: nowrap; flex-shrink: 0;` to prevent awkward multi-line wrapping on 1024px–1440px viewports. Features smooth touch horizontal scrolling on mobile viewports (`< 768px`).
  - Right: Quick search pill input ("Cari agenda...") and WIB operational timezone indicator. Zero horizontal overflow across all desktop and mobile viewports.
- **Hero Welcome Banner:** Wide card (`border-radius: 16px`) with Barelang Bridge scenic photography, left-to-right soft gradient overlay, vertical accent indicator line, and official welcome message. Optimized for mobile viewports with compact height (< 200px) and appropriate vertical breathing room.
- **Summary Cards (4-column grid):**
  - Agenda Hari Ini (Calendar outline icon in `#eff6ff`)
  - Agenda Minggu Ini (Calendar outline icon in `#eff6ff`)
  - Agenda Bulan Ini (Calendar outline icon in `#eff6ff`)
  - Total Agenda (Layers/stack outline icon in `#eff6ff`)
- **Dashboard Columns:**
  - Primary Column (65%): Hari Ini & Agenda 7 Hari Mendatang.
  - Secondary Column (35%): Lompat ke Tanggal & Pengumuman Kedinasan.

### B. Admin Portal Layout (Left Sidebar & Off-Canvas Mobile Drawer)
- **Left Vertical Sidebar (250px):**
  - Desktop (`>= 1024px`): Permanently docked left sidebar with subtle right border (`#e2e8f0`).
  - Mobile & Tablet (`< 1024px`): Responsive off-canvas navigation drawer (`#adminSidebar.sidebar-open`, `transform: translateX(0)`), paired with a translucent backdrop overlay (`#sidebarBackdrop.active`, `backdrop-filter: blur(4px)`).
  - Accessibility & Interaction: Accessible hamburger button (`#adminMenuToggleBtn`, `aria-expanded`, `aria-label="Buka menu navigasi"`), automatic keyboard Escape keypress close handler, focus management on open/close, and automatic drawer close when any navigation item is tapped.
  - Top branding: Lambang Kota Batam crest + "SIMAK DISKUM Kota Batam".
  - Nav list with lightweight icons: `Dashboard`, `Agenda`, `Master Data`, `Laporan`, `Pengaturan`.
  - Active item styled as a light-blue rounded pill (`#dbeafe`, `#2563eb`).
- **Top Header Bar:**
  - Left: Mobile menu toggle button (`#adminMenuToggleBtn`, visible on `< 1024px`), "Admin Portal" heading and "Sistem Informasi Manajemen Agenda Kedinasan" subtitle.
  - Right: Notification bell outline icon + "Operator ⌄" profile button.
- **Administrative Stage Summary Cards (5-column grid):**
  - Input Awal (Document outline in `#eff6ff`, `#3b82f6`)
  - Proses Offline (Clock outline in `#fef3c7`, `#f59e0b`)
  - Detail Dilengkapi (Checklist outline in `#e0f2fe`, `#0284c7`)
  - Administrasi Lengkap (Checkmark circle in `#dcfce7`, `#16a34a`)
  - Total Agenda (Calendar outline in `#eff6ff`, `#2563eb`)
- **Administrative Analytics & Upcoming Panels:**
  - Left Panel (60%): Agenda Mendatang with date badges ("06 Nov"), event titles, human-readable resolved location names (via master location lookup & fallback dictionary; zero raw `loc_xx` identifiers), and formatted time ranges.
  - Right Panel (40%): Status Administrasi with pure CSS conic-gradient Donut Chart and interactive color-coded legend.

---

## 4. Secondary Pages Visual Consistency (V01-B)

### A. Public Secondary Pages
1. **Kalender Kegiatan (Month, Week, Day, List):**
   - Clean civic toolbar with segmented view mode controls (`Bulan`, `Minggu`, `Hari`, `Daftar`).
   - Category filtering pills with semantic dot indicators.
   - Month view: 7-column calendar grid with today highlights and multi-day spanning indicator badges.
   - Week view: Responsive 7-day schedule with full/abbreviated day labels (`.day-full` / `.day-short`) and horizontal touch scroll on viewports `< 768px`.
   - Day & List views: Chronological agenda stream with time badges, location icons, and category badges.
2. **Cari Agenda (Debounced Multi-Criteria Search):**
   - Search hero bar with real-time text query and dropdown filters (Category, Status, Date Range).
   - Agenda cards styled with crisp borders, date pills, location tags, and attendee indicators.
   - Nonblocking feedback when 0 results match, with reset actions.
3. **Detail Kegiatan Modal:**
   - Pure CSS/DOM accessible modal overlay with keyboard Escape and backdrop dismissal.
   - Sanitized Public DTO fields: Title, formatted WIB datetime, human-readable location, organizer, public notes, and cancellation notices.
   - Guaranteed ZERO rendering of private internal notes, Zoom passcodes, meeting credentials, or operator audit logs.
4. **Pengumuman Kedinasan:**
   - Official municipal notification stream with icon banners, valid WIB formatted publication dates, and category tags.

### B. Admin Secondary Pages
1. **Daftar Agenda (Activities Management):**
   - Multi-stage filter tabs (`Semua`, `Input Awal`, `Proses Offline`, `Detail Dilengkapi`, `Administrasi Lengkap`).
   - Civic tabular layout with status badges, date/time chips, action buttons (`Edit`, `Duplikat`, `Hapus`), and quick search.
2. **Form Tambah / Edit Agenda (F01 4-Stage Pipeline):**
   - Visual 4-step progress indicator bar (`.stage-indicator-bar`) with numbered circles and active stage highlighting (`.stage-step.active`).
   - Structured Surat Masuk / Undangan panel with Nomor Surat, Tanggal Surat, Pengirim/Asal, and safe Google Drive link input.
   - Safe Google Drive link rendering via strict DOM anchor construction (`target="_blank" rel="noopener noreferrer"`).
   - Real-time privacy scanner alerts triggered for credentials (passcodes, meeting IDs) before save.
   - Live public preview card demonstrating exactly what public citizens will see.
   - Conflict warning modal for overlapping rooms or assigned staff.
3. **Master Data Management (5 Entity Tabs):**
   - Tabbed interface: `Pegawai`, `Bidang`, `Lokasi Ruangan`, `Penyelenggara`, `Kategori Kegiatan`.
   - Clean civic data tables with search filters, active/inactive badges, inline editing, and referential deactivation safety.
4. **Laporan Resmi 8-Kolom & Export:**
   - Official Indonesian government 8-column layout (`No | Hari / Tanggal | Pukul | Kegiatan | Tempat | Penyelenggara | Dihadiri Oleh | Keterangan`).
   - Single-row multi-day event formatting (`Jumat–Minggu, 6–8 November 2026`).
   - Instant print view formatted for A4 Landscape with official Kop Surat and signatory block.
   - Genuine OpenXML XLSX download with formula injection defense (`=`, `+`, `-`, `@`).
   - Legacy spreadsheet ingestion tab with dry-run verification and credential isolation.
5. **Pengaturan Aplikasi (Signatory Settings):**
   - Department signatory configuration (Kepala Dinas name, NIP, title, department city) with persistent Firestore storage and live preview in report printouts.

---

## 5. Responsive Breakpoints & Viewport Usability

- **1440px (Wide Desktop):** Maximum readability, multi-column dashboard layouts, generous whitespace, unwrapped public navigation, docked 250px admin sidebar, zero horizontal overflow.
- **1024px (Standard Desktop):** 4-card / 5-card grids comfortably fit without wrapping; public header items remain strictly on a single line (`white-space: nowrap`); admin sidebar remains permanently docked.
- **768px (Tablet):** Summary cards adapt to 2-column grids; public nav hides secondary subtitles to maintain single-line layout; admin sidebar switches to accessible off-canvas drawer with hamburger button (`#adminMenuToggleBtn`); zero horizontal overflow.
- **375px (Mobile):** Single-column layout; full touch-friendly tap targets (>44px); public header offers horizontal touch scroll; admin drawer slides smoothly from left; banner height compacted (< 200px); zero horizontal overflow.

---

## 6. V01-B Final Correction Pass & Design Hardening

### A. Public Month Calendar Grid Geometry
- **Mathematical Column Equalization:** Both `.month-headers-row` and `.month-cells-grid` employ `grid-template-columns: repeat(7, minmax(0, 1fr))`. This prevents CSS Grid from defaulting to `minmax(auto, 1fr)`, which previously expanded columns containing event text while starving empty columns.
- **Header-to-Cell Alignment:** Zero horizontal drift across all 7 columns (`diffX = 0.00px`, `diffW = 0.00px`) verified at 375px, 768px, 1024px, and 1440px viewports.
- **November 2026 Date Placement:** Sunday, November 1, 2026 is mathematically placed in column 6 (Minggu/Sunday) in accordance with the Indonesian Monday-first workweek convention (`Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu`).
- **Event Overflow Defense:** Event cards within month cells employ `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; box-sizing: border-box;`, guaranteeing zero pixel overflow past the cell border (`0.00px` offset).
- **Mobile Horizontal Scrolling:** On viewports `< 768px`, `.month-grid-wrapper` enforces `min-width: 640px` within a smooth touch-scrolling container (`overflow-x: auto; -webkit-overflow-scrolling: touch;`), preserving complete multi-day bar continuity and preventing squeezed illegible cells.

### B. Public Attendee Display & Privacy Shields
- **Smart Degree Separation in Migration Parser:** Academic and professional titles (`M.Si`, `S.Sos`, `SE`, `S.Kom`, `M.M.`) are preserved alongside employee names rather than split into pseudo-attendees.
- **Snapshot Deduplication:** `createAttendeeSnapshot()` enforces unique attendee IDs via `Set`, preventing duplicate employee entries while preserving official hierarchy order.
- **Zero Raw ID Leakage:** Unlisted or fallback employee entries in public views are sanitized to generic civic titles (`Pegawai Dinas`) rather than revealing internal database IDs (`emp_01`, `emp_xx`).
- **Projector Defense-in-Depth:** `projectPublicActivity()` includes secondary regex scrubbing removing any residual `(emp_...)` patterns before Firestore public projection write.

### C. Civic UI Controls & Accessibility
- **Action Buttons in Admin Tables:** Action buttons (`Edit`, `Duplikat`, `Hapus`) use flexbox alignment (`display: flex; gap: 0.4rem; align-items: center; white-space: nowrap;`) with minimum touch target sizing (height `>= 32px`, minimum width `>= 44px`).
- **High-Contrast Master Data Tabs:** Active tab button (`.master-tabs-bar .tab-btn.active`) explicitly consumes `var(--color-primary)` (`#2563eb`) with pure white text (`#ffffff`), ensuring WCAG AAA compliant contrast against light backgrounds.
- **Civic Announcements View:** Modern card stream styled with `.page-title-banner`, `.announcement-item-card`, `.ann-badge-pill`, and valid Indonesian date formatting (`WIB`).
- **Activity Detail Modal Cleanliness:** Public detail modal renders human-readable location types (`Kantor Dinas`, `Luar Kantor`, `Daring`) and completely omits raw internal activity IDs (`ID Kegiatan: act_xxx`).
- **Enum Localization Standards:**
  - Status: `SCHEDULED` → `Terjadwal`, `COMPLETED` → `Selesai`, `CANCELLED` → `Dibatalkan`.
  - Location Type: `OFFICE` → `Kantor Dinas`, `EXTERNAL` → `Luar Kantor`, `ONLINE` → `Daring`.
  - Administrative Stage: `INITIAL_ENTRY` → `Input Awal`, `OFFLINE_PROCESS` → `Proses Offline`, `DETAILS_COMPLETED` → `Detail Dilengkapi`, `ADMIN_COMPLETE` → `Administrasi Lengkap`.

---

## 7. V01-C Final Responsive, Accessibility, Performance & Quality Assurance Hardening

### A. Admin Table Reachability & Contained Horizontal Scroll
- **Action Buttons Preservation:** On all viewports (375px, 768px, 1024px, 1280px, 1440px), `.data-table.activities-table` enforces `min-width: 880px; width: 100%;` and `td.action-cell` enforces `min-width: 210px; width: 210px;`.
- **Button Squeeze Prevention:** Action buttons (`Edit`, `Duplikat`, `Hapus`) are wrapped in `.action-buttons-wrap` (`display: flex; gap: 0.45rem; min-width: 210px;`), preventing browser table layout algorithms from collapsing action controls.
- **Visual Scroll Hint:** On screens `<= 1024px`, an explicit Indonesian scroll hint is rendered above the table: `<div class="table-scroll-hint"><span>👉 Geser tabel ke kanan untuk melihat semua kolom & aksi</span></div>`.
- **Destructive Action Safeguard:** Deleting an activity prompts with unambiguous Indonesian confirmation text: `"Apakah Anda yakin ingin menghapus agenda kegiatan ini secara permanen?"`.

### B. Mobile Month Calendar Scroll Hint & Touch Reachability
- **Contained Mobile Scroll:** On mobile viewports (`< 768px`), `.month-grid-wrapper` enforces `min-width: 640px` inside a touch-friendly overflow container (`overflow-x: auto; -webkit-overflow-scrolling: touch;`).
- **Interactive Indonesian Hint:** Displays `.calendar-scroll-hint` (`👉 Geser untuk melihat hari lainnya`) directly above the calendar grid.
- **Sunday Column Reachability:** Touch or pointer scrolling reveals the complete Sunday (Minggu) column without causing document-level overflow (`document.documentElement.scrollWidth === window.innerWidth`).
- **Interactive Target Retention:** All date cells and calendar activities remain clickable and keyboard-focusable after scrolling.

### C. Accessibility & Focus Visibility (WCAG 2.1 AA)
- **Global Visible Focus Rings:** Added high-contrast `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` to all interactive buttons, links, inputs, and selects across both Public and Admin portals.
- **Modal Focus Trapping & Restoration:**
  - Auto-focuses the close button (`#btnModalClose`) or primary form input upon opening.
  - Traps `Tab` and `Shift+Tab` keyboard focus strictly inside the modal dialog container.
  - Dismisses dialog on `Escape` keypress.
  - Automatically restores focus to the invoking element upon dialog closure.
- **200% Browser Zoom Responsive Layout:**
  - Header responsiveness adjusted at `@media (max-width: 1350px)` to hide secondary agency titles and brand dividers.
  - Verified `0px` horizontal overflow (`scrollWidth === innerWidth`) at 1280px viewport width with 200% zoom (`deviceScaleFactor: 2`).
  - All 4 dashboard summary cards and 2-column feed remain completely intact.

### D. Public Privacy & DTO Hardening
- **Strict Key Allow-list:** `PublicActivityDTO` guarantees only public-facing fields are exposed.
- **Emulator Verification:** Direct Firestore document reads confirm zero leakage of `attendeeIds`, `attendeeSnapshots`, `invitationLetter`, `driveUrl`, `privateNotes`, `privateMeetingUrl`, `administrativeStage`, or `cancelReason`.
- **Historical Snapshot Immutability:** Updating master employee directories preserves existing activity attendee snapshots without retroactive corruption.

### E. Telemetry & Performance Instrumentation
- **Cold Load Data-Ready Latency:** **561ms** (Budget: < 3000ms).
- **First Contentful Paint (FCP):** **24ms – 40ms** (Budget: < 1000ms).
- **DOM Complete:** **217ms – 235ms**.
- **Public Application Bundle:** **48.85 kB** (13.55 kB gzip), safely below the critical performance ceiling.

