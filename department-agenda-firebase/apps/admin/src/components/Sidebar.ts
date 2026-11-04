/**
 * Responsive Sidebar Navigation Component
 */

export function renderSidebar(activeRoute: string): string {
  const routes = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'activities', label: 'Kelola Kegiatan', icon: '📋' },
    { id: 'activities/new', label: '+ Tambah Kegiatan', icon: '➕' },
    { id: 'calendar', label: 'Kalender', icon: '📅' },
    { id: 'master', label: 'Master Data', icon: '👥' },
    { id: 'announcements', label: 'Pengumuman', icon: '📢' },
    { id: 'audit', label: 'Audit Trail', icon: '🔍' },
    { id: 'reports', label: 'Laporan 8 Kolom', icon: '📄' },
    { id: 'settings', label: 'Pengaturan', icon: '⚙️' }
  ];

  const linksHtml = routes
    .map(r => {
      const isActive = activeRoute === r.id || (r.id === 'activities' && activeRoute.startsWith('activities/edit'));
      return `
        <a href="#${r.id}" class="nav-item ${isActive ? 'active' : ''}">
          <span class="nav-icon">${r.icon}</span>
          <span class="nav-text">${r.label}</span>
        </a>
      `;
    })
    .join('');

  return `
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="sidebar-brand">
        <div class="brand-header">
          <h2>Agenda Batam</h2>
          <button id="sidebarCloseBtn" class="mobile-only close-btn" aria-label="Tutup menu">✕</button>
        </div>
        <span class="badge-env">Emulator Dev (Gate 5)</span>
      </div>
      <nav class="sidebar-nav">
        ${linksHtml}
      </nav>
      <div class="sidebar-footer">
        <p class="agency-label">Dinas Koperasi & Usaha Mikro Kota Batam</p>
      </div>
    </aside>
  `;
}
