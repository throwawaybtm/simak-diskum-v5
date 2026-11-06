/**
 * SIMAK DISKUM Kota Batam v5.0 — S03 Live Staging Consolidated Multi-Viewport Verification
 * 
 * Verifies all S03 mobile UI/UX remediation requirements on LIVE staging:
 * - Public Portal: https://simakdiskum-staging.web.app
 * - Admin Portal: https://simakdiskum-staging-admin.web.app
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const artifactsDir = 'C:/Users/Evaluation Software/.gemini/antigravity/brain/9bc97728-a55d-4267-af2e-af77ebf60f34';

const VIEWPORTS = [
  { name: '320px', width: 320, height: 844, isMobile: true },
  { name: '375px', width: 375, height: 812, isMobile: true },
  { name: '390px', width: 390, height: 844, isMobile: true },
  { name: '402px', width: 402, height: 874, isMobile: true },
  { name: '425px', width: 425, height: 900, isMobile: true },
  { name: '768px', width: 768, height: 1024, isMobile: true },
  { name: '1024px', width: 1024, height: 768, isMobile: false },
  { name: '1440px', width: 1440, height: 900, isMobile: false }
];

async function run() {
  console.log('======================================================================');
  console.log('S03 CONSOLIDATED LIVE STAGING MULTI-VIEWPORT VERIFICATION');
  console.log('Public: https://simakdiskum-staging.web.app');
  console.log('Admin:  https://simakdiskum-staging-admin.web.app');
  console.log('======================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const verificationResults = {
    timestamp: new Date().toISOString(),
    viewportsTested: VIEWPORTS.length,
    publicPortal: {},
    adminPortal: {},
    passedAll: true
  };

  try {
    // ------------------------------------------------------------------
    // PART 1: PUBLIC PORTAL VERIFICATION ACROSS VIEWPORTS
    // ------------------------------------------------------------------
    console.log('--- 1. TESTING PUBLIC PORTAL ---');
    for (const vp of VIEWPORTS) {
      console.log(`[Public] Testing ${vp.name} (${vp.width}x${vp.height})...`);
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

      // 1.1 Dashboard & Compact Footer
      await page.goto(`https://simakdiskum-staging.web.app/?v=${Date.now()}#dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const dScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const dClientW = await page.evaluate(() => document.documentElement.clientWidth);
      const dashboardOverflow = dScrollW > dClientW;

      const jumpDateInput = page.locator('#inputJumpDate');
      const jumpDatePlaceholder = await jumpDateInput.getAttribute('placeholder');
      const footerText = await page.locator('.app-footer').innerText();

      // 1.2 Calendar Week View
      await page.goto(`https://simakdiskum-staging.web.app/?v=${Date.now()}#calendar`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const btnWeekMode = page.locator('.mode-btn:has-text("Minggu")');
      if (await btnWeekMode.count() > 0) {
        await btnWeekMode.first().click();
        await page.waitForTimeout(1000);
      }

      const wScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const wClientW = await page.evaluate(() => document.documentElement.clientWidth);
      const weekOverflow = wScrollW > wClientW;

      const stackedWeekVisible = await page.locator('.week-stacked-container').isVisible();
      const desktopGridVisible = await page.locator('.week-grid-container').isVisible();

      if (vp.name === '390px') {
        const weekScreenshotPath = path.join(artifactsDir, 's03-public-week-390px.png');
        await page.screenshot({ path: weekScreenshotPath, fullPage: true });
        console.log(`  ✓ Saved screenshot: ${weekScreenshotPath}`);
      }

      // 1.3 Cari Agenda & Date Range Inputs
      await page.goto(`https://simakdiskum-staging.web.app/?v=${Date.now()}#agenda`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const aScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const aClientW = await page.evaluate(() => document.documentElement.clientWidth);
      const agendaOverflow = aScrollW > aClientW;

      const startPlaceholder = await page.locator('#inputFilterStartDate').getAttribute('placeholder');
      const endPlaceholder = await page.locator('#inputFilterEndDate').getAttribute('placeholder');
      const attendeeChipCount = await page.locator('.attendee-chip').count();

      if (vp.name === '390px') {
        const agendaScreenshotPath = path.join(artifactsDir, 's03-public-agenda-390px.png');
        await page.screenshot({ path: agendaScreenshotPath, fullPage: true });
        console.log(`  ✓ Saved screenshot: ${agendaScreenshotPath}`);
      }

      verificationResults.publicPortal[vp.name] = {
        viewport: `${vp.width}x${vp.height}`,
        dashboard: {
          scrollWidth: dScrollW,
          clientWidth: dClientW,
          hasOverflow: dashboardOverflow,
          jumpDatePlaceholder,
          hasCompactFooter: footerText.includes('Dinas Koperasi dan Usaha Mikro Kota Batam') && footerText.includes('Asia/Jakarta (WIB)')
        },
        weekView: {
          scrollWidth: wScrollW,
          clientWidth: wClientW,
          hasOverflow: weekOverflow,
          stackedWeekVisible,
          desktopGridVisible
        },
        agendaSearch: {
          scrollWidth: aScrollW,
          clientWidth: aClientW,
          hasOverflow: agendaOverflow,
          startPlaceholder,
          endPlaceholder,
          attendeeChipCount
        }
      };

      await page.close();
    }

    // ------------------------------------------------------------------
    // PART 2: ADMIN PORTAL VERIFICATION ACROSS VIEWPORTS
    // ------------------------------------------------------------------
    console.log('\n--- 2. TESTING ADMIN PORTAL ---');
    for (const vp of VIEWPORTS) {
      console.log(`[Admin] Testing ${vp.name} (${vp.width}x${vp.height})...`);
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });

      // 2.1 Admin Dashboard Mount and Authentication
      await page.goto(`https://simakdiskum-staging-admin.web.app/?v=${Date.now()}#dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Authenticate via staging test hook
      await page.waitForFunction(() => Boolean((window).__ADMIN_TEST_VIEW__), { timeout: 15000 });
      await page.evaluate(async () => {
        await (window).__ADMIN_TEST_VIEW__();
      });
      await page.waitForTimeout(1200);

      const admScrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const admClientW = await page.evaluate(() => document.documentElement.clientWidth);
      const admDashboardOverflow = admScrollW > admClientW;

      // 2.2 Routing Check: #activities and #agenda
      await page.evaluate(() => { window.location.hash = '#activities'; });
      await page.waitForTimeout(1000);
      const activitiesPageText = await page.locator('body').innerText();
      const hasPlaceholderOnActivities = activitiesPageText.includes('Modul "activities"') || activitiesPageText.includes('Modul ini siap dikembangkan');
      const mobileActivitiesCards = await page.locator('.activity-management-card').count();
      const desktopActivitiesRows = await page.locator('.activities-table tbody tr').count();

      if (vp.name === '390px') {
        const activitiesScreenshot = path.join(artifactsDir, 's03-admin-activities-390px.png');
        await page.screenshot({ path: activitiesScreenshot, fullPage: true });
        console.log(`  ✓ Saved screenshot: ${activitiesScreenshot}`);
      }

      await page.evaluate(() => { window.location.hash = '#agenda'; });
      await page.waitForTimeout(1000);
      const agendaPageText = await page.locator('body').innerText();
      const hasPlaceholderOnAgenda = agendaPageText.includes('Modul "agenda"') || agendaPageText.includes('Modul ini siap dikembangkan');

      // 2.3 Unknown Route: #unknown-test
      await page.evaluate(() => { window.location.hash = '#unknown-test'; });
      await page.waitForTimeout(1000);
      const notFoundVisible = await page.locator('.not-found-panel').isVisible();

      if (vp.name === '390px') {
        const notFoundScreenshot = path.join(artifactsDir, 's03-admin-404-390px.png');
        await page.screenshot({ path: notFoundScreenshot, fullPage: true });
        console.log(`  ✓ Saved screenshot: ${notFoundScreenshot}`);
      }

      // 2.4 Reports Page: #reports
      await page.evaluate(() => { window.location.hash = '#reports'; });
      await page.waitForTimeout(1200);
      const reportsStartPlaceholder = await page.locator('#inputReportStartDate').getAttribute('placeholder');
      const reportsEndPlaceholder = await page.locator('#inputReportEndDate').getAttribute('placeholder');
      const reportsExportGrid = await page.locator('.reports-export-actions').isVisible();

      if (vp.name === '390px') {
        const reportsScreenshot = path.join(artifactsDir, 's03-admin-reports-390px.png');
        await page.screenshot({ path: reportsScreenshot, fullPage: true });
        console.log(`  ✓ Saved screenshot: ${reportsScreenshot}`);
      }

      // 2.5 Settings Informational Page: #settings
      await page.evaluate(() => { window.location.hash = '#settings'; });
      await page.waitForTimeout(1200);
      const settingsText = await page.locator('body').innerText();
      const hasOfficial8ColSpec = settingsText.includes('Spesifikasi Ekspor Laporan Resmi 8 Kolom (Standar S01-QA-R2)');
      const hasWibParam = settingsText.includes('Asia/Jakarta (WIB)');
      const hasDdmmyyyyParam = settingsText.includes('dd/mm/yyyy');
      const hasHistoricalArchive = settingsText.includes('Arsip Profil Instansi & Pejabat Historis');
      const hasMisleadingForm = await page.locator('#signatorySettingsForm').isVisible();

      if (vp.name === '390px') {
        const settingsScreenshot = path.join(artifactsDir, 's03-admin-settings-390px.png');
        await page.screenshot({ path: settingsScreenshot, fullPage: true });
        console.log(`  ✓ Saved screenshot: ${settingsScreenshot}`);
      }

      verificationResults.adminPortal[vp.name] = {
        viewport: `${vp.width}x${vp.height}`,
        dashboard: {
          scrollWidth: admScrollW,
          clientWidth: admClientW,
          hasOverflow: admDashboardOverflow
        },
        routing: {
          hasPlaceholderOnActivities,
          hasPlaceholderOnAgenda,
          mobileActivitiesCards,
          desktopActivitiesRows,
          notFoundHandledCleanly: notFoundVisible
        },
        reports: {
          reportsStartPlaceholder,
          reportsEndPlaceholder,
          reportsExportGrid
        },
        settings: {
          hasOfficial8ColSpec,
          hasWibParam,
          hasDdmmyyyyParam,
          hasHistoricalArchive,
          hasMisleadingForm
        }
      };

      await page.close();
    }

  } catch (err) {
    console.error('Error during verification:', err);
    verificationResults.passedAll = false;
    verificationResults.error = String(err);
  } finally {
    await browser.close();
  }

  // Save verification results artifact
  const resultsPath = path.join(artifactsDir, 's03-consolidated-verification-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(verificationResults, null, 2), 'utf-8');
  console.log(`\n======================================================================`);
  console.log(`Verification completed! Results written to: ${resultsPath}`);
  console.log(`======================================================================\n`);
}

run();
