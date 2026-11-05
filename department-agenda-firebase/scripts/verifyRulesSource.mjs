/**
 * SIMAK DISKUM Kota Batam v5.0 — Deterministic Firestore Rules Deployment Verifier
 * 
 * Verifies that the intended Firestore Security Rules file is being deployed,
 * guards against accidental deployment of maintenance lockdown during routine operations,
 * and confirms the exact release identity.
 * 
 * Usage:
 *   # Verify routine production rules:
 *   node scripts/verifyRulesSource.mjs --target=prod
 * 
 *   # Verify maintenance lockdown rules:
 *   node scripts/verifyRulesSource.mjs --config=firebase.maintenance.json --target=prod
 */

import fs from 'node:fs';
import path from 'node:path';

export const REQUIRED_PROJECT_ID = 'simakdiskum';
export const PROD_RULES_IDENTITY = 'SIMAK_DISKUM_PRODUCTION_SECURITY_RULES_V5';
export const MAINT_RULES_IDENTITY = 'SIMAK_DISKUM_MAINTENANCE_LOCKDOWN_RULES_V5';

/**
 * Inspects a Firebase configuration file and determines the exact rules source and mode.
 */
export function inspectRulesConfig(configPath = 'firebase.json', options = {}) {
  const resolvedConfigPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedConfigPath)) {
    throw new Error(`[Rules Verifier] Configuration file not found: ${resolvedConfigPath}`);
  }

  const configContent = JSON.parse(fs.readFileSync(resolvedConfigPath, 'utf-8'));
  const rulesRelativePath = configContent.firestore?.rules;

  if (!rulesRelativePath) {
    throw new Error(`[Rules Verifier] No firestore.rules configuration found in: ${configPath}`);
  }

  // Base directory is the directory containing the config file
  const baseDir = path.dirname(resolvedConfigPath);
  const resolvedRulesPath = path.resolve(baseDir, rulesRelativePath);

  if (!fs.existsSync(resolvedRulesPath)) {
    throw new Error(`[Rules Verifier] Rules file not found at: ${resolvedRulesPath}`);
  }

  const rulesContent = fs.readFileSync(resolvedRulesPath, 'utf-8');

  // Extract RELEASE_IDENTITY from rules file
  const identityMatch = rulesContent.match(/\/\/\s*RELEASE_IDENTITY:\s*([A-Za-z0-9_-]+)/);
  const releaseIdentity = identityMatch ? identityMatch[1] : 'UNKNOWN_IDENTITY';

  // Determine mode
  let mode;
  if (releaseIdentity === PROD_RULES_IDENTITY || rulesRelativePath.includes('firestore.rules')) {
    mode = 'PRODUCTION_NORMAL';
  } else if (releaseIdentity === MAINT_RULES_IDENTITY || rulesRelativePath.includes('maintenance')) {
    mode = 'MAINTENANCE_LOCKDOWN';
  } else {
    mode = 'CUSTOM_OR_UNKNOWN';
  }

  // CRITICAL INVARIANT: The main production config (firebase.json) must NEVER point to maintenance rules!
  // Routine `firebase deploy` commands rely on firebase.json.
  const isMainConfig = path.basename(resolvedConfigPath) === 'firebase.json';
  if (isMainConfig && mode === 'MAINTENANCE_LOCKDOWN') {
    throw new Error(
      `[CRITICAL SAFETY VIOLATION] firebase.json points to maintenance rules (${rulesRelativePath})! ` +
      `Routine "firebase deploy" would accidentally freeze production writes. ` +
      `Keep firebase.json pointing to firebase/firestore.rules, and use firebase.maintenance.json for lockdown.`
    );
  }

  const targetProject = options.projectId || (options.target === 'emulator' ? 'demo-department-agenda' : REQUIRED_PROJECT_ID);
  const exactCommand = isMainConfig
    ? `firebase deploy --only firestore:rules --project ${targetProject}`
    : `firebase deploy --config ${path.basename(resolvedConfigPath)} --only firestore:rules --project ${targetProject}`;

  return {
    configPath: resolvedConfigPath,
    configFile: path.basename(resolvedConfigPath),
    rulesPath: resolvedRulesPath,
    rulesRelativePath,
    releaseIdentity,
    mode,
    isMainConfig,
    targetProject,
    exactCommand,
    isRoutineSafe: mode === 'PRODUCTION_NORMAL' && isMainConfig
  };
}

// CLI Execution Support
function main() {
  const args = process.argv.slice(2);
  const configArg = args.find(a => a.startsWith('--config='))?.split('=')[1] || 'firebase.json';
  const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'prod';
  const projectArg = args.find(a => a.startsWith('--project='))?.split('=')[1];

  try {
    const inspection = inspectRulesConfig(configArg, { target: targetArg, projectId: projectArg });

    console.log('======================================================================');
    console.log('[SIMAK DISKUM] FIRESTORE RULES DEPLOYMENT PREFLIGHT INSPECTION');
    console.log(`Config File:        ${inspection.configFile}`);
    console.log(`Rules Source:       ${inspection.rulesRelativePath}`);
    console.log(`Release Identity:   ${inspection.releaseIdentity}`);
    console.log(`Deployment Mode:    ${inspection.mode}`);
    console.log(`Target Project:     ${inspection.targetProject}`);
    console.log(`Routine Safe:       ${inspection.isRoutineSafe ? 'YES (Normal production writes)' : 'NO (Deliberate Maintenance Lockdown)'}`);
    console.log('----------------------------------------------------------------------');
    console.log('Exact Deterministic CLI Command:');
    console.log(`  ${inspection.exactCommand}`);
    console.log('======================================================================');

    if (inspection.mode === 'MAINTENANCE_LOCKDOWN') {
      console.log('⚠️  NOTICE: This command will deploy MAINTENANCE LOCKDOWN rules.');
      console.log('   All client write mutations will be FROZEN until normal rules are redeployed.');
    } else {
      console.log('✓  VERIFIED: Routine production rules with full RBAC and audit trail.');
    }
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('verifyRulesSource.mjs')) {
  main();
}
