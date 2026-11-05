# SIMAK DISKUM v5.0 — Backup, Disaster Recovery & Seeding Runbook

**Dinas Koperasi dan Usaha Mikro Kota Batam**  
**Document Version:** 1.0  
**Effective Date:** November 2026  
**Infrastructure Target:** Firebase Spark (No-Cost) Plan  
**Primary Tool:** `scripts/backupRestore.mjs`

---

## 1. Executive Summary & Plan Constraints

### 1.1 The Firebase Spark Backup Reality
On the **Firebase Spark (No-Cost Plan)**:
- Managed, automated Cloud Firestore backups (`gcloud firestore export` / `firebase firestore:export`) require a **Google Cloud Storage (GCS)** destination bucket.
- Provisioning and writing to external GCS buckets is restricted to the pay-as-you-go **Blaze Plan**.
- **Crucial Architectural Invariant:** On the Spark plan, standard Google Cloud automated backups cannot be configured without upgrading to Blaze.

### 1.2 The Spark-Compatible Logical Backup Solution
To guarantee complete data protection without violating the zero-cost requirement, SIMAK DISKUM v5.0 provides a dedicated, production-tested Node.js administrative utility:
```
department-agenda-firebase/scripts/backupRestore.mjs
```
This utility utilizes the **Firebase Admin SDK** to perform deterministic, atomic chunked reads and writes directly between Firestore and local JSON datasets.

---

## 2. Core Collections Covered

The backup and disaster recovery utility covers all 9 Firestore collections that form the SIMAK DISKUM v5.0 data architecture:

| Collection Name | Classification | Content Description | Backup Frequency |
|---|---|---|---|
| `activities` | Restricted Private | Canonical operational activity records, including internal notes and draft fields | Daily / Pre-change |
| `publicActivities` | Public Projection | Sanitized, citizen-facing activity projections | Daily / Re-derivable |
| `employees` | Restricted Master Data | Official department personnel directory (NIP, Nama, Jabatan, Golongan) | Weekly / On update |
| `departments` | Master Data | Department division / bidangs list | Weekly / On update |
| `locations` | Master Data | Official meeting rooms and external venues | Weekly / On update |
| `organizers` | Master Data | Internal and external event organizer entities | Weekly / On update |
| `categories` | Master Data | Activity taxonomy tags | Weekly / On update |
| `settings` | System Configuration | Dinas header, default report signatories, and system metadata | On configuration change |
| `auditLogs` | Immutable Audit Trail | Tamper-evident administrative activity logs | Daily / Incremental |

---

## 3. Prerequisites & Environment Setup

### 3.1 Hardware & Environment Prerequisites
1. **Node.js**: Version 20.x or 22.x LTS.
2. **Repository Directory**: `department-agenda-firebase/`
3. **Dependencies**: `npm install` completed (`firebase-admin` available).

### 3.2 Service Account Credentials (Production Only)
In production, the Admin SDK requires a Google Cloud Service Account Key with `Cloud Datastore User` or `Firebase Admin` role:
```bash
# On secure operator machine:
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/to/simakdiskum-service-account.json"
# Windows PowerShell:
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\path\to\simakdiskum-service-account.json"
```

> [!WARNING]
> Never commit service account credentials into Git repositories or upload them to public storage. Verify `.gitignore` contains `*.serviceAccountKey.json` and `*service-account*.json`.

### 3.3 Emulator Testing Environment
When testing backups locally against the Firestore Emulator:
```bash
# Windows PowerShell:
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
```

---

## 4. Operational Procedures

### 4.1 Procedure A: Performing a Full Logical Backup

Run the export command specifying an output directory:
```bash
# Example syntax:
node scripts/backupRestore.mjs export ./backups/2026-11-05_pre_deploy
```

#### What Happens:
1. Validates connectivity to Firestore.
2. Sequentially streams all documents from each of the 9 collections.
3. Generates structured JSON files:
   - `activities.json`
   - `publicActivities.json`
   - `employees.json`
   - `departments.json`
   - `locations.json`
   - `organizers.json`
   - `categories.json`
   - `settings.json`
   - `auditLogs.json`
4. Generates `manifest.json` containing:
   - Timestamp in UTC ISO 8601.
   - System version (`5.0.0`).
   - Document counts per collection.
   - SHA-256 integrity metadata.

#### Sample Output:
```text
[backupRestore] Starting logical backup to: ./backups/2026-11-05_pre_deploy
[backupRestore] Exporting collection: activities...
  ✓ Exported 62 documents from activities to activities.json
[backupRestore] Exporting collection: publicActivities...
  ✓ Exported 62 documents from publicActivities to publicActivities.json
[backupRestore] Exporting collection: employees...
  ✓ Exported 25 documents from employees to employees.json
...
[backupRestore] Backup completed successfully in ./backups/2026-11-05_pre_deploy
```

---

### 4.2 Procedure B: Disaster Recovery / Restoring a Backup

In the event of accidental data corruption, unauthorized deletion, or environment recreation:

```bash
node scripts/backupRestore.mjs restore ./backups/2026-11-05_pre_deploy
```

#### What Happens:
1. Validates the existence and syntax of `manifest.json` and collection files.
2. Chunks document restoration into batches of **450 operations** (safely below Firestore's 500-operation transaction/batch limit).
3. Uses `batch.set(docRef, docData, { merge: true })` to prevent partial overwrite anomalies while restoring all document fields with exact IDs preserved.
4. Restores collections in dependency order: master data first, then private activities, public projections, system settings, and audit logs.

#### Safety Verification:
After restoration finishes, verify document counts in the Admin Portal or via:
```bash
node scripts/manageRoles.mjs inspect
```

---

### 4.3 Procedure C: Initial System Master Data Seeding

When deploying SIMAK DISKUM to a clean environment for the first time, initial master data (official department structure, default rooms, categories, and initial Kepala Dinas signatory profile) must be seeded.

Run:
```bash
node scripts/backupRestore.mjs seed
```

#### Seeded Records:
1. **Employees (`employees`):**
   - Kepala Dinas: Dr. H. Hendri Arulan, S.Pd, M.M. (NIP: 197206121998021003)
   - Sekretaris Dinas: Drs. Zulkifli, M.Si
   - Kepala Bidang Koperasi
   - Kepala Bidang Pemberdayaan Usaha Mikro
   - Kepala Bidang Pengawasan & Akuntabilitas
2. **Locations (`locations`):**
   - Ruang Rapat Kadis (Lantai 2)
   - Ruang Rapat Sekda (Kantor Wali Kota Batam)
   - Aula Dinas Koperasi dan Usaha Mikro
   - Ruang Pelatihan PLUT Kota Batam
3. **Organizers (`organizers`):**
   - Sekretariat Dinas Koperasi & UM
   - Bidang Koperasi
   - Bidang Usaha Mikro
   - Kementerian Koperasi dan UKM RI
   - Dinas Koperasi & UKM Provinsi Kepulauan Riau
4. **Categories (`categories`):**
   - Rapat Koordinasi
   - Sosialisasi / Pelatihan
   - Kunjungan Lapangan / Pengawasan
   - Upacara / Acara Resmi
   - Workshop / Bimtek
5. **System Settings (`settings/general`):**
   - Instansi: `Dinas Koperasi dan Usaha Mikro Kota Batam`
   - Default Signatory: `Dr. H. Hendri Arulan, S.Pd, M.M.`
   - Default Location: `Batam`

The seed operation is **idempotent**: running it multiple times safely merges without deleting existing modifications.

---

## 5. Schema Evolution & Migration Dry-Run Rules

When the schema evolves (e.g. from v5.0 to a future v5.1):
1. **Always export current data** using `backupRestore.mjs export` before running migrations.
2. **Run a Dry-Run Test against Firestore Emulator**:
   - Start local emulator: `npm run emulators`
   - Restore real snapshot to emulator: `$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"; node scripts/backupRestore.mjs restore <snapshot>`
   - Execute migration script on emulator.
   - Run Vitest integration suite: `npx vitest run`
   - Verify both Public Portal and Admin Portal function properly with migrated records.
3. **Rollback Plan**:
   - If a live migration encounters any failure, immediately restore the pre-migration snapshot using `backupRestore.mjs restore <snapshot>`.

---

## 6. Daily / Weekly Backup Schedule Recommendations

For municipal IT staff managing SIMAK DISKUM on the Spark plan without Cloud Scheduler:
1. **Automated Scheduled Task**: Configure a scheduled task (Windows Task Scheduler or Linux cron on a secure office server/desktop) to run every weekday at 18:00 WIB (after office hours):
   ```powershell
   # Windows Task Scheduler Action:
   powershell.exe -ExecutionPolicy Bypass -Command "cd D:\Apps\SIMAK-DISKUM\department-agenda-firebase; node scripts/backupRestore.mjs export ('D:\Backups\SIMAK-DISKUM\' + (Get-Date -Format 'yyyy-MM-dd_HHmm'))"
   ```
2. **Offsite Retention**: Synchronize the weekly backup directory to an approved secure offsite storage location (e.g., Kota Batam municipal private drive or encrypted offline drive). Retain daily backups for 30 days and monthly backups for 12 months.
