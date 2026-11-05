# SIMAK DISKUM v5.0 — Backup, Disaster Recovery & Seeding Runbook (Hardened)

**Dinas Koperasi dan Usaha Mikro Kota Batam**  
**Document Version:** 2.0 (P01-A Operational Safety Hardened)  
**Effective Date:** November 2026  
**Infrastructure Target:** Firebase Spark (No-Cost) Plan  
**Primary Tool:** `scripts/backupRestore.mjs`

---

## 1. Executive Summary & Critical Safety Principles

### 1.1 The Firebase Spark Backup Reality
On the **Firebase Spark (No-Cost Plan)**:
- Managed, automated Cloud Firestore backups (`gcloud firestore export` / `firebase firestore:export`) require a **Google Cloud Storage (GCS)** destination bucket.
- Provisioning and writing to external GCS buckets is restricted to the pay-as-you-go **Blaze Plan**.
- On the Spark plan, database safety is achieved via **logical JSON exports** using the Firebase Admin SDK / client scripts (`scripts/backupRestore.mjs`).

### 1.2 Critical Distinction: Merge Import vs Controlled Full Restoration

> [!CAUTION]
> **CORRECTING THE MERGE ASSUMPTION:**  
> A standard `batch.set(docRef, data, { merge: true })` does **NOT** restore a database to its previous state.  
> `merge: true` only merges fields present in the backup. It **does NOT**:
> 1. Remove fields that were created or modified *after* the backup.
> 2. Remove orphaned documents that were created *after* the backup.
> 3. Recover deleted documents if an unauthorized batch operation cleared IDs without record.
> 
> Therefore, SIMAK DISKUM v5.0 defines **two distinct, explicit restore modes**:

| Mode | Command Flag | Mechanism | Effect on Orphaned Live Docs | Effect on Modified Fields | Intended Use Case |
|---|---|---|---|---|---|
| **Non-Destructive Import** | `--mode=merge` | `batch.set(..., { merge: true })` | Preserved intact | Overwritten by backup values | Restoring lost documents or seeding non-conflicting master data |
| **Controlled Full Restoration** | `--mode=full` | `batch.set(..., { merge: false })` + orphan deletion | **Deleted** (requires `--force`) | Completely replaced by exact backup payload | Disaster recovery after corruption or unauthorized batch update |

---

## 2. Lossless Serialization of Firestore Data Types

Standard `JSON.stringify` drops or mangles Firestore native types (Timestamps, DocumentReferences, GeoPoints).  
`backupRestore.mjs` implements **lossless type tagging**:

```json
// Example serialized Timestamp in activities.json:
{
  "id": "act_101",
  "title": "Rapat Koordinasi Koperasi",
  "createdAt": {
    "_type": "Firestore.Timestamp",
    "seconds": 1762740000,
    "nanoseconds": 0
  },
  "departmentRef": {
    "_type": "Firestore.DocumentReference",
    "path": "departments/dept_01"
  }
}
```

Upon restoration, `deserializeFirestoreData()` reconstructs true `Timestamp` and `DocumentReference` objects before committing writes to Cloud Firestore.

---

## 3. SHA-256 Integrity Verification

During export, the utility computes a cryptographic SHA-256 checksum for every exported collection file and records it in `manifest.json`:

```json
{
  "exportedAt": "2026-11-05T05:28:21.000Z",
  "systemVersion": "5.0.0",
  "projectId": "simakdiskum",
  "collections": { "activities": 62, "employees": 25 },
  "files": {
    "activities.json": {
      "sha256": "a6b07ab9cf3e284a1e94817a027384...",
      "count": 62
    }
  }
}
```

Before any restore begins, `validateBackupIntegrity()` recalculates all file hashes. If any file has been modified, corrupted, or tampered with, restoration **halts immediately** with a fatal integrity error.

---

## 4. Safety Gates: Dry-Run Diff Analysis & Confirmation

### 4.1 Dry-Run Diff Mode
To inspect what a restore will do without writing or deleting anything:
```bash
node scripts/backupRestore.mjs restore ./backups/2026-11-05 --mode=full --dry-run
```

#### Output:
```text
RESTORE DIFF REPORT (Mode: FULL):
  - activities: 62 backup docs, 64 live docs, 2 orphans
  - employees: 25 backup docs, 25 live docs, 0 orphans
Total documents to restore: 87
Total orphaned live documents: 2 (act_201_new, act_202_new)
[backupRestore] Dry-run complete. No changes were made to Firestore.
```

### 4.2 Mandatory Confirmation Gate (`--force`)
If orphaned live documents exist in a collection, `--mode=full` will **refuse to run** unless `--force` is explicitly provided:
```bash
# Throws error if orphans exist:
node scripts/backupRestore.mjs restore ./backups/2026-11-05 --mode=full

# Executes controlled deletion of orphans and restoration:
node scripts/backupRestore.mjs restore ./backups/2026-11-05 --mode=full --force
```

---

## 5. Audit Log Immutability & Maintenance Logging

### 5.1 Audit Logs Are Protected
`auditLogs` represent a tamper-evident administrative record.
- In `--mode=full`, **orphaned audit logs are NEVER deleted**. Any audit records created after the backup timestamp remain strictly preserved.
- Restoring an older backup will never erase subsequent audit history.

### 5.2 Independent Maintenance Logging
Every execution of `restore` or `seed` automatically writes an audit record directly into `auditLogs`:
```json
{
  "action": "MAINTENANCE_RESTORE",
  "entity": "DATABASE_BACKUP",
  "entityId": "2026-11-05",
  "actor": "admin@diskum.batam.go.id",
  "mode": "full",
  "details": "Restored 87 documents across collections (mode: full, dryRun: false)",
  "performedAt": "2026-11-05T05:30:00.000Z",
  "timestamp": "[Firestore.Timestamp]"
}
```

---

## 6. Batch Atomicity & Partial Failure Handling

Firestore limits batched writes to 500 operations. `backupRestore.mjs` executes in chunks of **450 operations**.

> [!WARNING]
> **BATCH ATOMICITY BOUNDARY:**  
> Each 450-document batch is atomic *within itself*. However, Firestore does **NOT** provide multi-batch atomicity across an entire database restore.  
> If batch 2 of 5 fails due to network termination, batches 1 has already been committed to Firestore.

### Handling Partial Batch Failures:
1. `backupRestore.mjs` records completed batches into a local progress file: `restore-progress.json`.
2. If a commit error occurs, the script logs the exact collection name, batch index, and document IDs.
3. **Rollback Guidance:** The operator can inspect `restore-progress.json`, resolve the network/credential issue, and re-run `--mode=merge` to complete the remaining documents idempotently.

---

## 7. Post-Restoration Verification Pass

After all batches commit, `backupRestore.mjs` executes an automated two-level verification:
1. **Document Count Verification:** Confirms live document counts match `manifest.json`.
2. **Field-Level Equality Verification:** Reads back restored documents and verifies that primary scalars (`title`, `startDate`, `status`, `version`, `name`, `nip`) match the backup JSON records.

If any field does not match, the utility throws an explicit `Field mismatch` error.

---

## 8. Production Master Data Seeding Safety

### 8.1 Separation of Dev Fixtures vs Production Templates
- **Development Fixtures (`seed:dev` or `--env=dev`):** Synthetic placeholder data clearly labeled `[DEMO]` for local testing in the Firestore emulator.
- **Production Seeding (`seed` / `--env=prod`):** Strictly blocked from inserting unverified civil servant names or NIPs.

### 8.2 Production Import Approval Step
The default command:
```bash
node scripts/backupRestore.mjs seed
```
will **REJECT** execution with:
```text
[Production Seeding Blocked] Production master data seeding requires a client-approved JSON template.
Pass --template=<path> pointing to an approved template (e.g. templates/productionMasterDataTemplate.json).
```

To seed production:
1. Obtain official civil service decree (SK Penetapan Pejabat & Signatory) from Dinas Koperasi dan Usaha Mikro Kota Batam.
2. Fill `templates/productionMasterDataTemplate.json` with verified names, NIPs, and signatory profiles.
3. Set `"clientApproved": true` and provide `"approvalReference": "SK/DISKUM/..."`.
4. Execute:
   ```bash
   node scripts/backupRestore.mjs seed --template=templates/productionMasterDataTemplate.json
   ```

---

## 9. Backup File Security & Data Protection Policies

1. **Git Exclusion:** All backup folders (`backups/`, `*.backup`, `*backup*.json`, `restore-progress.json`) are strictly excluded in `.gitignore`.
2. **Access Control:** Backups contain non-public invitation letter metadata and internal department notes. Store exported files on encrypted, access-controlled municipal drives with restricted administrative access.
3. **Retention Schedule:** Retain daily backups for 30 days and monthly archival snapshots for 12 months.
