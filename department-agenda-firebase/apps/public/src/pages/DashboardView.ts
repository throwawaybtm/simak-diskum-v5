/**
 * Public Dashboard View Component
 * Provides executive daily overview, 7-day upcoming activities, announcements, and quick jump-to-date.
 */

import type { PublicActivityDTO } from '@department-agenda/shared';
import { formatIndonesianDate } from '@department-agenda/shared';

export interface DashboardViewProps {
  todayActivities: PublicActivityDTO[];
  upcomingActivities: PublicActivityDTO[];
  monthActivitiesCount: number;
  announcements: Array<{ id: string; title: string; content: string; publishedAt: string; category?: string }>;
  todayDateStr: string; // YYYY-MM-DD
}

export function renderDashboardView(props: DashboardViewProps): string {
  const { todayActivities, upcomingActivities, monthActivitiesCount, announcements, todayDateStr } = props;
  const todayFormatted = formatIndonesianDate(todayDateStr);

  // Today's activities cards
  const todayCardsHtml = todayActivities.length > 0
    ? todayActivities.map(act => renderActivityCard(act)).join('')
    : `
      <div class="empty-state-card">
        <div class="empty-icon">☕</div>
        <p class="empty-title">Tidak Ada Kegiatan Dinas Hari Ini</p>
        <p class="empty-desc">Tidak ada agenda dinas yang dijadwalkan pada hari ini (${todayFormatted}).</p>
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
            <span class="ann-date">${new Date(ann.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })} WIB</span>
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
      <!-- HERO BANNER -->
      <section class="hero-section">
        <div class="hero-content">
          <span class="hero-date-pill">🗓️ ${todayFormatted}</span>
          <h2 class="hero-title">Portal Jadwal Kegiatan Kedinasan</h2>
          <p class="hero-subtitle">Transparansi jadwal rapat koordinasi, pelatihan UMKM, bimtek, pameran, dan agenda resmi pimpinan</p>

          <div class="hero-search-bar">
            <input type="text" id="heroSearchInput" placeholder="Cari kegiatan, narasumber, atau tempat..." aria-label="Cari kegiatan">
            <button type="button" class="btn btn-primary" id="btnHeroSearch">Cari Agenda</button>
          </div>
        </div>
      </section>

      <!-- METRICS GRID -->
      <section class="stats-overview-section">
        <div class="metrics-grid">
          <div class="metric-card metric-today">
            <div class="metric-icon">📌</div>
            <div class="metric-body">
              <span class="metric-number">${todayActivities.length}</span>
              <span class="metric-label">Kegiatan Hari Ini</span>
            </div>
          </div>

          <div class="metric-card metric-upcoming">
            <div class="metric-icon">🚀</div>
            <div class="metric-body">
              <span class="metric-number">${upcomingActivities.length}</span>
              <span class="metric-label">Agenda 7 Hari Mendatang</span>
            </div>
          </div>

          <div class="metric-card metric-month">
            <div class="metric-icon">📊</div>
            <div class="metric-body">
              <span class="metric-number">${monthActivitiesCount}</span>
              <span class="metric-label">Total Agenda Bulan Ini</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TWO-COLUMN MAIN CONTENT -->
      <div class="dashboard-columns-grid">
        <!-- LEFT COLUMN: TODAY & UPCOMING -->
        <div class="main-agenda-column">
          <!-- TODAY'S ACTIVITIES -->
          <div class="section-box">
            <div class="section-header-bar">
              <h3 class="section-title">Hari Ini (${todayFormatted})</h3>
              <a href="#calendar" class="section-link">Buka Kalender →</a>
            </div>
            <div class="activities-cards-list">
              ${todayCardsHtml}
            </div>
          </div>

          <!-- UPCOMING ACTIVITIES -->
          <div class="section-box">
            <div class="section-header-bar">
              <h3 class="section-title">Agenda 7 Hari Mendatang</h3>
              <a href="#agenda" class="section-link">Lihat Semua Agenda →</a>
            </div>
            <div class="activities-cards-list">
              ${upcomingCardsHtml}
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: ANNOUNCEMENTS & CALENDAR JUMP -->
        <aside class="sidebar-column">
          <!-- QUICK JUMP TO DATE -->
          <div class="widget-box calendar-jump-widget">
            <h4 class="widget-title">🗓️ Lompat ke Tanggal</h4>
            <p class="widget-desc">Pilih tanggal untuk langsung membuka agenda kegiatan pada hari tersebut:</p>
            <div class="jump-date-group">
              <input type="date" id="inputJumpDate" value="${todayDateStr}">
              <button type="button" class="btn btn-secondary btn-sm" id="btnJumpToDate">Buka Tanggal</button>
            </div>
          </div>

          <!-- OFFICIAL ANNOUNCEMENTS -->
          <div class="widget-box announcements-widget">
            <h4 class="widget-title">📢 Pengumuman Kedinasan</h4>
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
          <span class="meta-icon">📅</span>
          <span>${act.dateDisplay}</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">⏰</span>
          <span>${act.timeDisplay}</span>
        </div>
        <div class="meta-item">
          <span class="meta-icon">📍</span>
          <span><strong>${act.locationName}</strong></span>
        </div>
      </div>

      <div class="card-footer">
        <span class="card-organizer">Oleh: ${act.organizerName}</span>
        <button type="button" class="btn-detail" data-open-detail="${act.id}">Lihat Rincian →</button>
      </div>
    </article>
  `;
}
