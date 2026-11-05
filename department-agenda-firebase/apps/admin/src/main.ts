/**
 * Admin Application Entrypoint & Protected Bootstrap Router
 * SIMAK DISKUM Kota Batam v5.0
 * 
 * Implements strict RBAC state machine, route-based dynamic code-splitting,
 * session lifecycle management, and zero private Firestore reads before authentication.
 */

const SYSTEM_VERSION = '5.0.0';
const TIMEZONE = 'Asia/Jakarta'; // WIB (UTC+7)

import type { Location, Organizer, Category, Employee, Department, ActivityDocument } from '@department-agenda/shared';
import { renderSidebar } from './components/Sidebar';
import {
  subscribeAuthState,
  signInOperator,
  requestPasswordReset,
  signOutOperator,
  isValidEmailFormat,
  type AuthState,
  type CurrentUserProfile
} from './auth/authService';
import {
  renderLoginPage,
  renderPasswordRecoveryPage,
  renderAccessDeniedPage
} from './pages/AuthPages';

// State Machine & Session Variables
let currentAuthState: AuthState = 'AUTH_LOADING';
let currentUser: CurrentUserProfile | null = null;
let currentAuthErrorMessage: string | undefined = undefined;

// Session epoch token to discard in-flight async operations after logout/switch
let activeSessionEpoch = 0;

// Registry for active Firestore real-time listeners
const activeFirestoreListeners: Array<() => void> = [];

export function registerFirestoreListener(unsub: () => void) {
  activeFirestoreListeners.push(unsub);
}

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

/**
 * Resets all in-memory administrative caches upon sign-out or access denial.
 * Unsubscribes all registered Firestore listeners and invalidates pending in-flight async tasks.
 */
function clearAdministrativeSession() {
  activeSessionEpoch++;

  // Unsubscribe all registered real-time listeners immediately
  for (const unsub of activeFirestoreListeners) {
    try {
      unsub();
    } catch (err) {
      console.warn('[Admin] Error cleaning listener:', err);
    }
  }
  activeFirestoreListeners.length = 0;

  masterLocations = [];
  masterOrganizers = [];
  masterCategories = [];
  masterEmployees = [];
  masterDepartments = [];
  cachedActivities = [];
  currentLookups = {
    locations: new Map<string, Location>(),
    organizers: new Map<string, Organizer>(),
    categories: new Map<string, Category>()
  };
}

async function getFirestoreModule() {
  const [{ db }, { collection, getDocs }] = await Promise.all([
    import('./firebase'),
    import('firebase/firestore')
  ]);
  return { db, collection, getDocs };
}

/**
 * Loads master data only when user is authenticated with verified custom claims.
 * Bound to activeSessionEpoch to discard in-flight data if session terminates.
 */
async function loadMasterData() {
  const sessionToken = activeSessionEpoch;
  if (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR') {
    console.warn('[Admin] Skipped master data fetch: unauthenticated session.');
    return;
  }

  try {
    const { db, collection, getDocs } = await getFirestoreModule();
    const [locSnap, orgSnap, catSnap, empSnap, deptSnap] = await Promise.all([
      getDocs(collection(db, 'locations')),
      getDocs(collection(db, 'organizers')),
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'employees')),
      getDocs(collection(db, 'departments'))
    ]);

    // Check if session changed or logged out during fetch
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) {
      console.log('[Admin] Discarded in-flight master data fetch: session invalidated.');
      return;
    }

    masterLocations = locSnap.docs.map(d => ({ id: d.id, ...d.data() } as Location));
    masterOrganizers = orgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organizer));
    masterCategories = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
    masterEmployees = empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
    masterDepartments = deptSnap.docs.map(d => ({ id: d.id, ...d.data() } as Department));
  } catch (err) {
    if (sessionToken !== activeSessionEpoch) return;
    console.warn('[Admin] Could not load master data from Firestore, using fallback fixtures:', err);
  }

  if (sessionToken !== activeSessionEpoch) return;

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
  const sessionToken = activeSessionEpoch;
  if (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR') {
    return [];
  }
  try {
    const { db, collection, getDocs } = await getFirestoreModule();
    const snap = await getDocs(collection(db, 'activities'));
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) {
      console.log('[Admin] Discarded in-flight activities fetch: session invalidated.');
      return [];
    }
    cachedActivities = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityDocument));
    return cachedActivities;
  } catch (err) {
    if (sessionToken !== activeSessionEpoch) return [];
    console.warn('[Admin] Could not fetch activities from Firestore, using in-memory cache:', err);
    return cachedActivities;
  }
}

/**
 * Returns Admin Portal shell layout when authenticated
 */
function renderAdminShell(): string {
  const isStaging = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'staging';
  return `
    ${isStaging ? `
      <div class="staging-indicator-banner" role="status" aria-label="Informasi Lingkungan Staging">
        <span class="staging-badge">UJI COBA</span>
        <span class="staging-text">LINGKUNGAN UJI COBA / STAGING — DATA SIMULASI</span>
      </div>
    ` : ''}
    <div id="sidebarBackdrop" class="sidebar-backdrop" aria-hidden="true"></div>
    <aside class="admin-sidebar" id="adminSidebar" aria-label="Navigasi Utama Admin" aria-hidden="false">
      <!-- Injected by renderSidebar -->
    </aside>
    <div class="admin-body">
      <header class="topbar">
        <div class="topbar-left">
          <button type="button" id="adminMenuToggleBtn" class="btn-menu-toggle mobile-only" aria-label="Buka menu navigasi" aria-expanded="false" aria-controls="adminSidebar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div class="topbar-title-wrap">
            <h1 class="topbar-portal-title">Admin Portal</h1>
            <p class="topbar-portal-sub">Sistem Informasi Manajemen Agenda Kedinasan</p>
          </div>
        </div>
        <div class="topbar-right">
          <button type="button" class="btn-topbar-icon" title="Notifikasi" aria-label="Notifikasi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </button>
          <div class="operator-profile-wrapper">
            <div class="operator-profile-pill" id="operatorProfilePill" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false" aria-label="Menu profil operator">
              <svg class="operator-avatar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="5"/>
                <path d="M20 21a8 8 0 1 0-16 0"/>
              </svg>
              <span class="operator-name" id="operatorDisplayName">Operator</span>
              <svg class="operator-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div class="operator-dropdown-menu hidden" id="operatorDropdownMenu" role="menu" aria-label="Opsi akun operator">
              <div class="dropdown-user-info">
                <p class="dropdown-user-name" id="dropdownUserName">Operator</p>
                <p class="dropdown-user-email" id="dropdownUserEmail">operator@batam.go.id</p>
                <span class="dropdown-role-badge role-admin" id="dropdownRoleBadge">Administrator</span>
              </div>
              <button type="button" id="btnLogout" class="dropdown-logout-btn" role="menuitem">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Keluar (Sign Out)
              </button>
            </div>
          </div>
        </div>
      </header>
      <main id="admin-main" class="admin-content">
        <div class="loading-shell">Memuat konsol admin...</div>
      </main>
    </div>
  `;
}

/**
 * Updates topbar operator profile pill and dropdown menu with active user details
 */
function updateOperatorHeader(profile: CurrentUserProfile | null) {
  const displayNameEl = document.getElementById('operatorDisplayName');
  const dropdownNameEl = document.getElementById('dropdownUserName');
  const dropdownEmailEl = document.getElementById('dropdownUserEmail');
  const dropdownRoleBadgeEl = document.getElementById('dropdownRoleBadge');

  const displayName = profile?.displayName || (profile?.role === 'admin' ? 'Administrator' : 'Operator Agenda');
  const email = profile?.email || '';
  const roleLabel = profile?.roleLabel || 'Operator';
  const roleClass = profile?.role === 'admin' ? 'dropdown-role-badge role-admin' : 'dropdown-role-badge role-editor';

  if (displayNameEl) displayNameEl.textContent = displayName;
  if (dropdownNameEl) dropdownNameEl.textContent = displayName;
  if (dropdownEmailEl) dropdownEmailEl.textContent = email;
  if (dropdownRoleBadgeEl) {
    dropdownRoleBadgeEl.textContent = roleLabel;
    dropdownRoleBadgeEl.className = roleClass;
  }
}

/**
 * Configures operator profile dropdown toggle and sign-out action
 */
function setupOperatorDropdown() {
  const pill = document.getElementById('operatorProfilePill');
  const menu = document.getElementById('operatorDropdownMenu');
  const logoutBtn = document.getElementById('btnLogout');

  if (!pill || !menu) return;

  const toggleMenu = (open?: boolean) => {
    const isCurrentlyOpen = !menu.classList.contains('hidden');
    const nextState = typeof open === 'boolean' ? open : !isCurrentlyOpen;
    if (nextState) {
      menu.classList.remove('hidden');
      pill.setAttribute('aria-expanded', 'true');
    } else {
      menu.classList.add('hidden');
      pill.setAttribute('aria-expanded', 'false');
    }
  };

  pill.onclick = (e) => {
    e.stopPropagation();
    toggleMenu();
  };

  pill.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      toggleMenu(true);
      logoutBtn?.focus();
    }
  };

  if (logoutBtn) {
    logoutBtn.onkeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleMenu(false);
        pill.focus();
      }
    };
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && !pill.contains(target) && !menu.contains(target)) {
      toggleMenu(false);
    }
  });

  // Close on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
      toggleMenu(false);
      pill.focus();
    }
  });

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await signOutOperator();
        clearAdministrativeSession();
        currentAuthState = 'SIGNED_OUT';
        currentUser = null;
        renderCurrentState();
      } catch (err) {
        console.error('[Admin Auth] Error signing out:', err);
      }
    };
  }
}

// Router and Dynamic View Renderer
async function router() {
  const sessionToken = activeSessionEpoch;
  if (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR') {
    return;
  }

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
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
    contentContainer.innerHTML = renderDashboardPage(activities, currentLookups.locations);
  } else if (hash === 'activities') {
    const [{ renderActivitiesPage }, activities] = await Promise.all([
      import('./pages/ActivitiesPage'),
      loadActivities()
    ]);
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
    contentContainer.innerHTML = renderActivitiesPage(activities);
    bindActivitiesListEvents();
  } else if (hash === 'activities/new' || hash.startsWith('activities/edit/') || hash.startsWith('activities/duplicate/')) {
    await loadMasterData();
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
    const [{ handleEditRoute }, { db }, activities] = await Promise.all([
      import('./pages/ActivityEditWorkflow'),
      import('./firebase'),
      loadActivities()
    ]);
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
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
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
    await mountMasterDataPage(contentContainer, {
      db,
      onDataChanged: async () => {
        await loadMasterData();
      }
    });
  } else if (hash === 'reports') {
    await loadMasterData();
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
    const [{ mountReportsPage }, { db }] = await Promise.all([
      import('./pages/ReportsPage'),
      import('./firebase')
    ]);
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
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
    if (sessionToken !== activeSessionEpoch || (currentAuthState !== 'AUTHENTICATED_ADMIN' && currentAuthState !== 'AUTHENTICATED_EDITOR')) return;
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

/**
 * Renders the Login page and attaches form validation, submission, and password toggle handlers
 */
function showLoginView(error?: string, isSubmitting = false, initialEmail = '') {
  const adminApp = document.getElementById('admin-app');
  if (!adminApp) return;

  adminApp.className = 'auth-layout';
  adminApp.innerHTML = renderLoginPage(error, isSubmitting, initialEmail);

  const form = document.getElementById('adminLoginForm') as HTMLFormElement | null;
  const emailInput = document.getElementById('authEmail') as HTMLInputElement | null;
  const passwordInput = document.getElementById('authPassword') as HTMLInputElement | null;
  const toggleBtn = document.getElementById('btnTogglePassword') as HTMLButtonElement | null;
  const forgotBtn = document.getElementById('btnForgotPwd') as HTMLButtonElement | null;

  // Toggle password visibility
  if (toggleBtn && passwordInput) {
    toggleBtn.onclick = () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      const eyeOpen = document.getElementById('iconEyeOpen');
      const eyeClosed = document.getElementById('iconEyeClosed');
      if (eyeOpen && eyeClosed) {
        eyeOpen.classList.toggle('hidden', isPassword);
        eyeClosed.classList.toggle('hidden', !isPassword);
      }
      const newLabel = isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi';
      toggleBtn.setAttribute('aria-label', newLabel);
      toggleBtn.setAttribute('title', newLabel);
    };
  }

  // Switch to forgot password view
  if (forgotBtn) {
    forgotBtn.onclick = () => {
      showRecoveryView(undefined, false, emailInput?.value || '');
    };
  }

  // Handle Login submission
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = (emailInput?.value || '').trim();
      const password = passwordInput?.value || '';

      if (!email) {
        showLoginView('Silakan masukkan alamat email kedinasan.', false, email);
        return;
      }
      if (!isValidEmailFormat(email)) {
        showLoginView('Format alamat email tidak valid.', false, email);
        return;
      }
      if (!password) {
        showLoginView('Silakan masukkan kata sandi Anda.', false, email);
        return;
      }

      showLoginView(undefined, true, email);

      try {
        await signInOperator(email, password);
        // On success, subscribeAuthState will fire and invoke renderCurrentState()
      } catch (err: any) {
        showLoginView(err.message || 'Gagal masuk ke sistem.', false, email);
      }
    };
  }

  // Focus management for accessible keyboard workflow
  if (!isSubmitting) {
    if (error) {
      if (emailInput && !emailInput.value.trim()) {
        emailInput.focus();
      } else if (passwordInput) {
        passwordInput.focus();
        passwordInput.select();
      }
    } else if (initialEmail && passwordInput) {
      passwordInput.focus();
    } else if (emailInput) {
      emailInput.focus();
    }
  }
}

/**
 * Renders the Password Recovery page and attaches request handlers
 */
function showRecoveryView(message?: { type: 'success' | 'error'; text: string }, isSubmitting = false, initialEmail = '') {
  const adminApp = document.getElementById('admin-app');
  if (!adminApp) return;

  adminApp.className = 'auth-layout';
  adminApp.innerHTML = renderPasswordRecoveryPage(message, isSubmitting, initialEmail);

  const form = document.getElementById('adminRecoveryForm') as HTMLFormElement | null;
  const emailInput = document.getElementById('recoveryEmail') as HTMLInputElement | null;
  const backBtn = document.getElementById('btnBackToLogin') as HTMLButtonElement | null;

  if (backBtn) {
    backBtn.onclick = () => {
      showLoginView(undefined, false, emailInput?.value || '');
    };
  }

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = (emailInput?.value || '').trim();

      if (!email) {
        showRecoveryView({ type: 'error', text: 'Silakan masukkan alamat email kedinasan.' }, false, email);
        return;
      }
      if (!isValidEmailFormat(email)) {
        showRecoveryView({ type: 'error', text: 'Format alamat email tidak valid.' }, false, email);
        return;
      }

      showRecoveryView(undefined, true, email);

      try {
        const res = await requestPasswordReset(email);
        showRecoveryView({ type: 'success', text: res.message }, false, email);
      } catch (err: any) {
        showRecoveryView({ type: 'error', text: err.message || 'Gagal mengirim instruksi pemulihan.' }, false, email);
      }
    };
  }

  if (!isSubmitting && emailInput) {
    emailInput.focus();
    if (initialEmail) {
      emailInput.select();
    }
  }
}

/**
 * Renders the Access Denied page when an authenticated user lacks required claims
 */
function showAccessDeniedView(profile: CurrentUserProfile | null, customMsg?: string) {
  const adminApp = document.getElementById('admin-app');
  if (!adminApp) return;

  adminApp.className = 'auth-layout';
  adminApp.innerHTML = renderAccessDeniedPage(profile, customMsg);

  const signOutBtn = document.getElementById('btnAccessDeniedSignOut') as HTMLButtonElement | null;
  if (signOutBtn) {
    signOutBtn.onclick = async () => {
      try {
        await signOutOperator();
        clearAdministrativeSession();
        currentAuthState = 'SIGNED_OUT';
        currentUser = null;
        renderCurrentState();
      } catch (err) {
        console.error('[Admin Auth] Error signing out from denied state:', err);
      }
    };
  }
}

/**
 * Renders the clean loading screen while verifying session
 */
function showLoadingScreen() {
  const adminApp = document.getElementById('admin-app');
  if (!adminApp) return;

  adminApp.className = 'auth-layout';
  adminApp.innerHTML = `
    <div class="auth-loading-screen" role="status" aria-live="polite">
      <div class="auth-loading-spinner" aria-hidden="true"></div>
      <p class="auth-loading-text">Memverifikasi sesi operator...</p>
    </div>
  `;
}

/**
 * Central State Machine View Dispatcher
 */
async function renderCurrentState() {
  // Update global telemetry / test introspection hook
  (window as any).__AUTH_STATE__ = {
    state: currentAuthState,
    profile: currentUser,
    error: currentAuthErrorMessage
  };

  const adminApp = document.getElementById('admin-app');
  if (!adminApp) return;

  switch (currentAuthState) {
    case 'AUTH_LOADING':
      showLoadingScreen();
      break;

    case 'SIGNED_OUT':
      showLoginView();
      break;

    case 'ACCESS_DENIED':
      showAccessDeniedView(currentUser, currentAuthErrorMessage);
      break;

    case 'AUTH_ERROR':
      showLoginView(currentAuthErrorMessage || 'Terjadi kesalahan autentikasi. Silakan masuk kembali.');
      break;

    case 'AUTHENTICATED_ADMIN':
    case 'AUTHENTICATED_EDITOR': {
      const adminStartTime = performance.now();
      adminApp.className = 'admin-layout';
      adminApp.innerHTML = renderAdminShell();

      updateOperatorHeader(currentUser);
      setupOperatorDropdown();
      setupAdminMobileDrawer();

      // Only load private Firestore master data once verified as authenticated
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
      break;
    }
  }
}

// Router listener only reacts when authenticated
window.addEventListener('hashchange', () => {
  if (currentAuthState === 'AUTHENTICATED_ADMIN' || currentAuthState === 'AUTHENTICATED_EDITOR') {
    router();
  }
});

// Protected Application Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  console.log(`[Admin App] v${SYSTEM_VERSION} (${TIMEZONE}) initialized. Subscribing to auth state...`);

  subscribeAuthState(async (state, profile, errorMessage) => {
    console.log(`[Admin Auth] Transitioned to state: ${state} (${profile?.email || 'anonymous'})`);
    currentAuthState = state;
    currentUser = profile;
    currentAuthErrorMessage = errorMessage;
    await renderCurrentState();
  });
});
