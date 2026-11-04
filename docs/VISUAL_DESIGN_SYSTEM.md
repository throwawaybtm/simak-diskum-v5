# SIMAK DISKUM v5.0 — Visual Design System (V01-A)

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Target Architecture:** Firebase Multi-site Web Applications (`public` & `admin`)  
**Design Authority:** Approved Minimalist Dual-Portal Reference (`docs/design/reference-approved.png`)  
**Status:** Phase A — Design System and Dashboard Prototypes Implemented  

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
- **Top Header:** Full-width white bar with container (`max-width: 1240px`).
  - Left: Lambang Kota Batam crest (`batam-emblem.png`, 32px), "SIMAK DISKUM Kota Batam", vertical divider, and official agency subtitle.
  - Center: Horizontal navigation links with pill highlights (`Beranda`, `Kalender Kegiatan`, `Cari Agenda`, `Pengumuman`).
  - Right: Quick search pill input ("Cari agenda...") and WIB operational timezone indicator.
- **Hero Welcome Banner:** Wide card (`border-radius: 16px`) with Barelang Bridge scenic photography, left-to-right soft gradient overlay, vertical accent indicator line, and official welcome message.
- **Summary Cards (4-column grid):**
  - Agenda Hari Ini (Calendar outline icon in `#eff6ff`)
  - Agenda Minggu Ini (Calendar outline icon in `#eff6ff`)
  - Agenda Bulan Ini (Calendar outline icon in `#eff6ff`)
  - Total Agenda (Layers/stack outline icon in `#eff6ff`)
- **Dashboard Columns:**
  - Primary Column (65%): Hari Ini & Agenda 7 Hari Mendatang.
  - Secondary Column (35%): Lompat ke Tanggal & Pengumuman Kedinasan.

### B. Admin Portal Layout (Left Sidebar)
- **Left Vertical Sidebar (250px):**
  - White surface with subtle right border (`#e2e8f0`).
  - Top branding: Lambang Kota Batam crest + "SIMAK DISKUM Kota Batam".
  - Nav list with lightweight icons: `Dashboard`, `Agenda`, `Master Data`, `Laporan`, `Pengaturan`.
  - Active item styled as a light-blue rounded pill (`#dbeafe`, `#2563eb`).
- **Top Header Bar:**
  - Left: "Admin Portal" heading and "Sistem Informasi Manajemen Agenda Kedinasan" subtitle.
  - Right: Notification bell outline icon + "Operator ⌄" profile button.
- **Administrative Stage Summary Cards (5-column grid):**
  - Input Awal (Document outline in `#eff6ff`, `#3b82f6`)
  - Proses Offline (Clock outline in `#fef3c7`, `#f59e0b`)
  - Detail Dilengkapi (Checklist outline in `#e0f2fe`, `#0284c7`)
  - Administrasi Lengkap (Checkmark circle in `#dcfce7`, `#16a34a`)
  - Total Agenda (Calendar outline in `#eff6ff`, `#2563eb`)
- **Administrative Analytics & Upcoming Panels:**
  - Left Panel (60%): Agenda Mendatang with date badges ("06 Nov"), event titles, locations, and time ranges.
  - Right Panel (40%): Status Administrasi with pure CSS conic-gradient Donut Chart and interactive color-coded legend.

---

## 4. Responsive Breakpoints & Viewport Usability

- **1440px (Wide Desktop):** Maximum readability, multi-column dashboard layouts, generous whitespace.
- **1024px (Standard Desktop):** 4-card / 5-card grids comfortably fit without wrapping; sidebar fixed at 250px.
- **768px (Tablet):** Summary cards adapt to 2-column grids; sidebar collapses gracefully or scales; public horizontal menu wraps cleanly.
- **375px (Mobile):** Single-column layout; full touch-friendly tap targets (>44px); header controls stack logically without horizontal overflow.
