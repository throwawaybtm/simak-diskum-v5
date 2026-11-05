# SIMAK DISKUM v5.0 — Milestone P02 Pre-Activation Go / No-Go Checklist

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**System Version:** 5.0.0  
**Target Architecture:** Firebase Multi-site Web Applications (`public` & `admin`) on **Firebase Spark (Zero-Cost Plan, $0.00/month)**  
**Target Project:** `simakdiskum`  
**Milestone:** **P02-A Controlled Production Activation Planning**  
**Document Status:** P02-A PREFLIGHT VERIFICATION MATRIX — AWAITING STAKEHOLDER SIGN-OFF  

---

## 1. Executive Preflight Assessment

Before authorizing live production deployment to Google Cloud / Firebase project `simakdiskum`, all technical capabilities, administrative approvals, and operational risk boundaries must be verified against this checklist.

> [!CAUTION]
> **HONEST READINESS BOUNDARY:**  
> Excellent local emulator benchmarks (e.g. 76ms multi-month query response, 0.00px calendar grid drift) prove algorithmic and functional correctness under synthetic conditions. They do **NOT** guarantee real-world network latency across municipal Indonesian ISPs, cellular field conditions in Batam, or unmonitored client traffic spikes. Production readiness requires clear distinction between what has been proven locally versus what requires live validation.

---

## 2. Five-Category Go / No-Go Decision Matrix

```mermaid
pie title Production Readiness Breakdown (Verification Categories)
    "Verified Locally (Automated)": 45
    "Requires Department Approval": 20
    "Requires Live Activation": 15
    "Requires Real-World Testing": 10
    "Outstanding Operational Risk": 10
```

---

### Category 1: Verified Locally (Automated Tests & Local Emulators)
*Status: 100% PASSED in Local Development Environment.*

| Item # | Verification Check | Harness / Tool | Result | Evidence / Reference | Status |
|:---:|---|---|:---:|---|:---:|
| **1.1** | TypeScript compilation & linting | `tsc --noEmit` | Clean | Clean monorepo compile (`@department-agenda/shared`, `apps/*`) | **GO** |
| **1.2** | Automated Vitest test suite | `vitest run` | 208 / 208 Passed (100%) | 24 test files passing across all domain logic | **GO** |
| **1.3** | Live Firestore Security Rules | Real Firestore Emulator (`8080`) | 32 / 32 Passed | `tests/rules/firestore.rules.test.ts` | **GO** |
| **1.4** | Reversible Maintenance Lockdown Rules | Real Firestore Emulator (`8080`) | 6 / 6 Passed | `tests/rules/maintenanceRules.test.ts` (write freeze & Admin SDK bypass) | **GO** |
| **1.5** | Real-Emulator Operational Safety Scenarios | Real Firestore (`8080`) & Auth (`9099`) | 10 / 10 Passed | `tests/integration/p01bSafetyVerification.test.ts` | **GO** |
| **1.6** | Playwright Real-Browser Regression Suites | Chromium (`1280x800`) | 79 / 79 Passed (100%) | 99 verified screenshots in `tests/e2e/screenshots/` | **GO** |
| **1.7** | Resumable Restore Checkpoint Ledger | `scripts/backupRestore.mjs` | Verified | `restore-progress.json` bound to `manifestHash` and `operationId` | **GO** |
| **1.8** | Deep Firestore Equality Verification | `assertDeepFirestoreEquality` | Verified | Recursive equality across nested objects, arrays, Timestamps, and refs | **GO** |
| **1.9** | Audit History & Collision Immunity | `scripts/backupRestore.mjs` | Verified | Zero post-backup audit deletions; collision safe prefixing | **GO** |
| **1.10** | Production Master Data Seeding Safeguard | `templates/productionMasterDataTemplate.json` | Verified | Rejects unapproved templates and placeholder markers | **GO** |
| **1.11** | Zero Credential Logging Safeguard | `scripts/manageRoles.mjs` | Verified | Zero passwords or API keys printed to logs/stdout | **GO** |
| **1.12** | Production Vite Build Bundles | Vite + Rollup | Exit 0 | Public Shell: 13.67 kB gzip; Admin Shell: 4.70 kB gzip | **GO** |

---

### Category 2: Requires Department Approval (Civil Service Administrative Actions)
*Status: PENDING DEPARTMENT EXECUTION (Requires Live Personnel Input).*

| Item # | Approval Requirement | Required Deliverable / Action | Responsible Stakeholder | Gate Impact | Status |
|:---:|---|---|---|---|:---:|
| **2.1** | Official Head of Department Signatory Data | Decree (Surat Keputusan / SK) containing exact Name, NIP, Rank/Golongan, and Title | Kepala Dinas Koperasi dan Usaha Mikro | Blocks Gate 3 Seeding | **PENDING** |
| **2.2** | Official Employee Directory | Complete roster of active civil servants (PNS/PPPK) with verified NIPs | Kasubag Kepegawaian / Umum | Blocks Gate 3 Seeding | **PENDING** |
| **2.3** | Official Operator Email Accounts | List of designated email addresses under `@batam.go.id` for Admin and Editor roles | Administrator IT Dinas | Blocks Gate 2 Provisioning | **PENDING** |
| **2.4** | Official Department Locations & Stakeholders | Approved list of official meeting rooms, external venues, and regular organizers | Sekretaris Dinas | Blocks Gate 3 Seeding | **PENDING** |
| **2.5** | Google Drive Municipal Folder & IAM Policies | Municipal Google Drive folder created with `Anyone with the link can view` policy | Administrator IT Dinas | Affects Letter Attachments | **PENDING** |
| **2.6** | User Acceptance Testing (UAT) Sign-Off | Completed execution and signed acceptance of 11 formal business scenarios | Department Review Committee | Blocks Gate 9 Handover | **PENDING** |

---

### Category 3: Requires Live Activation (Google Cloud / Firebase Console)
*Status: PENDING LIVE EXECUTION (Scheduled for Milestone P02-B).*

| Item # | Activation Action | Console / CLI Step | Safety Guard | Reversible? | Status |
|:---:|---|---|---|:---:|:---:|
| **3.1** | Verify Project Ownership & Spark Tier | Open Firebase Console `simakdiskum` > Usage & billing | Confirm $0.00/mo Spark plan | Yes | **PENDING** |
| **3.2** | Enable Email/Password Provider | Authentication > Sign-in method > Email/Password | Passwordless link left disabled | Yes | **PENDING** |
| **3.3** | Disable Public Self-Registration | Authentication > Settings > User actions | Uncheck "Enable create (sign-up)" | Yes | **PENDING** |
| **3.4** | Deploy Firestore Compound Indexes | `firebase deploy --only firestore:indexes --project simakdiskum` | Wait for status `Enabled` | Yes | **PENDING** |
| **3.5** | Deploy Firestore Security Rules | `firebase deploy --only firestore:rules --project simakdiskum` | Verify rules history in console | Yes | **PENDING** |
| **3.6** | Deploy Hosting Sites (`public` & `admin`) | `firebase deploy --only hosting:public,hosting:admin --project simakdiskum` | 1-click console rollback ready | Yes | **PENDING** |

---

### Category 4: Requires Real-World Testing (Field & Network Validation)
*Status: PENDING POST-DEPLOYMENT SMOKE TESTING.*

| Item # | Real-World Aspect | Testing Method | Acceptance Criteria | Responsible Role | Status |
|:---:|---|---|---|---|:---:|
| **4.1** | Municipal Network Latency | Test from Batam Government Office network (`Diskominfo Batam` / `DISKUM LAN`) | Cold page load < 2.5s; warm load < 500ms | Field QA Tester | **PENDING** |
| **4.2** | Low-End Mobile Performance | Test on low-spec Android devices (Chrome / Opera Mini) on 3G/4G cellular | Smooth month calendar touch scroll; zero UI freeze | Field QA Tester | **PENDING** |
| **4.3** | Out-of-Band Password Delivery | Transmit generated reset link via official municipal WhatsApp / memo | Operator successfully sets private password | System Admin | **PENDING** |
| **4.4** | External Google Drive Attachment Access | Open invitation letter link from public and admin views | PDF renders in new tab without credential prompt | Agenda Operator | **PENDING** |
| **4.5** | Multi-Device Concurrency Smoke Test | 2 operators edit different activities simultaneously | Optimistic version lockstep functions with zero data loss | Lead Engineer | **PENDING** |

---

### Category 5: Outstanding Operational Risks & Mitigation Strategies

| Risk # | Description of Risk | Probability | Impact | Mitigation Strategy Implemented in v5.0 | Residual Risk |
|:---:|---|:---:|:---:|---|:---:|
| **5.1** | **Firestore 50k Reads Daily Quota Spike:** Citizen traffic spike during municipal festival or press conference could exhaust daily free read quota. | Medium | Medium | Aggressive HTTP caching on static assets; warm HTTP 304 (<3 kB); date-range indexed queries (<30 reads/view); graceful Indonesian HTTP 429 quota notice modal without crashing application shell. Quota resets daily at 15:00 WIB PST / 14:00 WIB PDT. | **LOW** |
| **5.2** | **Lack of Outbound SMTP on Spark Free Plan:** Firebase cannot send automated password reset emails directly to citizen/operator inboxes on Spark plan without external SMTP relays. | High | Low | Handled securely via Admin SDK CLI (`manageRoles.mjs reset-password`). System Administrator generates one-time links and delivers them out-of-band via official government memo/WhatsApp. | **MINIMAL** |
| **5.3** | **Multi-Batch Restoration Non-Atomicity:** In disaster recovery, network disconnection between 450-doc batches could leave database partially restored. | Low | High | Cryptographically bound checkpoint ledger (`restore-progress.json`) tracks completed batches. Operator safely resumes with `--resume` without re-writing committed batches. Merge mode is strictly prohibited after failed restore. | **MINIMAL** |
| **5.4** | **Browser Architecture Audit Trail Boundary:** Authorized Admin directly executing raw client SDK calls could hypothetically modify master data without writing audit logs. | Very Low | Low | Enforced in UI workflows; Firestore security rules mandate server timestamps (`request.time`) and authenticated operator ID match on all activity transactions. Documented as honest boundary of serverless browser-only architecture. | **LOW** |
| **5.5** | **Maintenance Rules Permanent Lockout on Disconnect:** Operator deploying maintenance rules loses power or internet connectivity. | Low | Medium | Read access is preserved (`allow read: if true`) so citizens see no crashes; maintenance rules are completely reversible via 1-click restore in Firebase Console from any mobile or desktop device; emergency CLI command documented. | **MINIMAL** |

---

## 3. Formal Go / No-Go Decision Gate Table

| Gate | Phase | Decision | Condition Required for "GO" | Stakeholder Sign-Off |
|:---:|---|:---:|---|---|
| **Gate 0** | Pre-Activation Admin Verification | **READY FOR GO** | Project `simakdiskum` verified on Spark plan; 2 Hosting sites confirmed | Lead Systems Architect |
| **Gate 1** | Auth Config & Signup Restriction | **READY FOR GO** | "Enable create (sign-up)" toggle unchecked in Firebase Console | Project Owner |
| **Gate 2** | Operator Role Provisioning | **HOLD (PENDING DATA)** | Awaiting official operator email roster signed by Department Head | Department Head |
| **Gate 3** | Master Data Seeding | **HOLD (PENDING DATA)** | Awaiting signed decree (SK) for Signatory, Employees, and Locations | Department Head |
| **Gate 4** | Maintenance Lockdown | **READY FOR GO** | Maintenance rules verified locally (6/6 tests passed) | Lead Systems Architect |
| **Gate 5** | Rules & Indexes Deployment | **READY FOR GO** | Rules (32 tests passed); Indexes syntax verified | Lead Systems Architect |
| **Gate 6** | Multi-Site Hosting Deployment | **READY FOR GO** | Build clean (Public 13.67 kB gzip, Admin 4.70 kB gzip) | Release Manager |
| **Gate 7** | Live Post-Deployment Smoke Audit | **STANDBY** | To be executed immediately following Gate 6 deployment | QA Engineer |
| **Gate 8** | Department UAT Execution | **STANDBY** | To be conducted with authorized department personnel | Department Stakeholders |
| **Gate 9** | Production Handover | **STANDBY** | Final sign-off after successful UAT completion | Kepala Dinas Koperasi & UKM |

---

## 4. Final Recommendation

**CURRENT STATUS: CONDITIONAL GO (HOLD AT P02-A CHECKPOINT)**

The SIMAK DISKUM v5.0 software artifacts, build pipelines, database security rules, reversible maintenance rules, and administrative CLIs are **100% technically verified and ready for production deployment**.

However, live activation must **REMAIN ON HOLD** until the Dinas Koperasi dan Usaha Mikro Kota Batam provides the official civil service decree (SK) for the Signatory profile and the verified list of authorized operator email accounts.

**DO NOT EXECUTE `firebase deploy` OR CREATE LIVE USERS UNTIL ALL PENDING CATEGORY 2 REQUIREMENTS ARE SIGNED.**
