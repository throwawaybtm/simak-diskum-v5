/**
 * Public Activity Detail Modal Component
 * Renders sanitized PublicActivityDTO with complete civic accessibility.
 */

import type { PublicActivityDTO } from '@department-agenda/shared';

export function renderActivityDetailModal(act: PublicActivityDTO): string {
  const isCancelled = act.status === 'CANCELLED';
  const isCompleted = act.status === 'COMPLETED';

  let statusBadgeClass = 'badge-scheduled';
  let statusText = 'Terjadwal';
  if (isCancelled) {
    statusBadgeClass = 'badge-cancelled';
    statusText = 'Dibatalkan';
  } else if (isCompleted) {
    statusBadgeClass = 'badge-completed';
    statusText = 'Selesai';
  }

  const attendeesHtml = act.attendeeLabels && act.attendeeLabels.length > 0
    ? `<ul class="attendee-list">
        ${act.attendeeLabels.map(att => `<li><strong>👤 ${att}</strong></li>`).join('')}
       </ul>`
    : '<p class="text-muted">Tidak ada pejabat atau staf dinas yang ditugaskan secara spesifik.</p>';

  const locationTypeIndonesian = act.locationType === 'OFFICE' ? 'Kantor Dinas'
    : (act.locationType === 'ONLINE' ? 'Daring' : 'Luar Kantor');

  const cancellationNoticeHtml = isCancelled && act.publicCancellationNotice
    ? `
      <div class="alert alert-danger cancellation-alert">
        <strong>⚠️ Pemberitahuan Pembatalan Resmi:</strong>
        <p>${act.publicCancellationNotice}</p>
      </div>
    `
    : '';

  return `
    <div class="modal-backdrop public-detail-modal" id="activityDetailModal">
      <div class="modal-card">
        <div class="modal-header ${isCancelled ? 'header-cancelled' : ''}">
          <div class="header-badges">
            <span class="badge ${statusBadgeClass}">${statusText}</span>
            <span class="badge badge-category">${act.categoryName}</span>
          </div>
          <button type="button" class="modal-close" id="btnModalClose" aria-label="Tutup">✕</button>
        </div>

        <div class="modal-body">
          <h2 class="modal-activity-title ${isCancelled ? 'text-strikethrough' : ''}">${act.title}</h2>

          ${cancellationNoticeHtml}

          <div class="detail-grid">
            <div class="detail-row">
              <span class="detail-label">📅 Tanggal & Hari:</span>
              <strong class="detail-value">${act.dateDisplay}</strong>
            </div>

            <div class="detail-row">
              <span class="detail-label">⏰ Waktu Pelaksanaan:</span>
              <strong class="detail-value">${act.timeDisplay}</strong>
            </div>

            <div class="detail-row">
              <span class="detail-label">📍 Lokasi / Tempat:</span>
              <span class="detail-value">
                <strong>${act.locationName}</strong>
                <span class="location-tag tag-${act.locationType.toLowerCase()}">(${locationTypeIndonesian})</span>
              </span>
            </div>

            <div class="detail-row">
              <span class="detail-label">🏛️ Penyelenggara:</span>
              <span class="detail-value">${act.organizerName}</span>
            </div>
          </div>

          <div class="detail-section">
            <h4 class="section-title">👥 Dihadiri Oleh (Pejabat / Staf Ditugaskan)</h4>
            ${attendeesHtml}
          </div>

          ${act.publicNotes ? `
            <div class="detail-section">
              <h4 class="section-title">📝 Catatan & Petunjuk untuk Publik</h4>
              <div class="public-notes-box">${act.publicNotes}</div>
            </div>
          ` : ''}

          <div class="modal-footer-meta">
            <small class="text-muted">Informasi resmi agenda diperbarui pada: ${new Date(act.updatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</small>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btnModalCloseAction">Tutup</button>
        </div>
      </div>
    </div>
  `;
}
