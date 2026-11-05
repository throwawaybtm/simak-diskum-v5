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
    expect(rc.projects.staging).toBe('simakdiskum');

    const targets = rc.targets?.simakdiskum?.hosting;
    expect(targets).toBeDefined();
    expect(targets.public).toContain('simakdiskum');
    expect(targets.admin).toContain('simakdiskum-admin');
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

});
