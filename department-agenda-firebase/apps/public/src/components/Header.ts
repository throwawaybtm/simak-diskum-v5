/**
 * Public Header & Navigation Component
 */

export function renderHeader(activeRoute: string): string {
  const isDashboard = activeRoute === 'dashboard' || activeRoute === '';
  const isCalendar = activeRoute.startsWith('calendar');
  const isAgenda = activeRoute.startsWith('agenda');
  const isAnnouncements = activeRoute.startsWith('announcements');

  return `
    <header class="app-header">
      <div class="header-container">
        <div class="header-brand">
          <div class="brand-crest">🏛️</div>
          <div class="brand-text">
            <h1 class="brand-title">Dinas Koperasi dan Usaha Mikro Kota Batam</h1>
            <p class="brand-subtitle">Portal Informasi Jadwal Kegiatan Resmi • Pemerintah Kota Batam</p>
          </div>
        </div>

        <div class="header-tz-badge">
          <span class="tz-dot"></span>
          <span>Waktu Indonesia Barat (WIB • UTC+7)</span>
        </div>
      </div>

      <nav class="app-nav" aria-label="Navigasi Utama">
        <div class="nav-container">
          <div class="nav-links">
            <a href="#dashboard" class="nav-link ${isDashboard ? 'active' : ''}">
              <span class="nav-icon">📊</span>
              <span>Beranda</span>
            </a>
            <a href="#calendar" class="nav-link ${isCalendar ? 'active' : ''}">
              <span class="nav-icon">📅</span>
              <span>Kalender Kegiatan</span>
            </a>
            <a href="#agenda" class="nav-link ${isAgenda ? 'active' : ''}">
              <span class="nav-icon">🔍</span>
              <span>Cari Agenda</span>
            </a>
            <a href="#announcements" class="nav-link ${isAnnouncements ? 'active' : ''}">
              <span class="nav-icon">📢</span>
              <span>Pengumuman</span>
            </a>
          </div>

          <div class="nav-admin-link">
            <a href="http://localhost:3001" target="_blank" class="btn-portal-admin" title="Buka Portal Operator Dinas">
              <span>🔒 Masuk Operator</span>
            </a>
          </div>
        </div>
      </nav>
    </header>
  `;
}
