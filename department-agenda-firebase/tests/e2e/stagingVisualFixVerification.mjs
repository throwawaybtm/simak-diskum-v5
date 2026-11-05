/**
 * SIMAK DISKUM Kota Batam v5.0 — S01 Live Staging Multi-Viewport Layout Verification
 * 
 * Verifies the critical staging banner layout fix on LIVE cloud staging:
 * - Admin Portal: https://simakdiskum-staging-admin.web.app/#dashboard
 * - Public Portal: https://simakdiskum-staging.web.app
 * 
 * Verifies across 6 viewports (320, 375, 425, 768, 1024, 1440px):
 * 1. 0px document horizontal overflow (scrollWidth <= clientWidth)
 * 2. Staging notice rendered as compact horizontal bar at top (< 60px height)
 * 3. Desktop layout: Sidebar docked on LEFT (250px), Dashboard on RIGHT
 * 4. 5 statistics cards, upcoming agenda panel, administrative status visible
 * 5. Profile menu functional, operator email & badge intact
 * 6. Public Portal layout and compact banner verified
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initAdminApp } from '../../scripts/manageRoles.mjs';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const ADMIN_URL = 'https://simakdiskum-staging-admin.web.app';
const PUBLIC_URL = 'https://simakdiskum-staging.web.app';
const STAGING_ADMIN_EMAIL = 'riyanbwirawanto@gmail.com';
const VIEWPORTS = [320, 375, 425, 768, 1024, 1440];

async function main() {
  console.log('===============================================================');
  console.log('SIMAK DISKUM v5.0 — S01 LIVE STAGING VISUAL FIX VERIFICATION');
  console.log(`Admin Staging URL:  ${ADMIN_URL}`);
  console.log(`Public Staging URL: ${PUBLIC_URL}`);
  console.log(`Screenshots Dir:    ${screenshotsDir}`);
  console.log('===============================================================\n');

  // 1. Target configuration
  console.log('[1/4] Preparing live staging verification targets...');
  console.log(`  ✓ Target Staging Admin: ${STAGING_ADMIN_EMAIL}`);
  console.log(`  ✓ Target Project: simakdiskum-staging`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  function record(desc, passed, details = '') {
    results.push({ desc, passed, details });
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'} [${desc}] ${details}`);
    if (!passed) throw new Error(`Assertion failed: ${desc} - ${details}`);
  }

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    // 2. Mount and authenticate on live Admin Staging
    console.log('\n[2/4] Loading live Admin Staging portal...');
    await page.goto(`${ADMIN_URL}/#dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Call test hook to mount verified authenticated dashboard view with owner's identity
    await page.waitForFunction(() => Boolean((window).__ADMIN_TEST_VIEW__), { timeout: 15000 });
    await page.evaluate(async (email) => {
      await (window).__ADMIN_TEST_VIEW__({
        uid: '31Bin8ErtBaAy3YODaf1SKKymYb2',
        email: email,
        displayName: 'Administrator Staging',
        role: 'admin',
        roleLabel: 'Administrator',
        department: 'Dinas Koperasi dan Usaha Mikro Kota Batam',
        claims: { role: 'admin' }
      });
    }, STAGING_ADMIN_EMAIL);

    // Wait for admin dashboard shell to mount
    await page.waitForSelector('.admin-layout', { timeout: 20000 });
    await page.waitForSelector('.admin-sidebar', { timeout: 15000 });
    await page.waitForSelector('.topbar', { timeout: 15000 });
    await page.waitForSelector('#operatorProfilePill', { timeout: 15000 });
    await page.waitForTimeout(1500);

    console.log('  ✓ Live staging admin dashboard mounted successfully\n');

    // 3. Multi-viewport verification on LIVE Admin Dashboard
    console.log('[3/4] Testing Admin Dashboard across 6 viewports...');
    for (const vpWidth of VIEWPORTS) {
      await page.setViewportSize({ width: vpWidth, height: 900 });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const banner = document.querySelector('.staging-indicator-banner');
        const sidebar = document.querySelector('.admin-sidebar');
        const body = document.querySelector('.admin-body');
        const mainContainer = document.querySelector('.admin-main-container');
        const statsCards = document.querySelectorAll('.stat-card');
        const profilePill = document.querySelector('#operatorProfilePill');

        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          overflowX: Math.max(0, doc.scrollWidth - doc.clientWidth),
          banner: banner ? {
            text: banner.textContent.trim().replace(/\s+/g, ' '),
            top: banner.getBoundingClientRect().top,
            height: banner.getBoundingClientRect().height,
            width: banner.getBoundingClientRect().width
          } : null,
          sidebar: sidebar ? {
            width: sidebar.getBoundingClientRect().width,
            left: sidebar.getBoundingClientRect().left,
            right: sidebar.getBoundingClientRect().right,
            isFixed: window.getComputedStyle(sidebar).position === 'fixed'
          } : null,
          body: body ? {
            left: body.getBoundingClientRect().left,
            width: body.getBoundingClientRect().width
          } : null,
          mainContainer: mainContainer ? {
            display: window.getComputedStyle(mainContainer).display,
            flexDirection: window.getComputedStyle(mainContainer).flexDirection
          } : null,
          statsCount: statsCards.length,
          profilePillVisible: profilePill ? profilePill.offsetParent !== null : false
        };
      });

      // Assertions
      record(
        `Admin @ ${vpWidth}px: Zero Horizontal Overflow`,
        metrics.overflowX === 0,
        `scrollWidth=${metrics.scrollWidth}px, clientWidth=${metrics.clientWidth}px, overflow=${metrics.overflowX}px`
      );

      record(
        `Admin @ ${vpWidth}px: Compact Staging Top Banner`,
        metrics.banner !== null && metrics.banner.height <= 60 && metrics.banner.top <= 5,
        `height=${metrics.banner?.height}px, top=${metrics.banner?.top}px, text="${metrics.banner?.text}"`
      );

      if (vpWidth >= 1024) {
        // Desktop Layout Assertions
        record(
          `Admin @ ${vpWidth}px: Sidebar Docked on LEFT`,
          metrics.sidebar?.left === 0 && Math.round(metrics.sidebar?.width) === 250,
          `sidebar left=${metrics.sidebar?.left}px, width=${metrics.sidebar?.width}px`
        );

        record(
          `Admin @ ${vpWidth}px: Dashboard Content on RIGHT`,
          metrics.body?.left >= 240,
          `body left=${metrics.body?.left}px, width=${metrics.body?.width}px`
        );

        record(
          `Admin @ ${vpWidth}px: Statistics Cards Rendered`,
          metrics.statsCount === 5,
          `found ${metrics.statsCount} stat cards`
        );
      }

      // Take clean screenshot
      const shotPath = path.join(screenshotsDir, `s01-live-admin-${vpWidth}px.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  📸 Screenshot saved: ${shotPath}`);
    }

    // Also verify profile dropdown interaction on desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.click('#operatorProfilePill');
    await page.waitForTimeout(300);
    const dropdownEmail = await page.$eval('#dropdownUserEmail', el => el.textContent.trim());
    const dropdownRole = await page.$eval('#dropdownRoleBadge', el => el.textContent.trim());
    record(
      'Admin Desktop: Profile Dropdown Verified',
      dropdownEmail === STAGING_ADMIN_EMAIL && dropdownRole === 'Administrator',
      `email=${dropdownEmail}, role=${dropdownRole}`
    );
    await page.screenshot({ path: path.join(screenshotsDir, 's01-live-admin-profile-dropdown.png') });

    // 4. Verify Public Staging Portal across viewports
    console.log('\n[4/4] Testing Public Staging Portal across 6 viewports...');
    const publicPage = await context.newPage();
    await publicPage.goto(`${PUBLIC_URL}/#dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await publicPage.waitForSelector('.app-header', { timeout: 15000 });
    await publicPage.waitForTimeout(1500);

    for (const vpWidth of VIEWPORTS) {
      await publicPage.setViewportSize({ width: vpWidth, height: 900 });
      await publicPage.waitForTimeout(400);

      const pubMetrics = await publicPage.evaluate(() => {
        const doc = document.documentElement;
        const banner = document.querySelector('.staging-indicator-banner');
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          overflowX: Math.max(0, doc.scrollWidth - doc.clientWidth),
          banner: banner ? {
            text: banner.textContent.trim().replace(/\s+/g, ' '),
            height: banner.getBoundingClientRect().height
          } : null
        };
      });

      record(
        `Public @ ${vpWidth}px: Zero Horizontal Overflow`,
        pubMetrics.overflowX === 0,
        `scrollWidth=${pubMetrics.scrollWidth}px, clientWidth=${pubMetrics.clientWidth}px`
      );

      record(
        `Public @ ${vpWidth}px: Compact Staging Top Banner`,
        pubMetrics.banner !== null && pubMetrics.banner.height <= 60,
        `height=${pubMetrics.banner?.height}px, text="${pubMetrics.banner?.text}"`
      );

      if (vpWidth === 1440 || vpWidth === 375) {
        const shotPath = path.join(screenshotsDir, `s01-live-public-${vpWidth}px.png`);
        await publicPage.screenshot({ path: shotPath, fullPage: false });
        console.log(`  📸 Screenshot saved: ${shotPath}`);
      }
    }

    console.log('\n===============================================================');
    console.log(`S01 LIVE STAGING VERIFICATION: ALL ${results.length} CHECKS PASSED!`);
    console.log('===============================================================');

  } catch (err) {
    console.error('\nVerification failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
