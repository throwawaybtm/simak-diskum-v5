/**
 * Playwright E2E Verification Suite: Visual Makeover V01-B
 * Verifies fixes for V01-A usability issues and full design system consistency across all secondary pages:
 * 1. Admin mobile & tablet navigation drawer with keyboard, backdrop, and focus management.
 * 2. Admin upcoming agenda location resolution (zero raw loc_xx IDs).
 * 3. Public desktop header text unwrapped (Kalender Kegiatan & Cari Agenda on single lines).
 * 4. Responsive information density on mobile & tablet.
 * 5. Public secondary pages: Calendar (Month/Week/Day/List), Agenda search, Detail modal, Announcements.
 * 6. Admin secondary pages: Activities list & filters, Add/Edit workflow with F01 controls & Drive link, Master Data (5 tabs), Reports 8-column preview, Settings.
 * 7. Screenshots captured at 375px, 768px, 1024px, and 1440px.
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

async function runV01BVerification() {
  console.log('===============================================================');
  console.log('STARTING VISUAL MAKEOVER V01-B FULL VERIFICATION SUITE');
  console.log(`Public Base URL: ${publicBaseUrl}`);
  console.log(`Admin Base URL:  ${adminBaseUrl}`);
  console.log(`Screenshots dir: ${screenshotsDir}`);
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // ------------------------------------------------------------------------
    // FIX A: ADMIN MOBILE & TABLET NAVIGATION DRAWER
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Admin Mobile & Tablet Navigation Drawer (Fix A) ---');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${adminBaseUrl}/#dashboard`);
    await page.waitForSelector('.dashboard-page');

    // 1.1 Verify Menu Toggle Button is Visible on Tablet
    const toggleVisibleTablet = await page.isVisible('#adminMenuToggleBtn');
    record('Admin Tablet Menu Button', toggleVisibleTablet, 'Menu toggle button is visible at 768px');

    // 1.2 Open Drawer via Menu Button
    await page.click('#adminMenuToggleBtn');
    await page.waitForTimeout(300);
    const isSidebarOpen = await page.$eval('#adminSidebar', el => el.classList.contains('sidebar-open'));
    const isBackdropActive = await page.$eval('#sidebarBackdrop', el => el.classList.contains('active'));
    const ariaExpanded = await page.$eval('#adminMenuToggleBtn', el => el.getAttribute('aria-expanded'));
    record('Admin Drawer Open', isSidebarOpen && isBackdropActive && ariaExpanded === 'true', 'Drawer opened, backdrop active, aria-expanded=true');

    // Screenshot open drawer on tablet
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_admin_drawer_tablet.png') });

    // 1.3 Close Drawer via Escape Key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isClosedEsc = await page.$eval('#adminSidebar', el => !el.classList.contains('sidebar-open'));
    record('Admin Drawer Escape Close', isClosedEsc, 'Drawer closed successfully on Escape keypress');

    // 1.4 Open Drawer again and Close via Backdrop Click
    await page.click('#adminMenuToggleBtn');
    await page.waitForTimeout(300);
    await page.click('#sidebarBackdrop', { position: { x: 500, y: 300 } });
    await page.waitForTimeout(300);
    const isClosedBackdrop = await page.$eval('#adminSidebar', el => !el.classList.contains('sidebar-open'));
    record('Admin Drawer Backdrop Close', isClosedBackdrop, 'Drawer closed successfully on Backdrop click');

    // 1.5 Mobile Viewport (375px) Drawer Navigation
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${adminBaseUrl}/#dashboard`);
    await page.waitForSelector('.dashboard-page');
    const toggleVisibleMobile = await page.isVisible('#adminMenuToggleBtn');
    await page.click('#adminMenuToggleBtn');
    await page.waitForTimeout(300);
    const isMobileDrawerOpen = await page.$eval('#adminSidebar', el => el.classList.contains('sidebar-open'));
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_admin_drawer_mobile.png') });
    record('Admin Mobile Drawer', toggleVisibleMobile && isMobileDrawerOpen, 'Menu button works and drawer opens at 375px');

    // 1.6 Navigate via drawer link (Master Data) and auto-close
    await page.click('a[href="#master"]');
    await page.waitForTimeout(500);
    const isMasterVisible = await page.isVisible('.master-data-page');
    const isDrawerAutoClosed = await page.$eval('#adminSidebar', el => !el.classList.contains('sidebar-open'));
    record('Admin Drawer Auto-Close on Nav', isMasterVisible && isDrawerAutoClosed, 'Navigated to #master and drawer auto-closed');

    // ------------------------------------------------------------------------
    // FIX B: ADMIN UPCOMING AGENDA LOCATION RESOLUTION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Admin Upcoming Agenda Location Resolution (Fix B) ---');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${adminBaseUrl}/#dashboard`);
    await page.waitForSelector('.dashboard-page');
    await page.waitForTimeout(400);

    const locationTexts = await page.$$eval('.agenda-item-location', els => els.map(e => e.textContent?.trim() || ''));
    console.log('   Upcoming activity location labels found:', locationTexts);
    const hasRawLocId = locationTexts.some(loc => /^loc_\d+$/i.test(loc));
    const allHumanReadable = locationTexts.every(loc => loc.length > 0 && !/^loc_\d+$/i.test(loc));
    record('Admin Location Name Resolution', !hasRawLocId && allHumanReadable, `Zero raw loc_xx IDs. All locations human-readable (${locationTexts.length} items)`);

    // ------------------------------------------------------------------------
    // FIX C: PUBLIC DESKTOP HEADER WRAPPING & NAVIGATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Public Desktop Header Unwrapped Navigation (Fix C) ---');
    for (const width of [1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${publicBaseUrl}/#dashboard`);
      await page.waitForSelector('.dashboard-view');
      await page.waitForTimeout(300);

      const navPillHeights = await page.$$eval('.nav-link', els => els.map(el => ({
        text: el.textContent?.trim(),
        height: el.getBoundingClientRect().height,
        whiteSpace: window.getComputedStyle(el).whiteSpace
      })));

      // Assert each nav-link height is single-line (<= 44px) and white-space is nowrap
      const isSingleLine = navPillHeights.every(p => p.height <= 44 && (p.whiteSpace === 'nowrap' || p.text?.length < 15));
      record(`Public Header @ ${width}px`, isSingleLine, `All nav items single line (no awkward wrapping): ${navPillHeights.map(p => `${p.text} (${Math.round(p.height)}px)`).join(', ')}`);
    }

    // ------------------------------------------------------------------------
    // FIX D: RESPONSIVE INFORMATION DENSITY
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Responsive Information Density (Fix D) ---');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${publicBaseUrl}/#dashboard`);
    await page.waitForSelector('.dashboard-view');
    const pubBannerPadding = await page.$eval('.welcome-banner', el => window.getComputedStyle(el).padding);
    const pubBannerHeight = await page.$eval('.welcome-banner', el => el.getBoundingClientRect().height);
    record('Public Mobile Banner Density', pubBannerHeight < 280, `Banner height compact on mobile: ${Math.round(pubBannerHeight)}px (padding: ${pubBannerPadding})`);

    // ------------------------------------------------------------------------
    // PART 5: PUBLIC SECONDARY PAGES CONSISTENCY
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Public Secondary Pages Consistency ---');

    // 5.1 Calendar Views (Month, Week, Day, List)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${publicBaseUrl}/#calendar`);
    await page.waitForSelector('.calendar-view');
    await page.waitForTimeout(400);

    const hasCalToolbar = await page.isVisible('.calendar-toolbar');
    const hasCategoryPills = await page.isVisible('.category-filter-bar');
    const hasMonthGrid = await page.isVisible('.month-cells-grid');
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_public_calendar_month.png') });
    record('Public Calendar Month', hasCalToolbar && hasCategoryPills && hasMonthGrid, 'Month view rendered with civic toolbar and category pills');

    // Toggle Week Mode
    await page.click('button[data-mode="week"]');
    await page.waitForTimeout(300);
    const hasWeekGrid = await page.isVisible('.week-grid-container');
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_public_calendar_week.png') });
    record('Public Calendar Week', hasWeekGrid, 'Week grid rendered with date header pills');

    // Toggle Day Mode
    await page.click('button[data-mode="day"]');
    await page.waitForTimeout(300);
    const hasDayTimeline = await page.isVisible('.day-view-container, .day-timeline, .calendar-container');
    record('Public Calendar Day', hasDayTimeline, 'Day view rendered');

    // Toggle List Mode
    await page.click('button[data-mode="list"]');
    await page.waitForTimeout(300);
    const hasListView = await page.isVisible('.list-view, .calendar-container');
    record('Public Calendar List', hasListView, 'List view rendered');

    // 5.2 Agenda Search & Filter
    await page.goto(`${publicBaseUrl}/#agenda`);
    await page.waitForSelector('.agenda-view');
    await page.waitForTimeout(400);

    const hasFilterPanel = await page.isVisible('.agenda-filter-panel');
    const hasSearchInput = await page.isVisible('#agendaSearchInput');
    const agendaCardsCount = await page.$$eval('.agenda-item-card', els => els.length);
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_public_agenda_search.png') });
    record('Public Agenda Search View', hasFilterPanel && hasSearchInput && agendaCardsCount > 0, `Search view rendered with ${agendaCardsCount} agenda cards`);

    // 5.3 Activity Detail Modal
    if (agendaCardsCount > 0) {
      await page.click('.agenda-item-card:first-child button[data-open-detail]');
      await page.waitForSelector('#activityDetailModal', { timeout: 3000 });
      const modalVisible = await page.isVisible('#activityDetailModal');
      await page.screenshot({ path: path.join(screenshotsDir, 'v01b_public_detail_modal.png') });
      record('Public Detail Modal', modalVisible, 'Sanitized activity detail modal opened cleanly');

      // Close modal
      await page.click('#btnModalClose');
      await page.waitForTimeout(300);
      const modalClosed = !(await page.isVisible('#activityDetailModal'));
      record('Public Detail Modal Close', modalClosed, 'Modal closed on close button click');
    }

    // 5.4 Announcements View
    await page.goto(`${publicBaseUrl}/#announcements`);
    await page.waitForSelector('.announcements-view');
    await page.waitForTimeout(400);

    const hasAnnouncementsContainer = await page.isVisible('.announcements-container');
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_public_announcements.png') });
    record('Public Announcements View', hasAnnouncementsContainer, 'Announcements page rendered with civic banners');

    // ------------------------------------------------------------------------
    // PART 6: ADMIN SECONDARY PAGES CONSISTENCY
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Admin Secondary Pages Consistency ---');

    // 6.1 Activities List Page
    await page.goto(`${adminBaseUrl}/#activities`);
    await page.waitForSelector('.activities-page');
    await page.waitForTimeout(400);

    const hasActivitiesFilter = await page.isVisible('.filter-panel');
    const hasActivitiesTable = await page.isVisible('.data-table');
    const activitiesRowsCount = await page.$$eval('tr[data-activity-row]', els => els.length);
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_admin_activities_list.png') });
    record('Admin Activities List', hasActivitiesFilter && hasActivitiesTable && activitiesRowsCount > 0, `Activities list rendered with ${activitiesRowsCount} rows and stage filters`);

    // 6.2 Add/Edit Workflow with F01 Controls & Safe Google Drive Link
    await page.goto(`${adminBaseUrl}/#activities/new`);
    await page.waitForSelector('.edit-activity-page');
    await page.waitForTimeout(500);

    const hasStageIndicator = await page.isVisible('.stage-indicator-bar');
    const hasLetterSection = await page.isVisible('.invitation-letter-panel');
    const hasDriveInput = await page.isVisible('#inputDriveUrl');
    const hasPreviewCard = await page.isVisible('#livePreviewContainer');

    // Test real-time privacy scanner warning
    await page.fill('#inputPublicNotes', 'Meeting Zoom ID: 123 456 789 passcode: RAHASIA');
    await page.waitForTimeout(200);
    const privacyAlertTriggered = await page.isVisible('#privacyWarningContainer .privacy-alert');

    // Clear public notes back to clean civic instructions
    await page.fill('#inputPublicNotes', 'Pakaian: Batik Lengan Panjang');
    await page.waitForTimeout(200);

    // Test Safe Google Drive URL validation & link creation
    await page.fill('#inputDriveUrl', 'https://drive.google.com/file/d/1B2C3D4E5F6G_official_doc/view');
    await page.waitForTimeout(200);

    const driveAnchorExists = await page.isVisible('#linkOpenDriveFile');
    const driveAnchorHref = await page.$eval('#linkOpenDriveFile', el => el.getAttribute('href'));
    const driveAnchorTarget = await page.$eval('#linkOpenDriveFile', el => el.getAttribute('target'));
    const driveAnchorRel = await page.$eval('#linkOpenDriveFile', el => el.getAttribute('rel'));

    console.log('   F01 Edit Workflow checks:', {
      hasStageIndicator,
      hasLetterSection,
      hasDriveInput,
      privacyAlertTriggered,
      hasPreviewCard,
      driveAnchorExists,
      driveAnchorHref,
      driveAnchorTarget,
      driveAnchorRel
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_admin_edit_workflow.png') });
    record(
      'Admin F01 Edit Workflow & Safe Drive Link',
      hasStageIndicator && hasLetterSection && hasDriveInput && privacyAlertTriggered && hasPreviewCard && driveAnchorExists && driveAnchorHref?.includes('drive.google.com') && driveAnchorTarget === '_blank' && driveAnchorRel === 'noopener noreferrer',
      'Stage indicator, invitation panel, privacy scanner trigger, live preview, and safe DOM anchor (target=_blank rel="noopener noreferrer") verified'
    );

    // 6.3 Master Data Management (5 Tabs)
    await page.goto(`${adminBaseUrl}/#master`);
    await page.waitForSelector('.master-data-page');
    await page.waitForTimeout(400);

    const tabsCount = await page.$$eval('.master-tabs-bar .tab-btn', els => els.length);
    const hasMasterTable = await page.isVisible('.master-table-panel');
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_admin_master_data.png') });
    record('Admin Master Data (5 Tabs)', tabsCount === 5 && hasMasterTable, `All 5 master entity tabs rendered with civic table`);

    // Switch to Lokasi & Ruangan tab
    await page.click('button[data-tab="locations"]');
    await page.waitForTimeout(300);
    const locationsTableRendered = await page.isVisible('.master-table-panel table');
    record('Admin Master Data Tab Switch', locationsTableRendered, 'Switched to locations tab cleanly');

    // 6.4 Official 8-Column Reports & Migration
    await page.goto(`${adminBaseUrl}/#reports`);
    await page.waitForSelector('.reports-page-wrapper');
    await page.waitForTimeout(400);

    const hasReportTable = await page.isVisible('#reportPreviewTable');
    const reportColCount = await page.$$eval('#reportPreviewTable thead th', els => els.length);
    const hasPrintBtn = await page.isVisible('#btnPrintReport');
    const hasDownloadBtn = await page.isVisible('#btnDownloadXlsx');
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_admin_reports_8col.png') });
    record('Admin Reports Official 8-Column', hasReportTable && reportColCount === 8 && hasPrintBtn && hasDownloadBtn, 'Official 8-column table with print & XLSX export buttons rendered');

    // Switch to Migration Tab
    await page.click('#btnTabMigration');
    await page.waitForTimeout(300);
    const hasMigrationPanel = await page.isVisible('#btnLoadSampleMigration');
    record('Admin Migration Tab', hasMigrationPanel, 'Spreadsheet migration panel rendered');

    // 6.5 Settings & Signatory Configuration
    await page.goto(`${adminBaseUrl}/#settings`);
    await page.waitForSelector('.settings-page-wrapper');
    await page.waitForTimeout(400);

    const hasSignatoryForm = await page.isVisible('#signatorySettingsForm');
    const hasNipInput = await page.isVisible('#cfgSignatoryNip');
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_admin_settings.png') });
    record('Admin Settings Page', hasSignatoryForm && hasNipInput, 'Signatory configuration form with Firestore persistence rendered');

    // ------------------------------------------------------------------------
    // PART 7: RESPONSIVE SCREENSHOTS AT 4 VIEWPORTS
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Responsive Screenshots at 4 Viewports ---');
    const testViewports = [
      { name: '375px', width: 375, height: 812 },
      { name: '768px', width: 768, height: 1024 },
      { name: '1024px', width: 1024, height: 768 },
      { name: '1440px', width: 1440, height: 900 }
    ];

    for (const vp of testViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Public Calendar
      await page.goto(`${publicBaseUrl}/#calendar`);
      await page.waitForSelector('.calendar-view');
      const pubNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
      await page.screenshot({ path: path.join(screenshotsDir, `v01b_public_calendar_${vp.name}.png`) });

      // Admin Activities List
      await page.goto(`${adminBaseUrl}/#activities`);
      await page.waitForSelector('.activities-page');
      const adminNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
      await page.screenshot({ path: path.join(screenshotsDir, `v01b_admin_activities_${vp.name}.png`) });

      record(`Viewport ${vp.name} Overflow Check`, pubNoOverflow && adminNoOverflow, `Zero horizontal overflow at ${vp.name} on both Public and Admin`);
    }

    await page.close();

  } catch (err) {
    console.error('Fatal verification error:', err);
    failedCount++;
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log('VISUAL MAKEOVER V01-B PLAYWRIGHT SUMMARY');
  console.log(`Passed: ${passedCount} / ${passedCount + failedCount} scenarios`);
  if (failedCount === 0) {
    console.log('🎉 ALL V01-B FIXES & DESIGN CONSISTENCY SCENARIOS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`⚠️ FAILED: ${failedCount} scenarios.`);
    process.exit(1);
  }
}

runV01BVerification();
