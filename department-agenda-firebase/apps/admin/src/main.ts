/**
 * Admin Application Entrypoint & Interactive Router
 * Implements route-based dynamic code-splitting for optimal initial load bundle performance.
 */

const SYSTEM_VERSION = '5.0.0';
const TIMEZONE = 'Asia/Jakarta'; // WIB (UTC+7)
import type { Location, Organizer, Category, Employee, Department, ActivityDocument } from '@department-agenda/shared';
import { renderSidebar } from './components/Sidebar';

// In-memory master data cache for administrative session
let masterLocations: Location[] = [];
let masterOrganizers: Organizer[] = [];
let masterCategories: Category[] = [];
let masterEmployees: Employee[] = [];
let masterDepartments: Department[] = [];
let cachedActivities: ActivityDocument[] = [];

let currentLookups = {
  locations: new Map<string, Location>(),
  organizers: new Map<string, Organizer>(),
  categories: new Map<string, Category>()
};

async function getFirestoreModule() {
  const [{ db }, { collection, getDocs }] = await Promise.all([
    import('./firebase'),
    import('firebase/firestore')
  ]);
  return { db, collection, getDocs };
}

async function loadMasterData() {
  try {
    const { db, collection, getDocs } = await getFirestoreModule();
    const locSnap = await getDocs(collection(db, 'locations'));
    masterLocations = locSnap.docs.map(d => ({ id: d.id, ...d.data() } as Location));

    const orgSnap = await getDocs(collection(db, 'organizers'));
    masterOrganizers = orgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organizer));

    const catSnap = await getDocs(collection(db, 'categories'));
    masterCategories = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));

    const empSnap = await getDocs(collection(db, 'employees'));
    masterEmployees = empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));

    const deptSnap = await getDocs(collection(db, 'departments'));
    masterDepartments = deptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
  } catch (err) {
    console.warn('[Admin] Could not load master data from Firestore, using fallback fixtures:', err);
  }

  // Ensure default fallback data if collections are empty (e.g. freshly initialized emulator)
  if (masterLocations.length === 0) {
    masterLocations = [
      { id: 'loc_01', name: 'Ruang Rapat Kadis (Lt. 2)', type: 'OFFICE', isBookableRoom: true, active: true },
      { id: 'loc_02', name: 'Aula PLUT Batam', type: 'OFFICE', isBookableRoom: true, active: true },
      { id: 'loc_03', name: 'Zoom Cloud Meeting Dinas', type: 'ONLINE', isBookableRoom: false, active: true },
      { id: 'loc_04', name: 'Hotel Planet Holiday Batam', type: 'EXTERNAL', isBookableRoom: false, active: true }
    ];
  }

  if (masterOrganizers.length === 0) {
    masterOrganizers = [
      { id: 'org_01', name: 'Sekretariat Dinas', active: true },
      { id: 'org_02', name: 'Bidang Pemberdayaan Koperasi', active: true },
      { id: 'org_03', name: 'Bidang Pengembangan Usaha Mikro', active: true }
    ];
  }

  if (masterCategories.length === 0) {
    masterCategories = [
      { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true },
      { id: 'cat_02', name: 'Pelatihan / Bimtek', colorHex: '#16a34a', active: true },
      { id: 'cat_03', name: 'Pameran & Ekspo', colorHex: '#ea580c', active: true }
    ];
  }

  if (masterEmployees.length === 0) {
    masterEmployees = [
      { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true },
      { id: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris Dinas', departmentId: 'dept_01', active: true },
      { id: 'emp_03', name: 'Ahmad Fauzi, SE', position: 'Kabid Koperasi', departmentId: 'dept_02', active: true },
      { id: 'emp_04', name: 'Dewi Sartika, S.Si', position: 'Kabid Pengawasan UMKM', departmentId: 'dept_03', active: true }
    ];
  }

  if (masterDepartments.length === 0) {
    masterDepartments = [
      { id: 'dept_01', name: 'Sekretariat', active: true },
      { id: 'dept_02', name: 'Bidang Pemberdayaan Koperasi', active: true },
      { id: 'dept_03', name: 'Bidang Pengembangan Usaha Mikro', active: true }
    ];
  }

  currentLookups = {
    locations: new Map(masterLocations.map(l => [l.id, l])),
    organizers: new Map(masterOrganizers.map(o => [o.id, o])),
    categories: new Map(masterCategories.map(c => [c.id, c]))
  };
}

async function loadActivities(): Promise<ActivityDocument[]> {
  try {
    const { db, collection, getDocs } = await getFirestoreModule();
    const snap = await getDocs(collection(db, 'activities'));
    cachedActivities = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityDocument));
    return cachedActivities;
  } catch (err) {
    console.warn('[Admin] Could not fetch activities from Firestore, using in-memory cache:', err);
    return cachedActivities;
  }
}

// Router and Dynamic View Renderer
async function router() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const sidebarContainer = document.querySelector('.admin-sidebar');
  if (sidebarContainer) {
    sidebarContainer.outerHTML = renderSidebar(hash);
  }

  const contentContainer = document.getElementById('admin-main');
  if (!contentContainer) return;

  if (hash === 'dashboard') {
    const [{ renderDashboardPage }, activities] = await Promise.all([
      import('./pages/DashboardPage'),
      loadActivities()
    ]);
    contentContainer.innerHTML = renderDashboardPage(activities, currentLookups.locations);
  } else if (hash === 'activities') {
    const [{ renderActivitiesPage }, activities] = await Promise.all([
      import('./pages/ActivitiesPage'),
      loadActivities()
    ]);
    contentContainer.innerHTML = renderActivitiesPage(activities);
    bindActivitiesListEvents();
  } else if (hash === 'activities/new' || hash.startsWith('activities/edit/') || hash.startsWith('activities/duplicate/')) {
    await loadMasterData();
    const [{ handleEditRoute }, { db }, activities] = await Promise.all([
      import('./pages/ActivityEditWorkflow'),
      import('./firebase'),
      loadActivities()
    ]);
    await handleEditRoute(hash, contentContainer, {
      db,
      masterLocations,
      masterOrganizers,
      masterCategories,
      masterEmployees,
      cachedActivities: activities,
      currentLookups,
      refreshActivities: loadActivities
    });
  } else if (hash === 'master') {
    const [{ mountMasterDataPage }, { db }] = await Promise.all([
      import('./pages/MasterDataPage'),
      import('./firebase')
    ]);
    await mountMasterDataPage(contentContainer, {
      db,
      onDataChanged: async () => {
        await loadMasterData();
      }
    });
  } else if (hash === 'reports') {
    await loadMasterData();
    const [{ mountReportsPage }, { db }] = await Promise.all([
      import('./pages/ReportsPage'),
      import('./firebase')
    ]);
    await mountReportsPage(contentContainer, {
      db,
      masterLocations,
      masterOrganizers,
      masterCategories,
      masterEmployees,
      loadActivities
    });
  } else if (hash === 'settings') {
    const [{ mountSettingsPage }, { db }] = await Promise.all([
      import('./pages/SettingsPage'),
      import('./firebase')
    ]);
    await mountSettingsPage(contentContainer, {
      db,
      onSettingsSaved: async () => {
        console.log('[Admin] Settings saved successfully.');
      }
    });
  } else {
    contentContainer.innerHTML = `
      <div class="panel">
        <h3>Modul "${hash}"</h3>
        <p>Modul ini siap dikembangkan pada tahapan berikutnya sesuai jadwal Gate.</p>
      </div>
    `;
  }
}

function bindActivitiesListEvents() {
  const searchInput = document.getElementById('inputSearchActivities') as HTMLInputElement | null;
  const stageSelect = document.getElementById('filterStageSelect') as HTMLSelectElement | null;
  const rows = document.querySelectorAll<HTMLTableRowElement>('tr[data-activity-row]');

  const applyFilters = () => {
    const query = (searchInput?.value || '').trim().toLowerCase();
    const stage = stageSelect?.value || 'ALL';

    rows.forEach(row => {
      const rowStage = row.getAttribute('data-stage') || 'INITIAL_ENTRY';
      const rowTitle = row.getAttribute('data-title') || '';
      const rowAgenda = row.getAttribute('data-agenda') || '';

      const matchesStage = (stage === 'ALL' || rowStage === stage);
      const matchesQuery = !query || rowTitle.includes(query) || rowAgenda.includes(query);

      row.style.display = (matchesStage && matchesQuery) ? '' : 'none';
    });
  };

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (stageSelect) stageSelect.addEventListener('change', applyFilters);

  document.querySelectorAll<HTMLButtonElement>('button[data-delete-id]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-delete-id');
      if (!id) return;
      if (confirm('Apakah Anda yakin ingin menghapus agenda kegiatan ini secara permanen?')) {
        try {
          const [{ deleteActivity }, { db }] = await Promise.all([
            import('@department-agenda/shared'),
            import('./firebase')
          ]);
          await deleteActivity(db, id, 'UNVERIFIED');
          alert('Kegiatan berhasil dihapus.');
          router();
        } catch (err) {
          alert(`Gagal menghapus kegiatan: ${err}`);
        }
      }
    };
  });
}

function setupAdminMobileDrawer() {
  const toggleBtn = document.getElementById('adminMenuToggleBtn');
  const backdrop = document.getElementById('sidebarBackdrop');

  const closeDrawer = () => {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
      sidebar.classList.remove('sidebar-open');
      sidebar.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) {
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.focus();
    }
    document.body.classList.remove('admin-drawer-open');
  };

  const openDrawer = () => {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
      sidebar.classList.add('sidebar-open');
      sidebar.setAttribute('aria-hidden', 'false');
      const firstFocusable = sidebar.querySelector<HTMLElement>('#sidebarCloseBtn, .nav-item');
      if (firstFocusable) firstFocusable.focus();
    }
    if (backdrop) {
      backdrop.classList.add('active');
      backdrop.setAttribute('aria-hidden', 'false');
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
    document.body.classList.add('admin-drawer-open');
  };

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeDrawer();
    });
  }

  // Delegated click listener for close button and nav links in sidebar
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('#sidebarCloseBtn')) {
      closeDrawer();
    } else if (target.closest('.nav-item') && window.innerWidth < 1024) {
      closeDrawer();
    }
  });

  // Keyboard navigation & accessibility: Escape to close
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sidebar = document.getElementById('adminSidebar');
      if (sidebar && sidebar.classList.contains('sidebar-open')) {
        closeDrawer();
      }
    }
  });
}

// Bootstrap
window.addEventListener('DOMContentLoaded', async () => {
  const adminStartTime = performance.now();
  console.log(`[Admin App] v${SYSTEM_VERSION} (${TIMEZONE}) loaded.`);
  setupAdminMobileDrawer();
  await loadMasterData();
  const shellRenderMs = Math.round(performance.now() - adminStartTime);
  await router();
  const dataReadyMs = Math.round(performance.now() - adminStartTime);

  (window as any).__ADMIN_PERF_TELEMETRY__ = {
    shellRenderMs,
    dataReadyMs,
    activitiesCount: cachedActivities.length
  };
  console.log(`[Admin Telemetry] Shell: ${shellRenderMs}ms | Data Ready: ${dataReadyMs}ms | Activities: ${cachedActivities.length}`);
});

window.addEventListener('hashchange', router);
