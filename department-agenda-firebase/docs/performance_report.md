# Department Activity Scheduling System v5.0
## Performance Instrumentation & Staging Readiness Report (Task 8)

**Date of Execution:** 2026-11-04T08:12:30.690Z  
**Target Environment:** Firebase Emulator Suite (`:8080`, `:3000`, `:3001`)  
**Project ID:** `simakdiskum`  
**Hosting Multi-Site Targets:**
- Public Portal: `simakdiskum` (`apps/public/dist`)
- Administrative Portal: `simakdiskum-admin` (`apps/admin/dist`)

---

## 1. Executive Performance Summary

| Metric | Target | Desktop Cold | Desktop Warm | Mobile (Throttled) | Compliance Status |
|---|:---:|:---:|:---:|:---:|:---:|
| **First Contentful Paint (FCP)** | < 1,500 ms | **44 ms** | **28 ms** | **612 ms** | ✅ **Passed (Good)** |
| **Largest Contentful Paint (LCP)** | < 2,500 ms | **44 ms** | **28 ms** | **612 ms** | ✅ **Passed (Good)** |
| **Cumulative Layout Shift (CLS)** | < 0.10 | **0** | **0** | **0** | ✅ **Passed (Zero Jitter)** |
| **Shell Render Latency** | < 100 ms | **2 ms** | **1 ms** | **1 ms** | ✅ **Passed (Instant Shell)** |
| **Firestore Data-Visible Latency** | < 1,000 ms | **154 ms** | **106 ms** | **562 ms** | ✅ **Passed (Optimized Query)** |
| **Initial Critical Path JS (Gzip)** | < 150 KB | **11.94 KB gzip** | **Cached** | **11.94 KB gzip** | ✅ **Passed (Well Under Budget)** |

---

## 2. Timing Breakdown: Shell vs. Data-Visible Latency

A critical architectural distinction verified in Task 8 is the complete separation of **Shell Rendering** from **Asynchronous Firestore Data Resolution**:

```
Navigation Start (0 ms)
      │
      ├──> HTML Parsed & CSS Loaded
      │
      ├──> Shell Render (2 ms) ──> [FCP Triggered, Header, Skeletons & Navigation Ready]
      │
      ├──> Firestore Query Executed (startDate <= visibleEnd && endDate >= visibleStart)
      │
      └──> Data-Visible Latency (154 ms) ──> [30 Activities Rendered in DOM]
```

- **Shell Render Latency:** Occurs in **2 ms** on desktop and **1 ms** on mobile, immediately establishing visual structure and brand presence.
- **Data-Visible Latency:** The full query across 35 realistic November 2026 activities resolves and renders in **154 ms** (Desktop) and **562 ms** (Mobile under simulated 100ms latency / 1.6 Mbps download).

---

## 3. Network Payload & Asset Optimization

Through manual chunking and dynamic subpath module loading:
- **Public Entry JS:** `index-COQOxydy.js` is **41.16 KB** (**11.94 KB gzip**), far below the 150 KB budget.
- **Public Vendor JS:** `firebase-vendor-Dup0lvXz.js` is **871.46 KB** (225.69 KB gzip).
- **Public Heavy Tools:** `exceljs-vendor-d3DOtdTa.js` is **952.28 KB** (275.52 KB gzip), completely isolated from the critical initial load and lazy-loaded only when the user requests an Excel download.
- **Admin Entry JS:** `index-DP6CE8aB.js` is **9.48 KB** (**3.63 KB gzip**). All routes (`SettingsPage`, `ReportsPage`, `MasterDataPage`, `ActivityEditWorkflow`) are lazy-loaded upon navigation.

---

## 4. Query Efficiency & Billed Read Observations

- **Fundamental Range Condition:** `startDate <= visibleEnd && endDate >= visibleStart` evaluates cleanly against composite index `publicActivities (startDate ASC, endDate ASC)`.
- **Read Count:** In a monthly calendar or dashboard load, exactly **30** documents were fetched from Firestore. No over-fetching or unbounded pagination occurs.
- **Index Entry Overhead:** Evaluated client-side as exact document snapshots; backend index evaluations are handled by Cloud Firestore Standard Edition within free quota.

---

## 5. Verification Artifacts & Visuals

- Desktop Cold Profile: `tests/e2e/screenshots/perf_01_desktop_cold.png`
- Desktop Warm Profile: `tests/e2e/screenshots/perf_02_desktop_warm.png`
- Mobile Throttled Profile: `tests/e2e/screenshots/perf_03_mobile_throttled.png`
- Admin Settings Signatory Profile: `tests/e2e/screenshots/perf_04_admin_settings.png`