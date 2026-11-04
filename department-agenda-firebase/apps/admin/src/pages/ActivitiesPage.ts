/**
 * Admin Activities List Page Component
 */

import type { ActivityDocument } from '@department-agenda/shared';
import { formatIndonesianDateSpan, formatTimeDisplay } from '@department-agenda/shared';

export function renderActivitiesPage(activities: ActivityDocument[]): string {
  const rowsHtml = activities.length > 0
    ? activities.map(act => {
        const isCancelled = act.status === 'CANCELLED';
        const dateSpan = formatIndonesianDateSpan(act.startDate, act.endDate);
        const timeStr = formatTimeDisplay(act.startTime, act.endTime, act.openEnded);

        return `
          <tr class="${isCancelled ? 'row-cancelled' : ''}">
            <td><strong>${dateSpan}</strong></td>
            <td>${timeStr}</td>
            <td>
              <div class="act-title">${act.title}</div>
              ${act.privateNotes ? '<span class="tag-private">🔒 Ada Catatan Privat</span>' : ''}
              ${act.cancelReason ? `<span class="tag-cancel">Batal: ${act.cancelReason}</span>` : ''}
            </td>
            <td><span class="status-badge status-${act.status.toLowerCase()}">${act.status}</span></td>
            <td>v${act.version}</td>
            <td class="action-cell">
              <a href="#activities/edit/${act.id}" class="btn-sm btn-edit">Edit</a>
              <button type="button" class="btn-sm btn-delete" data-delete-id="${act.id}">Hapus</button>
            </td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="6" class="text-center">Belum ada kegiatan tersimpan di database. Silakan klik "Tambah Kegiatan".</td></tr>`;

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

      <div class="panel">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Hari / Tanggal</th>
                <th>Waktu (WIB)</th>
                <th>Judul Kegiatan</th>
                <th>Status</th>
                <th>Versi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
