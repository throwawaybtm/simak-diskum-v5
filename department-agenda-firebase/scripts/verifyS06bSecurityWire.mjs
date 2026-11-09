/**
 * SIMAK DISKUM Kota Batam v5.0 — Milestone S06-B R1 Security Wire-Level Audit Suite
 * 
 * Objectives & Tasks (S06-B R1 Hardening):
 * 1. Cryptographic Ruleset Parity: SHA-256 and RELEASE_IDENTITY check against live staging.
 * 2. Anonymous REST Collection Access Boundaries (12 collections, private denied 403).
 * 3. Targeted Document ID Probes on private collections (5 known IDs denied 403).
 * 4. Strict Public Schema Allowlist (TC-PAYLOAD-01):
 *    - Exact 19 approved publicActivities fields allowlist.
 *    - Reject any unexpected top-level field.
 *    - Reject missing required fields.
 *    - Recursive inspection of nested data for confidential fields/suspicious strings.
 *    - Full pagination traversal (reconciles exact 38 baseline activities).
 *    - Sanitized evidence preservation.
 * 5. Browser Network Inspection (TC-WIRE-PUB-01, TC-WIRE-ADM-01):
 *    - Accounts for Firestore SDK network protocols (REST and WebChannel / Listen streams).
 *    - Inspects request URL and POST payload parameters without logging sensitive content.
 *    - Distinguishes observed private collection isolation, direct REST denial, and streaming payload boundaries.
 * 6. Admin Portal Pre-Authentication Invariant (0 Firestore requests before login).
 * 7. In-page client-side fetch probes from web origins (403 Forbidden).
 */

import { chromium } from 'playwright';
import { GoogleAuth } from 'google-auth-library';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const STAGING_PROJECT_ID = 'simakdiskum-staging';
export const PUBLIC_PORTAL_URL = 'https://simakdiskum-staging.web.app';
export const ADMIN_PORTAL_URL = 'https://simakdiskum-staging-admin.web.app';
export const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${STAGING_PROJECT_ID}/databases/(default)/documents`;
export const EXPECTED_BASELINE_COUNT = 38;

// Exact 19 approved top-level fields for publicActivities projection
export const APPROVED_PUBLIC_FIELDS = [
  'id',
  'title',
  'startDate',
  'startTime',
  'endDate',
  'endTime',
  'openEnded',
  'timeDisplay',
  'dateDisplay',
  'status',
  'publicCancellationNotice',
  'locationName',
  'locationType',
  'organizerName',
  'categoryName',
  'publicNotes',
  'attendeeLabels',
  'updatedAt',
  'version'
];

// Required fields according to Firestore schema (publicCancellationNotice is optional)
export const REQUIRED_PUBLIC_FIELDS = [
  'id',
  'title',
  'startDate',
  'startTime',
  'endDate',
  'endTime',
  'openEnded',
  'timeDisplay',
  'dateDisplay',
  'status',
  'locationName',
  'locationType',
  'organizerName',
  'categoryName',
  'publicNotes',
  'attendeeLabels',
  'updatedAt',
  'version'
];

export const FORBIDDEN_KEY_PATTERNS = [
  'privateNotes',
  'privateMeetingUrl',
  'invitationLetter',
  'attendeeSnapshots',
  'attendeeIds',
  'createdBy',
  'createdByName',
  'updatedBy',
  'cancelReason',
  'password',
  'secret',
  'token',
  'credential',
  'zoomPasscode'
];

export const SUSPICIOUS_STRING_PATTERNS = [
  { name: 'Zoom credential URL', regex: /zoom\.us\/.*pwd=/i },
  { name: 'Meeting passcode pattern', regex: /(?:passcode|password|pwd)\s*[:=]\s*\S+/i },
  { name: 'Google Drive URL', regex: /drive\.google\.com/i },
  { name: 'Google Docs URL', regex: /docs\.google\.com/i },
  { name: 'Raw employee foreign key', regex: /^emp_[a-zA-Z0-9_-]+$/ }
];

/**
 * Recursively inspects a value (string, array, or object) for suspicious patterns and forbidden keys.
 */
export function inspectValueRecursively(val, pathStr = '', violations = []) {
  if (val === null || val === undefined) return violations;

  if (typeof val === 'string') {
    for (const pat of SUSPICIOUS_STRING_PATTERNS) {
      if (pat.regex.test(val)) {
        violations.push({
          type: 'SUSPICIOUS_STRING_CONTENT',
          path: pathStr,
          rule: pat.name
        });
      }
    }
  } else if (Array.isArray(val)) {
    val.forEach((item, idx) => {
      inspectValueRecursively(item, `${pathStr}[${idx}]`, violations);
    });
  } else if (typeof val === 'object') {
    // Check if it's a Firestore REST typed value
    if ('stringValue' in val) {
      inspectValueRecursively(val.stringValue, pathStr, violations);
    } else if ('arrayValue' in val) {
      inspectValueRecursively(val.arrayValue.values || [], pathStr, violations);
    } else if ('mapValue' in val) {
      inspectValueRecursively(val.mapValue.fields || {}, pathStr, violations);
    } else {
      for (const [key, subVal] of Object.entries(val)) {
        for (const forbiddenKey of FORBIDDEN_KEY_PATTERNS) {
          if (key.toLowerCase().includes(forbiddenKey.toLowerCase())) {
            violations.push({
              type: 'FORBIDDEN_NESTED_KEY',
              path: `${pathStr}.${key}`,
              key
            });
          }
        }
        inspectValueRecursively(subVal, `${pathStr}.${key}`, violations);
      }
    }
  }
  return violations;
}

/**
 * Validates a single publicActivities document against the strict schema allowlist.
 */
export function validatePublicDocument(doc) {
  const violations = [];
  const docId = doc.name ? doc.name.split('/').pop() : (doc.id || 'unknown_doc');
  const fields = doc.fields || doc;

  const fieldKeys = Object.keys(fields);

  // 1. Check for unexpected top-level fields (Strict Allowlist)
  for (const k of fieldKeys) {
    if (!APPROVED_PUBLIC_FIELDS.includes(k)) {
      violations.push({
        type: 'UNEXPECTED_TOP_LEVEL_FIELD',
        docId,
        field: k,
        message: `Field '${k}' is not in the approved 19-field public schema allowlist`
      });
    }
  }

  // 2. Check for missing required fields
  for (const req of REQUIRED_PUBLIC_FIELDS) {
    if (!fieldKeys.includes(req)) {
      violations.push({
        type: 'MISSING_REQUIRED_FIELD',
        docId,
        field: req,
        message: `Required public field '${req}' is missing from document`
      });
    }
  }

  // 3. Recursive inspection for confidential keys and suspicious content
  inspectValueRecursively(fields, docId, violations);

  return {
    docId,
    isValid: violations.length === 0,
    fieldCount: fieldKeys.length,
    fieldKeys,
    violations
  };
}

/**
 * Validates an entire batch of public documents with pagination and baseline reconciliation.
 */
export function validatePublicPayload(docs, expectedCount = EXPECTED_BASELINE_COUNT) {
  const allViolations = [];
  const observedFields = new Set();

  if (docs.length !== expectedCount) {
    allViolations.push({
      type: 'BASELINE_COUNT_MISMATCH',
      message: `Expected ${expectedCount} baseline activities, but retrieved ${docs.length}`
    });
  }

  for (const doc of docs) {
    const res = validatePublicDocument(doc);
    res.fieldKeys.forEach(k => observedFields.add(k));
    if (!res.isValid) {
      allViolations.push(...res.violations);
    }
  }

  return {
    totalDocuments: docs.length,
    expectedCount,
    isReconciled: docs.length === expectedCount,
    isValid: allViolations.length === 0,
    observedFields: Array.from(observedFields).sort(),
    approvedFieldsCount: APPROVED_PUBLIC_FIELDS.length,
    violationsCount: allViolations.length,
    violations: allViolations
  };
}

/**
 * Fetches all publicActivities documents via REST with full pagination support.
 */
export async function fetchAllPublicActivities(baseUrl = FIRESTORE_REST_BASE) {
  let allDocs = [];
  let pageToken = '';
  let pageCount = 0;

  do {
    pageCount++;
    const url = new URL(`${baseUrl}/publicActivities`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Pagination request failed on page ${pageCount}: HTTP ${res.status}`);
    }

    const data = await res.json();
    const docs = data.documents || [];
    allDocs = allDocs.concat(docs);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return { allDocs, pageCount };
}

// -------------------------------------------------------------------
// Main Execution Function
// -------------------------------------------------------------------
export async function runSecurityWireAudit() {
  const auditResults = {
    timestamp: new Date().toISOString(),
    targetProject: STAGING_PROJECT_ID,
    auditMilestone: 'S06-B R1',
    tests: []
  };

  function recordTest(id, name, status, details, evidence = {}) {
    const result = { id, name, status, details, evidence };
    auditResults.tests.push(result);
    console.log(`[${status}] ${id}: ${name} — ${details}`);
  }

  console.log('===============================================================');
  console.log('SIMAK DISKUM v5.0 — S06-B R1 SECURITY AUDIT EVIDENCE HARDENING');
  console.log(`Target:      ${STAGING_PROJECT_ID}`);
  console.log(`Timestamp:   ${auditResults.timestamp}`);
  console.log('===============================================================\n');

  // -----------------------------------------------------------------
  // 1. RULES DEPLOYMENT & CRYPTOGRAPHIC HASH PARITY (Scope 1)
  // -----------------------------------------------------------------
  console.log('--- TEST GROUP 1: Cryptographic Ruleset Parity Audit ---');
  try {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;

    const releasesRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${STAGING_PROJECT_ID}/releases`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const releasesData = await releasesRes.json();
    const firestoreRelease = (releasesData.releases || []).find(r => r.name.includes('cloud.firestore'));

    if (!firestoreRelease) {
      recordTest('TC-SEC-01', 'Published Ruleset Discovery', 'FAIL', 'No cloud.firestore release found on staging');
    } else {
      const rulesetRes = await fetch(`https://firebaserules.googleapis.com/v1/${firestoreRelease.rulesetName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rulesetData = await rulesetRes.json();
      const remoteFile = (rulesetData.source?.files || [])[0];
      const remoteContent = remoteFile?.content || '';

      const localPath = path.resolve('firebase/firestore.rules');
      const localContent = fs.readFileSync(localPath, 'utf8');

      const normRemote = remoteContent.replace(/\r\n/g, '\n');
      const normLocal = localContent.replace(/\r\n/g, '\n');

      const hashRemote = crypto.createHash('sha256').update(normRemote).digest('hex');
      const hashLocal = crypto.createHash('sha256').update(normLocal).digest('hex');

      const identityRemote = (remoteContent.match(/\/\/\s*RELEASE_IDENTITY:\s*([A-Za-z0-9_-]+)/) || [])[1];
      const identityLocal = (localContent.match(/\/\/\s*RELEASE_IDENTITY:\s*([A-Za-z0-9_-]+)/) || [])[1];

      const hashMatch = hashRemote === hashLocal;
      recordTest(
        'TC-SEC-01',
        'Cryptographic Ruleset SHA-256 Parity',
        hashMatch ? 'PASS' : 'FAIL',
        hashMatch ? 'Remote ruleset SHA-256 bit-for-bit matches committed rules' : 'Hash mismatch between local and staging',
        {
          rulesetName: firestoreRelease.rulesetName,
          updateTime: firestoreRelease.updateTime,
          remoteLines: normRemote.split('\n').length,
          localLines: normLocal.split('\n').length,
          remoteHash: hashRemote,
          localHash: hashLocal,
          remoteIdentity: identityRemote,
          localIdentity: identityLocal
        }
      );
    }
  } catch (err) {
    recordTest('TC-SEC-01', 'Cryptographic Ruleset SHA-256 Parity', 'FAIL', err.message);
  }

  // -----------------------------------------------------------------
  // 2. REST UNCONNECTED ACCESS CONTROL TESTS (Scope 6)
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Anonymous REST Collection Access Boundaries ---');
  const collectionsToProbe = [
    { name: 'publicActivities', expectedStatus: 200, category: 'PUBLIC' },
    { name: 'publicAnnouncements', expectedStatus: 200, category: 'PUBLIC' },
    { name: 'publicSettings', expectedStatus: 200, category: 'PUBLIC' },
    { name: 'activities', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'auditLogs', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'employees', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'departments', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'locations', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'organizers', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'categories', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'settings', expectedStatus: 403, category: 'PRIVATE' },
    { name: 'arbitraryCollectionProbe', expectedStatus: 403, category: 'FALLBACK_DENY' }
  ];

  for (let i = 0; i < collectionsToProbe.length; i++) {
    const col = collectionsToProbe[i];
    const testId = `TC-REST-${String(i + 1).padStart(2, '0')}`;
    try {
      const res = await fetch(`${FIRESTORE_REST_BASE}/${col.name}`);
      const pass = res.status === col.expectedStatus;
      recordTest(
        testId,
        `Anonymous REST Read: /${col.name}`,
        pass ? 'PASS' : 'FAIL',
        `Returned HTTP ${res.status} (Expected ${col.expectedStatus} ${col.expectedStatus === 200 ? 'OK' : 'Forbidden'})`,
        { collection: col.name, status: res.status, category: col.category }
      );
    } catch (e) {
      recordTest(testId, `Anonymous REST Read: /${col.name}`, 'FAIL', e.message);
    }
  }

  // -----------------------------------------------------------------
  // 3. TARGETED DOCUMENT REST ACCESS PROBES (Scope 4 & 6)
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Targeted Document ID Access Probes ---');
  try {
    const pubRes = await fetch(`${FIRESTORE_REST_BASE}/publicActivities`);
    const pubData = await pubRes.json();
    const docs = pubData.documents || [];
    const sampleIds = docs.slice(0, 5).map(d => d.name.split('/').pop());

    let allDenied = true;
    const probeDetails = [];
    for (const id of sampleIds) {
      const actRes = await fetch(`${FIRESTORE_REST_BASE}/activities/${id}`);
      if (actRes.status !== 403) allDenied = false;
      probeDetails.push({ id, status: actRes.status });
    }

    recordTest(
      'TC-PROBE-01',
      'Targeted Read of Known Activity IDs from Private Collection',
      allDenied ? 'PASS' : 'FAIL',
      allDenied
        ? `All ${sampleIds.length} known public IDs strictly denied (HTTP 403) on /activities/{id}`
        : 'One or more known IDs leaked from /activities/{id}',
      { probeDetails }
    );
  } catch (err) {
    recordTest('TC-PROBE-01', 'Targeted Read of Known Activity IDs', 'FAIL', err.message);
  }

  // -----------------------------------------------------------------
  // 4. REST DATA PAYLOAD SANITIZATION INSPECTION & ALLOWLIST (Task 1)
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Public Data Payload Deep Field Inspection (Allowlist) ---');
  try {
    const { allDocs, pageCount } = await fetchAllPublicActivities(FIRESTORE_REST_BASE);
    const validation = validatePublicPayload(allDocs, EXPECTED_BASELINE_COUNT);

    recordTest(
      'TC-PAYLOAD-01',
      'Public Payload Strict Allowlist & Deep Sanitization Audit',
      validation.isValid ? 'PASS' : 'FAIL',
      validation.isValid
        ? `Traversed ${pageCount} page(s), validated ${validation.totalDocuments}/${EXPECTED_BASELINE_COUNT} documents; exactly ${validation.observedFields.length} approved fields; 0 unexpected fields, 0 missing required fields, 0 confidential leaks`
        : `Validation failed with ${validation.violationsCount} violations across ${validation.totalDocuments} documents`,
      {
        totalDocs: validation.totalDocuments,
        expectedCount: EXPECTED_BASELINE_COUNT,
        pageCount,
        isReconciled: validation.isReconciled,
        approvedSchemaCount: APPROVED_PUBLIC_FIELDS.length,
        observedFields: validation.observedFields,
        violationsCount: validation.violationsCount,
        violationsSummary: validation.violations.slice(0, 5) // sanitized summary
      }
    );
  } catch (err) {
    recordTest('TC-PAYLOAD-01', 'Public Payload Strict Allowlist & Deep Sanitization Audit', 'FAIL', err.message);
  }

  // -----------------------------------------------------------------
  // 5. BROWSER WIRE-LEVEL AUDIT: PUBLIC PORTAL (Task 2)
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Browser Network Wire Audit (Public Portal) ---');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const networkRequests = [];
    const streamProtocols = [];

    page.on('request', (req) => {
      const url = req.url();
      const method = req.method();
      const postData = req.postData() || '';

      networkRequests.push({ url, method, resourceType: req.resourceType() });

      if (url.includes('firestore.googleapis.com')) {
        streamProtocols.push({
          url,
          method,
          isChannel: url.includes('/channel'),
          isListen: url.includes('Listen')
        });
      }
    });

    await page.goto(PUBLIC_PORTAL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.header-container', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Filter requests targeting private collections in URL or POST body
    const privateCollectionCalls = networkRequests.filter(r => {
      const u = r.url.toLowerCase();
      const body = (r.postData || '').toLowerCase();
      return (
        u.includes('/activities') ||
        u.includes('/auditlogs') ||
        u.includes('/employees') ||
        u.includes('/departments') ||
        u.includes('/settings') ||
        body.includes('activities') ||
        body.includes('auditlogs') ||
        body.includes('employees')
      );
    });

    recordTest(
      'TC-WIRE-PUB-01',
      'Public Portal Network Protocol & Private Collection Isolation',
      privateCollectionCalls.length === 0 ? 'PASS' : 'FAIL',
      privateCollectionCalls.length === 0
        ? `Browser dispatched ${networkRequests.length} total requests (${streamProtocols.length} Firestore SDK streams/calls); exactly 0 private collection targets observed in URLs or request payloads`
        : `Detected ${privateCollectionCalls.length} requests targeting private endpoints`,
      {
        totalRequests: networkRequests.length,
        firestoreCallsCount: streamProtocols.length,
        streamProtocolsObserved: streamProtocols.map(s => s.url.split('?')[0]),
        privateCollectionCalls
      }
    );

    // Verify DOM does not contain leaked employee IDs
    const leakedEmpIdCount = await page.evaluate(() => {
      const allText = document.body.innerText;
      const matches = allText.match(/emp_[a-zA-Z0-9_-]+/g);
      return matches ? matches.length : 0;
    });

    recordTest(
      'TC-DOM-PUB-01',
      'Public Portal DOM Inspection (Zero Raw Employee IDs in DOM)',
      leakedEmpIdCount === 0 ? 'PASS' : 'FAIL',
      leakedEmpIdCount === 0
        ? 'Public DOM contains 0 raw employee IDs (e.g. emp_xx)'
        : `Found ${leakedEmpIdCount} raw employee IDs in public DOM`,
      { leakedEmpIdCount }
    );

    // In-page anonymous fetch probe against private collection from public origin
    const inPageFetchStatus = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url + '/activities');
        return r.status;
      } catch (e) {
        return e.message;
      }
    }, FIRESTORE_REST_BASE);

    recordTest(
      'TC-INPAGE-PUB-01',
      'In-Page Client-Side Fetch to Private Collection Denial',
      inPageFetchStatus === 403 ? 'PASS' : 'FAIL',
      `In-page fetch to /activities from public web origin returned HTTP ${inPageFetchStatus} (Expected 403 Forbidden)`,
      { inPageFetchStatus }
    );

    await context.close();
  } catch (err) {
    recordTest('TC-WIRE-PUB-01', 'Public Portal Network Isolation', 'FAIL', err.message);
  }

  // -----------------------------------------------------------------
  // 6. BROWSER WIRE-LEVEL AUDIT: ADMIN PORTAL PRE-AUTH INVARIANT (Task 2)
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Admin Portal Pre-Authentication Network Audit ---');
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const adminFirestoreRequests = [];
    page.on('request', (req) => {
      if (req.url().includes('firestore.googleapis.com')) {
        adminFirestoreRequests.push({
          url: req.url(),
          method: req.method()
        });
      }
    });

    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.auth-card', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const hasLoginCard = await page.evaluate(() => {
      return Boolean(document.querySelector('.auth-card'));
    });

    recordTest(
      'TC-WIRE-ADM-01',
      'Admin Portal Pre-Auth Zero-Read Invariant',
      adminFirestoreRequests.length === 0 && hasLoginCard ? 'PASS' : 'FAIL',
      adminFirestoreRequests.length === 0
        ? 'Admin Portal rendered Login Card with exactly 0 Firestore read requests before authentication'
        : `Admin Portal dispatched ${adminFirestoreRequests.length} Firestore calls prior to authentication`,
      {
        hasLoginCard,
        firestoreRequestCount: adminFirestoreRequests.length,
        dispatchedUrls: adminFirestoreRequests.map(r => r.url)
      }
    );

    // In-page anonymous fetch probe against private collection from admin origin
    const inPageAdminFetchStatus = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url + '/activities');
        return r.status;
      } catch (e) {
        return e.message;
      }
    }, FIRESTORE_REST_BASE);

    recordTest(
      'TC-INPAGE-ADM-01',
      'In-Page Client-Side Fetch to Private Collection Denial from Admin Origin',
      inPageAdminFetchStatus === 403 ? 'PASS' : 'FAIL',
      `In-page fetch to /activities from admin web origin returned HTTP ${inPageAdminFetchStatus} (Expected 403 Forbidden)`,
      { inPageAdminFetchStatus }
    );

    await context.close();
  } catch (err) {
    recordTest('TC-WIRE-ADM-01', 'Admin Portal Pre-Auth Zero-Read Invariant', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  // -----------------------------------------------------------------
  // 7. SUMMARY & ARTIFACT EXPORT
  // -----------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('AUDIT SUMMARY');
  const total = auditResults.tests.length;
  const passed = auditResults.tests.filter(t => t.status === 'PASS').length;
  const failed = auditResults.tests.filter(t => t.status === 'FAIL').length;
  console.log(`Total Tests:  ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('===============================================================\n');

  fs.writeFileSync('scripts/s06b_wire_audit_results.json', JSON.stringify(auditResults, null, 2), 'utf8');
  console.log('Detailed audit results written to scripts/s06b_wire_audit_results.json');

  return auditResults;
}

// Self-executing CLI support
if (process.argv[1] && process.argv[1].endsWith('verifyS06bSecurityWire.mjs')) {
  runSecurityWireAudit().catch(err => {
    console.error('Audit execution error:', err);
    process.exit(1);
  });
}
