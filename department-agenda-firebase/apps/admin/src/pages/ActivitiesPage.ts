/**
 * Admin Activities List Page Component
 */

import type { ActivityDocument, ActivitySortOption } from '@department-agenda/shared';
import { formatIndonesianDateSpan, formatTimeDisplay, sortActivities } from '@department-agenda/shared';

export function renderActivitiesPage(activities: ActivityDocument[], initialSort: ActivitySortOption = 'NEWEST'): string {
  const stageMap: Record<string, { label: string; cls: string }> = {
    INITIAL_ENTRY: { label: 'Input Awal', cls: 'initial' },
    OFFLINE_PROCESS: { label: 'Proses Offline', cls: 'offline' },
    DETAILS_COMPLETED: { label: 'Detail Dilengkapi', cls: 'details' },
    ADMIN_COMPLETE: { label: 'Administrasi Lengkap', cls: 'complete' }
  };

  // Sort deterministically newest-first by default
  const sortedActivities = sortActivities(activities, initialSort);

  const rowsHtml = sortedActivities.length > 0
    ? sortedActivities.map(act => {
        const isCancelled = act.status === 'CANCELLED';
        const dateSpan = formatIndonesianDateSpan(act.startDate, act.endDate);
        const timeStr = formatTimeDisplay(act.startTime, act.endTime, act.openEnded);
        const stage = act.administrativeStage || 'INITIAL_ENTRY';
        const stageInfo = stageMap[stage] || stageMap.INITIAL_ENTRY;
        const agendaNumber = act.invitationLetter?.agendaNumber || '';

        const statusIndonesian = isCancelled ? 'Dibatalkan' : (act.status === 'COMPLETED' ? 'Selesai' : 'Terjadwal');

        return `
          <tr class="${isCancelled ? 'row-cancelled' : ''}" data-activity-row data-id="${act.id}" data-startdate="${act.startDate}" data-starttime="${act.startTime || ''}" data-status="${act.status}" data-stage="${stage}" data-title="${act.title.toLowerCase()}" data-agenda="${agendaNumber.toLowerCase()}">
            <td><strong>${dateSpan}</strong></td>
            <td>${timeStr}</td>
            <td>
              <div class="act-title">${act.title}</div>
              ${agendaNumber ? `<div class="act-agenda-no" style="font-size: 0.8rem; color: #475569; margin-top: 0.2rem;">📜 No. Agenda: <strong>${agendaNumber}</strong></div>` : ''}
              ${(!act.attendeeIds || act.attendeeIds.length === 0) ? '<span class="tag-missing">⚠️ Belum Ada Peserta</span>' : ''}
              ${stage === 'ADMIN_COMPLETE' && act.invitationLetter?.missingDocumentReason ? '<span class="tag-missing">ℹ️ Pengecualian Surat</span>' : ''}
              ${act.privateNotes ? '<span class="tag-private">🔒 Ada Catatan Privat</span>' : ''}
              ${act.cancelReason ? `<span class="tag-cancel">Batal: ${act.cancelReason}</span>` : ''}
            </td>
            <td><span class="stage-badge stage-${stageInfo.cls}">${stageInfo.label}</span></td>
            <td><span class="status-badge status-${act.status.toLowerCase()}">${statusIndonesian}</span></td>
            <td>v${act.version}</td>
            <td class="action-cell">
              <div class="action-buttons-wrap">
                <a href="#activities/edit/${act.id}" class="btn-sm btn-edit" aria-label="Edit agenda: ${act.title}">Edit</a>
                <a href="#activities/duplicate/${act.id}" class="btn-sm btn-duplicate" data-duplicate-id="${act.id}" aria-label="Duplikat agenda: ${act.title}">Duplikat</a>
                <button type="button" class="btn-sm btn-delete" data-delete-id="${act.id}" aria-label="Hapus agenda: ${act.title}">Hapus</button>
              </div>
            </td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="7" class="text-center" style="padding: 2.5rem 1rem; color: #64748b;">Belum ada kegiatan tersimpan di database. Silakan klik "Tambah Kegiatan".</td></tr>`;

  return `
    <div class="page-container activities-page">
      <div class="page-header">
        <div>
          <h2>Kelola Jadwal Kegiatan</h2>
          <p class="subtitle">Daftar agenda kegiatan resmi Dinas Koperasi dan Usaha Mikro Kota Batam</p>
        </div>
        <div>
          <a href="#activities/new" class="btn btn-primary">+ Tambah Kegiatan</a>
        </div>
      </div>

      <!-- FILTER & SEARCH PANEL (Feature F01) -->
      <div class="panel filter-panel" style="margin-bottom: 1.25rem;">
        <div class="filter-row" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 2; min-width: 250px;">
            <label for="inputSearchActivities" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Pencarian Kegiatan:</label>
            <input type="text" id="inputSearchActivities" class="form-control" placeholder="Cari berdasarkan judul kegiatan atau No. Agenda...">
          </div>
          <div style="flex: 1; min-width: 220px;">
            <label for="filterStageSelect" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Filter Tahap Administrasi:</label>
            <select id="filterStageSelect" class="form-control">
              <option value="ALL">Semua Tahap Administrasi</option>
              <option value="INITIAL_ENTRY">1. Input Awal (INITIAL_ENTRY)</option>
              <option value="OFFLINE_PROCESS">2. Proses Offline (OFFLINE_PROCESS)</option>
              <option value="DETAILS_COMPLETED">3. Detail Dilengkapi (DETAILS_COMPLETED)</option>
              <option value="ADMIN_COMPLETE">4. Administrasi Lengkap (ADMIN_COMPLETE)</option>
            </select>
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label for="selectActivitySort" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Urutkan:</label>
            <select id="selectActivitySort" class="form-control">
              <option value="NEWEST" ${initialSort === 'NEWEST' ? 'selected' : ''}>Terbaru ke Terlama</option>
              <option value="OLDEST" ${initialSort === 'OLDEST' ? 'selected' : ''}>Terlama ke Terbaru</option>
              <option value="TITLE_ASC" ${initialSort === 'TITLE_ASC' ? 'selected' : ''}>Nama Kegiatan: A–Z</option>
              <option value="TITLE_DESC" ${initialSort === 'TITLE_DESC' ? 'selected' : ''}>Nama Kegiatan: Z–A</option>
              <option value="STATUS" ${initialSort === 'STATUS' ? 'selected' : ''}>Status Kegiatan</option>
            </select>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="table-scroll-hint" aria-hidden="true">
          <span>👉 Geser tabel ke kanan untuk melihat semua kolom & aksi</span>
        </div>
        <div class="table-responsive">
          <table class="data-table activities-table">
            <thead>
              <tr>
                <th>Hari / Tanggal</th>
                <th>Waktu (WIB)</th>
                <th>Judul Kegiatan & No. Agenda</th>
                <th>Tahap Administrasi</th>
                <th>Status</th>
                <th>Versi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="activitiesTableBody">
              ${rowsHtml}
              ${activities.length > 0 ? `
                <tr id="emptySearchRow" style="display: none;">
                  <td colspan="7" class="text-center" style="padding: 2.5rem 1rem; background: #fafafa;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🔍</div>
                    <div style="font-weight: 600; font-size: 1rem; color: #1e293b; margin-bottom: 0.25rem;">Tidak ada kegiatan yang sesuai dengan pencarian atau filter.</div>
                    <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 1rem;">Coba ubah kata kunci atau atur ulang filter.</div>
                    <button type="button" id="btnResetActivityFilter" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                      <span>🔄</span> Atur Ulang Filter
                    </button>
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
