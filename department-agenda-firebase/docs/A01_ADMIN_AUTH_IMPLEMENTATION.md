# SIMAK DISKUM v5.0 — Milestone A01 Admin Authentication UI & RBAC Verification Report

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**System Version:** 5.0.0  
**Target Environment:** Local Development & Firebase Emulator Suite  
**Milestone:** **A01 — Admin Authentication UI, Protected Application Bootstrap & Local Security Verification**  
**Document Status:** COMPLETED, AUDITED & LOCALLY VERIFIED  
**Date:** November 5, 2026  

---

## 1. Executive Summary

Milestone A01 was authorized following the pre-production readiness audit of Milestone P02-A, which identified a critical architectural gap: the Admin Portal (`apps/admin/`) previously mounted the administrative dashboard shell directly upon page load without an interactive Firebase Authentication login gate or password recovery interface. Under Gate 5A production Cloud Firestore Security Rules, unauthenticated operations are strictly denied (`PERMISSION_DENIED`).

In Milestone A01, a production-grade, secure, and accessible administrative authentication architecture was designed, implemented, and verified locally against real Firebase Auth (`127.0.0.1:9099`) and Cloud Firestore (`127.0.0.1:8080`) emulators.

> [!IMPORTANT]
> **LOCAL DEVELOPMENT & TESTING BOUNDARY:**  
> All development, authentication provisioning, and verification activities were executed strictly in the local emulator environment (`demo-department-agenda`).  
> Zero live cloud deployments were executed (`firebase deploy` was NOT run).  
> Zero live accounts were created in Google Cloud Identity.  
> Zero live Firestore rules or production documents were modified.  
> The Firebase Spark ($0.00/month) plan architecture remains strictly preserved.

---

## 2. Architectural Gap Analysis & Root Cause

Before Milestone A01, inspection of `apps/admin/src/main.ts` and `apps/admin/src/firebase.ts` revealed three fundamental authentication gaps:

1. **Unprotected DOMContentLoaded Initialization:**  
   `main.ts` previously executed `await loadMasterData()` and `await router()` immediately upon DOM load. While permissible in permissive local emulator rules, this caused unauthenticated clients in production to attempt reads on private collections (`activities`, `locations`, `organizers`, `employees`, `departments`), triggering `PERMISSION_DENIED` errors and exposing empty dashboards.
2. **Missing Firebase Client Auth SDK:**  
   `apps/admin/src/firebase.ts` only initialized `getFirestore` and lacked `getAuth`, `connectAuthEmulator`, and session persistence configuration.
3. **Static Operator Pill & Absence of Session Termination:**  
   The admin topbar contained a static HTML pill with hardcoded text ("Operator") without dynamic claims introspection, user email display, role badge, or functional sign-out capability.

---

## 3. Implemented Authentication Architecture

### 3.1 Six-State RBAC State Machine

The client application bootstrap in `apps/admin/src/main.ts` now enforces a deterministic six-state machine driven by `subscribeAuthState` in `apps/admin/src/auth/authService.ts`:

```
               [ Page Load / Bootstrap ]
                           │
                           ▼
                  ┌────────────────┐
                  │  AUTH_LOADING  │  ◄── (Clean loading shell; zero Firestore reads)
                  └───────┬────────┘
                          │
         ┌────────────────┼────────────────┐
         │ (No User)      │ (Valid Token)  │ (Token Error)
         ▼                ▼                ▼
  ┌──────────────┐  [Claims Check]   ┌──────────────┐
  │  SIGNED_OUT  │        │          │  AUTH_ERROR  │
  └──────────────┘        │          └──────────────┘
         │                ├────────────────────────┐
         │                │ role == 'admin'        │ role == 'editor'
         │                ▼                        ▼
         │       ┌──────────────────┐    ┌───────────────────┐
         │       │AUTHENTICATED_ADMN│    │AUTHENTICATED_EDTR │
         │       └────────┬─────────┘    └─────────┬─────────┘
         │                │                        │
         │                └───────────┬────────────┘
         │                            ▼
         │             ┌──────────────────────────────┐
         │             │ Mount Admin Shell, Topbar,   │
         │             │ Fetch Master Data & Activities│
         │             └──────────────────────────────┘
         │
         │ (User Authenticated but role != 'admin' && role != 'editor')
         ▼
  ┌───────────────┐
  │ ACCESS_DENIED │  ◄── (Strict quarantine: user email, role status, logout CTA)
  └───────────────┘
```

1. **`AUTH_LOADING`:** Displays a minimal civic loading spinner (`.auth-loading-screen`). Crucially, **zero private Firestore queries** are dispatched while resolving credentials.
2. **`SIGNED_OUT`:** Mounts the Batam civic Operator Login form (`renderLoginPage`). Clears all cached in-memory master data and unmounts the admin shell.
3. **`AUTHENTICATED_ADMIN`:** Verifies custom claim `{ role: 'admin' }`. Mounts the full administrative shell, injects the operator profile pill with `Administrator` badge, loads master data, and executes the router.
4. **`AUTHENTICATED_EDITOR`:** Verifies custom claim `{ role: 'editor' }`. Mounts the administrative shell with `Operator Agenda` badge and restricts write actions according to Gate 5A rules.
5. **`ACCESS_DENIED`:** If an authenticated user lacks custom claims or holds an unrecognized role (e.g. public user, uppercase `'ADMIN'`), they are quarantined in the Access Denied view (`renderAccessDeniedPage`). No administrative data is fetched.
6. **`AUTH_ERROR`:** Handles unexpected token resolution errors with a user-friendly Indonesian alert prompting the operator to sign in again.

---

## 4. Civic User Interfaces & Accessibility

All authentication screens adhere strictly to the approved minimalist civic design system (`docs/VISUAL_DESIGN_SYSTEM.md` and `docs/design/reference-approved.png`):

### 4.1 Operator Sign-In Interface
- **Branding:** Displays the official Coat of Arms of Kota Batam (`/batam-emblem.png`), system title `SIMAK DISKUM Kota Batam`, and civic badge `Admin Portal — Masuk Operator`.
- **Inputs:** Email address (`autocomplete="username"`) and Password (`autocomplete="current-password"`).
- **Password Visibility Toggle:** Interactive eye icon button toggling `type="password"` and `type="text"`, complete with screen-reader friendly `aria-label` updates ("Tampilkan kata sandi" / "Sembunyikan kata sandi").
- **Error Presentation:** Prominent alert banner (`.auth-alert-error`) with role alert semantics (`role="alert"`, `aria-live="assertive"`).
- **Anti-Enumeration Protection:** Submitting invalid passwords or non-registered emails displays the exact same non-enumerating message:  
  *“Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.”*
- **Regulatory Notice:** Explicit footer reminder stating that registration is restricted to official department personnel and self-signup is disabled.

### 4.2 Password Recovery Interface
- **Access:** Direct text button `Lupa Kata Sandi?` on the login form.
- **Workflow:** Clean single-input form requesting the operator's official email address.
- **Anti-Enumeration Defense:** Regardless of whether the submitted email exists in Firebase Authentication, the UI returns an identical neutral success confirmation:  
  *“Jika alamat email terdaftar pada sistem SIMAK DISKUM, instruksi dan tautan pemulihan kata sandi telah dikirimkan ke email tersebut.”*
- **Navigation:** Prominent `← Kembali ke Halaman Masuk` secondary button returning cleanly to the login view.
- **Spark Quota Documentation:** Informs the user that password reset emails are delivered via Firebase native mailer under the Spark tier quota (150 emails/day).

### 4.3 Access Denied & Session Isolation Interface
- **Isolation:** Triggered when an authenticated Google Identity user lacks valid role claims.
- **Visual Presentation:** Red shield/lock icon, warning badge `Akun Tidak Memiliki Izin Operasional`, and metadata box showing the authenticated email, role status (`Tidak Memiliki Hak Akses`), and database authority (`Cloud Firestore Security Rules (Strict Deny)`).
- **Action:** A prominent `Keluar dari Akun Ini (Sign Out)` button cleanly terminates the session and returns the browser to the login screen.

### 4.4 Topbar Operator Profile Pill & Dropdown
- **Trigger:** Interactive profile pill in the administrative topbar displaying the operator's name and chevron.
- **Dropdown Menu:** Accessible popup menu (`role="menu"`, `aria-haspopup="true"`) displaying:
  - Operator full name (`displayName` from Firebase Auth token).
  - Operator email address.
  - Role pill badge (`Administrator` in civic blue vs. `Operator Agenda` in emerald green).
  - Action button: `Keluar (Sign Out)` with logout icon.
- **Accessibility:** Closes automatically on `Escape` key press, clicking outside the menu, or keyboard navigation.

---

## 5. Security Invariants & Defensive Implementations

| Security Invariant | Implementation Mechanism | Verification Result |
|---|---|:---:|
| **Zero Pre-Auth Reads** | `loadMasterData()` and `loadActivities()` return immediately if `currentAuthState` is not authenticated. | **VERIFIED** (0 network reads detected during anonymous visit) |
| **Strict Lowercase Roles** | `resolveUserProfile()` checks strictly `rawRole === 'admin'` and `rawRole === 'editor'`. Uppercase `'ADMIN'` or `'EDITOR'` evaluates to `ACCESS_DENIED`. | **VERIFIED** (100% compliant with Gate 5A `firestore.rules`) |
| **Anti-Account Enumeration** | `signInOperator()` and `requestPasswordReset()` normalize error codes (`auth/user-not-found`, `auth/wrong-password`) to uniform messages. | **VERIFIED** (Zero discrepancy in response messages) |
| **Session Persistence** | `setPersistence(auth, browserLocalPersistence)` maintains operator state across page refreshes. | **VERIFIED** (Session persists without re-prompt) |
| **Complete Cache Wiping** | `clearAdministrativeSession()` wipes `masterLocations`, `masterOrganizers`, `cachedActivities`, and lookup maps on sign-out. | **VERIFIED** (Zero state leaks across user switches) |
| **Disabled Account Handling** | Firebase Auth `auth/user-disabled` error code maps to informative Indonesian lock notice. | **VERIFIED** (Disabled accounts rejected immediately) |

---

## 6. Comprehensive Verification Evidence

### 6.1 Unit & Integration Test Suite (Vitest)
A dedicated integration test suite (`tests/integration/adminAuthService.test.ts`) was executed against the running Firebase Auth Emulator:

- **Total Test Files:** 26 passed (26)
- **Total Tests:** **233 passed (233)**
- **A01 Service Tests:** **19 passed (19)**:
  1. Accepts standard civic and governmental email formats (`@batam.go.id`).
  2. Rejects invalid email formats and empty inputs.
  3. Evaluates `role: "admin"` to `AUTHENTICATED_ADMIN` with `Administrator` label.
  4. Evaluates `role: "editor"` to `AUTHENTICATED_EDITOR` with `Operator Agenda` label.
  5. Evaluates uppercase `"ADMIN"` to `ACCESS_DENIED`.
  6. Evaluates missing custom claims to `ACCESS_DENIED`.
  7. Validates empty email before network call.
  8. Validates invalid email format before network call.
  9. Validates empty password before network call.
  10. Returns non-enumerating error for invalid password.
  11. Returns non-enumerating error for non-existent user.
  12. Returns descriptive lock message for disabled accounts.
  13. Successfully authenticates Admin and verifies token claims.
  14. Successfully authenticates Editor and verifies token claims.
  15. Authenticates unprivileged user and confirms `ACCESS_DENIED` state.
  16. Validates empty email on password reset.
  17. Validates invalid email format on password reset.
  18. Returns neutral success message for registered email.
  19. Returns identical neutral message for non-registered email.

### 6.2 Real-Browser End-to-End Suite (Playwright)
A full-browser verification suite (`tests/e2e/adminAuthVerification.mjs`) was executed across Desktop (1440px) and Mobile (375px) viewports:

- **Total Scenarios:** **34 passed / 34 total (100%)**
- **Captured Visual Screenshots:**
  1. `a01-login-1440px.png` (Desktop Operator Sign-In Form)
  2. `a01-login-375px.png` (Mobile Operator Sign-In Form)
  3. `a01-invalid-creds-1440px.png` (Desktop Invalid Credentials Alert)
  4. `a01-invalid-creds-375px.png` (Mobile Invalid Credentials Alert)
  5. `a01-recovery-1440px.png` (Desktop Password Recovery Form with Neutral Alert)
  6. `a01-recovery-375px.png` (Mobile Password Recovery Form)
  7. `a01-access-denied-1440px.png` (Desktop Access Denied View)
  8. `a01-access-denied-375px.png` (Mobile Access Denied View)
  9. `a01-dashboard-1440px.png` (Desktop Authenticated Dashboard with Operator Pill & 5 Stage Cards)
  10. `a01-dashboard-375px.png` (Mobile Authenticated Dashboard with Responsive Topbar)
- **Public Portal Check:** Confirmed `http://localhost:3000` remains completely functional with zero visual or runtime regressions.

### 6.3 Production Bundle Compilation
Clean production build executed via Vite and Rollup:
- Public Application Bundle: **13.67 kB gzip**
- Admin Application Bundle: **10.23 kB gzip**
- Zero TypeScript diagnostics or compilation errors (`tsc --noEmit` clean).

---

## 7. Status of Production Preflight Blockers

With the completion and verification of Milestone A01, the status of outstanding preflight blockers has evolved:

| Blocker # | Description | Previous Status | Current Status | Notes |
|:---:|---|:---:|:---:|---|
| **Blocker 1** | **Official Civil Service Deliverables:** Signed SK from Kepala Dinas, employee directory, and approved operator email roster. | PENDING | **PENDING** | Civil service administrative action (Department Stakeholders). |
| **Blocker 2** | **Client-Side Admin Login & Password Recovery UI:** Implementation of authenticated bootstrap, login form, and password recovery. | **BLOCKER** | **RESOLVED** | **100% implemented, tested (233 Vitest + 34 E2E scenarios), and verified in Milestone A01.** |
| **Blocker 3** | **Dual-Operator Live Authorization:** Formal human authorization to proceed with live cloud deployment gates. | PENDING | **PENDING** | Department Head and Project Owner authorization required. |

---

## 8. Milestone A01 Sign-Off Checkpoint

- **Milestone A01 Status:** **COMPLETED & APPROVED FOR HANDOFF**
- **Next Milestone:** Milestone P02-B (Controlled Production Activation) remains **ON HOLD** pending Blocker 1 and Blocker 3 resolution.
- **Handoff Target:** A01 Admin Authentication Review Checkpoint.
