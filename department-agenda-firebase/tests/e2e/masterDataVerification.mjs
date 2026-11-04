/**
 * Playwright Browser Verification Script for Phase 7A: Master Data Management
 * Validates Tabs, Search, Add, Edit, Duplicate Detection, Referential Integrity Guards,
 * and live integration with the Activity Scheduling form.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, 'screenshots');
const adminBaseUrl = 'http://localhost:3001';

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

async function seedInitialMasterAndActivityData() {
  console.log('[Setup] Seeding initial master and activity fixtures into Firestore Emulator...');

  const masterLocations = [
    { id: 'loc_01', name: 'Ruang Rapat Kadis (Lantai 2)', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_02', name: 'Aula PLUT Batam', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_03', name: 'Zoom Cloud Meeting Dinas', type: 'ONLINE', isBookableRoom: false, active: true }
  ];

  const masterOrganizers = [
    { id: 'org_01', name: 'Sekretariat Dinas', active: true },
    { id: 'org_02', name: 'Bidang Pemberdayaan Koperasi', active: true }
  ];

  const masterCategories = [
    { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true },
    { id: 'cat_02', name: 'Pelatihan / Bimtek', colorHex: '#16a34a', active: true }
  ];

  const masterDepartments = [
    { id: 'dept_01', name: 'Sekretariat', active: true },
    { id: 'dept_02', name: 'Bidang Pemberdayaan Koperasi', active: true }
  ];

  const masterEmployees = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_03', name: 'Ahmad Fauzi, SE', position: 'Kepala Bidang Koperasi', departmentId: 'dept_02', active: true }
  ];

  const postDoc = async (col, docId, data) => {
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string') fields[k] = { stringValue: v };
      else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
      else if (typeof v === 'number') fields[k] = { integerValue: String(v) };
      else if (Array.isArray(v)) {
        fields[k] = {
          arrayValue: {
            values: v.map(item => {
              if (typeof item === 'string') return { stringValue: item };
              if (typeof item === 'object') {
                const mapFields = {};
                for (const [mk, mv] of Object.entries(item)) {
                  mapFields[mk] = { stringValue: String(mv) };
                }
                return { mapValue: { fields: mapFields } };
              }
              return { stringValue: String(item) };
            })
          }
        };
      }
    }

    const url = `http://127.0.0.1:8080/v1/projects/demo-department-agenda/databases/(default)/documents/${col}/${docId}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  };

  for (const item of masterLocations) await postDoc('locations', item.id, item);
  for (const item of masterOrganizers) await postDoc('organizers', item.id, item);
  for (const item of masterCategories) await postDoc('categories', item.id, item);
  for (const item of masterDepartments) await postDoc('departments', item.id, item);
  for (const item of masterEmployees) await postDoc('employees', item.id, item);

  // Seed activity referencing loc_01 and emp_03
  const testAct = {
    id: 'act_seed_01',
    title: 'Rapat Koordinasi Evaluasi Program Koperasi Triwulan III',
    startDate: '2026-11-10',
    startTime: '09:00',
    endDate: '2026-11-10',
    endTime: '11:00',
    openEnded: false,
    locationId: 'loc_01',
    organizerId: 'org_01',
    categoryId: 'cat_01',
    attendeeIds: ['emp_01', 'emp_03'],
    attendeeSnapshots: [
      { employeeId: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', label: '1. Kadis (Drs. Hendri Arifin, M.Si)' },
      { employeeId: 'emp_03', name: 'Ahmad Fauzi, SE', position: 'Kepala Bidang Koperasi', label: '2. Kabid Koperasi (Ahmad Fauzi, SE)' }
    ],
    guestAttendees: [],
    status: 'SCHEDULED',
    publicNotes: 'Pakaian PDH.',
    privateNotes: 'Catatan internal.',
    version: 1,
    createdAt: '2026-10-01T08:00:00.000Z',
    createdBy: 'admin_initial',
    updatedAt: '2026-10-01T08:00:00.000Z',
    updatedBy: 'admin_initial'
  };
  await postDoc('activities', testAct.id, testAct);

  console.log('[Setup] Seed completed: master data and 1 referencing activity.\n');
}

async function runMasterDataVerification() {
  console.log('===========================================================');
  console.log('STARTING PHASE 7A: MASTER DATA REAL BROWSER VERIFICATION');
  console.log(`Admin Base URL:  ${adminBaseUrl}`);
  console.log(`Screenshots dir: ${screenshotsDir}`);
  console.log('===========================================================\n');

  await resetEmulatorDatabase();
  await seedInitialMasterAndActivityData();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const dialogMessages = [];
  page.on('dialog', async dialog => {
    dialogMessages.push(dialog.message());
    console.log(`  [Browser Dialog] "${dialog.type()}": ${dialog.message().replace(/\n/g, ' ').slice(0, 100)}...`);
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
    // Scenario 1: Master Data Navigation & Tab Views
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Master Data Navigation & Tab Views ---');
    await page.goto(`${adminBaseUrl}/#dashboard`);
    await page.waitForSelector('.dashboard-page');

    await page.click('.sidebar-nav a[href="#master"]');
    await page.waitForSelector('.master-data-page');

    const tabButtons = await page.$$eval('.master-tabs-bar .tab-btn', els => els.map(e => e.textContent.trim()));
    const hasEmployeeTab = tabButtons.some(t => t.includes('Pegawai'));
    const hasDeptTab = tabButtons.some(t => t.includes('Bidang'));
    const hasLocTab = tabButtons.some(t => t.includes('Lokasi'));
    const hasOrgTab = tabButtons.some(t => t.includes('Penyelenggara'));
    const hasCatTab = tabButtons.some(t => t.includes('Kategori'));

    const initialRowsCount = await page.$$eval('.data-table tbody tr', els => els.length);
    await page.screenshot({ path: path.join(screenshotsDir, 'master_01_view_tabs.png') });

    const s1Passed = hasEmployeeTab && hasDeptTab && hasLocTab && hasOrgTab && hasCatTab && initialRowsCount >= 3;
    record(1, s1Passed, `Master page rendered with 5 entity tabs and ${initialRowsCount} employee rows`);

    // ----------------------------------------------------
    // Scenario 2: Search Filtering in Master Table
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Search Filtering in Master Table ---');
    await page.fill('#masterSearchInput', 'Hendri');
    await page.waitForTimeout(300);

    const filteredRowsCount = await page.$$eval('.data-table tbody tr', els => els.length);
    const hasHendri = await page.locator('.data-table td:has-text("Hendri Arifin")').isVisible();

    // Clear search
    await page.fill('#masterSearchInput', '');
    await page.waitForTimeout(300);
    const restoredRowsCount = await page.$$eval('.data-table tbody tr', els => els.length);

    await page.screenshot({ path: path.join(screenshotsDir, 'master_02_search_filter.png') });

    const s2Passed = filteredRowsCount === 1 && hasHendri && restoredRowsCount >= 3;
    record(2, s2Passed, `Search filter matched 1 employee ("Hendri"), clear search restored to ${restoredRowsCount}`);

    // ----------------------------------------------------
    // Scenario 3: Add New Master Record Flow
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Add New Master Record Flow ---');
    // Switch to Lokasi & Ruangan tab
    await page.click('.tab-btn[data-tab="locations"]');
    await page.waitForTimeout(300);

    await page.click('#btnAddMasterRecord');
    await page.waitForSelector('.master-modal-card');

    const newLocName = 'Ruang Media Center PLUT Batam';
    await page.fill('#modalInputName', newLocName);
    await page.selectOption('#modalSelectType', 'OFFICE');
    await page.check('#modalCheckBookable');

    await page.click('#btnMasterModalSave');
    await page.waitForTimeout(1000);

    const hasNewLoc = await page.locator(`.data-table td:has-text("${newLocName}")`).isVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'master_03_add_location.png') });

    record(3, hasNewLoc, `New bookable location added and saved to Firestore: "${newLocName}"`);

    // ----------------------------------------------------
    // Scenario 4: Duplicate Prevention Check in UI
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: Duplicate Prevention Check in UI ---');
    await page.click('#btnAddMasterRecord');
    await page.waitForSelector('.master-modal-card');

    // Try adding the same location name
    await page.fill('#modalInputName', newLocName);
    await page.click('#btnMasterModalSave');
    await page.waitForTimeout(600);

    const errBox = page.locator('#masterModalError');
    const isErrVisible = await errBox.isVisible();
    const errText = await errBox.textContent();

    await page.click('#btnMasterModalCancel');
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(screenshotsDir, 'master_04_duplicate_prevention.png') });

    const s4Passed = isErrVisible && (errText?.includes('sudah terdaftar') ?? false);
    record(4, s4Passed, `Duplicate prevention triggered: "${errText}"`);

    // ----------------------------------------------------
    // Scenario 5: Edit Existing Master Record Flow
    // ----------------------------------------------------
    console.log('\n--- Scenario 5: Edit Existing Master Record Flow ---');
    // Switch to Pegawai tab
    await page.click('.tab-btn[data-tab="employees"]');
    await page.waitForTimeout(300);

    // Edit emp_03 (Ahmad Fauzi)
    const editBtnEmp3 = page.locator('tr:has-text("Ahmad Fauzi") .btn-edit-master').first();
    await editBtnEmp3.click();
    await page.waitForSelector('.master-modal-card');

    const updatedPosition = 'Kepala Seksi Kelembagaan Koperasi';
    await page.fill('#modalInputPosition', updatedPosition);
    await page.click('#btnMasterModalSave');
    await page.waitForTimeout(1000);

    const hasUpdatedPosition = await page.locator(`.data-table td:has-text("${updatedPosition}")`).isVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'master_05_edit_employee.png') });

    record(5, hasUpdatedPosition, `Employee position updated in master directory: "${updatedPosition}"`);

    // ----------------------------------------------------
    // Scenario 6: Referential Integrity Safeguard on Deactivation
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Referential Integrity Safeguard on Deactivation ---');
    // Switch back to Lokasi tab
    await page.click('.tab-btn[data-tab="locations"]');
    await page.waitForTimeout(300);

    // loc_01 is referenced by act_seed_01
    const loc1ToggleBtn = page.locator('tr:has-text("Ruang Rapat Kadis") .btn-toggle-master').first();
    await loc1ToggleBtn.click();
    await page.waitForTimeout(500);

    const hasWarningDialog = dialogMessages.some(m =>
      m.includes('PERINGATAN INTEGRITAS REFERENSIAL') &&
      m.includes('dirujuk oleh 1 kegiatan')
    );

    await page.screenshot({ path: path.join(screenshotsDir, 'master_06_referential_safeguard.png') });

    record(6, hasWarningDialog, `Referential safeguard intercepted deactivation of in-use location with dialog notice`);

    // ----------------------------------------------------
    // Scenario 7: Live Integration with Activity Form
    // ----------------------------------------------------
    console.log('\n--- Scenario 7: Live Integration with Activity Form ---');
    await page.goto(`${adminBaseUrl}/#activities/new`);
    await page.waitForSelector('.edit-activity-page');

    // Wait for options to load
    await page.waitForSelector('#selectLocation option:nth-child(2)', { state: 'attached' });

    const locationOptions = await page.$$eval('#selectLocation option', els => els.map(e => e.textContent.trim()));
    const hasMediaCenterInForm = locationOptions.some(opt => opt.includes('Ruang Media Center PLUT Batam'));

    await page.screenshot({ path: path.join(screenshotsDir, 'master_07_activity_form_integration.png') });

    record(7, hasMediaCenterInForm, `Newly created master location dynamically available in Add Activity form`);

    // ----------------------------------------------------
    // Scenario 8: Historical Attendee Snapshot Preservation
    // ----------------------------------------------------
    console.log('\n--- Scenario 8: Historical Attendee Snapshot Preservation ---');
    // Check that historical activity act_seed_01 still retains Ahmad Fauzi's original title
    const res = await fetch('http://127.0.0.1:8080/v1/projects/demo-department-agenda/databases/(default)/documents/activities/act_seed_01');
    const actJson = await res.json();
    const snapshots = actJson.fields.attendeeSnapshots.arrayValue.values.map(v => v.mapValue.fields.label.stringValue);
    const preservesHistoricalTitle = snapshots.some(label => label.includes('Kabid Koperasi'));

    record(8, preservesHistoricalTitle, `Historical activity snapshots preserved intact ("${snapshots.join(', ')}") despite employee master edit`);

  } catch (err) {
    console.error('Fatal error in Master Data verification run:', err);
    record('FATAL', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n===========================================================');
  console.log('PHASE 7A BROWSER VERIFICATION SUMMARY');
  console.log('===========================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed:          ${passedCount}`);
  console.log(`Failed:          ${results.length - passedCount}`);
  console.log('===========================================================\n');

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runMasterDataVerification().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
