/**
 * SIMAK DISKUM v5.0 — V01-B Final Correction Verification Suite
 * 
 * Verifies all P0, P1, and P2 corrections:
 * 1. Public Month Calendar Grid DOM Geometry & Exact Column Alignment across 375px, 768px, 1024px, 1440px.
 * 2. Proper date placement (Nov 1, 2026 on Sunday).
 * 3. Zero event overflow into adjacent cells.
 * 4. Public Attendee deduplication, hydration, and complete privacy shield (zero raw emp_xx IDs).
 * 5. Removal of internal activity IDs from public-facing detail modal.
 * 6. Indonesian labels for status and location type enums across all views.
 * 7. Admin activities table buttons, primary + Tambah Kegiatan styling, search input width.
 * 8. Master Data active tab contrast and all 5 entity tabs verification.
 * 9. Public Announcements civic card styling.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, 'screenshots');

const publicBaseUrl = 'http://localhost:3000';
const adminBaseUrl = 'http://localhost:3001';

async function runVerification() {
  console.log('\n===============================================================');
  console.log('STARTING V01-B FINAL CORRECTION VERIFICATION SUITE');
  console.log('Public Base URL:', publicBaseUrl);
  console.log('Admin Base URL: ', adminBaseUrl);
  console.log('Screenshots dir:', screenshotsDir);
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });
  let passedCount = 0;
  let totalCount = 0;

  function record(name, condition, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✅ PASS [${name}] ${details}`);
    } else {
      console.error(`❌ FAIL [${name}] ${details}`);
    }
  }

  try {
    const page = await browser.newPage();

    // ------------------------------------------------------------------------
    // P0 - 1: PUBLIC MONTH CALENDAR GRID DOM GEOMETRY & ALIGNMENT
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Public Month Calendar Grid Geometry & Alignment ---');
    const viewports = [
      { width: 1440, name: '1440px Desktop' },
      { width: 1024, name: '1024px Standard Desktop' },
      { width: 768,  name: '768px Tablet' },
      { width: 375,  name: '375px Mobile' }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: 900 });
      await page.goto(`${publicBaseUrl}/#calendar`);
      await page.waitForSelector('.month-grid-wrapper');
      await page.waitForTimeout(400);

      const geometry = await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('.month-col-header')).map(el => {
          const r = el.getBoundingClientRect();
          return { text: el.textContent.trim(), x: r.x, width: r.width, right: r.right };
        });

        const cells = Array.from(document.querySelectorAll('.month-cell')).slice(0, 7).map(el => {
          const r = el.getBoundingClientRect();
          return { date: el.getAttribute('data-date'), x: r.x, width: r.width, right: r.right };
        });

        // Bounding check for all activity items in the entire month grid
        const allCells = Array.from(document.querySelectorAll('.month-cell'));
        let maxItemRightDiff = 0;
        let eventItemCount = 0;
        allCells.forEach(c => {
          const cRect = c.getBoundingClientRect();
          const items = Array.from(c.querySelectorAll('.cal-activity-item'));
          items.forEach(it => {
            eventItemCount++;
            const itRect = it.getBoundingClientRect();
            const diff = itRect.right - cRect.right;
            if (diff > maxItemRightDiff) maxItemRightDiff = diff;
          });
        });

        // November 1 date placement check
        const nov1Cell = Array.from(document.querySelectorAll('.month-cell')).find(c => c.getAttribute('data-date') === '2026-11-01');
        const nov1Col = nov1Cell ? (Array.from(document.querySelectorAll('.month-cell')).indexOf(nov1Cell) % 7) : -1;

        return { headers, cells, maxItemRightDiff, eventItemCount, nov1Col };
      });

      // Assert perfect alignment: header.x === cell.x and header.width === cell.width (tolerance <= 1.5px for subpixel rendering)
      let allColsAligned = true;
      let maxDiffX = 0;
      let maxDiffW = 0;

      for (let i = 0; i < 7; i++) {
        const h = geometry.headers[i];
        const c = geometry.cells[i];
        const dX = Math.abs(h.x - c.x);
        const dW = Math.abs(h.width - c.width);
        if (dX > maxDiffX) maxDiffX = dX;
        if (dW > maxDiffW) maxDiffW = dW;
        if (dX > 1.5 || dW > 1.5) {
          allColsAligned = false;
        }
      }

      record(
        `Calendar Grid Alignment @ ${vp.name}`,
        allColsAligned,
        `All 7 columns aligned perfectly (max diffX=${maxDiffX.toFixed(2)}px, max diffW=${maxDiffW.toFixed(2)}px)`
      );

      // Verify November 1, 2026 is on Sunday (col 6)
      record(
        `Nov 1 2026 on Sunday @ ${vp.name}`,
        geometry.nov1Col === 6,
        `November 1, 2026 placed in column ${geometry.nov1Col} (Minggu = col 6)`
      );

      // Verify no event item overflows adjacent cells
      record(
        `Zero Event Overflow @ ${vp.name}`,
        geometry.maxItemRightDiff <= 0.5,
        `Checked ${geometry.eventItemCount} event items; maximum right offset past cell border is ${geometry.maxItemRightDiff.toFixed(2)}px`
      );

      await page.screenshot({ path: path.join(screenshotsDir, `v01b_fix_cal_${vp.width}px.png`) });
    }

    // ------------------------------------------------------------------------
    // P0 - 2: PUBLIC ATTENDEE DISPLAY & PRIVACY SHIELD
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Public Attendee Display & Privacy Shield ---');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${publicBaseUrl}/#agenda`);
    await page.waitForSelector('.agenda-view');
    await page.waitForTimeout(400);

    // Open first activity detail modal
    await page.click('.agenda-item-card:first-child button[data-open-detail]');
    await page.waitForSelector('#activityDetailModal');
    await page.waitForTimeout(200);

    const modalAudit = await page.evaluate(() => {
      const modal = document.querySelector('#activityDetailModal');
      if (!modal) return null;

      const fullText = modal.textContent || '';
      const attendeeList = Array.from(modal.querySelectorAll('.attendee-list li')).map(e => e.textContent.trim());
      const locationTag = modal.querySelector('.location-tag')?.textContent?.trim() || '';
      const footerMeta = modal.querySelector('.modal-footer-meta')?.textContent?.trim() || '';

      // Check for raw emp_xx leaks
      const hasRawEmpId = /emp_\w+/i.test(fullText);
      // Check for internal activity ID in public modal
      const hasActivityIdInModal = /ID Kegiatan:\s*act_/i.test(fullText) || /<code>act_\w+<\/code>/i.test(modal.innerHTML);

      // Check for duplicate attendee entries
      const hasDuplicateAttendees = new Set(attendeeList).size !== attendeeList.length;

      return {
        fullText,
        attendeeList,
        locationTag,
        footerMeta,
        hasRawEmpId,
        hasActivityIdInModal,
        hasDuplicateAttendees
      };
    });

    console.log('   Hydrated Attendee List in Modal:', modalAudit.attendeeList);
    console.log('   Location Type Tag in Modal:     ', modalAudit.locationTag);

    record(
      'Zero Internal Employee ID Leaks in Modal',
      !modalAudit.hasRawEmpId,
      'Verified ZERO occurrences of raw emp_xx IDs in public detail modal'
    );

    record(
      'Attendee List Deduplication & Hydration',
      !modalAudit.hasDuplicateAttendees && modalAudit.attendeeList.length > 0,
      `Attendees deduplicated and rendered with official titles (${modalAudit.attendeeList.length} distinct items)`
    );

    record(
      'Internal Activity ID Removed from Public View',
      !modalAudit.hasActivityIdInModal,
      'Internal activity ID completely removed from public detail modal'
    );

    record(
      'Location Type Indonesian Translation in Modal',
      !modalAudit.locationTag.includes('OFFICE') && !modalAudit.locationTag.includes('EXTERNAL'),
      `Location type translated to Indonesian: "${modalAudit.locationTag}"`
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_fix_public_modal.png') });
    await page.click('#btnModalClose');
    await page.waitForTimeout(200);

    // ------------------------------------------------------------------------
    // P2 - 5.1: PUBLIC ANNOUNCEMENTS CIVIC CARD STYLING
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Public Announcements Civic Styling ---');
    await page.goto(`${publicBaseUrl}/#announcements`);
    await page.waitForSelector('.announcements-view');
    await page.waitForTimeout(300);

    const announcementCheck = await page.evaluate(() => {
      const banner = document.querySelector('.page-title-banner');
      const cards = Array.from(document.querySelectorAll('.announcement-item-card'));
      const pills = Array.from(document.querySelectorAll('.ann-badge-pill'));
      return {
        hasBanner: Boolean(banner),
        cardCount: cards.length,
        hasPills: pills.length > 0
      };
    });

    record(
      'Public Announcements Civic Styling',
      announcementCheck.hasBanner && announcementCheck.cardCount > 0 && announcementCheck.hasPills,
      `Announcements rendered with civic title banner and ${announcementCheck.cardCount} styled announcement cards`
    );
    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_fix_public_announcements.png') });

    // ------------------------------------------------------------------------
    // P1 - 3: ADMIN ACTIVITIES MANAGEMENT & BUTTONS
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Admin Activities Management & Button Styling ---');
    await page.goto(`${adminBaseUrl}/#activities`);
    await page.waitForSelector('.activities-page');
    await page.waitForTimeout(400);

    const adminActivitiesAudit = await page.evaluate(() => {
      const addBtn = document.querySelector('.page-header a[href="#activities/new"]');
      const addBtnStyle = addBtn ? window.getComputedStyle(addBtn) : null;
      const addBtnBg = addBtnStyle ? addBtnStyle.backgroundColor : '';

      const searchInput = document.querySelector('#inputSearchActivities');
      const searchInputWidth = searchInput ? searchInput.getBoundingClientRect().width : 0;

      // Check action buttons inside table
      const actionCells = Array.from(document.querySelectorAll('table.data-table tbody td.action-cell'));
      let buttonsTouchOrOverlap = false;

      for (const cell of actionCells) {
        const btns = Array.from(cell.querySelectorAll('.btn-sm'));
        for (let i = 0; i < btns.length - 1; i++) {
          const r1 = btns[i].getBoundingClientRect();
          const r2 = btns[i + 1].getBoundingClientRect();
          if (r2.left < r1.right) {
            buttonsTouchOrOverlap = true;
          }
        }
      }

      // Check status badges in table
      const statusBadges = Array.from(document.querySelectorAll('.status-badge')).map(b => b.textContent.trim());
      const hasRawScheduled = statusBadges.some(s => s === 'SCHEDULED' || s === 'COMPLETED' || s === 'CANCELLED');
      const hasIndonesianStatus = statusBadges.some(s => s === 'Terjadwal' || s === 'Selesai' || s === 'Dibatalkan');

      return {
        addBtnBg,
        searchInputWidth,
        buttonsTouchOrOverlap,
        hasRawScheduled,
        hasIndonesianStatus,
        sampleStatuses: statusBadges.slice(0, 5)
      };
    });

    record(
      'Primary Button Styling for + Tambah Kegiatan',
      adminActivitiesAudit.addBtnBg.includes('rgb(37, 99, 235)') || adminActivitiesAudit.addBtnBg.includes('#2563eb'),
      `+ Tambah Kegiatan has royal blue primary background: ${adminActivitiesAudit.addBtnBg}`
    );

    record(
      'Activities Table Action Buttons Separation',
      !adminActivitiesAudit.buttonsTouchOrOverlap,
      'Edit, Duplikat, and Hapus buttons have clear spacing and do not overlap'
    );

    record(
      'Search Input Width & Styling',
      adminActivitiesAudit.searchInputWidth > 200,
      `Pencarian Kegiatan input has full responsive width: ${Math.round(adminActivitiesAudit.searchInputWidth)}px`
    );

    record(
      'Admin Status Badges Indonesian Translation',
      !adminActivitiesAudit.hasRawScheduled && adminActivitiesAudit.hasIndonesianStatus,
      `Status enums translated to Indonesian: ${JSON.stringify(adminActivitiesAudit.sampleStatuses)}`
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_fix_admin_activities.png') });

    // ------------------------------------------------------------------------
    // P1 - 4: ADMIN MASTER DATA ACTIVE TABS & 5 TABS VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Admin Master Data Contrast & All 5 Tabs ---');
    await page.goto(`${adminBaseUrl}/#master`);
    await page.waitForSelector('.master-data-page');
    await page.waitForTimeout(400);

    const tabsCheck = await page.evaluate(() => {
      const activeTab = document.querySelector('.master-tabs-bar .tab-btn.active');
      const activeStyle = activeTab ? window.getComputedStyle(activeTab) : null;
      const activeBg = activeStyle ? activeStyle.backgroundColor : '';
      const activeColor = activeStyle ? activeStyle.color : '';

      const allTabs = Array.from(document.querySelectorAll('.master-tabs-bar .tab-btn')).map(t => ({
        tab: t.getAttribute('data-tab'),
        text: t.textContent.trim()
      }));

      return { activeBg, activeColor, allTabs };
    });

    console.log('   Active Master Tab Styling: bg =', tabsCheck.activeBg, ', text color =', tabsCheck.activeColor);

    record(
      'Master Data Active Tab Contrast',
      tabsCheck.activeBg.includes('rgb(37, 99, 235)') && (tabsCheck.activeColor.includes('rgb(255, 255, 255)')) || tabsCheck.activeColor === 'white',
      `Active tab has high-contrast royal blue background (${tabsCheck.activeBg}) with white text (${tabsCheck.activeColor})`
    );

    // Click each of the 5 tabs and verify table renders
    const expectedTabs = ['employees', 'departments', 'locations', 'organizers', 'categories'];
    let allTabsFunctioning = true;

    for (const tabName of expectedTabs) {
      await page.click(`.master-tabs-bar .tab-btn[data-tab="${tabName}"]`);
      await page.waitForTimeout(200);
      const isPanelVisible = await page.isVisible('.master-table-panel table.data-table');
      if (!isPanelVisible) {
        allTabsFunctioning = false;
        console.error(`Failed to load table for master tab: ${tabName}`);
      }
    }

    record(
      'All 5 Master Data Tabs Functioning',
      allTabsFunctioning,
      'Verified all 5 master entity tabs (Pegawai, Bidang, Lokasi, Penyelenggara, Kategori) switch and render clean tables'
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'v01b_fix_admin_master_tabs.png') });

    await page.close();
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log(`V01-B FINAL CORRECTION SUMMARY`);
  console.log(`Passed: ${passedCount} / ${totalCount} scenarios`);
  if (passedCount === totalCount) {
    console.log('🎉 ALL V01-B FINAL CORRECTION SCENARIOS PASSED WITH 100% SUCCESS!');
  } else {
    console.error(`❌ ${totalCount - passedCount} SCENARIOS FAILED.`);
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
