/**
 * SIMAK DISKUM Kota Batam v5.0 — Spark-Compatible Logical Backup & Restore Utility
 * 
 * Provides logical JSON export, restoration, and master data seeding for Cloud Firestore
 * without requiring the paid Cloud Firestore managed export/import (which requires Google Cloud
 * Storage buckets and the Blaze plan).
 * 
 * Usage:
 *   # Export all collections to a timestamped backup directory:
 *   node scripts/backupRestore.mjs export ./backups/2026-11-05
 * 
 *   # Restore collections from a backup directory:
 *   node scripts/backupRestore.mjs restore ./backups/2026-11-05
 * 
 *   # Seed initial department master data (idempotent):
 *   node scripts/backupRestore.mjs seed
 * 
 * In local development / emulator mode:
 *   export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
 *   node scripts/backupRestore.mjs seed
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

// All core collections for SIMAK DISKUM
export const CORE_COLLECTIONS = [
  'activities',
  'publicActivities',
  'employees',
  'departments',
  'locations',
  'organizers',
  'categories',
  'settings',
  'auditLogs'
];

/**
 * Initializes Firestore instance safely
 */
export function initFirestore() {
  if (getApps().length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

    if (isEmulator) {
      console.log(`[backupRestore] Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
      initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'simakdiskum' });
    } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      console.log(`[backupRestore] Using service account from ${serviceAccountPath}`);
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || 'simakdiskum'
      });
    } else {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'simakdiskum' });
    }
  }

  return getFirestore();
}

/**
 * Exports all core collections to a target directory in JSON format
 */
export async function exportCollections(db, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    systemVersion: '5.0.0',
    projectId: process.env.GCLOUD_PROJECT || 'simakdiskum',
    collections: {}
  };

  for (const collName of CORE_COLLECTIONS) {
    console.log(`[backupRestore] Exporting collection: ${collName}...`);
    const snap = await db.collection(collName).get();
    const docs = [];
    snap.forEach(d => {
      docs.push({ id: d.id, ...d.data() });
    });

    const filePath = path.join(targetDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
    manifest.collections[collName] = docs.length;
    console.log(`  ✓ Exported ${docs.length} documents from ${collName} to ${filePath}`);
  }

  fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[backupRestore] Backup completed successfully in ${targetDir}`);
  return manifest;
}

/**
 * Restores collections from a backup directory into Firestore using batch writes
 */
export async function restoreCollections(db, sourceDir) {
  const manifestPath = path.join(sourceDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found in ${sourceDir}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`[backupRestore] Restoring backup created at ${manifest.exportedAt} (version: ${manifest.systemVersion})...`);

  for (const collName of CORE_COLLECTIONS) {
    const filePath = path.join(sourceDir, `${collName}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`[backupRestore] Skipping missing file for collection ${collName}`);
      continue;
    }

    const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[backupRestore] Restoring ${docs.length} documents to ${collName}...`);

    // Firestore batches are limited to 500 operations per batch
    const BATCH_SIZE = 450;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const item of chunk) {
        const { id, ...data } = item;
        const ref = db.collection(collName).doc(id);
        batch.set(ref, data, { merge: true });
      }
      await batch.commit();
      console.log(`  ✓ Restored batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} docs) for ${collName}`);
    }
  }

  console.log(`[backupRestore] Restoration completed successfully.`);
}

/**
 * Seeds initial department master data idempotently
 */
export async function seedInitialMasterData(db) {
  console.log('[backupRestore] Seeding default department master data...');

  const initialEmployees = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', nip: '19710312 199803 1 004', position: 'Kepala Dinas', rank: 'Pembina Utama Muda (IV/c)', active: true },
    { id: 'emp_02', name: 'Rini Marlina, S.Sos', nip: '19750821 200112 2 003', position: 'Sekretaris Dinas', rank: 'Pembina (IV/a)', active: true },
    { id: 'emp_03', name: 'Ahmad Fauzi, SE', nip: '19820415 200604 1 009', position: 'Kepala Bidang Koperasi', rank: 'Penata Tk. I (III/d)', active: true },
    { id: 'emp_04', name: 'Siti Nurhaliza, S.Kom', nip: '19881105 201101 2 008', position: 'Kepala Bidang Usaha Mikro', rank: 'Penata (III/c)', active: true },
    { id: 'emp_05', name: 'Dedi Kurniawan, S.AP', nip: '19850220 200902 1 003', position: 'Kepala Bidang Pengawasan dan Pemeriksaan', rank: 'Penata (III/c)', active: true }
  ];

  const initialLocations = [
    { id: 'loc_01', name: 'Ruang Rapat Kadis (Lantai 2)', type: 'OFFICE', address: 'Kantor Dinas Koperasi dan Usaha Mikro Kota Batam', bookable: true, active: true },
    { id: 'loc_02', name: 'Aula Pertemuan PLUT Batam', type: 'OFFICE', address: 'Pusat Layanan Usaha Terpadu (PLUT) KUKM Kota Batam', bookable: true, active: true },
    { id: 'loc_03', name: 'Ruang Media Center PLUT Batam', type: 'OFFICE', address: 'PLUT KUKM Kota Batam', bookable: true, active: true },
    { id: 'loc_04', name: 'Hotel Planet Holiday Batam', type: 'EXTERNAL', address: 'Jl. Raja Ali Haji, Sei Jodoh, Kota Batam', bookable: false, active: true },
    { id: 'loc_05', name: 'Ruang Rapat Hang Nadim Kantor Walikota', type: 'EXTERNAL', address: 'Jl. Engku Putri No. 1, Batam Centre', bookable: false, active: true },
    { id: 'loc_06', name: 'Zoom Meeting Kedinasan', type: 'ONLINE', address: 'https://zoom.us', bookable: false, active: true }
  ];

  const initialOrganizers = [
    { id: 'org_01', name: 'Sekretariat Dinas', code: 'SEKR', active: true },
    { id: 'org_02', name: 'Bidang Pemberdayaan Koperasi', code: 'KOP', active: true },
    { id: 'org_03', name: 'Bidang Fasilitasi Usaha Mikro', code: 'MIKRO', active: true },
    { id: 'org_04', name: 'Bidang Pengawasan dan Pemeriksaan', code: 'WAS', active: true },
    { id: 'org_05', name: 'Pemerintah Kota Batam', code: 'PEMKO', active: true },
    { id: 'org_06', name: 'Kementerian Koperasi dan UKM RI', code: 'KEMENKOP', active: true }
  ];

  const initialCategories = [
    { id: 'cat_01', name: 'Rapat Koordinasi', color: '#2563eb', active: true },
    { id: 'cat_02', name: 'Bimbingan Teknis & Pelatihan', color: '#0284c7', active: true },
    { id: 'cat_03', name: 'Kunjungan Kerja & Lapangan', color: '#16a34a', active: true },
    { id: 'cat_04', name: 'Sosialisasi & Edukasi', color: '#d97706', active: true },
    { id: 'cat_05', name: 'Pameran & Bazaar UMKM', color: '#9333ea', active: true }
  ];

  const initialSignatory = {
    headOfDepartmentName: 'Drs. Hendri Arifin, M.Si',
    headOfDepartmentNip: '19710312 199803 1 004',
    headOfDepartmentRank: 'Pembina Utama Muda (IV/c)',
    headOfDepartmentTitle: 'Kepala Dinas Koperasi dan Usaha Mikro Kota Batam',
    city: 'Batam',
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_seed'
  };

  const batch = db.batch();

  for (const emp of initialEmployees) {
    const { id, ...data } = emp;
    batch.set(db.collection('employees').doc(id), data, { merge: true });
  }

  for (const loc of initialLocations) {
    const { id, ...data } = loc;
    batch.set(db.collection('locations').doc(id), data, { merge: true });
  }

  for (const org of initialOrganizers) {
    const { id, ...data } = org;
    batch.set(db.collection('organizers').doc(id), data, { merge: true });
  }

  for (const cat of initialCategories) {
    const { id, ...data } = cat;
    batch.set(db.collection('categories').doc(id), data, { merge: true });
  }

  batch.set(db.collection('settings').doc('signatory'), initialSignatory, { merge: true });

  await batch.commit();
  console.log('[backupRestore] Master data seeded successfully (Employees, Locations, Organizers, Categories, Signatory).');
}

// CLI Support
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
SIMAK DISKUM Spark-Compatible Backup Utility
Commands:
  export <target_directory>
  restore <source_directory>
  seed
    `);
    return;
  }

  const db = initFirestore();

  try {
    if (command === 'export') {
      const targetDir = args[1] || `./backups/backup_${new Date().toISOString().slice(0, 10)}`;
      await exportCollections(db, targetDir);
    } else if (command === 'restore') {
      const sourceDir = args[1];
      if (!sourceDir) {
        console.error('Usage: backupRestore.mjs restore <source_directory>');
        process.exit(1);
      }
      await restoreCollections(db, sourceDir);
    } else if (command === 'seed') {
      await seedInitialMasterData(db);
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[backupRestore Error]: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('backupRestore.mjs')) {
  main();
}
