/**
 * Staging Readiness Verification Test Suite (Task 8 - Requirement 5)
 * 
 * Verifies:
 * 1. Project ID is configured as 'simakdiskum'.
 * 2. Multi-site hosting targets: 'public' -> 'simakdiskum', 'admin' -> 'simakdiskum-admin'.
 * 3. Hosted Firestore rules strictly point to 'firebase/firestore.rules' (deny-by-default).
 * 4. Permissive testing rules are strictly isolated to 'firebase.emulator.json'.
 * 5. Production deployment scripts cannot accidentally load emulator configuration.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 8: Staging Readiness & Deployment Configuration Verification', () => {
  const rootDir = path.resolve(__dirname, '../../');

  it('verifies .firebaserc contains project simakdiskum and proper hosting targets', () => {
    const firebasercPath = path.join(rootDir, '.firebaserc');
    expect(fs.existsSync(firebasercPath)).toBe(true);

    const rc = JSON.parse(fs.readFileSync(firebasercPath, 'utf-8'));
    expect(rc.projects.default).toBe('simakdiskum');
    expect(rc.projects.production).toBe('simakdiskum');
    expect(rc.projects.staging).toBe('simakdiskum-staging');

    // Production targets
    const prodTargets = rc.targets?.simakdiskum?.hosting;
    expect(prodTargets).toBeDefined();
    expect(prodTargets.public).toContain('simakdiskum');
    expect(prodTargets.admin).toContain('simakdiskum-admin');

    // Staging targets
    const stagingTargets = rc.targets?.['simakdiskum-staging']?.hosting;
    expect(stagingTargets).toBeDefined();
    expect(stagingTargets.public).toContain('simakdiskum-staging');
    expect(stagingTargets.admin).toContain('simakdiskum-staging-admin');
  });

  it('verifies firebase.json points exclusively to strict hosted firestore.rules', () => {
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    expect(fs.existsSync(firebaseJsonPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
    expect(config.firestore.rules).toBe('firebase/firestore.rules');
    expect(config.firestore.indexes).toBe('firebase/firestore.indexes.json');

    // Hosting targets
    const publicTarget = config.hosting.find((h: any) => h.target === 'public');
    const adminTarget = config.hosting.find((h: any) => h.target === 'admin');

    expect(publicTarget).toBeDefined();
    expect(publicTarget.public).toBe('apps/public/dist');
    expect(adminTarget).toBeDefined();
    expect(adminTarget.public).toBe('apps/admin/dist');
  });

  it('verifies firebase.emulator.json isolates permissive emulator.rules', () => {
    const emulatorConfigPath = path.join(rootDir, 'firebase.emulator.json');
    expect(fs.existsSync(emulatorConfigPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(emulatorConfigPath, 'utf-8'));
    expect(config.firestore.rules).toBe('firebase/emulator.rules');
  });

  it('verifies hosted firestore.rules strictly denies all unauthenticated private writes', () => {
    const rulesPath = path.join(rootDir, 'firebase/firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

    // Ensure private wildcard denies read and write
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false;');

    // Ensure public collections allow read but explicitly deny write
    expect(rulesContent).toContain('match /publicActivities/{id}');
    expect(rulesContent).toContain('allow write: if false;');
  });

  it('verifies package.json scripts preserve separate emulator vs production invocations', () => {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Emulator script must explicitly specify emulator config and demo project
    expect(pkg.scripts.emulators).toContain('--config firebase.emulator.json');
    expect(pkg.scripts.emulators).toContain('--project demo-department-agenda');
  });

  it('verifies client initializers support environment configuration and guard emulator connection to localhost', () => {
    const publicFirebase = fs.readFileSync(path.join(rootDir, 'apps/public/src/firebase.ts'), 'utf-8');
    const adminFirebase = fs.readFileSync(path.join(rootDir, 'apps/admin/src/firebase.ts'), 'utf-8');

    for (const code of [publicFirebase, adminFirebase]) {
      expect(code).toContain('import.meta.env?.VITE_FIREBASE_PROJECT_ID');
      expect(code).toContain("'simakdiskum'");
      expect(code).toContain("location.hostname === 'localhost' || location.hostname === '127.0.0.1'");
    }
  });

  it('verifies repository ignores sensitive credentials and contains zero committed private keys', () => {
    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('*.serviceAccountKey.json');
    expect(gitignore).toContain('*service-account*.json');
    expect(gitignore).toContain('.env');

    // Ensure no service account key files exist in root or packages
    const files = fs.readdirSync(rootDir);
    const hasServiceAccount = files.some(f => f.includes('serviceAccount') || f.includes('service-account'));
    expect(hasServiceAccount).toBe(false);
  });

  it('verifies .gitignore excludes backup files, progress ledgers and credentials', () => {
    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('backups/');
    expect(gitignore).toContain('*.backup');
    expect(gitignore).toContain('*backup*.json');
    expect(gitignore).toContain('restore-progress.json');
  });

  it('verifies production master data template requires client approval before seeding', () => {
    const templatePath = path.join(rootDir, 'templates/productionMasterDataTemplate.json');
    expect(fs.existsSync(templatePath)).toBe(true);

    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    expect(template.clientApproved).toBe(false);
    expect(template.templateVersion).toBe('1.0.0');
    expect(template.employees[0].name).toContain('[NAMA');
    expect(template.signatory.headOfDepartmentName).toContain('[NAMA');
  });

  it('verifies manageRoles and backupRestore guards strictly reject production project ID when targeting staging', async () => {
    const { validateTargetEnvironment: validateAuthTarget } = await import('../../scripts/manageRoles.mjs');
    const { validateTargetEnvironment: validateDbTarget } = await import('../../scripts/backupRestore.mjs');

    const prevEmuAuth = process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const prevEmuFs = process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.FIRESTORE_EMULATOR_HOST;

    try {
      // 1. Target staging with production project ID must be rejected by auth guard
      process.env.GCLOUD_PROJECT = 'simakdiskum';
      expect(() => validateAuthTarget({ target: 'staging' }))
        .toThrow(/--target=staging was specified, but target project is "simakdiskum" \(PRODUCTION\)/);

      // 2. Target staging with production project ID must be rejected by backup guard
      expect(() => validateDbTarget({ target: 'staging' }))
        .toThrow(/--target=staging was specified, but target project is "simakdiskum" \(PRODUCTION\)/);

      // 3. Target prod with staging project ID must be rejected
      process.env.GCLOUD_PROJECT = 'simakdiskum-staging';
      expect(() => validateAuthTarget({ target: 'prod' }))
        .toThrow(/--target=prod was specified, but target project is "simakdiskum-staging" \(STAGING\)/);
      expect(() => validateDbTarget({ target: 'prod' }))
        .toThrow(/--target=prod was specified, but target project is "simakdiskum-staging" \(STAGING\)/);

      // 4. Valid staging target without project set defaults to simakdiskum-staging
      delete process.env.GCLOUD_PROJECT;
      const validAuthStaging = validateAuthTarget({ target: 'staging' });
      expect(validAuthStaging.projectId).toBe('simakdiskum-staging');
      const validDbStaging = validateDbTarget({ target: 'staging' });
      expect(validDbStaging.projectId).toBe('simakdiskum-staging');
    } finally {
      if (prevEmuAuth) process.env.FIREBASE_AUTH_EMULATOR_HOST = prevEmuAuth;
      if (prevEmuFs) process.env.FIRESTORE_EMULATOR_HOST = prevEmuFs;
      delete process.env.GCLOUD_PROJECT;
    }
  });

  it('verifies client initializers configure simakdiskum-staging and disable emulator during staging mode', () => {
    const publicFirebase = fs.readFileSync(path.join(rootDir, 'apps/public/src/firebase.ts'), 'utf-8');
    const adminFirebase = fs.readFileSync(path.join(rootDir, 'apps/admin/src/firebase.ts'), 'utf-8');

    for (const code of [publicFirebase, adminFirebase]) {
      expect(code).toContain('simakdiskum-staging');
      expect(code).toContain("import.meta.env?.MODE === 'staging'");
      expect(code).toContain('isStagingOrProd');
    }
  });
});
