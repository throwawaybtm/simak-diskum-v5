# SIMAK DISKUM v5.0 — S02 Temporary External QA Tester Account Provisioning

**System:** SIMAK DISKUM v5.0 (Sistem Informasi Manajemen Agenda Kedinasan)  
**Intended Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Target Environment:** Firebase Cloud Staging (`simakdiskum-staging`)  
**Protected Production:** `simakdiskum` (Strictly Protected; Zero Mutations)  
**Date:** 6 November 2026  
**Status:** PROVISIONED & VERIFIED VIA ADMIN SDK — PENDING TESTER PASSWORD SETUP & LOGIN  
**Milestone Stop Condition:** `S02 EXTERNAL QA TESTER ACCOUNT PROVISIONED`  

---

## 1. Provisioning Summary & Verification Records

In accordance with explicit owner authorization received on 6 November 2026, the temporary application-level Administrator account for external software tester Asep has been created and verified on Firebase project `simakdiskum-staging`.

### A. Target Tester Auth Record (Verified via Firebase Admin SDK)
- **UID:** `RlFoWs62BVa66jdHjmGrONr1NKP2`
- **Email:** `aseppbukga@gmail.com`
- **Display Name:** `Asep — QA Tester`
- **Account Status:** `disabled: false` (Active & Enabled)
- **Email Verified:** `false` (Genuinely unverified; not automatically marked true)
- **Custom Claims:**
  ```json
  {
    "role": "admin",
    "department": "Dinas Koperasi dan Usaha Mikro Kota Batam",
    "updatedAt": "2026-11-06T04:03:39.344Z"
  }
  ```
- **Tokens Revoked Timestamp:** `Fri, 06 Nov 2026 04:03:39 GMT`

### B. Primary Owner Administrator Account Isolation (Verified)
- **UID:** `31Bin8ErtBaAy3YODaf1SKKymYb2`
- **Email:** `riyanbwirawanto@gmail.com`
- **Display Name:** `Administrator Staging`
- **Account Status:** `disabled: false`, `emailVerified: true`
- **Custom Claims:** `{ "role": "admin", "department": "Dinas Koperasi dan Usaha Mikro Kota Batam" }`
- **Isolation Status:** **100% Preserved & Unaffected**. Separate UID, separate audit log attribution, continuous operational access.

---

## 2. Provisioning Execution Audit

- **Execution Command:**
  ```bash
  node scripts/manageRoles.mjs provision aseppbukga@gmail.com "Asep — QA Tester" admin --target=staging --suppress-link
  ```
- **Credential Protection:** `--suppress-link` successfully prevented one-time password reset URLs and tokens from printing into terminal, logs, or chat.
- **Initial Password:** Auto-generated secure cryptographic entropy (`crypto.randomBytes(24)`). Never recorded or exposed.
- **IAM Boundaries:** Zero Google Cloud IAM or Firebase Console permissions granted. Account privileges are strictly governed by application-level custom claims evaluated by Gate 5A Firestore Security Rules (`request.auth.token.role == 'admin'`).

---

## 3. Password Setup & Initial Sign-In Instructions for Tester (Asep)

No password has been set, and no automated email was falsely claimed to have been sent by the CLI.

To complete password creation privately:

1. **Step 1:** Open the Staging Admin Portal login card:  
   👉 [https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app)
2. **Step 2:** Click **"Lupa Password?"** at the bottom of the login modal.
3. **Step 3:** Enter `aseppbukga@gmail.com` into the email field and click **"Kirim Tautan Pemulihan"**.
4. **Step 4:** Open the inbox for `aseppbukga@gmail.com`. Firebase will dispatch an official Google-hosted password reset email (covered under Firebase Spark free tier).
5. **Step 5:** Follow the secure link to set a private password.
6. **Step 6:** Return to [https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app) and sign in using `aseppbukga@gmail.com` and the newly created password.
7. **Step 7:** Verify the **Administrator** badge appears in the top navigation profile and all administrative features (Agenda CRUD, Master Data, Laporan, Pengaturan) are accessible.

---

## 4. Verification Checklist Matrix

| Item | Requirement | Verification Method | Status |
|---|---|---|:---:|
| **A** | User exists in `simakdiskum-staging` | `auth.getUserByEmail('aseppbukga@gmail.com')` | **VERIFIED** (`UID: RlFoWs62BVa66jdHjmGrONr1NKP2`) |
| **B** | Target email matches | Direct inspection | **VERIFIED** (`aseppbukga@gmail.com`) |
| **C** | Application role is `admin` | Custom claims inspection | **VERIFIED** (`{ "role": "admin" }`) |
| **D** | Account is enabled | `disabled: false` | **VERIFIED** |
| **E** | Email unverified initially | `emailVerified: false` | **VERIFIED** (Genuine unverified status preserved) |
| **F** | Zero secret / link disclosure | `--suppress-link` flag audit | **VERIFIED** (0 URLs or passwords leaked) |
| **G** | Primary admin preserved | `auth.getUserByEmail('riyanbwirawanto@gmail.com')` | **VERIFIED** (Active, intact) |
| **H** | Tester sets password privately | Staging portal "Lupa Password?" flow | **PENDING TESTER ACTION** |
| **I** | Tester confirms live sign-in | Asep login to `simakdiskum-staging-admin.web.app` | **PENDING TESTER CONFIRMATION** |
| **J** | Owner confirms live sign-in | Owner session check | **PENDING OWNER CONFIRMATION** |

---

## 5. Post-Testing Account Revocation Procedure

Once QA testing concludes, the project owner can completely de-provision or disable the tester's access using the following standard operational procedure:

1. **Step 1: Downgrade / Remove Application Role:**
   ```bash
   node scripts/manageRoles.mjs set-role aseppbukga@gmail.com editor --target=staging
   ```
2. **Step 2: Disable Account & Revoke Refresh Tokens:**
   ```bash
   node scripts/manageRoles.mjs disable aseppbukga@gmail.com --target=staging
   ```
   * Result: Account is disabled (`disabled: true`). Refresh tokens are immediately revoked via `auth.revokeRefreshTokens(uid)`, blocking any new ID token generation.
3. **Step 3: Verification:**
   ```bash
   node scripts/manageRoles.mjs inspect aseppbukga@gmail.com --target=staging
   ```
   * Confirm `Disabled: true` and `Tokens Revoked` timestamp is updated.
4. **Token Lifetime Limitation Notice:**
   * Firebase JWT ID tokens carry a standard client lifetime of up to 1 hour. While refresh tokens are revoked instantly, any active ID token already in the browser's memory remains valid until its 1-hour expiration unless token revocation is validated on each Firestore read/write.

---

## 6. Strict Production & Platform Safeguards

- **Production Project:** `simakdiskum` untouched (0 reads, 0 writes, 0 deploys).
- **Billing Tier:** Firebase Spark Free Tier ($0.00/month) fully preserved.
- **Firestore Schema, Security Rules, Indexes:** Zero mutations.
- **Hosting Deployments:** Zero deployments.
- **Next Milestone:** Production activation (`P02-B`) remains strictly blocked until formal production onboarding authorization is issued.
