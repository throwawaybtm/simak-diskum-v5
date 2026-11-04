/**
 * Admin Dashboard Page Component
 */

import type { ActivityDocument } from '@department-agenda/shared';
import { formatIndonesianDate, formatTimeDisplay } from '@department-agenda/shared';

export function renderDashboardPage(activities: ActivityDocument[]): string {
  const total = activities.length;
  const scheduled = activities.filter(a => a.status === 'SCHEDULED').length;
  const completed = activities.filter(a => a.status === 'COMPLETED').length;
  const cancelled = activities.filter(a => a.status === 'CANCELLED').length;

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

  const upcomingList = activities
    .filter(a => a.status === 'SCHEDULED' && a.endDate >= todayStr)
    .slice(0, 5);

  const upcomingHtml = upcomingList.length > 0
    ? upcomingList.map(a => `
        <div class="activity-card-item">
          <div class="card-item-date">${formatIndonesianDate(a.startDate)}</div>
          <div class="card-item-title"><strong>${a.title}</strong></div>
          <div class="card-item-meta">${formatTimeDisplay(a.startTime, a.endTime, a.openEnded)}</div>
        </div>
      `).join('')
    : '<p>Tidak ada kegiatan mendatang dalam waktu dekat.</p>';

  return `
    <div class="page-container dashboard-page">
      <div class="page-header">
        <div>
          <h2>Dashboard Administrator</h2>
          <p class="subtitle">Sistem Penjadwalan Kegiatan Dinas Koperasi dan Usaha Mikro Kota Batam</p>
        </div>
        <div>
          <a href="#activities/new" class="btn btn-primary">+ Tambah Kegiatan</a>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-num">${total}</div>
          <div class="stat-label">Total Kegiatan</div>
        </div>
        <div class="stat-card stat-scheduled">
          <div class="stat-num">${scheduled}</div>
          <div class="stat-label">Terjadwal</div>
        </div>
        <div class="stat-card stat-completed">
          <div class="stat-num">${completed}</div>
          <div class="stat-label">Selesai</div>
        </div>
        <div class="stat-card stat-cancelled">
          <div class="stat-num">${cancelled}</div>
          <div class="stat-label">Dibatalkan</div>
        </div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h4 style="margin-bottom: 0.75rem; color: var(--text-dark, #1e293b); font-size: 1.05rem;">Tahap Administrasi & Berkas Masuk (Feature F01)</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-num">${stageInitial}</div>
            <div class="stat-label"><span class="stage-badge stage-initial">Input Awal</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${stageOffline}</div>
            <div class="stat-label"><span class="stage-badge stage-offline">Proses Offline</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${stageDetails}</div>
            <div class="stat-label"><span class="stage-badge stage-details">Detail Dilengkapi</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-num">${stageComplete}</div>
            <div class="stat-label"><span class="stage-badge stage-complete">Administrasi Lengkap</span></div>
          </div>
        </div>
      </div>

      <div class="panel dashboard-panel" style="margin-top: 2rem;">
        <h3>Agenda Mendatang Terdekat</h3>
        <div class="upcoming-activities-list">
          ${upcomingHtml}
        </div>
      </div>
    </div>
  `;
}
