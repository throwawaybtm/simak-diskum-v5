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

describe('Firestore Security Rules: Strict Hosted vs Permissive Emulator', () => {
  const hostedRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/firestore.rules'),
    'utf8'
  );
  const emulatorRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/emulator.rules'),
    'utf8'
  );

  let hostedEnv: RulesTestEnvironment;
  let emulatorEnv: RulesTestEnvironment;

  beforeAll(async () => {
    // Hosted rules test environment
    hostedEnv = await initializeTestEnvironment({
      projectId: 'test-hosted-strict',
      firestore: {
        rules: hostedRules,
        host: '127.0.0.1',
        port: 8080
      }
    });

    // Emulator rules test environment
    emulatorEnv = await initializeTestEnvironment({
      projectId: 'test-emulator-permissive',
      firestore: {
        rules: emulatorRules,
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  afterAll(async () => {
    if (hostedEnv) await hostedEnv.cleanup();
    if (emulatorEnv) await emulatorEnv.cleanup();
  });

  describe('Hosted Rules (firebase/firestore.rules) - Strict Deny-by-Default', () => {
    it('allows anonymous read on publicActivities', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(anonDb, 'publicActivities', 'act_sample')));
    });

    it('allows anonymous read on publicAnnouncements', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(anonDb, 'publicAnnouncements', 'ann_sample')));
    });

    it('allows anonymous read on publicSettings', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(anonDb, 'publicSettings', 'main')));
    });

    it('denies anonymous write to publicActivities', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertFails(
        setDoc(doc(anonDb, 'publicActivities', 'act_sample'), { title: 'Hacked' })
      );
    });

    it('denies all reads and writes to private activities collection', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(anonDb, 'activities', 'act_sample')));
      await assertFails(
        setDoc(doc(anonDb, 'activities', 'act_sample'), { title: 'Secret Rapat' })
      );
    });

    it('denies all reads and writes to employees, auditLogs, and settings', async () => {
      const anonDb = hostedEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(anonDb, 'employees', 'emp_01')));
      await assertFails(getDoc(doc(anonDb, 'auditLogs', 'log_01')));
      await assertFails(setDoc(doc(anonDb, 'auditLogs', 'log_01'), { action: 'UNAUTHORIZED' }));
      await assertFails(getDoc(doc(anonDb, 'settings', 'main')));
    });
  });

  describe('Emulator Rules (firebase/emulator.rules) - Local Synthetic CRUD', () => {
    it('permits local writes to activities, publicActivities, and auditLogs in emulator', async () => {
      const emuDb = emulatorEnv.unauthenticatedContext().firestore();

      await assertSucceeds(
        setDoc(doc(emuDb, 'activities', 'act_local_01'), {
          title: 'Local Test Activity',
          version: 1
        })
      );

      await assertSucceeds(
        setDoc(doc(emuDb, 'publicActivities', 'act_local_01'), {
          title: 'Local Test Activity Public',
          status: 'SCHEDULED'
        })
      );

      await assertSucceeds(
        setDoc(doc(emuDb, 'auditLogs', 'log_local_01'), {
          action: 'CREATE',
          actorLabel: 'UNVERIFIED'
        })
      );
    });
  });
});
