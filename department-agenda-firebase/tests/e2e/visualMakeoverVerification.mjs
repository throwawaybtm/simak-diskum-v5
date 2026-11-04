/**
 * Playwright E2E Verification Suite: Visual Makeover V01-A
 * Verifies responsive layouts and visual fidelity for Public and Admin Portals at:
 * - 375px (Mobile)
 * - 768px (Tablet)
 * - 1024px (Standard Desktop)
 * - 1440px (Wide Desktop)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicBaseUrl = 'http://localhost:3000';
const adminBaseUrl = 'http://localhost:3001';
const screenshotsDir = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const VIEWPORTS = [
  { name: '375px (Mobile)', width: 375, height: 812, key: '375px' },
  { name: '768px (Tablet)', width: 768, height: 1024, key: '768px' },
  { name: '1024px (Desktop)', width: 1024, height: 768, key: '1024px' },
  { name: '1440px (Wide Desktop)', width: 1440, height: 900, key: '1440px' }
];

let passedCount = 0;
let failedCount = 0;

function record(name, condition, details) {
  if (condition) {
    passedCount++;
    console.log(`✅ PASS [${name}] ${details}`);
  } else {
    failedCount++;
    console.error(`❌ FAIL [${name}] ${details}`);
  }
}

async function runVisualMakeoverVerification() {
  console.log('===============================================================');
  console.log('STARTING VISUAL MAKEOVER V01-A RESPONSIVE VERIFICATION');
  console.log(`Public Base URL: ${publicBaseUrl}`);
  console.log(`Admin Base URL:  ${adminBaseUrl}`);
  console.log(`Screenshots dir: ${screenshotsDir}`);
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // ------------------------------------------------------------------------
    // PART 1: PUBLIC PORTAL VERIFICATION ACROSS VIEWPORTS
    // ------------------------------------------------------------------------
    console.log('--- PART 1: Public Portal Responsive Verification ---');
    const pubPage = await browser.newPage();

    for (const vp of VIEWPORTS) {
      await pubPage.setViewportSize({ width: vp.width, height: vp.height });
      await pubPage.goto(`${publicBaseUrl}/#dashboard`);
      await pubPage.waitForSelector('.dashboard-view');
      await pubPage.waitForTimeout(500);

      // Verify Header Top Placement
      const headerBox = await pubPage.$eval('.app-header', el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, width: rect.width, visible: rect.height > 0 };
      });
      const headerAtTop = headerBox.top <= 5 && headerBox.visible;

      // Verify Hero Welcome Banner
      const hasWelcomeBanner = await pubPage.isVisible('.welcome-banner');

      // Verify 4 Summary Cards
      const summaryCardsCount = await pubPage.$$eval('.summary-cards-grid .metric-card', els => els.length);

      // Verify No Horizontal Overflow
      const overflow = await pubPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const shotPath = path.join(screenshotsDir, `v01_public_${vp.key}.png`);
      await pubPage.screenshot({ path: shotPath, fullPage: false });

      record(
        `Public @ ${vp.name}`,
        headerAtTop && hasWelcomeBanner && summaryCardsCount === 4 && !overflow,
        `Header at top: ${headerAtTop}, Banner: ${hasWelcomeBanner}, Summary cards: ${summaryCardsCount}, Overflow: ${overflow}`
      );
    }
    await pubPage.close();

    // ------------------------------------------------------------------------
    // PART 2: ADMIN PORTAL VERIFICATION ACROSS VIEWPORTS
    // ------------------------------------------------------------------------
    console.log('\n--- PART 2: Admin Portal Responsive Verification ---');
    const adminPage = await browser.newPage();

    for (const vp of VIEWPORTS) {
      await adminPage.setViewportSize({ width: vp.width, height: vp.height });
      await adminPage.goto(`${adminBaseUrl}/#dashboard`);
      await adminPage.waitForSelector('.dashboard-page');
      await adminPage.waitForTimeout(500);

      // Verify Left Sidebar Position (Desktop vs Mobile)
      const sidebarState = await adminPage.$eval('.admin-sidebar', el => {
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left,
          width: rect.width,
          visible: rect.width > 0 && rect.right > 0
        };
      });

      // On desktop (>=1024px), sidebar should be docked on the left at left: 0
      const desktopSidebarOk = vp.width >= 1024 ? (sidebarState.left === 0 && sidebarState.width >= 240) : true;

      // Verify Topbar Header
      const hasTopbar = await adminPage.isVisible('.topbar');
      const topbarTitle = await adminPage.textContent('.topbar-portal-title');

      // Verify 5 Stage Summary Cards
      const stageCardsCount = await adminPage.$$eval('.stage-summary-grid .stat-card-stage', els => els.length);

      // Verify Donut Chart & Upcoming Panels
      const hasUpcomingPanel = await adminPage.isVisible('.panel-upcoming');
      const hasStatusPanel = await adminPage.isVisible('.panel-status');
      const hasDonut = await adminPage.isVisible('.donut-circle');

      // Verify No Horizontal Overflow
      const overflow = await adminPage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const shotPath = path.join(screenshotsDir, `v01_admin_${vp.key}.png`);
      await adminPage.screenshot({ path: shotPath, fullPage: false });

      record(
        `Admin @ ${vp.name}`,
        desktopSidebarOk && hasTopbar && topbarTitle?.includes('Admin Portal') && stageCardsCount === 5 && hasUpcomingPanel && hasStatusPanel && hasDonut && !overflow,
        `Sidebar docked: ${desktopSidebarOk}, Topbar: ${topbarTitle?.trim()}, Stage cards: ${stageCardsCount}, Panels: ${hasUpcomingPanel && hasStatusPanel}, Donut: ${hasDonut}, Overflow: ${overflow}`
      );
    }
    await adminPage.close();

  } catch (err) {
    console.error('Fatal verification error:', err);
    failedCount++;
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log('VISUAL MAKEOVER V01-A PLAYWRIGHT SUMMARY');
  console.log(`Passed: ${passedCount} / ${passedCount + failedCount} scenarios`);
  if (failedCount === 0) {
    console.log('🎉 ALL V01-A RESPONSIVE VIEWPORT SCENARIOS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ FAILED: ${failedCount} scenarios.`);
    process.exit(1);
  }
}

runVisualMakeoverVerification();
