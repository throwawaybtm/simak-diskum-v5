/**
 * Public Dashboard View Component
 * Modern Minimalist Civic Design with Hero Banner, 4 Summary Cards, and 2-Column Feed.
 */

import type { PublicActivityDTO } from '@department-agenda/shared';
import { formatIndonesianDate, formatAnnouncementDate, renderDateInputField } from '@department-agenda/shared';

export interface DashboardViewProps {
  todayActivities: PublicActivityDTO[];
  upcomingActivities: PublicActivityDTO[];
  monthActivitiesCount: number;
  weekActivitiesCount?: number;
  totalActivitiesCount?: number;
  announcements: Array<{ id: string; title: string; content: string; publishedAt: unknown; category?: string }>;
  todayDateStr: string; // YYYY-MM-DD
}

export function renderDashboardView(props: DashboardViewProps): string {
  const {
    todayActivities,
    upcomingActivities,
    monthActivitiesCount,
    weekActivitiesCount,
    totalActivitiesCount,
    announcements,
    todayDateStr
  } = props;
  const todayFormatted = formatIndonesianDate(todayDateStr);

  const weekCount = weekActivitiesCount !== undefined
    ? weekActivitiesCount
    : (upcomingActivities.length + todayActivities.length);

  const totalCount = totalActivitiesCount !== undefined
    ? totalActivitiesCount
    : (monthActivitiesCount || (todayActivities.length + upcomingActivities.length));

  // Today's activities cards
  const todayCardsHtml = todayActivities.length > 0
    ? todayActivities.map(act => renderActivityCard(act)).join('')
    : `
      <div class="empty-state-card">
        <div class="empty-icon">☕</div>
        <p class="empty-title">Tidak Ada Kegiatan Dinas Hari Ini</p>
        <p class="empty-desc">Tidak ada agenda kedinasan yang dijadwalkan pada hari ini (${todayFormatted}).</p>
      </div>
    `;

  // Upcoming 7-days cards
  const upcomingCardsHtml = upcomingActivities.length > 0
    ? upcomingActivities.map(act => renderActivityCard(act)).join('')
    : `
      <div class="empty-state-card">
        <div class="empty-icon">📅</div>
        <p class="empty-title">Belum Ada Agenda Mendatang</p>
        <p class="empty-desc">Tidak ada agenda dinas yang dijadwalkan dalam 7 hari ke depan.</p>
      </div>
    `;

  // Announcements list
  const announcementsHtml = announcements.length > 0
    ? announcements.map(ann => `
        <div class="announcement-card category-${(ann.category || 'info').toLowerCase()}">
          <div class="ann-header">
            <span class="ann-badge">${ann.category || 'PENGUMUMAN'}</span>
            <span class="ann-date">${formatAnnouncementDate(ann.publishedAt)}</span>
          </div>
          <h4 class="ann-title">${ann.title}</h4>
          <p class="ann-content">${ann.content}</p>
        </div>
      `).join('')
    : `
      <div class="announcement-card">
        <h4 class="ann-title">Informasi Layanan Dinas Koperasi & Usaha Mikro</h4>
        <p class="ann-content">Seluruh kegiatan resmi dinas diumumkan secara transparan melalui portal ini. Untuk informasi kemitraan atau konsultasi PLUT Batam, silakan hubungi bagian sekretariat dinas.</p>
      </div>
    `;

  return `
    <div class="public-page dashboard-view">
      <!-- WELCOME HERO BANNER (Barelang Bridge & Civic Branding) -->
      <section class="welcome-banner hero-section">
        <div class="welcome-banner-bg" style="background-image: url('/barelang-bridge.png');"></div>
        <div class="welcome-banner-overlay"></div>
        <div class="welcome-banner-content hero-content">
          <div class="welcome-brand-mark">
            <span class="welcome-accent-bar"></span>
            <div class="welcome-titles">
              <span class="hero-welcome">Selamat Datang di</span>
              <h2 class="hero-brand">SIMAK DISKUM</h2>
              <span class="hero-title sr-only">Jadwal Kegiatan Kedinasan</span>
            </div>
          </div>
          <p class="welcome-subtitle hero-subtitle">
            Informasi agenda kedinasan Dinas Koperasi dan Usaha Mikro Kota Batam secara terbuka dan terkini.
          </p>
        </div>
      </section>

      <!-- FOUR SUMMARY CARDS (Reference Layout) -->
      <section class="stats-overview-section">
        <div class="metrics-grid summary-cards-grid">
          <!-- Card 1: Agenda Hari Ini -->
          <div class="metric-card metric-today">
            <div class="metric-icon-box">
              <svg class="metric-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <div class="metric-body">
              <span class="metric-label">Agenda Hari Ini</span>
              <span class="metric-number">${todayActivities.length}</span>
            </div>
          </div>

          <!-- Card 2: Agenda Minggu Ini -->
          <div class="metric-card metric-upcoming">
            <div class="metric-icon-box">
              <svg class="metric-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <div class="metric-body">
              <span class="metric-label">Agenda Minggu Ini</span>
              <span class="metric-number">${weekCount}</span>
            </div>
          </div>

          <!-- Card 3: Agenda Bulan Ini -->
          <div class="metric-card metric-month">
            <div class="metric-icon-box">
              <svg class="metric-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <div class="metric-body">
              <span class="metric-label">Agenda Bulan Ini</span>
              <span class="metric-number">${monthActivitiesCount}</span>
            </div>
          </div>

          <!-- Card 4: Total Agenda -->
          <div class="metric-card metric-total">
            <div class="metric-icon-box">
              <svg class="metric-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>
            <div class="metric-body">
              <span class="metric-label">Total Agenda</span>
              <span class="metric-number">${totalCount}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TWO-COLUMN MAIN CONTENT FEED -->
      <div class="dashboard-columns-grid">
        <!-- LEFT COLUMN: TODAY & UPCOMING AGENDAS -->
        <div class="main-agenda-column">
          <!-- TODAY'S ACTIVITIES -->
          <div class="section-box">
            <div class="section-header-bar">
              <div class="section-title-wrap">
                <h3 class="section-title">Hari Ini</h3>
                <span class="section-subtitle">(${todayFormatted})</span>
              </div>
              <a href="#calendar" class="section-link">Buka Kalender →</a>
            </div>
            <div class="activities-cards-list">
              ${todayCardsHtml}
            </div>
          </div>

          <!-- UPCOMING ACTIVITIES -->
          <div class="section-box" style="margin-top: 1.5rem;">
            <div class="section-header-bar">
              <h3 class="section-title">Agenda 7 Hari Mendatang</h3>
              <a href="#agenda" class="section-link">Lihat Semua Agenda →</a>
            </div>
            <div class="activities-cards-list">
              ${upcomingCardsHtml}
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: JUMP TO DATE & ANNOUNCEMENTS -->
        <aside class="sidebar-column">
          <!-- QUICK JUMP TO DATE -->
          <div class="widget-box calendar-jump-widget">
            <h4 class="widget-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span>Lompat ke Tanggal</span>
            </h4>
            <p class="widget-desc">Pilih tanggal untuk langsung membuka agenda kegiatan pada hari tersebut:</p>
            <div class="jump-date-group">
              ${renderDateInputField({
                id: 'inputJumpDate',
                value: todayDateStr,
                placeholder: 'dd/mm/yyyy',
                className: 'jump-date-input-wrap'
              })}
              <button type="button" class="btn btn-secondary btn-sm" id="btnJumpToDate">Buka Tanggal</button>
            </div>
          </div>

          <!-- OFFICIAL ANNOUNCEMENTS -->
          <div class="widget-box announcements-widget" style="margin-top: 1.5rem;">
            <div class="widget-header">
              <h4 class="widget-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
                <span>Pengumuman Kedinasan</span>
              </h4>
              <a href="#announcements" class="widget-link">Semua →</a>
            </div>
            <div class="announcements-list">
              ${announcementsHtml}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function renderActivityCard(act: PublicActivityDTO): string {
  const isCancelled = act.status === 'CANCELLED';
  const isCompleted = act.status === 'COMPLETED';

  let statusBadge = '<span class="status-pill status-scheduled">Terjadwal</span>';
  if (isCancelled) {
    statusBadge = '<span class="status-pill status-cancelled">Dibatalkan</span>';
  } else if (isCompleted) {
    statusBadge = '<span class="status-pill status-completed">Selesai</span>';
  }

  return `
    <article class="activity-card ${isCancelled ? 'card-cancelled' : ''}" data-activity-id="${act.id}">
      <div class="card-header">
        <span class="card-category">${act.categoryName}</span>
        ${statusBadge}
      </div>

      <h4 class="card-title ${isCancelled ? 'title-cancelled' : ''}">${act.title}</h4>

      ${isCancelled && act.publicCancellationNotice ? `
        <div class="card-cancellation-notice">
          <strong>Pemberitahuan:</strong> ${act.publicCancellationNotice}
        </div>
      ` : ''}

      <div class="card-meta">
        <div class="meta-item">
          <svg class="meta-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <span>${act.dateDisplay}</span>
        </div>
        <div class="meta-item">
          <svg class="meta-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${act.timeDisplay}</span>
        </div>
        <div class="meta-item">
          <svg class="meta-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span><strong>${act.locationName}</strong></span>
        </div>
      </div>

      <div class="card-footer">
        <span class="card-organizer">Penyelenggara: ${act.organizerName}</span>
        <button type="button" class="btn-detail" data-open-detail="${act.id}">Lihat Rincian →</button>
      </div>
    </article>
  `;
}
