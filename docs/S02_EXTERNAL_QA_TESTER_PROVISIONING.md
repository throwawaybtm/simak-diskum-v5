# SIMAK DISKUM v5.0 — S02 Temporary External QA Tester Account Provisioning

**System:** SIMAK DISKUM v5.0 (Sistem Informasi Manajemen Agenda Kedinasan)  
**Intended Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Target Environment:** Firebase Cloud Staging (`simakdiskum-staging`)  
**Protected Production:** `simakdiskum` (Strictly Protected; Zero Mutations)  
**Date:** 6 November 2026  
**Status:** PREFLIGHT COMPLETE — PENDING OWNER APPROVAL  
**Current Stop Condition:** `S02 TESTER ACCOUNT — OWNER APPROVAL REQUIRED`  

---

## 1. Preflight Inspection Results

### Target Environment & Identity Isolation
- **Target Firebase Project:** `simakdiskum-staging`
- **Protected Production Project:** `simakdiskum` (untouched, 0 writes, 0 deploys)
- **Firebase CLI Target Mapping:** `.firebaserc` confirms separate staging targets (`simakdiskum-staging` and `simakdiskum-staging-admin`).
- **Application Default Credentials (ADC):** Verified operational with live Google Cloud for `simakdiskum-staging`.
- **Public Self-Registration:** Disabled in Firebase Authentication. End-users cannot register accounts.
- **Console / GCP IAM Access:** No Google Cloud IAM or Firebase Console roles are requested or will be granted. The tester receives strictly application-level custom claims.

### Existing User Lookups (`simakdiskum-staging`)
1. **Target External QA Tester Account:**
   - Email: `aseppbukga@gmail.com`
   - Lookup Result: `auth/user-not-found`
   - Existence Status: **DOES NOT EXIST** (Safe to provision upon explicit owner approval).
2. **Primary Owner Administrator Account:**
   - Email: `riyanbwirawanto@gmail.com`
   - UID: `31Bin8ErtBaAy3YODaf1SKKymYb2`
   - Display Name: `Administrator Staging`
   - Status: `disabled: false`, `emailVerified: true`
   - Role Claim: `{ "role": "admin", "department": "Dinas Koperasi dan Usaha Mikro Kota Batam" }`
   - Impact: **Completely separate, preserved, and unaffected**.

---

## 2. Proposed Mutation Plan

| Parameter | Specification |
|---|---|
| **Target Project ID** | `simakdiskum-staging` |
| **Target Email** | `aseppbukga@gmail.com` |
| **Display Name** | `Asep — QA Tester` |
| **Application Role** | `admin` (`{ "role": "admin", "department": "Dinas Koperasi dan Usaha Mikro Kota Batam" }`) |
| **Account Status** | `enabled` (`disabled: false`, `emailVerified: true`) |
| **Account Type** | Temporary External QA Tester (Application Level Only) |
| **Initial Password** | Secure high-entropy cryptographic random bytes (never printed or saved) |
| **Setup Link Handling** | `--suppress-link` enforced to ensure zero credential or token leakage to logs |
| **Exact CLI Operation** | `node scripts/manageRoles.mjs provision aseppbukga@gmail.com "Asep — QA Tester" admin --target=staging --suppress-link` |

---

## 3. Password Setup & Delivery Analysis

Firebase Admin SDK `generatePasswordResetLink()` creates a URL string on the server but **does NOT dispatch an automated email**. To ensure zero plaintext password handling and zero URL leakage in chat/logs:

### Approved Delivery Routes:
1. **Route 1 (Recommended — Native Self-Service via Staging Web Portal):**
   - Once the account is created, the tester visits the live staging Admin Portal:  
     `https://simakdiskum-staging-admin.web.app`
   - On the login card, clicks **"Lupa Password?"**.
   - Enters `aseppbukga@gmail.com` and clicks **"Kirim Tautan Pemulihan"**.
   - Firebase Client SDK invokes `sendPasswordResetEmail`, which triggers Google's native email delivery directly to the tester's inbox (covered under Firebase Spark free tier up to 150 emails/day).
   - The tester sets their own private password directly through the Google-hosted identity flow.

2. **Route 2 (Owner-Triggered via Firebase Console):**
   - The project owner navigates to Firebase Console > `simakdiskum-staging` > Authentication > Users.
   - Locates `aseppbukga@gmail.com`, clicks the three dots (`⋮`), and selects **"Reset password"**.
   - Firebase immediately dispatches the native password reset email to `aseppbukga@gmail.com`.

3. **Route 3 (Confidential Out-of-Band Delivery):**
   - If the tester cannot receive native emails, the project owner can generate the link on their private CLI (`node scripts/manageRoles.mjs reset-password aseppbukga@gmail.com --target=staging`) and deliver the link directly to the tester via private messaging without logging.

---

## 4. Planned Account Revocation & De-Provisioning Procedure

Once QA testing concludes, the owner can completely revoke tester access:

1. **Step 1: Downgrade / Remove Application Role:**
   ```bash
   node scripts/manageRoles.mjs set-role aseppbukga@gmail.com editor --target=staging
   ```
2. **Step 2: Disable Account & Revoke Refresh Tokens:**
   ```bash
   node scripts/manageRoles.mjs disable aseppbukga@gmail.com --target=staging
   ```
   - Sets `disabled: true` in Firebase Authentication.
   - Invokes `auth.revokeRefreshTokens(user.uid)`, immediately blocking the issuance of new ID tokens.
3. **Step 3: Verification:**
   - Execute `node scripts/manageRoles.mjs inspect aseppbukga@gmail.com --target=staging`.
   - Confirm `Disabled: true` and `Tokens Revoked` timestamp is recorded.
   - Attempting sign-in at `simakdiskum-staging-admin.web.app` will be rejected with `auth/user-disabled`.

> [!WARNING]
> **Token Lifetime Invariant:** Firebase Authentication JWT ID tokens have a standard 1-hour expiration. An already issued ID token remains cryptographically valid until its 1-hour expiry unless the application checks token revocation (`checkRevoked: true` on token verification) or Firestore Security Rules evaluate real-time revocation timestamps.

---

## 5. Verification Checklist (Post-Approval)

- [ ] A. Firebase Auth user exists in `simakdiskum-staging`.
- [ ] B. Target email matches `aseppbukga@gmail.com`.
- [ ] C. Application custom claims evaluate `{ role: "admin" }`.
- [ ] D. Account is enabled (`disabled: false`).
- [ ] E. Password setup delivered privately via approved delivery route.
- [ ] F. Tester independently confirms password setup.
- [ ] G. Tester logs into Staging Admin Portal (`https://simakdiskum-staging-admin.web.app`).
- [ ] H. Primary Administrator (`riyanbwirawanto@gmail.com`) confirms ongoing operational access.

---

## 6. Safety & Boundary Invariants

- **Production Project:** `simakdiskum` is strictly PROTECTED (zero reads, zero writes, zero deploys).
- **Billing Tier:** Firebase Spark Free Tier ($0.00/month) strictly preserved.
- **Firestore Security Rules & Indexes:** Zero changes.
- **Hosting Targets:** Zero changes.
- **Firestore Data & Projections:** Zero changes.
