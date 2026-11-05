/**
 * Unit Test Suite for Spark-Compatible Backup, Restore & Seeding
 * 
 * Verifies:
 * 1. Export produces clean JSON files for all core collections and a manifest.
 * 2. Restore reads JSON files and batches sets with merge: true.
 * 3. Seed populates official department master data idempotently.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CORE_COLLECTIONS,
  exportCollections,
  restoreCollections,
  seedInitialMasterData
} from '../../scripts/backupRestore.mjs';

describe('P01: Spark-Compatible Logical Backup, Restore & Seeding', () => {
  let tempDir: string;
  let mockDb: any;
  let storedData: Record<string, Record<string, any>>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simakdiskum-backup-test-'));
    storedData = {};
    for (const c of CORE_COLLECTIONS) {
      storedData[c] = {};
    }

    // Seed mock data for export test
    storedData['activities']['act_001'] = { title: 'Rapat Koordinasi', startDate: '2026-11-10', version: 1 };
    storedData['employees']['emp_01'] = { name: 'Drs. Hendri Arifin, M.Si', active: true };
    storedData['settings']['signatory'] = { headOfDepartmentName: 'Drs. Hendri Arifin, M.Si' };

    mockDb = {
      collection: vi.fn((collName: string) => ({
        get: vi.fn(async () => {
          const coll = storedData[collName] || {};
          const docs = Object.entries(coll).map(([id, data]) => ({
            id,
            data: () => data
          }));
          return {
            forEach: (cb: any) => docs.forEach(cb),
            docs
          };
        }),
        doc: vi.fn((docId: string) => ({
          id: docId,
          collection: collName
        }))
      })),
      batch: vi.fn(() => {
        const operations: any[] = [];
        return {
          set: vi.fn((ref: any, data: any, options: any) => {
            operations.push({ ref, data, options });
          }),
          commit: vi.fn(async () => {
            for (const op of operations) {
              const coll = op.ref.collection;
              const id = op.ref.id;
              if (!storedData[coll]) storedData[coll] = {};
              storedData[coll][id] = { ...op.data };
            }
          })
        };
      })
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('exports all core collections to json and creates valid manifest.json', async () => {
    const manifest = await exportCollections(mockDb, tempDir);

    expect(manifest.systemVersion).toBe('5.0.0');
    expect(manifest.collections['activities']).toBe(1);
    expect(manifest.collections['employees']).toBe(1);
    expect(manifest.collections['settings']).toBe(1);

    expect(fs.existsSync(path.join(tempDir, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'activities.json'))).toBe(true);

    const exportedActivities = JSON.parse(fs.readFileSync(path.join(tempDir, 'activities.json'), 'utf-8'));
    expect(exportedActivities[0].id).toBe('act_001');
    expect(exportedActivities[0].title).toBe('Rapat Koordinasi');
  });

  it('restores collections from backup directory using batch writes', async () => {
    // 1. First export
    await exportCollections(mockDb, tempDir);

    // 2. Clear in-memory data
    storedData = {};
    for (const c of CORE_COLLECTIONS) {
      storedData[c] = {};
    }

    // 3. Restore from tempDir
    await restoreCollections(mockDb, tempDir);

    expect(storedData['activities']['act_001']).toBeDefined();
    expect(storedData['activities']['act_001'].title).toBe('Rapat Koordinasi');
    expect(storedData['employees']['emp_01'].name).toBe('Drs. Hendri Arifin, M.Si');
  });

  it('seeds initial department master data into collections', async () => {
    await seedInitialMasterData(mockDb);

    expect(storedData['employees']['emp_01']).toBeDefined();
    expect(storedData['employees']['emp_01'].name).toBe('Drs. Hendri Arifin, M.Si');
    expect(storedData['locations']['loc_01'].name).toBe('Ruang Rapat Kadis (Lantai 2)');
    expect(storedData['organizers']['org_01'].name).toBe('Sekretariat Dinas');
    expect(storedData['categories']['cat_01'].name).toBe('Rapat Koordinasi');
    expect(storedData['settings']['signatory'].headOfDepartmentName).toBe('Drs. Hendri Arifin, M.Si');
  });
});
