/**
 * Conflict Warning Modal Component
 * Requires documented override justification for room or attendee collisions
 */

import type { ConflictWarning } from '@department-agenda/shared';

export function renderConflictWarningModal(warnings: ConflictWarning[]): string {
  const warningItemsHtml = warnings.map(w => `
    <div class="conflict-item ${w.type}">
      <div class="conflict-item-header">
        <span class="conflict-badge">${w.type === 'VENUE_CONFLICT' ? 'BENTROK RUANGAN' : 'BENTROK PEGAWAI'}</span>
        <strong>${w.conflictingTitle}</strong>
      </div>
      <p class="conflict-message">${w.message}</p>
    </div>
  `).join('');

  return `
    <div class="modal-backdrop" id="conflictModal">
      <div class="modal-card">
        <div class="modal-header warning-header">
          <h3>⚠️ Peringatan Bentrok Jadwal (${warnings.length})</h3>
          <button class="modal-close" id="conflictModalClose">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            Sistem mendeteksi jadwal yang bertabrakan pada rentang waktu yang sama. Mohon tinjau rincian bentrok berikut:
          </p>
          <div class="conflicts-list">
            ${warningItemsHtml}
          </div>
          <div class="override-reason-box">
            <label for="conflictOverrideInput"><strong>Alasan Dokumen Override (Wajib jika tetap disimpan):</strong></label>
            <textarea id="conflictOverrideInput" rows="3" placeholder="Contoh: Telah dikonfirmasi langsung oleh Kepala Dinas bahwa kegiatan dapat digabung atau diakomodasi bersama."></textarea>
            <small class="hint-text">Alasan ini akan dicatat secara permanen pada log audit kegiatan.</small>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="conflictCancelBtn">Kembali ke Form</button>
          <button type="button" class="btn btn-warning" id="conflictConfirmBtn">Konfirmasi & Simpan Jadwal</button>
        </div>
      </div>
    </div>
  `;
}
