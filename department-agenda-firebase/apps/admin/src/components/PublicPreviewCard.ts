/**
 * Live Read-Only Public Preview Card Component
 * Renders the exact public projection anonymous users will see
 */

import type { PublicActivityDTO } from '@department-agenda/shared';

export function renderPublicPreviewCard(dto: PublicActivityDTO): string {
  const isCancelled = dto.status === 'CANCELLED';
  const locTypeIndonesian = dto.locationType === 'OFFICE' ? 'Kantor Dinas'
    : (dto.locationType === 'ONLINE' ? 'Daring' : 'Luar Kantor');

  const attendeeListHtml = dto.attendeeLabels.length > 0
    ? dto.attendeeLabels.map(label => `<li class="preview-attendee-item">${label}</li>`).join('')
    : '<li class="preview-attendee-empty"><em>Belum ada peserta yang ditugaskan</em></li>';

  return `
    <div class="public-preview-card ${isCancelled ? 'is-cancelled' : ''}">
      <div class="preview-header">
        <span class="preview-badge ${isCancelled ? 'badge-cancelled' : 'badge-status'}">
          ${isCancelled ? 'DIBATALKAN' : 'PUBLIK TERJADWAL'}
        </span>
        <span class="preview-category">${dto.categoryName || 'Kategori'}</span>
      </div>

      <h3 class="preview-title">${dto.title || 'Judul Kegiatan Belum Diisi'}</h3>

      <div class="preview-meta">
        <div class="preview-meta-row">
          <span class="meta-label">📅 Tanggal:</span>
          <span class="meta-value">${dto.dateDisplay || 'Belum diatur'}</span>
        </div>
        <div class="preview-meta-row">
          <span class="meta-label">⏰ Waktu:</span>
          <span class="meta-value">${dto.timeDisplay || 'Belum diatur'}</span>
        </div>
        <div class="preview-meta-row">
          <span class="meta-label">📍 Lokasi:</span>
          <span class="meta-value">${dto.locationName} (${locTypeIndonesian})</span>
        </div>
        <div class="preview-meta-row">
          <span class="meta-label">🏛️ Penyelenggara:</span>
          <span class="meta-value">${dto.organizerName}</span>
        </div>
      </div>

      <div class="preview-section">
        <div class="section-title">Peserta Resmi / Dihadiri Oleh:</div>
        <ul class="preview-attendees">
          ${attendeeListHtml}
        </ul>
      </div>

      ${dto.publicNotes ? `
        <div class="preview-section">
          <div class="section-title">Catatan Publik / Pakaian:</div>
          <div class="preview-notes">${dto.publicNotes}</div>
        </div>
      ` : ''}

      ${isCancelled && dto.publicCancellationNotice ? `
        <div class="preview-section cancellation-section">
          <div class="section-title">Pemberitahuan Pembatalan Resmi:</div>
          <div class="cancellation-notice">${dto.publicCancellationNotice}</div>
        </div>
      ` : ''}

      <div class="preview-footer">
        <small class="shield-notice">🛡️ Catatan rahasia & tautan rapat privat dijamin tidak muncul di tampilan publik.</small>
      </div>
    </div>
  `;
}
