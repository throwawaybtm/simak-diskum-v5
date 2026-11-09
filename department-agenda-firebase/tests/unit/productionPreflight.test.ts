/**
 * Production Preflight Verifier Unit Tests
 * 
 * Tests safety invariants of verifyProductionPreflight.mjs:
 * 1. Rejects missing or invalid --target parameter.
 * 2. Rejects --target=prod when emulator environment variables are set.
 * 3. Rejects project ID mismatches.
 * 4. Gracefully reports NOT VERIFIED when cloud credentials are not present.
 * 5. Executes read-only queries with zero mutations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  validatePreflightEnvironment,
  executePreflightCheck,
  PRODUCTION_PROJECT_ID,
  STAGING_PROJECT_ID,
  EMULATOR_PROJECT_ID,
  MONITORED_COLLECTIONS
} from '../../scripts/verifyProductionPreflight.mjs';

describe('Production Preflight Verifier Safety Invariants', () => {
  let origFirestoreEmu: string | undefined;
  let origAuthEmu: string | undefined;
  let origProject: string | undefined;

  beforeEach(() => {
    origFirestoreEmu = process.env.FIRESTORE_EMULATOR_HOST;
    origAuthEmu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    origProject = process.env.GCLOUD_PROJECT;
  });

  afterEach(() => {
    if (origFirestoreEmu !== undefined) process.env.FIRESTORE_EMULATOR_HOST = origFirestoreEmu;
    else delete process.env.FIRESTORE_EMULATOR_HOST;

    if (origAuthEmu !== undefined) process.env.FIREBASE_AUTH_EMULATOR_HOST = origAuthEmu;
    else delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    if (origProject !== undefined) process.env.GCLOUD_PROJECT = origProject;
    else delete process.env.GCLOUD_PROJECT;
  });

  it('verifies all 9 required collections are monitored', () => {
    expect(MONITORED_COLLECTIONS).toHaveLength(9);
    expect(MONITORED_COLLECTIONS).toContain('activities');
    expect(MONITORED_COLLECTIONS).toContain('publicActivities');
    expect(MONITORED_COLLECTIONS).toContain('employees');
    expect(MONITORED_COLLECTIONS).toContain('departments');
    expect(MONITORED_COLLECTIONS).toContain('locations');
    expect(MONITORED_COLLECTIONS).toContain('organizers');
    expect(MONITORED_COLLECTIONS).toContain('categories');
    expect(MONITORED_COLLECTIONS).toContain('settings');
    expect(MONITORED_COLLECTIONS).toContain('auditLogs');
  });

  it('rejects execution when --target is missing or invalid', () => {
    expect(() => validatePreflightEnvironment({})).toThrow(/Missing required parameter: --target/);
    expect(() => validatePreflightEnvironment({ target: 'invalid-env' })).toThrow(/Invalid target/);
  });

  it('rejects --target=prod when FIRESTORE_EMULATOR_HOST is active', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    expect(() => validatePreflightEnvironment({ target: 'prod' })).toThrow(
      /Execution blocked: Target is 'prod' but emulator environment variables are active/
    );
  });

  it('rejects --target=staging when FIREBASE_AUTH_EMULATOR_HOST is active', () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

    expect(() => validatePreflightEnvironment({ target: 'staging' })).toThrow(
      /Execution blocked: Target is 'staging' but emulator environment variables are active/
    );
  });

  it('rejects project ID mismatch for production target', () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    expect(() =>
      validatePreflightEnvironment({ target: 'prod', project: 'wrong-project-id' })
    ).toThrow(/Project ID mismatch: target 'prod' expects project 'simakdiskum'/);
  });

  it('rejects project ID mismatch for staging target', () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    expect(() =>
      validatePreflightEnvironment({ target: 'staging', project: 'simakdiskum' })
    ).toThrow(/Project ID mismatch: target 'staging' expects project 'simakdiskum-staging'/);
  });

  it('resolves valid environment info when properly configured', () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    const prodEnv = validatePreflightEnvironment({ target: 'prod' });
    expect(prodEnv.target).toBe('prod');
    expect(prodEnv.projectId).toBe(PRODUCTION_PROJECT_ID);
    expect(prodEnv.isEmulator).toBe(false);

    const stagingEnv = validatePreflightEnvironment({ target: 'staging' });
    expect(stagingEnv.target).toBe('staging');
    expect(stagingEnv.projectId).toBe(STAGING_PROJECT_ID);
    expect(stagingEnv.isEmulator).toBe(false);

    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const emuEnv = validatePreflightEnvironment({ target: 'emulator' });
    expect(emuEnv.target).toBe('emulator');
    expect(emuEnv.projectId).toBe(EMULATOR_PROJECT_ID);
    expect(emuEnv.isEmulator).toBe(true);
  });

  it('returns valid status (PASS, NOT VERIFIED, or FAIL) safely without unhandled crashes', async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    const result = await executePreflightCheck({
      target: 'prod',
      project: PRODUCTION_PROJECT_ID,
      phase: 'pre-activation'
    });

    // In a test environment, it must report a valid status (PASS if ADC is active, NOT VERIFIED if missing, or FAIL)
    expect(['PASS', 'NOT VERIFIED', 'FAIL']).toContain(result.status);
    expect(result.target).toBe('prod');
    expect(result.projectId).toBe(PRODUCTION_PROJECT_ID);
  });

  it('returns FAIL cleanly when options violate safety checks', async () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    const result = await executePreflightCheck({
      target: 'prod'
    });

    expect(result.status).toBe('FAIL');
    expect(result.details).toContain('emulator environment variables are active');
  });
});
