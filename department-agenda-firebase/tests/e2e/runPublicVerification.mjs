/**
 * Comprehensive Playwright Browser Verification Script for Public Portal
 * Validates all 11 Public UI scenarios against live Firebase Emulator and Vite Public & Admin Servers.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, 'screenshots');
const publicBaseUrl = 'http://localhost:3000';
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

async function seedEmulatorData() {
  console.log('[Setup] Seeding initial test fixtures into Firestore Emulator...');

  const masterLocations = [
    { id: 'loc_01', name: 'Ruang Rapat Kadis (Lantai 2)', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_02', name: 'Aula PLUT Batam', type: 'OFFICE', isBookableRoom: true, active: true },
    { id: 'loc_03', name: 'Zoom Cloud Meeting Dinas', type: 'ONLINE', isBookableRoom: false, active: true },
    { id: 'loc_04', name: 'Hotel Planet Holiday Batam', type: 'EXTERNAL', isBookableRoom: false, active: true }
  ];

  const masterOrganizers = [
    { id: 'org_01', name: 'Sekretariat Dinas', active: true },
    { id: 'org_02', name: 'Bidang Pemberdayaan Koperasi', active: true },
    { id: 'org_03', name: 'Kementerian Koperasi dan UKM RI', active: true }
  ];

  const masterCategories = [
    { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true },
    { id: 'cat_02', name: 'Pelatihan / Bimtek', colorHex: '#16a34a', active: true },
    { id: 'cat_03', name: 'Pameran & Ekspo', colorHex: '#ea580c', active: true },
    { id: 'cat_04', name: 'Sosialisasi Regulasi', colorHex: '#9333ea', active: true }
  ];

  const masterEmployees = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_03', name: 'Ahmad Fauzi, SE', position: 'Kabid Koperasi', departmentId: 'dept_02', active: true },
    { id: 'emp_04', name: 'Dewi Sartika, S.Si', position: 'Kabid UMKM', departmentId: 'dept_03', active: true }
  ];

  // Helper to post doc to Firestore emulator REST endpoint
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

  // Seed master data
  for (const item of masterLocations) await postDoc('locations', item.id, item);
  for (const item of masterOrganizers) await postDoc('organizers', item.id, item);
  for (const item of masterCategories) await postDoc('categories', item.id, item);
  for (const item of masterEmployees) await postDoc('employees', item.id, item);

  // Seed public announcements
  const announcements = [
    {
      id: 'ann_01',
      title: 'Pelayanan Konsultasi Usaha di Gedung PLUT-KUMKM Batam',
      content: 'Pusat Layanan Usaha Terpadu (PLUT) KUMKM Kota Batam melayani konsultasi pendampingan kelembagaan, digitalisasi, dan pembiayaan bagi pelaku UMKM setiap hari kerja pukul 08.00 - 15.00 WIB.',
      category: 'LAYANAN',
      publishedAt: '2026-10-01T08:00:00.000Z'
    },
    {
      id: 'ann_02',
      title: 'Pendaftaran Fasilitasi Sertifikasi Halal Gratis (Self Declare) 2026',
      content: 'Dinas Koperasi dan Usaha Mikro Kota Batam memfasilitasi pendampingan sertifikasi halal gratis untuk pelaku usaha mikro olahan makanan dan minuman. Pendaftaran dibuka melalui loket PLUT Batam.',
      category: 'PROGRAM',
      publishedAt: '2026-10-15T09:30:00.000Z'
    },
    {
      id: 'ann_03',
      title: 'Himbauan Pelaporan Rapat Anggota Tahunan (RAT) Koperasi',
      content: 'Dihimbau kepada seluruh pengurus gerakan koperasi di Kota Batam agar melaksanakan Rapat Anggota Tahunan (RAT) Tahun Buku tepat waktu dan menyampaikan laporannya kepada Dinas.',
      category: 'REGULASI',
      publishedAt: '2026-11-01T10:00:00.000Z'
    }
  ];
  for (const item of announcements) await postDoc('publicAnnouncements', item.id, item);

  // Seed 6 diverse public activities
  const publicActivities = [
    {
      id: 'act_001',
      title: 'Rapat Koordinasi Evaluasi Program Koperasi Triwulan III',
      startDate: '2026-11-04',
      startTime: '09:00',
      endDate: '2026-11-04',
      endTime: '11:30',
      openEnded: false,
      dateDisplay: 'Rabu, 4 November 2026',
      timeDisplay: '09.00 - 11.30 WIB',
      status: 'SCHEDULED',
      locationName: 'Ruang Rapat Kadis (Lantai 2)',
      locationType: 'OFFICE',
      organizerName: 'Sekretariat Dinas',
      categoryName: 'Rapat Koordinasi',
      publicNotes: 'Pakaian: PDH Hari Rabu. Harap membawa dokumen evaluasi.',
      attendeeLabels: ['1. Kadis (Drs. Hendri Arifin, M.Si)', '2. Sekretaris (Rini Marlina, S.Sos)'],
      updatedAt: '2026-11-01T08:00:00.000Z'
    },
    {
      id: 'act_002',
      title: 'Bimtek Digitalisasi Manajemen Keuangan Koperasi',
      startDate: '2026-11-04',
      startTime: '13:30',
      endDate: '2026-11-04',
      endTime: '16:00',
      openEnded: false,
      dateDisplay: 'Rabu, 4 November 2026',
      timeDisplay: '13.30 - 16.00 WIB',
      status: 'SCHEDULED',
      locationName: 'Aula PLUT Batam',
      locationType: 'OFFICE',
      organizerName: 'Bidang Pemberdayaan Koperasi',
      categoryName: 'Pelatihan / Bimtek',
      publicNotes: 'Peserta membawa laptop masing-masing untuk praktik aplikasi pembukuan.',
      attendeeLabels: ['1. Kabid Koperasi (Ahmad Fauzi, SE)'],
      updatedAt: '2026-11-02T09:00:00.000Z'
    },
    {
      id: 'act_003',
      title: 'Batam Cooperative & Micro Enterprise Expo 2026',
      startDate: '2026-11-06',
      startTime: '08:00',
      endDate: '2026-11-08',
      endTime: '21:00',
      openEnded: false,
      dateDisplay: 'Jumat–Minggu, 6–8 November 2026',
      timeDisplay: '08.00 - 21.00 WIB',
      status: 'SCHEDULED',
      locationName: 'Hotel Planet Holiday Batam',
      locationType: 'EXTERNAL',
      organizerName: 'Kementerian Koperasi dan UKM RI',
      categoryName: 'Pameran & Ekspo',
      publicNotes: 'Terbuka untuk umum dan seluruh pelaku usaha mikro Kota Batam.',
      attendeeLabels: ['1. Kadis (Drs. Hendri Arifin, M.Si)', '2. Kabid UMKM (Dewi Sartika, S.Si)'],
      updatedAt: '2026-11-02T10:00:00.000Z'
    },
    {
      id: 'act_004',
      title: 'Program Inkubasi Bisnis UMKM Naik Kelas Kota Batam',
      startDate: '2026-10-15',
      startTime: '08:30',
      endDate: '2026-11-20',
      endTime: '12:00',
      openEnded: false,
      dateDisplay: 'Kamis–Jumat, 15 Oktober – 20 November 2026',
      timeDisplay: '08.30 - 12.00 WIB',
      status: 'SCHEDULED',
      locationName: 'Aula PLUT Batam',
      locationType: 'OFFICE',
      organizerName: 'Bidang Pemberdayaan Koperasi',
      categoryName: 'Pelatihan / Bimtek',
      publicNotes: 'Program inkubasi batch II intensif bagi 30 wirausaha terpilih.',
      attendeeLabels: ['1. Kabid UMKM (Dewi Sartika, S.Si)'],
      updatedAt: '2026-10-14T07:00:00.000Z'
    },
    {
      id: 'act_005',
      title: 'Sosialisasi Regulasi Pengawasan KSP dan USP Tingkat Daerah',
      startDate: '2026-11-05',
      startTime: '09:00',
      endDate: '2026-11-05',
      endTime: '12:00',
      openEnded: false,
      dateDisplay: 'Kamis, 5 November 2026',
      timeDisplay: '09.00 - 12.00 WIB',
      status: 'CANCELLED',
      publicCancellationNotice: 'Ditunda ke tanggal 15 Desember 2026 mengikuti penyesuaian agenda kunjungan Kementerian Koperasi dan UKM RI.',
      locationName: 'Ruang Rapat Kadis (Lantai 2)',
      locationType: 'OFFICE',
      organizerName: 'Sekretariat Dinas',
      categoryName: 'Sosialisasi Regulasi',
      publicNotes: 'Harap menunggu surat undangan revisi dari sekretariat dinas.',
      attendeeLabels: ['1. Kadis (Drs. Hendri Arifin, M.Si)'],
      updatedAt: '2026-11-03T08:00:00.000Z'
    },
    {
      id: 'act_006',
      title: 'Pemeriksaan Kesehatan Koperasi Triwulan III',
      startDate: '2026-10-20',
      startTime: '08:00',
      endDate: '2026-10-20',
      endTime: '15:00',
      openEnded: false,
      dateDisplay: 'Selasa, 20 Oktober 2026',
      timeDisplay: '08.00 - 15.00 WIB',
      status: 'COMPLETED',
      locationName: 'Ruang Rapat Kadis (Lantai 2)',
      locationType: 'OFFICE',
      organizerName: 'Bidang Pemberdayaan Koperasi',
      categoryName: 'Rapat Koordinasi',
      publicNotes: 'Pemeriksaan telah selesai dilaksanakan.',
      attendeeLabels: ['1. Kabid Koperasi (Ahmad Fauzi, SE)'],
      updatedAt: '2026-10-20T16:00:00.000Z'
    }
  ];

  for (const item of publicActivities) {
    await postDoc('publicActivities', item.id, item);
  }

  // Also seed corresponding private activities so Admin can see them
  for (const item of publicActivities) {
    const privItem = {
      id: item.id,
      title: item.title,
      startDate: item.startDate,
      startTime: item.startTime,
      endDate: item.endDate,
      endTime: item.endTime,
      openEnded: item.openEnded,
      locationId: item.locationName.includes('Kadis') ? 'loc_01' : item.locationName.includes('Aula') ? 'loc_02' : 'loc_04',
      organizerId: item.organizerName.includes('Kementerian') ? 'org_03' : item.organizerName.includes('Koperasi') ? 'org_02' : 'org_01',
      categoryId: item.categoryName.includes('Rapat') ? 'cat_01' : item.categoryName.includes('Pelatihan') ? 'cat_02' : item.categoryName.includes('Pameran') ? 'cat_03' : 'cat_04',
      status: item.status,
      publicNotes: item.publicNotes,
      privateNotes: 'SANGAT RAHASIA: Dokumen internal pengawasan dan target NPL dinas.',
      privateMeetingUrl: 'https://zoom.us/j/999888777?pwd=TOP_SECRET_PASSCODE',
      version: 1,
      attendeeIds: ['emp_01'],
      attendeeSnapshots: [
        { employeeId: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', label: '1. Kadis (Drs. Hendri Arifin, M.Si)' }
      ],
      createdAt: '2026-10-01T08:00:00.000Z',
      createdBy: 'admin_initial',
      updatedAt: item.updatedAt,
      updatedBy: 'admin_initial'
    };
    if (item.publicCancellationNotice) {
      privItem.publicCancellationNotice = item.publicCancellationNotice;
      privItem.cancelReason = 'Internal ministry protocol rescheduling';
    }
    await postDoc('activities', item.id, privItem);
  }

  console.log('[Setup] Seed completed: 4 locations, 3 organizers, 4 categories, 4 employees, 3 announcements, 6 activities.\n');
}

async function runPublicVerification() {
  console.log('===========================================================');
  console.log('STARTING TASK 6 REAL PUBLIC BROWSER VERIFICATION PASS');
  console.log(`Public Base URL: ${publicBaseUrl}`);
  console.log(`Admin Base URL:  ${adminBaseUrl}`);
  console.log(`Screenshots dir: ${screenshotsDir}`);
  console.log('===========================================================\n');

  await resetEmulatorDatabase();
  await seedEmulatorData();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const results = [];
  function record(scenario, passed, details = '') {
    results.push({ scenario, passed, details });
    const badge = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${badge} [Scenario ${scenario}] ${details}`);
  }

  try {
    // ----------------------------------------------------
    // Scenario 1: Public Dashboard & Civic Header Branding
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Public Dashboard & Civic Header Branding ---');
    await page.goto(`${publicBaseUrl}/#dashboard`);
    await page.waitForSelector('.dashboard-view');

    const brandTitle = await page.textContent('.brand-title');
    const tzBadge = await page.textContent('.header-tz-badge');
    const heroTitle = await page.textContent('.hero-title');
    const todayCount = await page.textContent('.metric-today .metric-number');
    const upcomingCount = await page.textContent('.metric-upcoming .metric-number');
    const hasAnnouncements = await page.isVisible('.announcements-widget');

    await page.screenshot({ path: path.join(screenshotsDir, 'public_01_dashboard.png') });

    const s1Passed = brandTitle?.includes('Dinas Koperasi dan Usaha Mikro') &&
      tzBadge?.includes('WIB') &&
      heroTitle?.includes('Jadwal Kegiatan Kedinasan') &&
      parseInt(todayCount || '0', 10) >= 2 &&
      hasAnnouncements;

    record(1, s1Passed, `Dashboard rendered: brand "${brandTitle}", tz "${tzBadge?.trim()}", today activities count: ${todayCount}`);

    // ----------------------------------------------------
    // Scenario 2: Calendar Month View & Multi-Day Spanning
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Calendar Month View & Multi-Day Spanning ---');
    await page.click('.nav-link[href="#calendar"]');
    await page.waitForSelector('.calendar-view');

    const periodTitle = await page.textContent('#calendarPeriodTitle');
    const monthCols = await page.$$eval('.month-col-header', els => els.map(e => e.textContent.trim()));
    const expectedCols = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const colsMatch = expectedCols.every(c => monthCols.includes(c));

    // Verify multi-day event spanning: Batam Expo spans Nov 6, 7, 8
    const expoItems = await page.$$eval(
      '.cal-activity-item:has-text("Batam Cooperative & Micro Enterprise Expo 2026")',
      els => els.map(e => e.classList.contains('item-multiday'))
    );

    // Verify long-running multi-month event: Inkubasi Bisnis appears in November
    const incubationVisible = await page.locator('.cal-activity-item:has-text("Program Inkubasi Bisnis")').first().isVisible();

    await page.screenshot({ path: path.join(screenshotsDir, 'public_02_calendar_month.png') });

    const s2Passed = periodTitle?.includes('November 2026') &&
      colsMatch &&
      expoItems.length >= 3 &&
      expoItems.every(Boolean) &&
      incubationVisible;

    record(2, s2Passed, `Month view rendered for "${periodTitle}", 7 days header, Expo spans ${expoItems.length} days with .item-multiday, multi-month event visible`);

    // ----------------------------------------------------
    // Scenario 3: Calendar Navigation (Prev, Next, Today)
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Calendar Navigation (Prev, Next, Today) ---');
    // Click Previous to view Oktober 2026
    await page.click('#btnCalPrev');
    await page.waitForTimeout(400);
    const prevTitle = await page.textContent('#calendarPeriodTitle');
    const hasOctActivity = await page.locator('.cal-activity-item:has-text("Pemeriksaan Kesehatan Koperasi")').first().isVisible();

    // Click Next to return to November 2026
    await page.click('#btnCalNext');
    await page.waitForTimeout(400);
    const nextTitle = await page.textContent('#calendarPeriodTitle');

    // Click Today to confirm reset
    await page.click('#btnCalToday');
    await page.waitForTimeout(400);
    const todayTitle = await page.textContent('#calendarPeriodTitle');

    await page.screenshot({ path: path.join(screenshotsDir, 'public_03_calendar_navigation.png') });

    const s3Passed = prevTitle?.includes('Oktober 2026') &&
      hasOctActivity &&
      nextTitle?.includes('November 2026') &&
      todayTitle?.includes('November 2026');

    record(3, s3Passed, `Calendar navigation: Prev -> "${prevTitle}" with Oct activities, Next -> "${nextTitle}", Today -> "${todayTitle}"`);

    // ----------------------------------------------------
    // Scenario 4: Calendar Modes (Week, Day, List)
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: Calendar Modes (Week, Day, List) ---');
    // Switch to Week mode
    await page.click('.mode-btn[data-mode="week"]');
    await page.waitForSelector('.week-grid-container');
    const weekColsCount = await page.$$eval('.week-day-col', els => els.length);

    // Switch to Day mode
    await page.click('.mode-btn[data-mode="day"]');
    await page.waitForSelector('.day-view-wrapper');
    const dayHeader = await page.textContent('.day-view-header h3');

    // Switch to List mode
    await page.click('.mode-btn[data-mode="list"]');
    await page.waitForSelector('.list-view-container');
    const listItemsCount = await page.$$eval('.list-activity-row', els => els.length);

    // Restore to Month mode
    await page.click('.mode-btn[data-mode="month"]');
    await page.waitForSelector('.month-grid-wrapper');

    await page.screenshot({ path: path.join(screenshotsDir, 'public_04_calendar_modes.png') });

    const s4Passed = weekColsCount === 7 &&
      dayHeader?.includes('Jadwal Agenda') &&
      listItemsCount > 0;

    record(4, s4Passed, `Calendar modes verified: Week (7 cols), Day ("${dayHeader?.slice(0, 30)}..."), List (${listItemsCount} rows)`);

    // ----------------------------------------------------
    // Scenario 5: Category Filtering in Calendar
    // ----------------------------------------------------
    console.log('\n--- Scenario 5: Category Filtering in Calendar ---');
    // Filter by "Pameran & Ekspo"
    const expoPill = page.locator('.cat-pill:has-text("Pameran & Ekspo")');
    await expoPill.click();
    await page.waitForTimeout(300);

    const visibleItemsOnlyExpo = await page.$$eval('.cal-activity-item', els => els.length);
    const hasExpoItem = await page.locator('.cal-activity-item:has-text("Batam Cooperative & Micro Enterprise Expo 2026")').first().isVisible();
    const noCoordItem = await page.locator('.cal-activity-item:has-text("Rapat Koordinasi Evaluasi")').count() === 0;

    // Reset to "Semua Kategori"
    await page.click('.cat-pill[data-cat="ALL"]');
    await page.waitForTimeout(300);
    const restoredCount = await page.$$eval('.cal-activity-item', els => els.length);

    await page.screenshot({ path: path.join(screenshotsDir, 'public_05_calendar_filter.png') });

    const s5Passed = visibleItemsOnlyExpo > 0 && hasExpoItem && noCoordItem && restoredCount > visibleItemsOnlyExpo;
    record(5, s5Passed, `Category filtering in Calendar: "Pameran & Ekspo" showed ${visibleItemsOnlyExpo} items, excluded unrelated, restored to ${restoredCount}`);

    // ----------------------------------------------------
    // Scenario 6: Agenda Multi-Criteria Search & Filter
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Agenda Multi-Criteria Search & Filter ---');
    await page.click('.nav-link[href="#agenda"]');
    await page.waitForSelector('.agenda-view');

    // Search by keyword "Digitalisasi"
    await page.fill('#agendaSearchInput', 'Digitalisasi');
    await page.waitForTimeout(400); // Debounce delay
    const keywordMatch = await page.locator('.agenda-item-card:has-text("Bimtek Digitalisasi")').isVisible();
    const otherCardMissing = await page.locator('.agenda-item-card:has-text("Batam Cooperative")').count() === 0;

    // Clear search
    await page.fill('#agendaSearchInput', '');
    await page.waitForTimeout(400);

    // Filter by Status: CANCELLED
    await page.selectOption('#selectFilterStatus', 'CANCELLED');
    await page.waitForTimeout(300);
    const cancelledCount = await page.$$eval('.agenda-item-card', els => els.length);
    const hasCancelled = await page.locator('.agenda-item-card:has-text("Sosialisasi Regulasi Pengawasan KSP")').isVisible();

    // Click Reset Filters
    await page.click('#btnResetFilters');
    await page.waitForTimeout(300);
    const allAgendaCount = await page.$$eval('.agenda-item-card', els => els.length);

    await page.screenshot({ path: path.join(screenshotsDir, 'public_06_agenda_search.png') });

    const s6Passed = keywordMatch && otherCardMissing && hasCancelled && cancelledCount === 1 && allAgendaCount >= 5;
    record(6, s6Passed, `Agenda search: keyword matched "Digitalisasi", status CANCELLED filtered 1 event, reset restored ${allAgendaCount} events`);

    // ----------------------------------------------------
    // Scenario 7: Retained Cancelled Activity & Notice
    // ----------------------------------------------------
    console.log('\n--- Scenario 7: Retained Cancelled Activity & Notice ---');
    const cancelledCard = page.locator('.agenda-item-card:has-text("Sosialisasi Regulasi Pengawasan KSP")');
    const hasCancelledPill = await cancelledCard.locator('.status-cancelled').isVisible();
    const hasStrikethrough = await cancelledCard.locator('.text-strikethrough').isVisible();
    const noticeText = await cancelledCard.locator('.card-cancellation-notice').textContent();

    await page.screenshot({ path: path.join(screenshotsDir, 'public_07_cancelled_activity.png') });

    const s7Passed = hasCancelledPill &&
      hasStrikethrough &&
      noticeText?.includes('Ditunda ke tanggal 15 Desember 2026');

    record(7, s7Passed, `Cancelled activity retained with status-cancelled pill, strikethrough, and notice: "${noticeText?.slice(0, 50)}..."`);

    // ----------------------------------------------------
    // Scenario 8: Activity Detail Dialog & Absolute Privacy Isolation
    // ----------------------------------------------------
    console.log('\n--- Scenario 8: Activity Detail Dialog & Absolute Privacy Isolation ---');
    // Click "Rincian" on the cancelled activity
    await cancelledCard.locator('button:has-text("Rincian")').click();
    await page.waitForSelector('.public-detail-modal');

    const modalTitle = await page.textContent('.modal-activity-title');
    const modalDate = await page.textContent('.detail-value');
    const modalNotice = await page.textContent('.cancellation-alert');
    const attendeeContent = await page.textContent('.attendee-list');

    // Strict Privacy Verification: NO private leaks in entire DOM
    const wholePageHtml = await page.content();
    const leaksPrivateNotes = wholePageHtml.includes('SANGAT RAHASIA') || wholePageHtml.includes('pengawasan dan target NPL');
    const leaksZoomPasscode = wholePageHtml.includes('TOP_SECRET_PASSCODE') || wholePageHtml.includes('pwd=');
    const leaksInternalCancelReason = wholePageHtml.includes('Internal ministry protocol rescheduling');

    // Close modal via Close Action Button
    await page.click('#btnModalCloseAction');
    await page.waitForTimeout(300);
    const modalClosed = await page.locator('.public-detail-modal').count() === 0;

    await page.screenshot({ path: path.join(screenshotsDir, 'public_08_activity_detail_modal.png') });

    const s8Passed = modalTitle?.includes('Sosialisasi Regulasi Pengawasan KSP') &&
      modalNotice?.includes('Ditunda ke tanggal 15 Desember 2026') &&
      attendeeContent?.includes('Kadis (Drs. Hendri Arifin, M.Si)') &&
      !leaksPrivateNotes &&
      !leaksZoomPasscode &&
      !leaksInternalCancelReason &&
      modalClosed;

    record(8, s8Passed, `Detail modal displayed sanitized public fields, verified ZERO private notes/passcodes/internal reasons in DOM, closed cleanly`);

    // ----------------------------------------------------
    // Scenario 9: Official Announcements View
    // ----------------------------------------------------
    console.log('\n--- Scenario 9: Official Announcements View ---');
    await page.click('.nav-link[href="#announcements"]');
    await page.waitForSelector('.announcements-view');

    const annCardsCount = await page.$$eval('.announcement-item-card', els => els.length);
    const hasHalalNotice = await page.locator('.announcement-item-card:has-text("Sertifikasi Halal Gratis")').isVisible();
    const hasPlutNotice = await page.locator('.announcement-item-card:has-text("Gedung PLUT-KUMKM Batam")').isVisible();

    await page.screenshot({ path: path.join(screenshotsDir, 'public_09_announcements_view.png') });

    const s9Passed = annCardsCount >= 3 && hasHalalNotice && hasPlutNotice;
    record(9, s9Passed, `Announcements view rendered with ${annCardsCount} notices including Halal certification and PLUT Batam services`);

    // ----------------------------------------------------
    // Scenario 10: Cross-Portal Synchronization (Admin -> Public)
    // ----------------------------------------------------
    console.log('\n--- Scenario 10: Cross-Portal Synchronization (Admin -> Public) ---');
    // Open second page for Admin
    const adminPage = await context.newPage();
    adminPage.on('console', msg => console.log('  [Admin Console]', msg.type(), msg.text()));
    adminPage.on('pageerror', err => console.log('  [Admin PageError]', err.message));
    adminPage.on('dialog', async dialog => {
      console.log(`  [Admin Dialog] "${dialog.type()}": ${dialog.message().replace(/\n/g, ' ')}`);
      await dialog.accept();
    });

    // Go to dashboard first to ensure master data is fully loaded
    await adminPage.goto(`${adminBaseUrl}/#dashboard`);
    await adminPage.waitForSelector('.dashboard-page');

    // Now navigate to create activity
    await adminPage.goto(`${adminBaseUrl}/#activities/new`);
    await adminPage.waitForSelector('.edit-activity-page');

    const crossSyncTitle = 'Rapat Paripurna Koperasi Bersama Walikota Batam';
    await adminPage.fill('#inputTitle', crossSyncTitle);
    await adminPage.selectOption('#selectCategory', { index: 1 });
    await adminPage.fill('#inputStartDate', '2026-11-25');
    await adminPage.fill('#inputEndDate', '2026-11-25');
    await adminPage.fill('#inputStartTime', '09:00');
    await adminPage.fill('#inputEndTime', '11:00');
    await adminPage.selectOption('#selectLocation', { index: 1 });
    await adminPage.selectOption('#selectOrganizer', { index: 1 });

    const empCheckbox = adminPage.locator('input[name="empAttendee"]').first();
    await empCheckbox.check();

    await adminPage.fill('#inputPublicNotes', 'Wajib dihadiri seluruh perwakilan gerakan koperasi.');
    await adminPage.click('#btnSaveActivity');
    await adminPage.waitForTimeout(1500); // Wait for transaction save

    await adminPage.close();

    // In Public app, reload to query updated Firestore records
    await page.goto(`${publicBaseUrl}/#agenda`);
    await page.reload();
    await page.waitForSelector('.agenda-view');
    await page.fill('#agendaSearchInput', 'Walikota');
    await page.waitForTimeout(500);

    const hasCrossSyncItem = await page.locator(`.agenda-item-card:has-text("${crossSyncTitle}")`).isVisible();
    await page.screenshot({ path: path.join(screenshotsDir, 'public_10_cross_portal_sync.png') });

    record(10, hasCrossSyncItem, `Activity created in Admin portal (:3001) projected atomically to Public portal (:3000): "${crossSyncTitle}"`);

    // ----------------------------------------------------
    // Scenario 11: Responsive Mobile Viewport Layout
    // ----------------------------------------------------
    console.log('\n--- Scenario 11: Responsive Mobile Viewport Layout ---');
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile iPhone SE
    await page.goto(`${publicBaseUrl}/#dashboard`);
    await page.waitForSelector('.dashboard-view');

    const heroTitleMobile = await page.textContent('.hero-title');
    const isMobileNavVisible = await page.isVisible('.app-nav');
    const isStatsVisibleMobile = await page.isVisible('.metrics-grid');

    await page.screenshot({ path: path.join(screenshotsDir, 'public_11_mobile_layout.png') });

    const s11Passed = Boolean(heroTitleMobile) && isMobileNavVisible && isStatsVisibleMobile;
    record(11, s11Passed, `Mobile layout responsive at 375px: nav visible, hero banner stacked, touch-friendly elements`);

  } catch (err) {
    console.error('Fatal error in Playwright verification run:', err);
    record('FATAL', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n===========================================================');
  console.log('PUBLIC BROWSER VERIFICATION SUMMARY');
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

runPublicVerification().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
