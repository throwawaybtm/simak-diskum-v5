import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 1: Monorepo & Firebase Configuration Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('verifies package.json workspaces configuration', () => {
    const pkgPath = path.join(rootDir, 'package.json');
    expect(fs.existsSync(pkgPath), 'package.json must exist').toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.workspaces).toBeDefined();
    expect(pkg.workspaces).toContain('apps/*');
    expect(pkg.workspaces).toContain('shared');
  });

  it('verifies firebase.json multi-site hosting and emulator configuration', () => {
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    expect(fs.existsSync(firebaseJsonPath), 'firebase.json must exist').toBe(true);
    const fb = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));

    // Check hosting targets
    expect(Array.isArray(fb.hosting)).toBe(true);
    expect(fb.hosting.length).toBe(2);

    const publicTarget = fb.hosting.find((h: any) => h.target === 'public');
    const adminTarget = fb.hosting.find((h: any) => h.target === 'admin');

    expect(publicTarget).toBeDefined();
    expect(publicTarget.public).toBe('apps/public/dist');
    expect(publicTarget.rewrites).toEqual([{ source: '**', destination: '/index.html' }]);

    expect(adminTarget).toBeDefined();
    expect(adminTarget.public).toBe('apps/admin/dist');
    expect(adminTarget.rewrites).toEqual([{ source: '**', destination: '/index.html' }]);

    // Check Firestore rules and indexes configuration
    expect(fb.firestore).toBeDefined();
    expect(fb.firestore.rules).toBe('firebase/firestore.rules');
    expect(fb.firestore.indexes).toBe('firebase/firestore.indexes.json');

    // Check emulator configuration
    expect(fb.emulators).toBeDefined();
    expect(fb.emulators.firestore).toBeDefined();
    expect(fb.emulators.firestore.port).toBe(8080);
    expect(fb.emulators.hosting).toBeDefined();
    expect(fb.emulators.hosting.port).toBe(5000);
  });

  it('verifies strict deny-by-default hosted rules and separate emulator rules', () => {
    const hostedRulesPath = path.join(rootDir, 'firebase', 'firestore.rules');
    const emulatorRulesPath = path.join(rootDir, 'firebase', 'emulator.rules');

    expect(fs.existsSync(hostedRulesPath), 'Hosted firestore.rules must exist').toBe(true);
    expect(fs.existsSync(emulatorRulesPath), 'Emulator emulator.rules must exist').toBe(true);

    const hostedRules = fs.readFileSync(hostedRulesPath, 'utf8');
    expect(hostedRules).toContain("rules_version = '2'");
    expect(hostedRules).toContain('match /publicActivities/{id}');
    expect(hostedRules).toContain('allow read: if true;');
    expect(hostedRules).toContain('allow write: if false;');
    expect(hostedRules).toContain('match /{document=**}');
    expect(hostedRules).toContain('allow read, write: if false;');
    expect(hostedRules).not.toContain('allow write: if true');
  });

  it('verifies apps/public scaffolding and entrypoint', () => {
    const publicDir = path.join(rootDir, 'apps', 'public');
    expect(fs.existsSync(path.join(publicDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'vite.config.ts'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'src', 'main.ts'))).toBe(true);
  });

  it('verifies apps/admin scaffolding and entrypoint', () => {
    const adminDir = path.join(rootDir, 'apps', 'admin');
    expect(fs.existsSync(path.join(adminDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(adminDir, 'vite.config.ts'))).toBe(true);
    expect(fs.existsSync(path.join(adminDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(adminDir, 'src', 'main.ts'))).toBe(true);
  });

  it('verifies shared package scaffolding', () => {
    const sharedDir = path.join(rootDir, 'shared');
    expect(fs.existsSync(path.join(sharedDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(sharedDir, 'src', 'index.ts'))).toBe(true);
  });

  it('verifies successful build artifacts for public and admin applications', () => {
    const publicDist = path.join(rootDir, 'apps', 'public', 'dist');
    const adminDist = path.join(rootDir, 'apps', 'admin', 'dist');

    expect(fs.existsSync(path.join(publicDist, 'index.html')), 'public dist/index.html exists').toBe(true);
    expect(fs.existsSync(path.join(adminDist, 'index.html')), 'admin dist/index.html exists').toBe(true);
  });
});
