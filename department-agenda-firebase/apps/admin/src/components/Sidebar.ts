/**
 * Responsive Sidebar Navigation Component
 * SIMAK DISKUM Minimalist Civic Design System (Phase V01-A)
 * Reference Authority: docs/design/reference-approved.png
 */

export function renderSidebar(activeRoute: string): string {
  const isDashboard = activeRoute === 'dashboard' || activeRoute === '';
  const isActivities = activeRoute === 'activities' || activeRoute.startsWith('activities/edit') || activeRoute === 'activities/new' || activeRoute.startsWith('activities/duplicate');
  const isMaster = activeRoute === 'master';
  const isReports = activeRoute === 'reports';
  const isSettings = activeRoute === 'settings';

  return `
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-brand">
        <div class="brand-header">
          <div class="brand-identity-wrap">
            <img src="/batam-emblem.png" alt="Lambang Kota Batam" class="brand-crest" width="28" height="34">
            <div class="brand-titles">
              <span class="brand-title-main">SIMAK DISKUM</span>
              <span class="brand-title-sub">Kota Batam</span>
            </div>
          </div>
          <button id="sidebarCloseBtn" class="mobile-only close-btn" aria-label="Tutup menu">✕</button>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a href="#dashboard" class="nav-item ${isDashboard ? 'active' : ''}">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="nav-text">Dashboard</span>
        </a>

        <a href="#activities" class="nav-item ${isActivities ? 'active' : ''}">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <span class="nav-text">Agenda</span>
        </a>

        <a href="#master" class="nav-item ${isMaster ? 'active' : ''}">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
          <span class="nav-text">Master Data</span>
        </a>

        <a href="#reports" class="nav-item ${isReports ? 'active' : ''}">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" x2="8" y1="13" y2="13"/>
            <line x1="16" x2="8" y1="17" y2="17"/>
            <line x1="10" x2="8" y1="9" y2="9"/>
          </svg>
          <span class="nav-text">Laporan</span>
        </a>

        <a href="#settings" class="nav-item ${isSettings ? 'active' : ''}">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span class="nav-text">Pengaturan</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <p class="agency-label">Dinas Koperasi & Usaha Mikro Kota Batam</p>
      </div>
    </aside>
  `;
}
