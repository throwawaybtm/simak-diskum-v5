/**
 * SIMAK DISKUM Kota Batam v5.0 — Milestone S06-B Security Wire-Level Audit Suite
 * 
 * Objectives:
 * 1. Verify deployed rules SHA-256 and RELEASE_IDENTITY on simakdiskum-staging match local rules.
 * 2. Unauthenticated clean-context browser network packet audit on staging Public Portal.
 * 3. Inspect raw Firestore wire payloads for zero private field leaks.
 * 4. Verify unauthenticated clean-context browser on staging Admin Portal (0 Firestore reads before auth).
 * 5. Direct REST probes against all 12 collection endpoints (unauthenticated read denial).
 * 6. Direct REST probes with known baseline IDs against private /activities/{id} (403 Forbidden).
 * 7. In-page anonymous client-side read probe against private collections (403 Forbidden).
 */

import { chromium } from 'playwright';
import { GoogleAuth } from 'google-auth-library';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const STAGING_PROJECT_ID = 'simakdiskum-staging';
const PUBLIC_PORTAL_URL = 'https://simakdiskum-staging.web.app';
const ADMIN_PORTAL_URL = 'https://simakdiskum-staging-admin.web.app';
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${STAGING_PROJECT_ID}/databases/(default)/documents`;

const auditResults = {
  timestamp: new Date().toISOString(),
  targetProject: STAGING_PROJECT_ID,
  tests: []
};

function recordTest(id, name, status, details, evidence = {}) {
  const result = { id, name, status, details, evidence };
  auditResults.tests.push(result);
  console.log(`[${status}] ${id}: ${name} — ${details}`);
}

async function runAudit() {
  console.log('===============================================================');
  console.log('SIMAK DISKUM v5.0 — S06-B SECURITY WIRE-LEVEL AUDIT');
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
  // 4. REST DATA PAYLOAD SANITIZATION INSPECTION (Scope 4 & 5)
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Public Data Payload Deep Field Inspection ---');
  try {
    const pubRes = await fetch(`${FIRESTORE_REST_BASE}/publicActivities`);
    const pubData = await pubRes.json();
    const docs = pubData.documents || [];

    const SENSITIVE_KEYWORDS = [
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
      'zoom.us',
      'teams.microsoft'
    ];

    let leakFound = false;
    const observedKeys = new Set();
    const leakInstances = [];

    for (const doc of docs) {
      const jsonStr = JSON.stringify(doc.fields || {});
      Object.keys(doc.fields || {}).forEach(k => observedKeys.add(k));

      for (const kw of SENSITIVE_KEYWORDS) {
        if (jsonStr.toLowerCase().includes(kw.toLowerCase())) {
          leakFound = true;
          leakInstances.push({ doc: doc.name.split('/').pop(), keyword: kw });
        }
      }
    }

    recordTest(
      'TC-PAYLOAD-01',
      'Public Payload Deep Inspection (No Sensitive Substrings)',
      !leakFound ? 'PASS' : 'FAIL',
      !leakFound
        ? `Inspected ${docs.length} public documents across ${observedKeys.size} unique fields; 0 sensitive leaks found`
        : `Found ${leakInstances.length} sensitive string occurrences in public payload`,
      {
        totalDocs: docs.length,
        allowedFields: Array.from(observedKeys).sort(),
        leakCount: leakInstances.length
      }
    );
  } catch (err) {
    recordTest('TC-PAYLOAD-01', 'Public Payload Deep Inspection', 'FAIL', err.message);
  }

  // -----------------------------------------------------------------
  // 5. BROWSER WIRE-LEVEL AUDIT: PUBLIC PORTAL (Scope 2, 3, 4)
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Browser Network Wire Audit (Public Portal) ---');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const networkRequests = [];
    page.on('request', (req) => {
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType()
      });
    });

    await page.goto(PUBLIC_PORTAL_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.header-container', { timeout: 15000 });
    await page.waitForTimeout(3000);

    const privateCollectionCalls = networkRequests.filter(r =>
      r.url.includes('/activities') ||
      r.url.includes('/auditLogs') ||
      r.url.includes('/employees') ||
      r.url.includes('/departments') ||
      r.url.includes('/settings')
    );

    recordTest(
      'TC-WIRE-PUB-01',
      'Public Portal Network Isolation (No Private Collection Requests)',
      privateCollectionCalls.length === 0 ? 'PASS' : 'FAIL',
      privateCollectionCalls.length === 0
        ? `Browser dispatched ${networkRequests.length} total network requests; exactly 0 targeted private Firestore collections`
        : `Detected ${privateCollectionCalls.length} requests targeting private endpoints`,
      { totalRequests: networkRequests.length, privateCollectionCalls }
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
  // 6. BROWSER WIRE-LEVEL AUDIT: ADMIN PORTAL UNANIMOUS / PRE-AUTH (Scope 8)
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
}

runAudit();
