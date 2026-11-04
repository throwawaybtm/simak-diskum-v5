/**
 * Version Concurrency Conflict Dialog Component
 * Triggered when expectedVersion does not match stored document version
 */

export function renderVersionConflictDialog(storedVersion: number, expectedVersion: number): string {
  return `
    <div class="modal-backdrop" id="versionConflictModal">
      <div class="modal-card danger-card">
        <div class="modal-header danger-header">
          <h3>⚡ Konflik Perubahan Bersamaan (Version Conflict)</h3>
          <button class="modal-close" id="versionConflictClose">✕</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger">
            <strong>Data Telah Berubah di Server!</strong>
            <p>Kegiatan ini telah diperbarui oleh operator lain (versi server: <strong>${storedVersion}</strong>, versi formulir Anda: <strong>${expectedVersion}</strong>).</p>
          </div>
          <p>
            Untuk menghindari tertimpanya data penting, perubahan Anda belum disimpan. Silakan muat ulang data terbaru atau bandingkan perubahannya terlebih dahulu.
          </p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="versionConflictReviewBtn">Tinjau Data Formulir</button>
          <button type="button" class="btn btn-primary" id="versionConflictReloadBtn">Muat Ulang Versi Terbaru</button>
        </div>
      </div>
    </div>
  `;
}
