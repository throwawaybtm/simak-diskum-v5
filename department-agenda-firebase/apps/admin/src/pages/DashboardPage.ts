/**
 * Admin Dashboard Page Component
 * SIMAK DISKUM Minimalist Civic Design System (Phase V01-A)
 * Reference Authority: docs/design/reference-approved.png
 */

import type { ActivityDocument } from '@department-agenda/shared';
import { formatTimeDisplay } from '@department-agenda/shared';

const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatShortDateBadge(dateStr: string): { day: string; month: string } {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[2];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const month = MONTH_NAMES_ID[monthIdx] || parts[1];
      return { day, month };
    }
  } catch {
    // fallback
  }
  return { day: '--', month: '---' };
}

export function renderDashboardPage(activities: ActivityDocument[]): string {
  const total = activities.length;

  // Feature F01: Administrative Stage Counts
  const stageInitial = activities.filter(a => (a.administrativeStage || 'INITIAL_ENTRY') === 'INITIAL_ENTRY').length;
  const stageOffline = activities.filter(a => a.administrativeStage === 'OFFLINE_PROCESS').length;
  const stageDetails = activities.filter(a => a.administrativeStage === 'DETAILS_COMPLETED').length;
  const stageComplete = activities.filter(a => a.administrativeStage === 'ADMIN_COMPLETE').length;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Upcoming scheduled activities
  const upcomingList = activities
    .filter(a => a.status === 'SCHEDULED' && a.endDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  const upcomingHtml = upcomingList.length > 0
    ? upcomingList.map(a => {
        const { day, month } = formatShortDateBadge(a.startDate);
        const timeStr = formatTimeDisplay(a.startTime, a.endTime, a.openEnded);
        return `
          <div class="agenda-item-row">
            <div class="agenda-date-badge">
              <span class="badge-day">${day}</span>
              <span class="badge-month">${month}</span>
            </div>
            <div class="agenda-item-info">
              <h4 class="agenda-item-title">${a.title}</h4>
              <p class="agenda-item-location">${a.locationId || 'Kantor Diskum Kota Batam'}</p>
            </div>
            <div class="agenda-item-time">
              ${timeStr}
            </div>
          </div>
        `;
      }).join('')
    : '<div class="empty-state-text">Tidak ada agenda dinas mendatang dalam waktu dekat.</div>';

  // Calculate Donut Chart conic angles
  let conicGradient = '#e2e8f0 0deg 360deg';
  if (total > 0) {
    const p1 = (stageInitial / total) * 360;
    const p2 = p1 + (stageOffline / total) * 360;
    const p3 = p2 + (stageDetails / total) * 360;
    conicGradient = `conic-gradient(
      #3b82f6 0deg ${p1}deg,
      #f59e0b ${p1}deg ${p2}deg,
      #06b6d4 ${p2}deg ${p3}deg,
      #10b981 ${p3}deg 360deg
    )`;
  }

  return `
    <div class="page-container dashboard-page">
      <!-- DASHBOARD HEADER -->
      <div class="page-header">
        <div>
          <h2 class="dashboard-main-heading">Dashboard</h2>
          <p class="subtitle sr-only">Tahap Administrasi & Sistem Penjadwalan Kegiatan</p>
        </div>
        <div>
          <a href="#activities/new" class="btn btn-primary btn-add-agenda">+ Tambah Kegiatan</a>
        </div>
      </div>

      <!-- FIVE ADMINISTRATIVE STAGE SUMMARY CARDS (Reference Authority) -->
      <section class="stats-overview-section">
        <div class="stats-grid stage-summary-grid">
          <!-- Card 1: Input Awal -->
          <div class="stat-card stat-card-stage">
            <div class="stat-card-icon icon-initial">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
              </svg>
            </div>
            <div class="stat-card-body">
              <span class="stat-label">Input Awal</span>
              <span class="stat-num">${stageInitial}</span>
            </div>
          </div>

          <!-- Card 2: Proses Offline -->
          <div class="stat-card stat-card-stage">
            <div class="stat-card-icon icon-offline">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="stat-card-body">
              <span class="stat-label">Proses Offline</span>
              <span class="stat-num">${stageOffline}</span>
            </div>
          </div>

          <!-- Card 3: Detail Dilengkapi -->
          <div class="stat-card stat-card-stage">
            <div class="stat-card-icon icon-details">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div class="stat-card-body">
              <span class="stat-label">Detail Dilengkapi</span>
              <span class="stat-num">${stageDetails}</span>
            </div>
          </div>

          <!-- Card 4: Administrasi Lengkap -->
          <div class="stat-card stat-card-stage">
            <div class="stat-card-icon icon-complete">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="stat-card-body">
              <span class="stat-label">Administrasi Lengkap</span>
              <span class="stat-num">${stageComplete}</span>
            </div>
          </div>

          <!-- Card 5: Total Agenda -->
          <div class="stat-card stat-card-stage">
            <div class="stat-card-icon icon-total">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            <div class="stat-card-body">
              <span class="stat-label">Total Agenda</span>
              <span class="stat-num">${total}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- TWO PANELS: UPCOMING AGENDA & ADMINISTRATIVE STATUS -->
      <div class="dashboard-panels-grid">
        <!-- LEFT PANEL: UPCOMING AGENDA (60%) -->
        <div class="panel dashboard-card panel-upcoming">
          <div class="panel-card-header">
            <div class="panel-title-group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <h3 class="panel-title">Agenda Mendatang</h3>
            </div>
            <a href="#activities" class="panel-header-link">Lihat Semua →</a>
          </div>
          <div class="upcoming-agenda-list">
            ${upcomingHtml}
          </div>
        </div>

        <!-- RIGHT PANEL: ADMINISTRATIVE STATUS (40%) -->
        <div class="panel dashboard-card panel-status">
          <div class="panel-card-header">
            <div class="panel-title-group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <h3 class="panel-title">Status Administrasi</h3>
            </div>
          </div>

          <div class="status-analytics-body">
            <!-- PURE CSS CONIC DONUT CHART -->
            <div class="donut-chart-container">
              <div class="donut-circle" style="background: ${conicGradient};">
                <div class="donut-hole">
                  <span class="donut-center-num">${total}</span>
                  <span class="donut-center-label">Agenda</span>
                </div>
              </div>
            </div>

            <!-- STAGE LEGEND LIST -->
            <div class="status-legend-list">
              <div class="legend-item">
                <div class="legend-color-label">
                  <span class="legend-dot dot-initial"></span>
                  <span class="legend-name">Input Awal</span>
                </div>
                <span class="legend-count">${stageInitial}</span>
              </div>

              <div class="legend-item">
                <div class="legend-color-label">
                  <span class="legend-dot dot-offline"></span>
                  <span class="legend-name">Proses Offline</span>
                </div>
                <span class="legend-count">${stageOffline}</span>
              </div>

              <div class="legend-item">
                <div class="legend-color-label">
                  <span class="legend-dot dot-details"></span>
                  <span class="legend-name">Detail Dilengkapi</span>
                </div>
                <span class="legend-count">${stageDetails}</span>
              </div>

              <div class="legend-item">
                <div class="legend-color-label">
                  <span class="legend-dot dot-complete"></span>
                  <span class="legend-name">Administrasi Lengkap</span>
                </div>
                <span class="legend-count">${stageComplete}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
