/**
 * Public Agenda & Search View Component
 * Multi-criteria filter engine (keyword, category, status, date interval) with debounced input.
 */

import type { PublicActivityDTO } from '@department-agenda/shared';
import type { PublicActivityFilterOptions } from '../components/PublicController';

export interface AgendaViewProps {
  activities: PublicActivityDTO[];
  categories: string[];
  filters: PublicActivityFilterOptions;
  totalActivitiesCount: number;
}

export function renderAgendaView(props: AgendaViewProps): string {
  const { activities, categories, filters, totalActivitiesCount } = props;

  const categoryOptions = categories.map(cat => `
    <option value="${cat}" ${filters.category === cat ? 'selected' : ''}>${cat}</option>
  `).join('');

  const statusOptions = [
    { value: 'ALL', label: 'Semua Status' },
    { value: 'SCHEDULED', label: 'Terjadwal (SCHEDULED)' },
    { value: 'COMPLETED', label: 'Selesai (COMPLETED)' },
    { value: 'CANCELLED', label: 'Dibatalkan (CANCELLED)' }
  ].map(st => `
    <option value="${st.value}" ${filters.status === st.value ? 'selected' : ''}>${st.label}</option>
  `).join('');

  const rowsHtml = activities.length > 0
    ? activities.map(act => {
        const isCancelled = act.status === 'CANCELLED';
        const statusIndonesian = isCancelled ? 'Dibatalkan' : (act.status === 'COMPLETED' ? 'Selesai' : 'Terjadwal');
        const locTypeIndonesian = act.locationType === 'OFFICE' ? 'Kantor Dinas'
          : (act.locationType === 'ONLINE' ? 'Daring' : 'Luar Kantor');

        return `
          <div class="agenda-item-card ${isCancelled ? 'card-cancelled' : ''}" data-open-detail="${act.id}">
            <div class="agenda-item-left">
              <span class="agenda-date-badge">${act.dateDisplay}</span>
              <span class="agenda-time-text">${act.timeDisplay}</span>
            </div>

            <div class="agenda-item-main">
              <div class="agenda-badges-row">
                <span class="badge badge-category">${act.categoryName}</span>
                <span class="status-pill status-${act.status.toLowerCase()}">${statusIndonesian}</span>
              </div>

              <h4 class="agenda-item-title ${isCancelled ? 'text-strikethrough' : ''}">${act.title}</h4>

              ${isCancelled && act.publicCancellationNotice ? `
                <div class="card-cancellation-notice">
                  <strong>Pemberitahuan:</strong> ${act.publicCancellationNotice}
                </div>
              ` : ''}

              <div class="agenda-meta-info">
                <span>📍 <strong>${act.locationName}</strong> (${locTypeIndonesian})</span>
                <span>🏛️ ${act.organizerName}</span>
                ${act.attendeeLabels && act.attendeeLabels.length > 0
                  ? `<span>👥 ${act.attendeeLabels.join(', ')}</span>`
                  : ''}
              </div>
            </div>

            <div class="agenda-item-right">
              <button type="button" class="btn btn-secondary btn-sm" data-open-detail="${act.id}">Rincian</button>
            </div>
          </div>
        `;
      }).join('')
    : `
      <div class="empty-state-card">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">Tidak Ditemukan Kegiatan</p>
        <p class="empty-desc">Tidak ada kegiatan yang sesuai dengan kriteria pencarian atau filter yang Anda terapkan. Silakan coba kata kunci lain atau klik tombol Reset.</p>
      </div>
    `;

  return `
    <div class="public-page agenda-view">
      <!-- SEARCH & FILTER PANEL -->
      <section class="agenda-filter-panel">
        <div class="filter-header">
          <h3>Pencarian & Filter Agenda Kedinasan</h3>
          <p class="filter-subtitle">Telusuri seluruh agenda resmi Dinas Koperasi dan Usaha Mikro Kota Batam</p>
        </div>

        <div class="filter-form-grid">
          <!-- Keyword Search -->
          <div class="form-group col-keyword">
            <label for="agendaSearchInput">Kata Kunci (Judul, Lokasi, Pejabat, dsb.):</label>
            <input type="text" id="agendaSearchInput" value="${filters.keyword || ''}" placeholder="Ketik kata pencarian...">
          </div>

          <!-- Category -->
          <div class="form-group col-category">
            <label for="selectFilterCategory">Kategori:</label>
            <select id="selectFilterCategory">
              <option value="ALL">Semua Kategori</option>
              ${categoryOptions}
            </select>
          </div>

          <!-- Status -->
          <div class="form-group col-status">
            <label for="selectFilterStatus">Status Kegiatan:</label>
            <select id="selectFilterStatus">
              ${statusOptions}
            </select>
          </div>

          <!-- Date Range: From -->
          <div class="form-group col-date">
            <label for="inputFilterStartDate">Dari Tanggal:</label>
            <input type="date" id="inputFilterStartDate" value="${filters.startDate || ''}">
          </div>

          <!-- Date Range: To -->
          <div class="form-group col-date">
            <label for="inputFilterEndDate">Sampai Tanggal:</label>
            <input type="date" id="inputFilterEndDate" value="${filters.endDate || ''}">
          </div>

          <!-- Sort Option (QA-07: Default Newest-First) -->
          <div class="form-group col-sort">
            <label for="selectSortOption">Urutkan Berdasarkan:</label>
            <select id="selectSortOption">
              <option value="NEWEST" ${(filters.sort || 'NEWEST') === 'NEWEST' ? 'selected' : ''}>Terbaru ke Terlama</option>
              <option value="OLDEST" ${filters.sort === 'OLDEST' ? 'selected' : ''}>Terlama ke Terbaru</option>
              <option value="TITLE_ASC" ${filters.sort === 'TITLE_ASC' ? 'selected' : ''}>Nama Kegiatan: A–Z</option>
              <option value="TITLE_DESC" ${filters.sort === 'TITLE_DESC' ? 'selected' : ''}>Nama Kegiatan: Z–A</option>
            </select>
          </div>
        </div>

        <div class="filter-actions-bar">
          <div class="result-count-label">
            Menampilkan <strong>${activities.length}</strong> dari <strong>${totalActivitiesCount}</strong> total kegiatan
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-secondary btn-sm" id="btnResetFilters">Reset Filter</button>
            <button type="button" class="btn btn-primary btn-sm" id="btnApplyFilters">Terapkan Filter</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btnPrintPublicAgenda">🖨️ Cetak</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btnDownloadPublicXlsx">📊 Unduh Excel</button>
          </div>
        </div>
      </section>

      <!-- RESULTS LIST -->
      <section class="agenda-results-section">
        <div class="agenda-list-wrapper">
          ${rowsHtml}
        </div>
      </section>
    </div>
  `;
}
