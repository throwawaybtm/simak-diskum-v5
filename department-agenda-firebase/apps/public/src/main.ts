/**
 * Public Application Entrypoint & Interactive Router
 * Dinas Koperasi dan Usaha Mikro Kota Batam
 * Renders Dashboard, Calendar (Month/Week/Day/List), Agenda Search, Announcements, and Detail Dialog.
 */

import {
  SYSTEM_VERSION,
  TIMEZONE,
  type PublicActivityDTO,
  fetchPublicActivities,
  formatIndonesianDate,
  formatIndonesianDateSpan,
  parseWibDate,
  addDaysToWibDate,
  captureClientPerformance,
  type ClientPerformanceSnapshot
} from '@department-agenda/shared';
import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import { renderHeader } from './components/Header';
import { renderActivityDetailModal } from './components/ActivityDetailModal';
import {
  filterPublicActivities,
  getVisibleMonthBounds,
  getVisibleWeekBounds,
  type PublicActivityFilterOptions
} from './components/PublicController';
import { renderDashboardView } from './pages/DashboardView';
import { renderCalendarView, type CalendarMode } from './pages/CalendarView';
import { renderAgendaView } from './pages/AgendaView';
import { renderAnnouncementsView, type AnnouncementItem } from './pages/AnnouncementsView';

// --- State Management ---
export function getTodayWibDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

const todayDateStr = getTodayWibDate();
const initialDateParts = parseWibDate(todayDateStr);

let currentRoute = (window.location.hash.slice(1) || 'dashboard').split('?')[0];
let calendarMode: CalendarMode = 'month';
let calendarYear = initialDateParts.year;
let calendarMonth = initialDateParts.month;
let selectedDate = todayDateStr;
let selectedCalendarCategory = 'ALL';

let agendaFilters: PublicActivityFilterOptions = {
  keyword: '',
  category: 'ALL',
  status: 'ALL',
  startDate: '',
  endDate: ''
};

// Data caches
const activitiesMap = new Map<string, PublicActivityDTO>();
let announcementsCache: AnnouncementItem[] = [];
let isLoadingActivities = false;
let isInitialLoaded = false;

// Default announcements fallback
const defaultAnnouncements: AnnouncementItem[] = [
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

function getAllCachedActivities(): PublicActivityDTO[] {
  return Array.from(activitiesMap.values());
}

function getAvailableCategories(): string[] {
  const acts = getAllCachedActivities();
  const set = new Set<string>();
  for (const act of acts) {
    if (act.categoryName) {
      set.add(act.categoryName);
    }
  }
  if (set.size === 0) {
    return ['Rapat Koordinasi', 'Pelatihan / Bimtek', 'Pameran & Ekspo', 'Sosialisasi Regulasi'];
  }
  return Array.from(set);
}

/**
 * Fetches public activities intersecting the query range using the fundamental query condition
 */
async function loadActivitiesForRange(startDate: string, endDate: string): Promise<void> {
  isLoadingActivities = true;
  try {
    const res = await fetchPublicActivities(db, startDate, endDate);
    for (const act of res.activities) {
      activitiesMap.set(act.id, act);
    }
  } catch (err) {
    console.warn('[Public App] Error fetching public activities:', err);
  } finally {
    isLoadingActivities = false;
  }
}

/**
 * Loads official announcements from publicAnnouncements collection
 */
async function loadAnnouncements(): Promise<void> {
  try {
    const annSnap = await getDocs(collection(db, 'publicAnnouncements'));
    if (!annSnap.empty) {
      announcementsCache = annSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AnnouncementItem));
    } else {
      announcementsCache = defaultAnnouncements;
    }
  } catch (err) {
    console.warn('[Public App] Could not load announcements from Firestore:', err);
    announcementsCache = defaultAnnouncements;
  }
}

// --- RENDER DISPATCHER ---

export function renderApp(): void {
  // 1. Render Header
  const headerContainer = document.getElementById('app-header');
  if (headerContainer) {
    headerContainer.innerHTML = renderHeader(currentRoute);
  }

  // 2. Render Active View Content
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  if (currentRoute === 'calendar') {
    renderCalendarRoute(mainContent);
  } else if (currentRoute === 'agenda') {
    renderAgendaRoute(mainContent);
  } else if (currentRoute === 'announcements') {
    renderAnnouncementsRoute(mainContent);
  } else {
    // Default: Dashboard
    renderDashboardRoute(mainContent);
  }

  // 3. Attach common handlers (modal detail, etc.)
  attachGlobalEventHandlers();
}

function renderDashboardRoute(container: HTMLElement): void {
  const allActs = getAllCachedActivities();

  // Today's activities: startDate <= today <= endDate
  const todayActs = allActs.filter(
    act => act.startDate <= todayDateStr && act.endDate >= todayDateStr
  );

  // 7-day upcoming activities: start or span within [tomorrow, tomorrow+7]
  const tomorrow = addDaysToWibDate(todayDateStr, 1);
  const next7Days = addDaysToWibDate(todayDateStr, 7);
  const upcomingActs = allActs.filter(
    act => act.startDate <= next7Days && act.endDate >= tomorrow
  );

  // This week count (activities intersecting today through next 7 days)
  const thisWeekActs = allActs.filter(
    act => act.startDate <= next7Days && act.endDate >= todayDateStr
  );

  // Current month count
  const currYearMonthPrefix = todayDateStr.slice(0, 7);
  const monthActsCount = allActs.filter(
    act => act.startDate.startsWith(currYearMonthPrefix) || act.endDate.startsWith(currYearMonthPrefix)
  ).length;

  container.innerHTML = renderDashboardView({
    todayActivities: todayActs,
    upcomingActivities: upcomingActs,
    monthActivitiesCount: monthActsCount,
    weekActivitiesCount: thisWeekActs.length,
    totalActivitiesCount: allActs.length,
    announcements: announcementsCache,
    todayDateStr
  });

  // Attach Dashboard-specific handlers
  const heroSearchInput = document.getElementById('heroSearchInput') as HTMLInputElement | null;
  const btnHeroSearch = document.getElementById('btnHeroSearch');
  if (btnHeroSearch && heroSearchInput) {
    const handleHeroSearch = () => {
      const q = heroSearchInput.value.trim();
      if (q) {
        agendaFilters.keyword = q;
        window.location.hash = '#agenda';
      }
    };
    btnHeroSearch.addEventListener('click', handleHeroSearch);
    heroSearchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleHeroSearch();
    });
  }

  const inputJumpDate = document.getElementById('inputJumpDate') as HTMLInputElement | null;
  const btnJumpToDate = document.getElementById('btnJumpToDate');
  if (btnJumpToDate && inputJumpDate) {
    btnJumpToDate.addEventListener('click', () => {
      const val = inputJumpDate.value;
      if (val) {
        selectedDate = val;
        const p = parseWibDate(val);
        calendarYear = p.year;
        calendarMonth = p.month;
        calendarMode = 'day';
        window.location.hash = '#calendar';
      }
    });
  }
}

function renderCalendarRoute(container: HTMLElement): void {
  const allActs = getAllCachedActivities();
  const categories = getAvailableCategories();

  // Compute visible bounds based on mode
  let visibleStart = '';
  let visibleEnd = '';

  if (calendarMode === 'month' || calendarMode === 'list') {
    const bounds = getVisibleMonthBounds(calendarYear, calendarMonth);
    visibleStart = bounds.visibleStart;
    visibleEnd = bounds.visibleEnd;
  } else if (calendarMode === 'week') {
    const bounds = getVisibleWeekBounds(selectedDate);
    visibleStart = bounds.weekStart;
    visibleEnd = bounds.weekEnd;
  } else {
    // Day mode
    visibleStart = selectedDate;
    visibleEnd = selectedDate;
  }

  container.innerHTML = renderCalendarView({
    mode: calendarMode,
    year: calendarYear,
    month: calendarMonth,
    selectedDate,
    visibleStart,
    visibleEnd,
    activities: allActs,
    categories,
    selectedCategory: selectedCalendarCategory
  });

  // Attach Calendar Controls
  const btnPrev = document.getElementById('btnCalPrev');
  const btnNext = document.getElementById('btnCalNext');
  const btnToday = document.getElementById('btnCalToday');

  if (btnPrev) {
    btnPrev.addEventListener('click', async () => {
      if (calendarMode === 'month' || calendarMode === 'list') {
        calendarMonth--;
        if (calendarMonth < 1) {
          calendarMonth = 12;
          calendarYear--;
        }
      } else if (calendarMode === 'week') {
        selectedDate = addDaysToWibDate(selectedDate, -7);
        const p = parseWibDate(selectedDate);
        calendarYear = p.year;
        calendarMonth = p.month;
      } else if (calendarMode === 'day') {
        selectedDate = addDaysToWibDate(selectedDate, -1);
        const p = parseWibDate(selectedDate);
        calendarYear = p.year;
        calendarMonth = p.month;
      }
      await refreshCalendarRange();
      renderApp();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      if (calendarMode === 'month' || calendarMode === 'list') {
        calendarMonth++;
        if (calendarMonth > 12) {
          calendarMonth = 1;
          calendarYear++;
        }
      } else if (calendarMode === 'week') {
        selectedDate = addDaysToWibDate(selectedDate, 7);
        const p = parseWibDate(selectedDate);
        calendarYear = p.year;
        calendarMonth = p.month;
      } else if (calendarMode === 'day') {
        selectedDate = addDaysToWibDate(selectedDate, 1);
        const p = parseWibDate(selectedDate);
        calendarYear = p.year;
        calendarMonth = p.month;
      }
      await refreshCalendarRange();
      renderApp();
    });
  }

  if (btnToday) {
    btnToday.addEventListener('click', async () => {
      selectedDate = todayDateStr;
      const p = parseWibDate(todayDateStr);
      calendarYear = p.year;
      calendarMonth = p.month;
      await refreshCalendarRange();
      renderApp();
    });
  }

  // Mode toggles
  const modeButtons = container.querySelectorAll<HTMLButtonElement>('.mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode as CalendarMode;
      if (mode && mode !== calendarMode) {
        calendarMode = mode;
        await refreshCalendarRange();
        renderApp();
      }
    });
  });

  // Category filter pills
  const catPills = container.querySelectorAll<HTMLButtonElement>('.cat-pill');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.dataset.cat || 'ALL';
      selectedCalendarCategory = cat;
      renderApp();
    });
  });

  // Cell clicks to jump to day
  const cells = container.querySelectorAll<HTMLElement>('.month-cell');
  cells.forEach(cell => {
    cell.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-open-detail]')) return; // handled separately
      const date = cell.dataset.date;
      if (date) {
        selectedDate = date;
        const p = parseWibDate(date);
        calendarYear = p.year;
        calendarMonth = p.month;
        calendarMode = 'day';
        renderApp();
      }
    });
  });
}

async function refreshCalendarRange(): Promise<void> {
  const bounds = getVisibleMonthBounds(calendarYear, calendarMonth);
  await loadActivitiesForRange(bounds.visibleStart, bounds.visibleEnd);
}

function renderAgendaRoute(container: HTMLElement): void {
  const allActs = getAllCachedActivities();
  const categories = getAvailableCategories();

  // Apply filters using pure controller function
  const filteredActs = filterPublicActivities(allActs, agendaFilters);

  container.innerHTML = renderAgendaView({
    activities: filteredActs,
    categories,
    filters: agendaFilters,
    totalActivitiesCount: allActs.length
  });

  // Attach Agenda Filter Handlers
  const keywordInput = document.getElementById('agendaSearchInput') as HTMLInputElement | null;
  const categorySelect = document.getElementById('selectFilterCategory') as HTMLSelectElement | null;
  const statusSelect = document.getElementById('selectFilterStatus') as HTMLSelectElement | null;
  const startDateInput = document.getElementById('inputFilterStartDate') as HTMLInputElement | null;
  const endDateInput = document.getElementById('inputFilterEndDate') as HTMLInputElement | null;
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  if (keywordInput) {
    keywordInput.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        agendaFilters.keyword = keywordInput.value;
        renderAgendaResultsOnly();
      }, 250);
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      agendaFilters.category = categorySelect.value;
      renderAgendaResultsOnly();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      agendaFilters.status = statusSelect.value;
      renderAgendaResultsOnly();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener('change', () => {
      agendaFilters.startDate = startDateInput.value;
      renderAgendaResultsOnly();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener('change', () => {
      agendaFilters.endDate = endDateInput.value;
      renderAgendaResultsOnly();
    });
  }

  if (btnApply) {
    btnApply.addEventListener('click', () => {
      if (keywordInput) agendaFilters.keyword = keywordInput.value;
      if (categorySelect) agendaFilters.category = categorySelect.value;
      if (statusSelect) agendaFilters.status = statusSelect.value;
      if (startDateInput) agendaFilters.startDate = startDateInput.value;
      if (endDateInput) agendaFilters.endDate = endDateInput.value;
      renderApp();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      agendaFilters = {
        keyword: '',
        category: 'ALL',
        status: 'ALL',
        startDate: '',
        endDate: ''
      };
      renderApp();
    });
  }

  const btnPrint = document.getElementById('btnPrintPublicAgenda');
  if (btnPrint) {
    btnPrint.addEventListener('click', async () => {
      const [{ generateEightColumnHtmlReport }] = await Promise.all([
        import('../../../shared/src/reports/eightColumnReport')
      ]);
      const reportRows = filteredActs.map((act, idx) => ({
        no: idx + 1,
        hariTanggal: act.dateDisplay,
        pukul: act.timeDisplay,
        kegiatan: act.status === 'CANCELLED' ? `[DIBATALKAN] ${act.title}` : act.title,
        tempat: act.locationName,
        penyelenggara: act.organizerName,
        dihadiriOleh: (act.attendeeLabels || []).join('\n') || '-',
        keterangan: act.status === 'CANCELLED'
          ? (act.publicCancellationNotice ? `Dibatalkan: ${act.publicCancellationNotice}` : 'Kegiatan Dibatalkan')
          : (act.publicNotes || '-'),
        isCancelled: act.status === 'CANCELLED'
      }));

      const sDate = agendaFilters.startDate || (filteredActs[0]?.startDate || '2026-11-01');
      const eDate = agendaFilters.endDate || (filteredActs[filteredActs.length - 1]?.endDate || '2026-11-30');

      const isStaging = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'staging';
      const html = generateEightColumnHtmlReport({
        startDate: sDate,
        endDate: eDate,
        rows: reportRows,
        departmentName: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        isStaging
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
      }
    });
  }

  const btnXlsx = document.getElementById('btnDownloadPublicXlsx');
  if (btnXlsx) {
    btnXlsx.addEventListener('click', async () => {
      const [{ generateEightColumnXlsx }, { formatIndonesianDateSpan }] = await Promise.all([
        import('../../../shared/src/reports/xlsxGenerator'),
        import('../../../shared/src/scheduling/timeUtils')
      ]);
      const reportRows = filteredActs.map((act, idx) => ({
        no: idx + 1,
        hariTanggal: act.dateDisplay,
        pukul: act.timeDisplay,
        kegiatan: act.status === 'CANCELLED' ? `[DIBATALKAN] ${act.title}` : act.title,
        tempat: act.locationName,
        penyelenggara: act.organizerName,
        dihadiriOleh: (act.attendeeLabels || []).join('\n') || '-',
        keterangan: act.status === 'CANCELLED'
          ? (act.publicCancellationNotice ? `Dibatalkan: ${act.publicCancellationNotice}` : 'Kegiatan Dibatalkan')
          : (act.publicNotes || '-'),
        isCancelled: act.status === 'CANCELLED'
      }));

      const sDate = agendaFilters.startDate || (filteredActs[0]?.startDate || '2026-11-01');
      const eDate = agendaFilters.endDate || (filteredActs[filteredActs.length - 1]?.endDate || '2026-11-30');
      const periodLabel = formatIndonesianDateSpan(sDate, eDate);

      const buffer = await generateEightColumnXlsx({
        departmentName: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        periodLabel,
        rows: reportRows,
        isStaging
      });

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Agenda_Publik_Batam_${sDate}_sd_${eDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

function renderAgendaResultsOnly(): void {
  const container = document.getElementById('main-content');
  if (container && currentRoute === 'agenda') {
    renderAgendaRoute(container);
  }
}

function renderAnnouncementsRoute(container: HTMLElement): void {
  container.innerHTML = renderAnnouncementsView(announcementsCache);
}

// --- Detail Modal Handling ---

async function openActivityDetail(activityId: string): Promise<void> {
  let act = activitiesMap.get(activityId);
  if (!act) {
    try {
      const snap = await getDoc(doc(db, 'publicActivities', activityId));
      if (snap.exists()) {
        act = { id: snap.id, ...snap.data() } as PublicActivityDTO;
        activitiesMap.set(act.id, act);
      }
    } catch (e) {
      console.warn('[Public App] Error fetching single public activity:', e);
    }
  }

  if (!act) {
    console.warn(`[Public App] Activity with id "${activityId}" not found in cache.`);
    return;
  }

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const previousActiveElement = document.activeElement as HTMLElement | null;
  modalContainer.innerHTML = renderActivityDetailModal(act);

  const btnClose = document.getElementById('btnModalClose') as HTMLButtonElement | null;
  const btnCloseAction = document.getElementById('btnModalCloseAction') as HTMLButtonElement | null;
  const backdrop = document.getElementById('activityDetailModal');
  const modalCard = modalContainer.querySelector('.modal-card') as HTMLElement | null;

  const closeModal = () => {
    window.removeEventListener('keydown', handleModalKeyDown);
    modalContainer.innerHTML = '';
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  };

  const handleModalKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'Tab' && modalCard) {
      const focusables = Array.from(
        modalCard.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (focusables.length === 0) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCloseAction) btnCloseAction.addEventListener('click', closeModal);

  if (backdrop) {
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal();
    });
  }

  window.addEventListener('keydown', handleModalKeyDown);

  // Set initial focus to close button for immediate accessibility
  setTimeout(() => {
    if (btnClose) btnClose.focus();
  }, 50);
}

function attachGlobalEventHandlers(): void {
  // Top navigation search input handler
  const topNavSearch = document.getElementById('topNavSearchInput') as HTMLInputElement | null;
  if (topNavSearch) {
    topNavSearch.onkeydown = e => {
      if (e.key === 'Enter') {
        const q = topNavSearch.value.trim();
        if (q) {
          agendaFilters.keyword = q;
          window.location.hash = '#agenda';
        }
      }
    };
  }
}

// Global delegated click listener for activity detail modal across all dynamic views & filters
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest<HTMLElement>('[data-open-detail]');
    if (target && target.dataset.openDetail) {
      e.preventDefault();
      e.stopPropagation();
      openActivityDetail(target.dataset.openDetail);
    }
  });
}

// --- INITIALIZATION ---

let shellRenderTime = 0;
let dataReadyTime = 0;

async function init(): Promise<void> {
  const startTime = performance.now();
  console.log(`[Public App] Starting v${SYSTEM_VERSION} (Timezone: ${TIMEZONE})...`);

  // Handle route navigation
  window.addEventListener('hashchange', () => {
    currentRoute = (window.location.hash.slice(1) || 'dashboard').split('?')[0];
    renderApp();
  });

  // 1. Immediate Shell Render (FCP & Shell speed)
  renderApp();
  shellRenderTime = Math.round(performance.now() - startTime);

  // 2. Data Fetch from Firestore
  const initialBounds = getVisibleMonthBounds(calendarYear, calendarMonth);
  // Broad initial fetch to ensure today, current month, and adjacent quarters are available
  const startYear = `${calendarYear - 1}-10-01`;
  const endYear = `${calendarYear + 1}-03-31`;

  await Promise.all([
    loadActivitiesForRange(startYear, endYear),
    loadAnnouncements()
  ]);

  isInitialLoaded = true;
  renderApp();
  dataReadyTime = Math.round(performance.now() - startTime);

  // Expose telemetry on window for Playwright and performance audit
  (window as any).__PERF_TELEMETRY__ = {
    shellRenderMs: shellRenderTime,
    dataReadyMs: dataReadyTime,
    activitiesCount: activitiesMap.size,
    announcementsCount: announcementsCache.length,
    getSnapshot: () => captureClientPerformance(dataReadyTime, activitiesMap.size)
  };

  console.log(`[Public App Telemetry] Shell: ${shellRenderTime}ms | Data Ready: ${dataReadyTime}ms | Activities: ${activitiesMap.size}`);
}

// Bootstrap
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
