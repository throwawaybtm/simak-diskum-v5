/**
 * Public Header & Navigation Component
 * Modern Minimalist Civic Design with Top Horizontal Pill Navigation
 */

export function renderHeader(activeRoute: string): string {
  const isDashboard = activeRoute === 'dashboard' || activeRoute === '';
  const isCalendar = activeRoute.startsWith('calendar');
  const isAgenda = activeRoute.startsWith('agenda');
  const isAnnouncements = activeRoute.startsWith('announcements');
  const isStaging = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'staging';

  return `
    ${isStaging ? `
      <div class="staging-indicator-banner" role="status" aria-label="Informasi Lingkungan Staging">
        <span class="staging-badge">UJI COBA</span>
        <span class="staging-text">LINGKUNGAN STAGING / DATA SIMULASI</span>
      </div>
    ` : ''}
    <header class="app-header">
      <div class="header-container">
        <!-- Brand / Identity -->
        <div class="header-brand">
          <a href="#dashboard" class="brand-link">
            <img src="/batam-emblem.png" alt="Lambang Kota Batam" class="brand-crest" width="30" height="36">
            <div class="brand-titles">
              <div class="brand-name-wrap">
                <span class="brand-title-main">SIMAK DISKUM</span>
                <span class="brand-title-sub">Kota Batam</span>
              </div>
              <div class="brand-divider"></div>
              <div class="agency-titles">
                <span class="agency-title">Sistem Informasi Manajemen Agenda Kedinasan</span>
                <span class="agency-sub brand-title">Dinas Koperasi dan Usaha Mikro Kota Batam</span>
              </div>
            </div>
          </a>
        </div>

        <!-- Horizontal Navigation Menu (Top Pill) -->
        <nav class="app-nav" aria-label="Navigasi Utama">
          <div class="nav-links">
            <a href="#dashboard" class="nav-link ${isDashboard ? 'active' : ''}">
              <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>Beranda</span>
            </a>
            <a href="#calendar" class="nav-link ${isCalendar ? 'active' : ''}">
              <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span>Kalender Kegiatan</span>
            </a>
            <a href="#agenda" class="nav-link ${isAgenda ? 'active' : ''}">
              <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>Cari Agenda</span>
            </a>
            <a href="#announcements" class="nav-link ${isAnnouncements ? 'active' : ''}">
              <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              <span>Pengumuman</span>
            </a>
          </div>
        </nav>

        <!-- Right Header Items: Quick Search Pill & Timezone Badge -->
        <div class="header-right">
          <div class="header-search-wrap">
            <svg class="header-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="topNavSearchInput" class="header-search-input" placeholder="Cari agenda..." aria-label="Cari agenda">
          </div>
          <div class="header-tz-badge" title="Zona Waktu Operasional Resmi: Asia/Jakarta (WIB • UTC+7)">
            <span class="tz-dot"></span>
            <span>WIB</span>
          </div>
        </div>
      </div>
    </header>
  `;
}
