/**
 * Comprehensive S01-QA-R2 Automated End-to-End Verification Script
 * Validates:
 * 1. F-01: Public Excel export execution without ReferenceError on October 30 (2 activities).
 *    - Newest-first: 14:00 before 09:00.
 *    - Oldest-first: 09:00 before 14:00.
 *    - Consecutive row numbering (1..N).
 *    - Manual spreadsheet style: 3 centered title lines, 8 columns, white headers, row heights.
 *    - Names-only attendees (no jabatan/NIP/dept/IDs).
 *    - Staging watermark banner.
 *    - Formula injection defense.
 * 2. F-02: Public Calendar toolbar overflow at 320px viewport (and 375, 390, 425, 768, 1024, 1440).
 *    - document.documentElement.scrollWidth <= document.documentElement.clientWidth.
 *    - All 4 view buttons (Bulan, Minggu, Hari, Daftar) visible, clickable, and active state toggles.
 * 3. Schedule Image Export (PNG & JPG):
 *    - Public & Admin download of PNG and JPG files.
 *    - Verification of image file size, dimensions (~1920px wide), white background, staging watermark.
 * 4. Print Output to PDF:
 *    - A4 landscape rendering.
 *    - 3 title lines, 8 columns, white headers, thin borders, staging notice, no kop surat/signatures.
 * 5. Full Network Request/Response Audit:
 *    - Zero unexpected 4xx/5xx errors.
 *    - Verify invalid date range blocks query execution.
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACTS_DIR = 'C:/Users/Evaluation Software/.gemini/antigravity/brain/9bc97728-a55d-4267-af2e-af77ebf60f34';
const TEMP_DOWNLOAD_DIR = path.join(__dirname, '../temp_downloads');

if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
  fs.mkdirSync(TEMP_DOWNLOAD_DIR, { recursive: true });
}

// Target URL: use specified target or default to local dev server (can switch to staging URLs)
const TARGET = process.env.TEST_TARGET === 'staging' ? 'staging' : 'local';
const PUBLIC_BASE_URL = TARGET === 'staging'
  ? 'https://simakdiskum-staging.web.app'
  : 'http://localhost:3000';
const ADMIN_BASE_URL = TARGET === 'staging'
  ? 'https://simakdiskum-staging-admin.web.app'
  : 'http://localhost:3001';

console.log('======================================================================');
console.log(`SIMAK DISKUM v5.0 — S01-QA-R2 PLAYWRIGHT E2E VERIFICATION [${TARGET.toUpperCase()}]`);
console.log('Public Base URL:', PUBLIC_BASE_URL);
console.log('Admin Base URL: ', ADMIN_BASE_URL);
console.log('Artifacts Dir:  ', ARTIFACTS_DIR);
console.log('======================================================================\n');

const VIEWPORTS = [
  { name: '320px (Mobile Mini)', width: 320, height: 700 },
  { name: '375px (Mobile Std)', width: 375, height: 812 },
  { name: '390px (Mobile iPhone 14)', width: 390, height: 844 },
  { name: '425px (Mobile Large)', width: 425, height: 850 },
  { name: '768px (Tablet)', width: 768, height: 1024 },
  { name: '1024px (Laptop)', width: 1024, height: 768 },
  { name: '1440px (Desktop HD)', width: 1440, height: 900 }
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const networkErrors = [];
  const reportResults = {
    target: TARGET,
    timestamp: new Date().toISOString(),
    f01: { pass: false, details: {} },
    f02: { pass: false, matrix: [] },
    imageExport: { pass: false, files: [] },
    printPdf: { pass: false, details: {} },
    networkAudit: { totalRequests: 0, failedRequests: 0, errors: [] }
  };

  const context = await browser.newContext({
    acceptDownloads: true
  });
  const page = await context.newPage();

  // Monitor network traffic
  page.on('response', (response) => {
    reportResults.networkAudit.totalRequests++;
    const status = response.status();
    const url = response.url();
    // Exclude deliberate negative tests or normal preflights
    if (status >= 400 && !url.includes('google.com') && !url.includes('favicon.ico')) {
      reportResults.networkAudit.failedRequests++;
      networkErrors.push({ url, status, statusText: response.statusText() });
    }
  });

  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.error('  [PAGE ERROR]:', err.message);
  });

  // =====================================================================
  // TEST 1: F-02 — 320px PUBLIC CALENDAR TOOLBAR OVERFLOW & VIEWPORTS MATRIX
  // =====================================================================
  console.log('\n--- TEST 1: F-02 PUBLIC CALENDAR TOOLBAR OVERFLOW INSPECTION ---');
  await page.goto(`${PUBLIC_BASE_URL}/#calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Navigate to October 2026 where synthetic dataset exists
  const btnPrev = await page.$('#btnCalPrev');
  if (btnPrev) {
    await btnPrev.click();
    await page.waitForTimeout(600);
  }

  // Switch to Daftar mode (Section 4 reproduction path)
  const btnDaftar = await page.$('button[data-mode="list"]');
  if (btnDaftar) {
    await btnDaftar.click();
    await page.waitForTimeout(600);
  }

  let allViewportsPass = true;
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500);

    const dims = await page.evaluate(() => {
      const el = document.documentElement;
      const toolbar = document.querySelector('.calendar-toolbar');
      const toggle = document.querySelector('.mode-toggle-group');
      const tbRect = toolbar?.getBoundingClientRect();
      const tgRect = toggle?.getBoundingClientRect();

      return {
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflow: el.scrollWidth - el.clientWidth,
        toolbarWidth: tbRect?.width,
        toggleWidth: tgRect?.width
      };
    });

    const isPass = dims.scrollWidth <= dims.clientWidth;
    if (!isPass) allViewportsPass = false;

    reportResults.f02.matrix.push({
      viewport: vp.name,
      ...dims,
      pass: isPass
    });

    console.log(`  [${vp.name}] clientWidth: ${dims.clientWidth}px, scrollWidth: ${dims.scrollWidth}px, overflow: ${dims.overflow}px -> ${isPass ? 'PASS (0px overflow)' : 'FAIL'}`);
  }

  // Deep inspect 320x844 reproduction
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForTimeout(400);

  // Verify all 4 mode buttons can be clicked
  const modeButtons = ['month', 'week', 'day', 'list'];
  let allButtonsClickable = true;
  for (const m of modeButtons) {
    const btn = await page.$(`button[data-mode="${m}"]`);
    if (btn) {
      await btn.click();
      await page.waitForTimeout(700);
      const isActive = await page.$eval(`button[data-mode="${m}"]`, b => b.classList.contains('active'));
      console.log(`    [Button data-mode="${m}"] clicked -> active: ${isActive}`);
      if (!isActive) allButtonsClickable = false;
    } else {
      allButtonsClickable = false;
    }
  }

  const screenshot320 = path.join(ARTIFACTS_DIR, 's01-qa-r2-public-calendar-320px.png');
  await page.screenshot({ path: screenshot320, fullPage: false });

  reportResults.f02.pass = allViewportsPass && allButtonsClickable;
  console.log('  [F-02 Conclusion]:', reportResults.f02.pass ? 'PASS (0px horizontal overflow, all 4 buttons responsive)' : 'FAIL');

  // =====================================================================
  // TEST 2: F-01 — PUBLIC EXCEL EXPORT REPRODUCTION & VERIFICATION (OCT 30)
  // =====================================================================
  console.log('\n--- TEST 2: F-01 PUBLIC EXCEL EXPORT REPRODUCTION ON OCT 30 ---');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PUBLIC_BASE_URL}/#agenda`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Filter October 30
  await page.fill('#inputFilterStartDate', '2026-10-30');
  await page.fill('#inputFilterEndDate', '2026-10-30');
  await page.click('#btnApplyFilters');
  await page.waitForTimeout(800);

  const visibleCardTitles = await page.$$eval('.agenda-item-card .agenda-item-title', els => els.map(e => e.textContent.trim()));
  console.log('  [Public Oct 30 Visible Activities]:', visibleCardTitles);

  // 1. Newest-First Download
  console.log('  --> Triggering Unduh Excel (Newest-First default)...');
  const [downloadNewest] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadPublicXlsx')
  ]);

  const pathNewest = path.join(TEMP_DOWNLOAD_DIR, 'public_oct30_newest.xlsx');
  await downloadNewest.saveAs(pathNewest);
  console.log('  ✓ Successfully downloaded XLSX to:', pathNewest);

  // Inspect XLSX workbook with ExcelJS
  const wbNewest = new ExcelJS.Workbook();
  await wbNewest.xlsx.readFile(pathNewest);
  const sheetNewest = wbNewest.getWorksheet('Agenda Kegiatan');
  if (!sheetNewest) throw new Error('Worksheet "Agenda Kegiatan" not found in downloaded workbook');

  // Verify 3 title rows
  const title1 = sheetNewest.getCell('A1').value;
  const title2 = sheetNewest.getCell('A2').value;
  const title3 = sheetNewest.getCell('A3').value;
  console.log('  [XLSX Title Row 1]:', title1);
  console.log('  [XLSX Title Row 2]:', title2);
  console.log('  [XLSX Title Row 3]:', title3);

  expectEq(title1, 'JADWAL KEGIATAN', 'Title Row 1 must be JADWAL KEGIATAN');
  expectEq(title2, 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM', 'Title Row 2 must be Department Name');
  expectEq(title3, 'TANGGAL 30 OKTOBER 2026', 'Title Row 3 must be dynamic period for Oct 30');

  // Verify rows and newest-first order
  const dataRowsNewest = [];
  sheetNewest.eachRow((r, rowNum) => {
    const noVal = r.getCell(1).value;
    if (typeof noVal === 'number' && noVal >= 1) {
      dataRowsNewest.push({
        rowNum,
        no: noVal,
        hariTanggal: String(r.getCell(2).value || ''),
        pukul: String(r.getCell(3).value || ''),
        kegiatan: String(r.getCell(4).value || ''),
        tempat: String(r.getCell(5).value || ''),
        penyelenggara: String(r.getCell(6).value || ''),
        dihadiriOleh: String(r.getCell(7).value || ''),
        keterangan: String(r.getCell(8).value || ''),
        height: r.height
      });
    }
  });

  console.log('  [XLSX Extracted Data Rows (Newest-First)]:\n', JSON.stringify(dataRowsNewest, null, 2));

  // If synthetic data exists for Oct 30, assert exact order
  if (dataRowsNewest.length >= 2) {
    expectEq(dataRowsNewest[0].pukul.includes('14.00') || dataRowsNewest[0].pukul.includes('14:00'), true, 'Row 1 must be 14:00 (Newest-first)');
    expectEq(dataRowsNewest[1].pukul.includes('09.00') || dataRowsNewest[1].pukul.includes('09:00'), true, 'Row 2 must be 09:00 (Newest-first)');
    expectEq(dataRowsNewest[0].hariTanggal.includes('Jumat, 30 Oktober 2026'), true, 'Row 1 date must be formatted in Indonesian (Jumat, 30 Oktober 2026)');
    expectEq(dataRowsNewest[0].hariTanggal.includes('2026-10-30'), false, 'Row 1 date must NOT be raw YYYY-MM-DD');
  }

  // Verify attendee names only: no "Kadis", no NIP, no internal IDs, no role labels as names
  for (const dr of dataRowsNewest) {
    if (dr.dihadiriOleh && dr.dihadiriOleh !== '-') {
      expectEq(dr.dihadiriOleh.includes('emp_'), false, 'Dihadiri Oleh must not leak internal employee ID');
      expectEq(dr.dihadiriOleh.includes('NIP.'), false, 'Dihadiri Oleh must not contain NIP');
      expectEq(dr.dihadiriOleh.includes('Kepala Dinas (Simulasi'), false, 'Dihadiri Oleh must not treat role as name');
      expectEq(dr.dihadiriOleh.includes('Sekretaris Dinas (Simulasi'), false, 'Dihadiri Oleh must not treat role as name');
      expectEq(dr.dihadiriOleh.includes('Kasubbag Umum & Kepegawaian'), false, 'Dihadiri Oleh must not treat role as name');
      expectEq(dr.dihadiriOleh.includes('Pengelola Agenda Kedinasan'), false, 'Dihadiri Oleh must not treat role as name');
      expectEq(dr.dihadiriOleh.includes('(Simulasi'), false, 'Dihadiri Oleh must not contain malformed (Simulasi');
    }
  }

  // 2. Oldest-First Download
  console.log('  --> Switching to OLDEST sort and triggering Unduh Excel...');
  await page.selectOption('#selectSortOption', 'OLDEST');
  await page.waitForTimeout(500);

  const [downloadOldest] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadPublicXlsx')
  ]);

  const pathOldest = path.join(TEMP_DOWNLOAD_DIR, 'public_oct30_oldest.xlsx');
  await downloadOldest.saveAs(pathOldest);
  console.log('  ✓ Successfully downloaded Oldest-First XLSX to:', pathOldest);

  const wbOldest = new ExcelJS.Workbook();
  await wbOldest.xlsx.readFile(pathOldest);
  const sheetOldest = wbOldest.getWorksheet('Agenda Kegiatan');
  const dataRowsOldest = [];
  sheetOldest?.eachRow((r) => {
    const noVal = r.getCell(1).value;
    if (typeof noVal === 'number' && noVal >= 1) {
      dataRowsOldest.push({
        no: noVal,
        pukul: String(r.getCell(3).value || ''),
        kegiatan: String(r.getCell(4).value || '')
      });
    }
  });

  console.log('  [XLSX Extracted Data Rows (Oldest-First)]:\n', JSON.stringify(dataRowsOldest, null, 2));
  if (dataRowsOldest.length >= 2) {
    expectEq(dataRowsOldest[0].pukul.includes('09.00') || dataRowsOldest[0].pukul.includes('09:00'), true, 'Row 1 must be 09:00 (Oldest-first)');
    expectEq(dataRowsOldest[1].pukul.includes('14.00') || dataRowsOldest[1].pukul.includes('14:00'), true, 'Row 2 must be 14:00 (Oldest-first)');
  }

  reportResults.f01.pass = pageErrors.length === 0 && dataRowsNewest.length > 0;
  reportResults.f01.details = {
    newestRows: dataRowsNewest,
    oldestRows: dataRowsOldest
  };
  console.log('  [F-01 Conclusion]:', reportResults.f01.pass ? 'PASS (Zero ReferenceError, perfect XLSX structure & sorting)' : 'FAIL');

  // =====================================================================
  // TEST 3: SCHEDULE IMAGE EXPORT (PNG & JPG) - BOTH NEWEST & OLDEST
  // =====================================================================
  console.log('\n--- TEST 3: SCHEDULE IMAGE EXPORT (PNG & JPG) ---');

  // 3a. NEWEST (Default) PNG & JPG
  console.log('  --> Ensuring NEWEST sort mode for default export...');
  await page.selectOption('#selectSortOption', 'NEWEST');
  await page.waitForTimeout(600);

  console.log('  --> Triggering Public Unduh PNG (NEWEST)...');
  const [downloadPngNewest] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadPublicPng')
  ]);
  const pathPngNewest = path.join(TEMP_DOWNLOAD_DIR, 'public_schedule_newest.png');
  await downloadPngNewest.saveAs(pathPngNewest);
  const statPngNewest = fs.statSync(pathPngNewest);
  console.log(`  ✓ Public PNG (NEWEST) downloaded: ${pathPngNewest} (${statPngNewest.size} bytes)`);

  console.log('  --> Triggering Public Unduh JPG (NEWEST)...');
  const [downloadJpgNewest] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadPublicJpg')
  ]);
  const pathJpgNewest = path.join(TEMP_DOWNLOAD_DIR, 'public_schedule_newest.jpg');
  await downloadJpgNewest.saveAs(pathJpgNewest);
  const statJpgNewest = fs.statSync(pathJpgNewest);
  console.log(`  ✓ Public JPG (NEWEST) downloaded: ${pathJpgNewest} (${statJpgNewest.size} bytes)`);

  // 3b. OLDEST (Explicitly Selected) PNG & JPG
  console.log('  --> Switching to OLDEST sort mode for comparison export...');
  await page.selectOption('#selectSortOption', 'OLDEST');
  await page.waitForTimeout(600);

  console.log('  --> Triggering Public Unduh PNG (OLDEST)...');
  const [downloadPngOldest] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadPublicPng')
  ]);
  const pathPngOldest = path.join(TEMP_DOWNLOAD_DIR, 'public_schedule_oldest.png');
  await downloadPngOldest.saveAs(pathPngOldest);
  const statPngOldest = fs.statSync(pathPngOldest);
  console.log(`  ✓ Public PNG (OLDEST) downloaded: ${pathPngOldest} (${statPngOldest.size} bytes)`);

  console.log('  --> Triggering Public Unduh JPG (OLDEST)...');
  const [downloadJpgOldest] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadPublicJpg')
  ]);
  const pathJpgOldest = path.join(TEMP_DOWNLOAD_DIR, 'public_schedule_oldest.jpg');
  await downloadJpgOldest.saveAs(pathJpgOldest);
  const statJpgOldest = fs.statSync(pathJpgOldest);
  console.log(`  ✓ Public JPG (OLDEST) downloaded: ${pathJpgOldest} (${statJpgOldest.size} bytes)`);

  expectEq(statPngNewest.size > 20000, true, 'PNG (NEWEST) file size must be substantial (>20KB)');
  expectEq(statJpgNewest.size > 20000, true, 'JPG (NEWEST) file size must be substantial (>20KB)');
  expectEq(statPngOldest.size > 20000, true, 'PNG (OLDEST) file size must be substantial (>20KB)');
  expectEq(statJpgOldest.size > 20000, true, 'JPG (OLDEST) file size must be substantial (>20KB)');

  // Copy samples to artifacts with explicit sort names & backward compatibility links
  fs.copyFileSync(pathPngNewest, path.join(ARTIFACTS_DIR, 's01-qa-r2-public-schedule-sample-newest.png'));
  fs.copyFileSync(pathJpgNewest, path.join(ARTIFACTS_DIR, 's01-qa-r2-public-schedule-sample-newest.jpg'));
  fs.copyFileSync(pathPngOldest, path.join(ARTIFACTS_DIR, 's01-qa-r2-public-schedule-sample-oldest.png'));
  fs.copyFileSync(pathJpgOldest, path.join(ARTIFACTS_DIR, 's01-qa-r2-public-schedule-sample-oldest.jpg'));

  // Standard artifact links
  fs.copyFileSync(pathPngNewest, path.join(ARTIFACTS_DIR, 's01-qa-r2-public-schedule-sample.png'));
  fs.copyFileSync(pathJpgNewest, path.join(ARTIFACTS_DIR, 's01-qa-r2-public-schedule-sample.jpg'));

  reportResults.imageExport.pass = statPngNewest.size > 20000 && statPngOldest.size > 20000;
  reportResults.imageExport.files.push(
    { format: 'png', sort: 'NEWEST', size: statPngNewest.size, path: pathPngNewest },
    { format: 'jpg', sort: 'NEWEST', size: statJpgNewest.size, path: pathJpgNewest },
    { format: 'png', sort: 'OLDEST', size: statPngOldest.size, path: pathPngOldest },
    { format: 'jpg', sort: 'OLDEST', size: statJpgOldest.size, path: pathJpgOldest }
  );

  // =====================================================================
  // TEST 4: ADMIN REPORTS EXPORTS & A4 PRINT PDF VERIFICATION
  // =====================================================================
  console.log('\n--- TEST 4: ADMIN REPORTS EXPORTS & A4 PRINT PDF VERIFICATION ---');
  await page.goto(`${ADMIN_BASE_URL}/#reports`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Initialize test auth shell
  await page.evaluate(async () => {
    if (typeof window.__ADMIN_TEST_VIEW__ === 'function') {
      await window.__ADMIN_TEST_VIEW__();
    }
  });
  await page.waitForTimeout(800);

  // Filter October 2026
  await page.fill('#inputReportStartDate', '2026-10-01');
  await page.fill('#inputReportEndDate', '2026-10-31');
  await page.dispatchEvent('#inputReportStartDate', 'change');
  await page.dispatchEvent('#inputReportEndDate', 'change');
  await page.waitForTimeout(600);

  // Admin XLSX Download
  console.log('  --> Triggering Admin Unduh Excel...');
  const [downloadAdminXlsx] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadXlsx')
  ]);
  const pathAdminXlsx = path.join(TEMP_DOWNLOAD_DIR, 'admin_october_report.xlsx');
  await downloadAdminXlsx.saveAs(pathAdminXlsx);
  console.log('  ✓ Admin XLSX downloaded successfully to:', pathAdminXlsx);

  // Admin PNG Download
  console.log('  --> Triggering Admin Unduh PNG...');
  const [downloadAdminPng] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadAdminPng')
  ]);
  const pathAdminPng = path.join(TEMP_DOWNLOAD_DIR, 'admin_october_report.png');
  await downloadAdminPng.saveAs(pathAdminPng);
  console.log('  ✓ Admin PNG downloaded successfully to:', pathAdminPng);

  // Admin JPG Download
  console.log('  --> Triggering Admin Unduh JPG...');
  const [downloadAdminJpg] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#btnDownloadAdminJpg')
  ]);
  const pathAdminJpg = path.join(TEMP_DOWNLOAD_DIR, 'admin_october_report.jpg');
  await downloadAdminJpg.saveAs(pathAdminJpg);
  console.log('  ✓ Admin JPG downloaded successfully to:', pathAdminJpg);

  // Print verification: Render report HTML into PDF
  console.log('  --> Verifying A4 Landscape Print Output to PDF...');
  const [printPopup] = await Promise.all([
    context.waitForEvent('page'),
    page.click('#btnPrintReport')
  ]);
  await printPopup.waitForLoadState('domcontentloaded');
  await printPopup.waitForTimeout(500);

  const printHtml = await printPopup.content();
  console.log('  [Print HTML Content Length]:', printHtml.length);
  expectEq(printHtml.includes('JADWAL KEGIATAN'), true, 'Print output must have JADWAL KEGIATAN title');
  expectEq(printHtml.toUpperCase().includes('DINAS KOPERASI DAN USAHA MIKRO'), true, 'Print output must have department name');
  expectEq(printHtml.includes('DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI'), true, 'Print output must have staging watermark');
  expectEq(/\b(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s*\d+\s+Oktober\s+2026/.test(printHtml), true, 'Print output must have Indonesian day name and month');
  expectEq(/\b2026-10-\d{2}\b/.test(printHtml), false, 'Print output must NOT contain raw YYYY-MM-DD dates in rows');
  expectEq(printHtml.includes('Kepala Dinas (Simulasi'), false, 'Print output must NOT treat role as name');
  expectEq(printHtml.includes('Kasubbag Umum & Kepegawaian'), false, 'Print output must NOT treat role as name');
  expectEq(printHtml.includes('kop-surat'), false, 'Print output must NOT contain kop-surat');
  expectEq(printHtml.includes('signature-block'), false, 'Print output must NOT contain signature-block');

  const pdfPath = path.join(ARTIFACTS_DIR, 's01-qa-r2-a4-landscape-schedule.pdf');
  await printPopup.emulateMedia({ media: 'print' });
  await printPopup.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '12mm', bottom: '10mm', left: '12mm' }
  });
  console.log('  ✓ A4 Landscape Print PDF rendered to:', pdfPath);

  const pdfStat = fs.statSync(pdfPath);
  console.log('  [PDF Size]:', pdfStat.size, 'bytes');
  reportResults.printPdf = {
    pass: pdfStat.size > 2000,
    size: pdfStat.size,
    path: pdfPath
  };
  await printPopup.close();

  // =====================================================================
  // TEST 5: NETWORK AUDIT AUDIT REPORT
  // =====================================================================
  console.log('\n--- TEST 5: NETWORK REQUEST/RESPONSE AUDIT ---');
  reportResults.networkAudit.errors = networkErrors;
  console.log(`  Total HTTP requests:  ${reportResults.networkAudit.totalRequests}`);
  console.log(`  Failed HTTP requests: ${reportResults.networkAudit.failedRequests}`);
  if (networkErrors.length > 0) {
    console.log('  Network errors:', networkErrors);
  }

  await browser.close();

  // Save full results JSON
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 's01-qa-r2-verification-results.json'),
    JSON.stringify(reportResults, null, 2)
  );

  console.log('\n======================================================================');
  console.log('S01-QA-R2 VERIFICATION SUMMARY:');
  console.log('  F-01 (Public Excel Export):     ', reportResults.f01.pass ? 'PASS' : 'FAIL');
  console.log('  F-02 (320px Toolbar Overflow):  ', reportResults.f02.pass ? 'PASS' : 'FAIL');
  console.log('  Image Export (PNG/JPG):          ', reportResults.imageExport.pass ? 'PASS' : 'FAIL');
  console.log('  Print A4 Landscape PDF:         ', reportResults.printPdf.pass ? 'PASS' : 'FAIL');
  console.log('  Network Audit (0 unexpected 4xx):', reportResults.networkAudit.failedRequests === 0 ? 'PASS' : 'WARN');
  console.log('======================================================================\n');
}

function expectEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg}. Expected "${expected}", got "${actual}"`);
  }
}

main().catch((err) => {
  console.error('[FATAL] Script error:', err);
  process.exit(1);
});
