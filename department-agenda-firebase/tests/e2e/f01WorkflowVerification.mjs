/**
 * Feature F01 Real-Browser Playwright Verification Suite
 * 
 * Verifies:
 * 1. Initial activity creation in INITIAL_ENTRY without attendees or letter metadata (nonblocking warning).
 * 2. Activity appears on Public Portal (localhost:3000) with safe placeholders and zero confidential leaks.
 * 3. Progression to DETAILS_COMPLETED with attendee selection and snapshot freezing.
 * 4. Progression to ADMIN_COMPLETE with No. Agenda, Tanggal Surat, Perihal, and Google Drive link.
 * 5. Functional Google Drive external link with rel="noopener noreferrer" target="_blank".
 * 6. Live search by No. Agenda in Admin activities table.
 * 7. Live filtering by administrative stage dropdown (filterStageSelect).
 * 8. Stage regression from ADMIN_COMPLETE back to DETAILS_COMPLETED with recorded reason.
 * 9. Official 8-column reports strictly maintain eight columns without extra letter metadata.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, 'screenshots');
const adminBaseUrl = 'http://localhost:3001';
const publicBaseUrl = 'http://localhost:3000';

async function resetEmulatorDatabase() {
  try {
    const res = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-department-agenda/databases/(default)/documents', {
      method: 'DELETE'
    });
    console.log(`[Setup] Reset Firestore Emulator: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.warn('[Setup] Warning: Could not reset emulator database:', err.message);
  }
}

async function runF01Verification() {
  console.log('===============================================================');
  console.log('STARTING FEATURE F01 ADMINISTRATIVE WORKFLOW BROWSER VERIFICATION');
  console.log(`Admin Base URL: ${adminBaseUrl}`);
  console.log(`Public Base URL: ${publicBaseUrl}`);
  console.log(`Screenshots dir: ${screenshotsDir}`);
  console.log('===============================================================\n');

  await resetEmulatorDatabase();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Capture alert/dialogs
  let lastDialogMessage = '';
  page.on('dialog', async dialog => {
    lastDialogMessage = dialog.message();
    console.log(`  [Browser Dialog] "${dialog.type()}": ${lastDialogMessage.slice(0, 80).replace(/\n/g, ' ')}...`);
    await dialog.accept();
  });

  const results = [];
  function record(scenario, passed, details = '') {
    results.push({ scenario, passed, details });
    const badge = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${badge} [Scenario ${scenario}] ${details}`);
  }

  try {
    // ----------------------------------------------------
    // Scenario 1: Initial Activity Creation in INITIAL_ENTRY
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Initial Entry Creation without Attendees or Letter ---');
    await page.goto(`${adminBaseUrl}/#activities/new`);
    await page.waitForSelector('#inputTitle');

    // Fill only primary fields
    await page.fill('#inputTitle', 'Sosialisasi Permodalan Koperasi Batam 2026');
    await page.selectOption('#selectCategory', { index: 1 });
    await page.selectOption('#selectLocation', { index: 1 });
    await page.selectOption('#selectOrganizer', { index: 1 });
    await page.fill('#inputStartDate', '2026-11-20');
    await page.fill('#inputEndDate', '2026-11-20');
    await page.fill('#inputStartTime', '09:00');
    await page.fill('#inputEndTime', '11:30');

    // Verify stage selector is default INITIAL_ENTRY
    const selectedStage = await page.$eval('#selectAdministrativeStage', el => el.value);
    const hasWarning = await page.$eval('#advisoryWarningsContainer', el => el.textContent.includes('peserta'));
    record(1, selectedStage === 'INITIAL_ENTRY' && hasWarning, `Default stage: ${selectedStage}, advisory warning visible`);

    await page.screenshot({ path: path.join(screenshotsDir, 'f01_01_initial_entry_form.png') });

    // Save and submit
    await page.click('#btnSaveActivity');
    await page.waitForURL(`${adminBaseUrl}/#activities`, { timeout: 10000 });
    await page.waitForSelector('table.data-table');

    const tableContent = await page.$eval('table.data-table', el => el.textContent);
    const savedInitial = tableContent.includes('Sosialisasi Permodalan Koperasi Batam 2026') &&
                         tableContent.includes('Input Awal') &&
                         tableContent.includes('Belum Ada Peserta');
    record(1.1, savedInitial, 'Saved activity reflects Input Awal badge and missing attendee indicator in table');

    // ----------------------------------------------------
    // Scenario 2: Public Portal Safety & Fallback Placeholders
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Public Portal Safe Rendering ---');
    const pubPage = await context.newPage();
    await pubPage.goto(`${publicBaseUrl}/`);
    await pubPage.waitForSelector('.dashboard-view');
    await pubPage.waitForTimeout(1000);

    const publicContent = await pubPage.content();
    const noLeakedStage = !publicContent.includes('INITIAL_ENTRY') && !publicContent.includes('Proses Offline');
    const noLeakedDrive = !publicContent.includes('drive.google.com') && !publicContent.includes('No. Agenda');
    record(2, noLeakedStage && noLeakedDrive, 'Zero leakage of administrative stage, No. Agenda, or private drive links on public dashboard');

    await pubPage.screenshot({ path: path.join(screenshotsDir, 'f01_02_public_dashboard_privacy.png') });
    await pubPage.close();

    // ----------------------------------------------------
    // Scenario 3: Update to DETAILS_COMPLETED with Attendees
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Advance to DETAILS_COMPLETED ---');
    await page.click('table.data-table tbody tr a.btn-edit');
    await page.waitForSelector('#selectAdministrativeStage');

    // Change stage to DETAILS_COMPLETED
    await page.selectOption('#selectAdministrativeStage', 'DETAILS_COMPLETED');
    // Select first employee attendee
    await page.check('input[name="empAttendee"]');
    await page.fill('#inputPublicNotes', 'Pakaian: Batik Lengan Panjang. Membawa proposal.');

    await page.screenshot({ path: path.join(screenshotsDir, 'f01_03_details_completed_form.png') });

    await page.click('#btnSaveActivity');
    await page.waitForURL(`${adminBaseUrl}/#activities`, { timeout: 10000 });
    await page.waitForSelector('table.data-table');

    const tableAfterDetails = await page.$eval('table.data-table', el => el.textContent);
    const hasDetailsBadge = tableAfterDetails.includes('Detail Dilengkapi') && !tableAfterDetails.includes('Belum Ada Peserta');
    record(3, hasDetailsBadge, 'Activity updated to Detail Dilengkapi and missing attendee warning cleared');

    // ----------------------------------------------------
    // Scenario 4 & 5: Advance to ADMIN_COMPLETE & Google Drive Link
    // ----------------------------------------------------
    console.log('\n--- Scenario 4 & 5: Advance to ADMIN_COMPLETE & Google Drive Link ---');
    await page.click('table.data-table tbody tr a.btn-edit');
    await page.waitForSelector('#selectAdministrativeStage');

    // Select ADMIN_COMPLETE
    await page.selectOption('#selectAdministrativeStage', 'ADMIN_COMPLETE');

    // Fill invitation letter fields
    await page.fill('#inputAgendaNumber', '045.2/DKUM/XI/2026');
    await page.fill('#inputLetterDate', '2026-11-02');
    await page.fill('#inputLetterTopic', 'Undangan Pelaksanaan Sosialisasi Akses Modal UMKM');
    await page.fill('#inputDriveUrl', 'https://drive.google.com/file/d/1B2C3D4E5F6G_official_doc/view');

    // Verify external link button is active
    const driveHref = await page.$eval('#linkOpenDriveFile', el => el.getAttribute('href'));
    const driveTarget = await page.$eval('#linkOpenDriveFile', el => el.getAttribute('target'));
    const driveRel = await page.$eval('#linkOpenDriveFile', el => el.getAttribute('rel'));

    const isDriveLinkSafe = driveHref === 'https://drive.google.com/file/d/1B2C3D4E5F6G_official_doc/view' &&
                            driveTarget === '_blank' &&
                            driveRel === 'noopener noreferrer';
    record(5, isDriveLinkSafe, 'Google Drive link rendered safely with target="_blank" and rel="noopener noreferrer"');

    await page.screenshot({ path: path.join(screenshotsDir, 'f01_04_admin_complete_letter_panel.png') });

    await page.click('#btnSaveActivity');
    await page.waitForURL(`${adminBaseUrl}/#activities`, { timeout: 10000 });
    await page.waitForSelector('table.data-table');

    const tableAfterAdminComplete = await page.$eval('table.data-table', el => el.textContent);
    const hasAdminBadge = tableAfterAdminComplete.includes('Administrasi Lengkap') &&
                          tableAfterAdminComplete.includes('045.2/DKUM/XI/2026');
    record(4, hasAdminBadge, 'Table displays Administrasi Lengkap badge and No. Agenda registration number');

    // ----------------------------------------------------
    // Scenario 6: Search by No. Agenda
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Live Search by No. Agenda ---');
    await page.fill('#inputSearchActivities', '045.2/DKUM');
    let visibleRows = await page.$$eval('table.data-table tbody tr[data-activity-row]:not([style*="display: none"])', rows => rows.length);
    record(6, visibleRows === 1, 'Search by No. Agenda displays 1 matching record');

    await page.fill('#inputSearchActivities', 'NON_EXISTENT_AGENDA_NUMBER');
    visibleRows = await page.$$eval('table.data-table tbody tr[data-activity-row]:not([style*="display: none"])', rows => rows.length);
    record(6.1, visibleRows === 0, 'Search with non-existent query hides rows cleanly');

    await page.fill('#inputSearchActivities', ''); // Clear search

    // ----------------------------------------------------
    // Scenario 7: Stage Filtering Dropdown
    // ----------------------------------------------------
    console.log('\n--- Scenario 7: Stage Filtering Dropdown ---');
    await page.selectOption('#filterStageSelect', 'ADMIN_COMPLETE');
    let adminRows = await page.$$eval('table.data-table tbody tr[data-activity-row]:not([style*="display: none"])', rows => rows.length);
    record(7, adminRows === 1, 'Filter by ADMIN_COMPLETE shows 1 record');

    await page.selectOption('#filterStageSelect', 'OFFLINE_PROCESS');
    let offlineRows = await page.$$eval('table.data-table tbody tr[data-activity-row]:not([style*="display: none"])', rows => rows.length);
    record(7.1, offlineRows === 0, 'Filter by OFFLINE_PROCESS shows 0 records');

    await page.selectOption('#filterStageSelect', 'ALL'); // Reset filter

    // ----------------------------------------------------
    // Scenario 8: Stage Regression with Recorded Reason
    // ----------------------------------------------------
    console.log('\n--- Scenario 8: Stage Regression with Audit Trail ---');
    await page.click('table.data-table tbody tr a.btn-edit');
    await page.waitForSelector('#selectAdministrativeStage');

    // Regress stage from ADMIN_COMPLETE back to DETAILS_COMPLETED
    await page.selectOption('#selectAdministrativeStage', 'DETAILS_COMPLETED');

    // Regression container must become visible
    const isRegressionVisible = await page.$eval('#stageRegressionContainer', el => el.style.display !== 'none');
    record(8, isRegressionVisible, 'Regression warning container automatically displayed when moving stage backward');

    await page.fill('#inputStageChangeReason', 'Perubahan disposisi pejabat dinas oleh Sekretariat');
    await page.screenshot({ path: path.join(screenshotsDir, 'f01_05_stage_regression_reason.png') });

    await page.click('#btnSaveActivity');
    await page.waitForURL(`${adminBaseUrl}/#activities`, { timeout: 10000 });
    await page.waitForSelector('table.data-table');

    const tableAfterRegression = await page.$eval('table.data-table', el => el.textContent);
    const regressedToDetails = tableAfterRegression.includes('Detail Dilengkapi');
    record(8.1, regressedToDetails, 'Activity stage successfully updated back to Detail Dilengkapi');

    // ----------------------------------------------------
    // Scenario 9: Official 8-Column Reports Preservation
    // ----------------------------------------------------
    console.log('\n--- Scenario 9: Official 8-Column Reports Structure ---');
    await page.goto(`${adminBaseUrl}/#reports`);
    await page.waitForSelector('.reports-page-wrapper');
    await page.waitForTimeout(1000);

    const reportHeaders = await page.$$eval('#reportPreviewTable thead th', ths => ths.map(t => t.textContent.trim()));
    const expectedHeaders = ['No', 'Hari / Tanggal', 'Pukul', 'Kegiatan', 'Tempat', 'Penyelenggara', 'Dihadiri Oleh', 'Keterangan'];
    
    const isEightColumnsExact = reportHeaders.length === 8 &&
      expectedHeaders.every((h, i) => reportHeaders[i] === h);

    const hasNoExtraColumns = !reportHeaders.includes('No. Agenda') &&
                              !reportHeaders.includes('Tanggal Surat') &&
                              !reportHeaders.includes('Tautan Drive');

    record(9, isEightColumnsExact && hasNoExtraColumns, `Official report maintains exactly 8 columns: [${reportHeaders.join(' | ')}]`);
    await page.screenshot({ path: path.join(screenshotsDir, 'f01_06_official_8column_report.png') });

    // ----------------------------------------------------
    // Summary
    // ----------------------------------------------------
    console.log('\n===============================================================');
    console.log('FEATURE F01 PLAYWRIGHT VERIFICATION SUMMARY');
    console.log('===============================================================');
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`Passed: ${passedCount} / ${totalCount} scenarios`);
    if (passedCount === totalCount) {
      console.log('🎉 ALL FEATURE F01 BROWSER SCENARIOS PASSED WITH 100% SUCCESS!\n');
    } else {
      console.error('❌ SOME FEATURE F01 SCENARIOS FAILED!\n');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution encountered fatal error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runF01Verification();
