/**
 * SIMAK DISKUM Kota Batam v5.0 — Maintenance Rules & Reversibility Test
 * 
 * Verifies Section 3 of Milestone P02-A:
 * 1. Read access remains available during maintenance (public & authenticated).
 * 2. Authorized client writes (Admin & Editor) are completely stopped.
 * 3. Normal rules can be restored and re-enable writes cleanly.
 * 4. Admin SDK operations bypass maintenance rules and succeed.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

describe('Reversible Maintenance Lockdown Rules Verification', () => {
  const prodRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/firestore.rules'),
    'utf8'
  );
  const maintenanceRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/firestore.maintenance.rules'),
    'utf8'
  );

  let maintEnv: RulesTestEnvironment;
  let prodEnv: RulesTestEnvironment;
  let adminApp: any;
  let adminDb: any;

  beforeAll(async () => {
    // 1. Environment under Maintenance Rules
    maintEnv = await initializeTestEnvironment({
      projectId: 'test-maint-project',
      firestore: {
        rules: maintenanceRules,
        host: '127.0.0.1',
        port: 8080
      }
    });

    // 2. Environment under Normal Production Rules
    prodEnv = await initializeTestEnvironment({
      projectId: 'test-prod-project',
      firestore: {
        rules: prodRules,
        host: '127.0.0.1',
        port: 8080
      }
    });

    // Seed test documents in maintEnv using security-rules-disabled context
    await maintEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'publicActivities', 'pub_maint_01'), {
        id: 'pub_maint_01',
        title: 'Agenda Pemantauan Pasar',
        startDate: '2026-11-10',
        status: 'SCHEDULED'
      });
      await setDoc(doc(db, 'activities', 'act_maint_01'), {
        id: 'act_maint_01',
        title: 'Internal Briefing Pemantauan Pasar',
        status: 'SCHEDULED',
        version: 1
      });
    });

    // Initialize Admin SDK for bypass test
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    adminApp = initializeApp({ projectId: 'test-maint-project' }, 'maintenance-admin-test');
    adminDb = getAdminFirestore(adminApp);
  });

  afterAll(async () => {
    if (adminApp) {
      await deleteApp(adminApp);
    }
    if (maintEnv) {
      await maintEnv.cleanup();
    }
    if (prodEnv) {
      await prodEnv.cleanup();
    }
  });

  it('allows public read access to publicActivities during maintenance', async () => {
    const unauthContext = maintEnv.unauthenticatedContext();
    const snap = await getDoc(doc(unauthContext.firestore(), 'publicActivities', 'pub_maint_01'));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.title).toBe('Agenda Pemantauan Pasar');
  });

  it('allows authenticated operators to read private activities during maintenance', async () => {
    const editorContext = maintEnv.authenticatedContext('operator_1', { role: 'editor' });
    const snap = await getDoc(doc(editorContext.firestore(), 'activities', 'act_maint_01'));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.title).toBe('Internal Briefing Pemantauan Pasar');
  });

  it('blocks all client writes from authenticated Editor during maintenance', async () => {
    const editorContext = maintEnv.authenticatedContext('operator_1', { role: 'editor' });
    await assertFails(
      setDoc(doc(editorContext.firestore(), 'activities', 'act_new_during_maint'), {
        id: 'act_new_during_maint',
        title: 'Disallowed Activity'
      })
    );
  });

  it('blocks all client writes from authenticated Admin during maintenance', async () => {
    const adminContext = maintEnv.authenticatedContext('admin_1', { role: 'admin' });
    await assertFails(
      setDoc(doc(adminContext.firestore(), 'publicActivities', 'pub_new_during_maint'), {
        id: 'pub_new_during_maint',
        title: 'Disallowed Public Write'
      })
    );
  });

  it('allows Admin SDK operations to bypass maintenance rules and modify database', async () => {
    // Admin SDK connects via privileged credentials (e.g. backupRestore.mjs restore)
    const testDocRef = adminDb.collection('activities').doc('act_admin_sdk_restore');
    await testDocRef.set({
      id: 'act_admin_sdk_restore',
      title: 'Restored via Admin SDK during maintenance',
      restoredAt: new Date().toISOString()
    });

    const docSnap = await testDocRef.get();
    expect(docSnap.exists).toBe(true);
    expect(docSnap.data().title).toBe('Restored via Admin SDK during maintenance');
  });

  it('re-enables authorized writes immediately when production rules are active', async () => {
    // Under prodEnv, public write is still denied for unauthenticated users
    const unauthContext = prodEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(unauthContext.firestore(), 'publicActivities', 'pub_hacked'), {
        id: 'pub_hacked',
        title: 'Anonymous Hack'
      })
    );

    // But authenticated Admin CAN write valid public settings under normal rules
    const adminContext = prodEnv.authenticatedContext('admin_real', { role: 'admin' });
    await assertSucceeds(
      setDoc(doc(adminContext.firestore(), 'publicSettings', 'general'), {
        systemName: 'SIMAK DISKUM v5.0',
        updatedAt: '2026-11-05T06:00:00Z'
      })
    );
  });
});
