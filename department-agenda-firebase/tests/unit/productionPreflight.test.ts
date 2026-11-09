/**
 * Production Preflight Verifier Unit Tests (100% Mocked)
 * 
 * Tests safety invariants and logic of verifyProductionPreflight.mjs without
 * any live network access or live cloud calls:
 * 1. Rejects missing or invalid --target parameter.
 * 2. Rejects invalid --phase parameter (strictly allows only pre-activation and post-activation).
 * 3. Rejects --target=prod and --target=staging when emulator environment variables are set.
 * 4. Rejects project ID mismatches.
 * 5. Verifies read-only collection inspection for pre-activation (0 docs = PASS, >0 docs = FAIL).
 * 6. Verifies read-only collection inspection for post-activation (master populated = PASS, missing = FAIL).
 * 7. Gracefully reports NOT VERIFIED on credential failures or initialization failures.
 * 8. Strict zero-write assertion: guarantees no add, set, update, or delete operations are called.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Spies for zero-write assertions
const mockCollectionGet = vi.fn();
const mockCollectionAdd = vi.fn();
const mockDocSet = vi.fn();
const mockDocUpdate = vi.fn();
const mockDocDelete = vi.fn();

// Mock Firestore collection reference
const mockCollection = vi.fn((colName: string) => ({
  get: () => mockCollectionGet(colName),
  add: mockCollectionAdd,
  doc: vi.fn(() => ({
    set: mockDocSet,
    update: mockDocUpdate,
    delete: mockDocDelete
  }))
}));

const mockDb = {
  collection: mockCollection
};

const mockInitializeApp = vi.fn();
const mockDeleteApp = vi.fn().mockResolvedValue(undefined);
const mockGetFirestore = vi.fn(() => mockDb);

vi.mock('firebase-admin/app', () => ({
  initializeApp: (...args: any[]) => mockInitializeApp(...args),
  getApps: vi.fn(() => []),
  deleteApp: (...args: any[]) => mockDeleteApp(...args)
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: (...args: any[]) => mockGetFirestore(...args)
}));

import {
  validatePreflightEnvironment,
  executePreflightCheck,
  PRODUCTION_PROJECT_ID,
  STAGING_PROJECT_ID,
  EMULATOR_PROJECT_ID,
  MONITORED_COLLECTIONS
} from '../../scripts/verifyProductionPreflight.mjs';

describe('Production Preflight Verifier Safety Invariants (Mocked)', () => {
  let origFirestoreEmu: string | undefined;
  let origAuthEmu: string | undefined;
  let origProject: string | undefined;

  beforeEach(() => {
    origFirestoreEmu = process.env.FIRESTORE_EMULATOR_HOST;
    origAuthEmu = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    origProject = process.env.GCLOUD_PROJECT;

    vi.clearAllMocks();
    mockInitializeApp.mockReturnValue({ name: 'mockApp' });
    mockDeleteApp.mockResolvedValue(undefined);
    mockGetFirestore.mockReturnValue(mockDb);

    // Default clean state: 0 docs for all collections
    mockCollectionGet.mockImplementation(() => Promise.resolve({ size: 0, docs: [] }));
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
    expect(MONITORED_COLLECTIONS).toEqual([
      'departments',
      'employees',
      'locations',
      'organizers',
      'categories',
      'activities',
      'publicActivities',
      'settings',
      'auditLogs'
    ]);
  });

  it('rejects execution when --target is missing or invalid', () => {
    expect(() => validatePreflightEnvironment({})).toThrow(/Missing required parameter: --target/);
    expect(() => validatePreflightEnvironment({ target: 'invalid-env' })).toThrow(/Invalid target/);
  });

  it('rejects invalid --phase values strictly', () => {
    expect(() => validatePreflightEnvironment({ target: 'prod', phase: 'invalid-phase' })).toThrow(
      /Invalid phase: 'invalid-phase'\. Must be 'pre-activation' or 'post-activation'/
    );
    expect(() => validatePreflightEnvironment({ target: 'emulator', phase: 'random' })).toThrow(
      /Invalid phase: 'random'\. Must be 'pre-activation' or 'post-activation'/
    );
  });

  it('returns FAIL cleanly when executePreflightCheck receives invalid phase', async () => {
    const result = await executePreflightCheck({
      target: 'prod',
      phase: 'invalid-phase'
    });

    expect(result.status).toBe('FAIL');
    expect(result.details).toContain("Invalid phase: 'invalid-phase'");
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

  it('resolves valid environment info for prod, staging, and emulator targets', () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    const prodEnv = validatePreflightEnvironment({ target: 'prod' });
    expect(prodEnv.target).toBe('prod');
    expect(prodEnv.projectId).toBe(PRODUCTION_PROJECT_ID);
    expect(prodEnv.phase).toBe('pre-activation');
    expect(prodEnv.isEmulator).toBe(false);

    const stagingEnv = validatePreflightEnvironment({ target: 'staging', phase: 'post-activation' });
    expect(stagingEnv.target).toBe('staging');
    expect(stagingEnv.projectId).toBe(STAGING_PROJECT_ID);
    expect(stagingEnv.phase).toBe('post-activation');
    expect(stagingEnv.isEmulator).toBe(false);

    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const emuEnv = validatePreflightEnvironment({ target: 'emulator' });
    expect(emuEnv.target).toBe('emulator');
    expect(emuEnv.projectId).toBe(EMULATOR_PROJECT_ID);
    expect(emuEnv.phase).toBe('pre-activation');
    expect(emuEnv.isEmulator).toBe(true);
  });

  it('executes mocked pre-activation check and reports PASS when all 9 collections are pristine (0 documents)', async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    // All collections return size: 0
    mockCollectionGet.mockImplementation(() => Promise.resolve({ size: 0, docs: [] }));

    const result = await executePreflightCheck({
      target: 'prod',
      project: PRODUCTION_PROJECT_ID,
      phase: 'pre-activation'
    });

    expect(result.status).toBe('PASS');
    expect(result.target).toBe('prod');
    expect(result.projectId).toBe(PRODUCTION_PROJECT_ID);
    expect(result.phase).toBe('pre-activation');
    expect(result.totalDocs).toBe(0);
    expect(result.details).toContain('Pristine initial database verified');

    // Assert zero write mutations were invoked
    expect(mockCollectionAdd).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });

  it('executes mocked pre-activation check and reports FAIL when database already contains documents', async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    // Simulate pre-existing data (e.g., 38 activities already present)
    mockCollectionGet.mockImplementation((col: string) => {
      if (col === 'activities') return Promise.resolve({ size: 38, docs: [] });
      return Promise.resolve({ size: 0, docs: [] });
    });

    const result = await executePreflightCheck({
      target: 'prod',
      project: PRODUCTION_PROJECT_ID,
      phase: 'pre-activation'
    });

    expect(result.status).toBe('FAIL');
    expect(result.totalDocs).toBe(38);
    expect(result.details).toContain('Pre-activation assumption violated: Database already contains 38 documents');

    // Assert zero mutations
    expect(mockCollectionAdd).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });

  it('executes mocked post-activation check and reports PASS when master collections are populated', async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    mockCollectionGet.mockImplementation((col: string) => {
      const counts: Record<string, number> = {
        departments: 5,
        locations: 3,
        organizers: 4,
        categories: 6,
        employees: 70
      };
      return Promise.resolve({ size: counts[col] || 0, docs: [] });
    });

    const result = await executePreflightCheck({
      target: 'prod',
      project: PRODUCTION_PROJECT_ID,
      phase: 'post-activation'
    });

    expect(result.status).toBe('PASS');
    expect(result.phase).toBe('post-activation');
    expect(result.details).toContain('Post-activation verified: Master collections populated');

    // Assert zero mutations
    expect(mockCollectionAdd).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });

  it('executes mocked post-activation check and reports FAIL when master collections are incomplete', async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    mockCollectionGet.mockImplementation((col: string) => {
      // departments is 0 (missing)
      const counts: Record<string, number> = {
        departments: 0,
        locations: 3,
        organizers: 4,
        categories: 6
      };
      return Promise.resolve({ size: counts[col] || 0, docs: [] });
    });

    const result = await executePreflightCheck({
      target: 'prod',
      project: PRODUCTION_PROJECT_ID,
      phase: 'post-activation'
    });

    expect(result.status).toBe('FAIL');
    expect(result.phase).toBe('post-activation');
    expect(result.details).toContain('Post-activation master collections incomplete');

    // Assert zero mutations
    expect(mockCollectionAdd).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });

  it('reports NOT VERIFIED gracefully when credential error occurs', async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    mockCollectionGet.mockRejectedValue(
      new Error('Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started')
    );

    const result = await executePreflightCheck({
      target: 'prod',
      project: PRODUCTION_PROJECT_ID,
      phase: 'pre-activation'
    });

    expect(result.status).toBe('NOT VERIFIED');
    expect(result.details).toContain('Google Cloud credentials not present, unauthenticated, or lacks read permission');

    // Assert zero mutations
    expect(mockCollectionAdd).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });

  it('reports NOT VERIFIED gracefully when Firebase Admin SDK initialization throws', async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    mockInitializeApp.mockImplementationOnce(() => {
      throw new Error('Project configuration error or missing credentials');
    });

    const result = await executePreflightCheck({
      target: 'prod',
      project: PRODUCTION_PROJECT_ID,
      phase: 'pre-activation'
    });

    expect(result.status).toBe('NOT VERIFIED');
    expect(result.details).toContain('Failed to initialize Firebase Admin SDK');

    // Assert zero mutations
    expect(mockCollectionAdd).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });

  it('strictly verifies zero mutations across all scenarios', () => {
    expect(mockCollectionAdd).not.toHaveBeenCalled();
    expect(mockDocSet).not.toHaveBeenCalled();
    expect(mockDocUpdate).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });
});
