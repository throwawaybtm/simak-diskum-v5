/**
 * SIMAK DISKUM Kota Batam v5.0 — Rules Source Selection & Determinism Unit Tests
 * 
 * Verifies Directive 1 of Milestone P02-A:
 * 1. Accurately identifies production rules in firebase.json.
 * 2. Accurately identifies maintenance rules in firebase.maintenance.json.
 * 3. Rejects any attempt where firebase.json accidentally points to maintenance rules.
 * 4. Verifies release identities and exact deterministic deployment commands.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  inspectRulesConfig,
  PROD_RULES_IDENTITY,
  MAINT_RULES_IDENTITY,
  REQUIRED_PROJECT_ID
} from '../../scripts/verifyRulesSource.mjs';

describe('Deterministic Rules Source Selection & Safety Guards', () => {
  it('correctly inspects standard production firebase.json', () => {
    const inspection = inspectRulesConfig('firebase.json', { target: 'prod' });
    expect(inspection.configFile).toBe('firebase.json');
    expect(inspection.rulesRelativePath).toBe('firebase/firestore.rules');
    expect(inspection.releaseIdentity).toBe(PROD_RULES_IDENTITY);
    expect(inspection.rulesHash).toMatch(/^[a-f0-9]{64}$/);
    expect(inspection.linesCount).toBeGreaterThan(50);
    expect(inspection.mode).toBe('PRODUCTION_NORMAL');
    expect(inspection.isRoutineSafe).toBe(true);
    expect(inspection.exactCommand).toBe(`firebase deploy --only firestore:rules --project ${REQUIRED_PROJECT_ID}`);
  });

  it('correctly inspects dedicated firebase.maintenance.json', () => {
    const inspection = inspectRulesConfig('firebase.maintenance.json', { target: 'prod' });
    expect(inspection.configFile).toBe('firebase.maintenance.json');
    expect(inspection.rulesRelativePath).toBe('firebase/firestore.maintenance.rules');
    expect(inspection.releaseIdentity).toBe(MAINT_RULES_IDENTITY);
    expect(inspection.rulesHash).toMatch(/^[a-f0-9]{64}$/);
    expect(inspection.linesCount).toBeGreaterThan(20);
    expect(inspection.mode).toBe('MAINTENANCE_LOCKDOWN');
    expect(inspection.isRoutineSafe).toBe(false);
    expect(inspection.exactCommand).toBe(
      `firebase deploy --config firebase.maintenance.json --only firestore:rules --project ${REQUIRED_PROJECT_ID}`
    );
  });

  it('blocks execution if firebase.json is accidentally corrupted or points to maintenance rules', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-guard-test-'));
    try {
      const corruptedConfigPath = path.join(tempDir, 'firebase.json');
      const mockRulesPath = path.join(tempDir, 'firestore.maintenance.rules');
      fs.writeFileSync(mockRulesPath, `// RELEASE_IDENTITY: ${MAINT_RULES_IDENTITY}\nrules_version = '2';`, 'utf-8');

      fs.writeFileSync(
        corruptedConfigPath,
        JSON.stringify({
          firestore: { rules: 'firestore.maintenance.rules' }
        }),
        'utf-8'
      );

      expect(() => inspectRulesConfig(corruptedConfigPath)).toThrow(/CRITICAL SAFETY VIOLATION/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
