/**
 * Official Eight-Column Reports and Legacy Migration View
 * 
 * Features:
 * 1. Official 8-column layout: No | Hari / Tanggal | Pukul | Kegiatan | Tempat | Penyelenggara | Dihadiri Oleh | Keterangan
 * 2. Exactly one row per activity, including multi-day activities formatted with formatIndonesianDateSpan.
 * 3. Browser-ready genuine OpenXML XLSX export via ExcelJS with formula injection sanitization.
 * 4. High-fidelity landscape A4 print formatting with Batam government letterhead and signature block.
 * 5. October 2026 legacy spreadsheet migration engine with Zoom credential isolation and deduplication.
 */

import type { ActivityDocument, Location, Organizer, Category, Employee, SignatorySettings } from '@department-agenda/shared';
import {
  buildEightColumnReportRows,
  generateEightColumnHtmlReport,
  generateEightColumnXlsx,
  parseLegacySpreadsheetData,
  saveActivity,
  DEFAULT_SIGNATORY_SETTINGS,
  type EightColumnReportRow,
  type LegacySpreadsheetRow,
  type LegacyMigrationResult,
  formatIndonesianDateSpan
} from '@department-agenda/shared';

export interface ReportsPageContext {
  db: any;
  masterLocations: Location[];
  masterOrganizers: Organizer[];
  masterCategories: Category[];
  masterEmployees: Employee[];
  loadActivities: () => Promise<ActivityDocument[]>;
}

export async function mountReportsPage(
  container: HTMLElement,
  context: ReportsPageContext
): Promise<void> {
  const { db, masterLocations, masterOrganizers, masterCategories, masterEmployees, loadActivities } = context;

  let currentActivities = await loadActivities();
  let activeTab: 'report' | 'migration' = 'report';

  // Load configured signatory from Firestore settings (or default)
  let currentSignatory: SignatorySettings = { ...DEFAULT_SIGNATORY_SETTINGS };
  try {
    const [{ doc, getDoc }] = await Promise.all([import('firebase/firestore')]);
    const sigSnap = await getDoc(doc(db, 'settings', 'signatory'));
    if (sigSnap.exists()) {
      currentSignatory = { ...DEFAULT_SIGNATORY_SETTINGS, ...sigSnap.data() } as SignatorySettings;
    }
  } catch (err) {
    console.warn('[ReportsPage] Could not load signatory settings, using defaults:', err);
  }

  // Filters state
  let startDate = '2026-11-01';
  let endDate = '2026-11-30';
  let selectedCategory = 'ALL';
  let selectedStatus = 'ALL';

  // Migration state
  let migrationResult: LegacyMigrationResult | null = null;

  const lookups = {
    locations: new Map(masterLocations.map(l => [l.id, l])),
    organizers: new Map(masterOrganizers.map(o => [o.id, o])),
    categories: new Map(masterCategories.map(c => [c.id, c])),
    employees: new Map(masterEmployees.map(e => [e.id, e]))
  };

  const sampleLegacySpreadsheet: LegacySpreadsheetRow[] = [
    {
      tanggal: '2026-10-01',
      waktu: '07.00 - 09.00',
      namaKegiatan: 'Rapat Koordinasi Evaluasi Program Koperasi Triwulan III',
      lokasi: 'Ruang Rapat Kadis (Lantai 2)',
      penyelenggara: 'Sekretariat Dinas',
      peserta: 'Drs. Hendri Arifin, M.Si, Rini Marlina, S.Sos, Ahmad Fauzi, SE',
      catatan: 'Pakaian: PDH Hari Kamis. Membawa laporan capaian.'
    },
    {
      tanggal: '2026-10-05',
      waktu: '08.30 - 15.00',
      namaKegiatan: 'Pelatihan Kewirausahaan Produk Olahan Laut Bagi UKM Pesisir',
      lokasi: 'Aula PLUT Batam',
      penyelenggara: 'Bidang Pemberdayaan Koperasi',
      peserta: 'Dewi Sartika, S.Si',
      catatan: 'Membawa sampel produk UKM masing-masing.'
    },
    {
      tanggal: '2026-10-12',
      waktu: '13.30 - 16.00',
      namaKegiatan: 'Sosialisasi Digitalisasi Pembayaran QRIS untuk Koperasi Pasar',
      lokasi: 'Ruang Rapat Kadis (Lantai 2)',
      penyelenggara: 'Sekretariat Dinas',
      peserta: 'Ahmad Fauzi, SE',
      catatan: 'Tautan Zoom: https://zoom.us/j/9876543210?pwd=RAHASIA_KOPERASI_2026 Pakaian Batik.'
    },
    {
      tanggal: '2026-10-15',
      waktu: '08.00 - 17.00',
      namaKegiatan: 'Pameran Produk Unggulan Koperasi dan UMKM Sempena HUT Kota Batam',
      lokasi: 'Hotel Planet Holiday Batam',
      penyelenggara: 'Bidang Pemberdayaan Koperasi',
      peserta: 'Drs. Hendri Arifin, M.Si, Ahmad Fauzi, SE, Dewi Sartika, S.Si',
      catatan: 'Stand pameran dibuka untuk publik.'
    },
    {
      tanggal: '2026-10-22',
      waktu: '09.00 s.d. selesai',
      namaKegiatan: 'Konsultasi Hukum Koperasi Bermasalah bersama Tim Pengawas',
      lokasi: 'Ruang Rapat Kadis (Lantai 2)',
      penyelenggara: 'Sekretariat Dinas',
      peserta: 'Dewi Sartika, S.Si',
      catatan: 'Dokumen audit koperasi wajib dibawa.'
    }
  ];

  function getFilteredRows(): EightColumnReportRow[] {
    let rows = buildEightColumnReportRows(currentActivities, startDate, endDate, lookups);

    if (selectedCategory !== 'ALL') {
      rows = rows.filter(r => r.categoryId === selectedCategory);
    }
    if (selectedStatus === 'CANCELLED') {
      rows = rows.filter(r => r.isCancelled);
    } else if (selectedStatus === 'SCHEDULED') {
      rows = rows.filter(r => !r.isCancelled);
    }

    // Re-index sequential numbers
    return rows.map((r, idx) => ({ ...r, no: idx + 1 }));
  }

  function render(): void {
    const rows = getFilteredRows();
    const periodLabel = formatIndonesianDateSpan(startDate, endDate);

    const categorySelectOptions = masterCategories
      .map(c => `<option value="${c.id}" ${selectedCategory === c.id ? 'selected' : ''}>${c.name}</option>`)
      .join('');

    const rowsHtml = rows.length > 0
      ? rows.map(r => `
          <tr class="${r.isCancelled ? 'row-cancelled' : ''}">
            <td class="text-center font-bold">${r.no}</td>
            <td class="text-nowrap">${r.hariTanggal}</td>
            <td class="text-nowrap">${r.pukul}</td>
            <td class="font-bold">${r.kegiatan}</td>
            <td>${r.tempat}</td>
            <td>${r.penyelenggara}</td>
            <td style="white-space: pre-line;">${r.dihadiriOleh}</td>
            <td>
              ${r.isCancelled ? `<span class="badge-cancelled-tag">DIBATALKAN</span> ` : ''}
              ${r.keterangan}
            </td>
          </tr>
        `).join('')
      : `
        <tr>
          <td colspan="8" class="text-center" style="padding: 2.5rem; color: #64748b;">
            Tidak ada kegiatan yang ditemukan pada periode ${periodLabel}.
          </td>
        </tr>
      `;

    container.innerHTML = `
      <div class="reports-page-wrapper">
        <div class="page-header-actions">
          <div>
            <h2>Laporan Kedinasan & Ingesti Data</h2>
            <p class="subtitle">Laporan Resmi 8 Kolom Standar Pemko Batam & Migrasi Spreadsheet Agenda</p>
          </div>
          <div class="tabs-nav-bar">
            <button id="btnTabReport" class="tab-pill ${activeTab === 'report' ? 'active' : ''}">
              📄 Laporan Resmi 8 Kolom
            </button>
            <button id="btnTabMigration" class="tab-pill ${activeTab === 'migration' ? 'active' : ''}">
              🔄 Migrasi Spreadsheet (Okt 2026)
            </button>
          </div>
        </div>

        <!-- TAB 1: OFFICIAL 8-COLUMN REPORT -->
        <div id="sectionReport" style="${activeTab === 'report' ? '' : 'display: none;'}">
          <div class="panel filter-panel">
            <div class="filter-controls-grid">
              <div class="form-group">
                <label for="inputReportStartDate">Dari Tanggal:</label>
                <input type="date" id="inputReportStartDate" value="${startDate}">
              </div>
              <div class="form-group">
                <label for="inputReportEndDate">Sampai Tanggal:</label>
                <input type="date" id="inputReportEndDate" value="${endDate}">
              </div>
              <div class="form-group">
                <label for="selectReportCategory">Kategori:</label>
                <select id="selectReportCategory">
                  <option value="ALL">Semua Kategori</option>
                  ${categorySelectOptions}
                </select>
              </div>
              <div class="form-group">
                <label for="selectReportStatus">Status Kegiatan:</label>
                <select id="selectReportStatus">
                  <option value="ALL" ${selectedStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
                  <option value="SCHEDULED" ${selectedStatus === 'SCHEDULED' ? 'selected' : ''}>Terjadwal</option>
                  <option value="CANCELLED" ${selectedStatus === 'CANCELLED' ? 'selected' : ''}>Dibatalkan</option>
                </select>
              </div>
            </div>

            <div class="filter-actions-row">
              <div class="summary-pill">
                Periode: <strong>${periodLabel}</strong> | Total: <strong>${rows.length}</strong> kegiatan
              </div>
              <div class="btn-group">
                <button type="button" class="btn btn-secondary" id="btnRefreshReport">🔄 Muat Ulang</button>
                <button type="button" class="btn btn-secondary" id="btnPrintReport">🖨️ Cetak (A4 Landscape)</button>
                <button type="button" class="btn btn-primary" id="btnDownloadXlsx">📊 Unduh Excel (.xlsx)</button>
              </div>
            </div>
          </div>

          <!-- TABLE PREVIEW -->
          <div class="panel table-responsive-panel">
            <table class="eight-column-table" id="reportPreviewTable">
              <thead>
                <tr>
                  <th style="width: 4%;">No</th>
                  <th style="width: 16%;">Hari / Tanggal</th>
                  <th style="width: 12%;">Pukul</th>
                  <th style="width: 22%;">Kegiatan</th>
                  <th style="width: 14%;">Tempat</th>
                  <th style="width: 12%;">Penyelenggara</th>
                  <th style="width: 12%;">Dihadiri Oleh</th>
                  <th style="width: 8%;">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 2: SPREADSHEET MIGRATION -->
        <div id="sectionMigration" style="${activeTab === 'migration' ? '' : 'display: none;'}">
          <div class="panel">
            <h3>Alat Ingesti Spreadsheet Agenda Lama (Oktober 2026)</h3>
            <p style="color: #475569; margin-bottom: 1rem;">
              Fitur migrasi ini memisahkan kredensial rapat (Zoom, Google Meet, Microsoft Teams) secara otomatis ke field privat,
              memeriksa duplikasi dengan data Firestore yang telah ada, dan memetakan lokasi serta penyelenggara ke Master Data.
            </p>

            <div class="migration-input-actions">
              <button type="button" class="btn btn-secondary" id="btnLoadSampleMigration">
                📋 Muat Contoh Spreadsheet Oktober 2026 (5 Baris)
              </button>
              <button type="button" class="btn btn-primary" id="btnRunDryRun">
                🔍 Jalankan Pratinjau (Dry Run)
              </button>
            </div>

            <div class="form-group" style="margin-top: 1rem;">
              <label for="txtMigrationInput">Data Spreadsheet (Format JSON Baris):</label>
              <textarea id="txtMigrationInput" rows="7" style="width: 100%; font-family: monospace; font-size: 0.85rem; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 6px;">${JSON.stringify(sampleLegacySpreadsheet, null, 2)}</textarea>
            </div>

            ${migrationResult ? renderMigrationResults(migrationResult) : ''}
          </div>
        </div>
      </div>

      <!-- HIDDEN PRINT CONTAINER -->
      <div id="printContainer" class="print-only"></div>
    `;

    bindEvents();
  }

  function renderMigrationResults(res: LegacyMigrationResult): string {
    const summaryBadge = `
      <div class="migration-metrics-bar">
        <span class="metric-chip">Total Baris: <strong>${res.totalRows}</strong></span>
        <span class="metric-chip chip-valid">Valid: <strong>${res.validCount}</strong></span>
        <span class="metric-chip chip-dup">Duplikat Terdeteksi: <strong>${res.duplicateCount}</strong></span>
        <span class="metric-chip chip-err">Error: <strong>${res.errorCount}</strong></span>
      </div>
    `;

    const recordsHtml = res.records.map((r, i) => {
      const hasUrl = !!r.privateMeetingUrl;
      return `
        <tr class="${r.isDuplicate ? 'row-duplicate' : ''}">
          <td class="text-center">${i + 1}</td>
          <td>${r.startDate}</td>
          <td>${r.startTime} - ${r.endTime || 'selesai'}</td>
          <td class="font-bold">${r.title}</td>
          <td>${r.locationName}</td>
          <td>
            ${hasUrl ? `
              <div class="badge-private-url">
                🔒 <strong>Privat:</strong> ${r.privateMeetingUrl}
              </div>
            ` : '<span style="color: #94a3b8;">-</span>'}
          </td>
          <td>
            <div class="badge-public-notes">
              📢 <strong>Publik:</strong> ${r.publicNotes || '-'}
            </div>
          </td>
          <td>
            ${r.isDuplicate ? `<span class="badge-tag tag-dup">Duplikat (${r.duplicateOfId})</span>` : '<span class="badge-tag tag-new">Baru</span>'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="migration-preview-section">
        <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">Hasil Analisis Pratinjau Ingesti</h4>
        ${summaryBadge}

        <div class="table-responsive-panel" style="margin-top: 1rem;">
          <table class="eight-column-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Pukul</th>
                <th>Kegiatan</th>
                <th>Tempat</th>
                <th>Kredensial Privat Terisolasi</th>
                <th>Catatan Publik Bersih</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${recordsHtml}
            </tbody>
          </table>
        </div>

        <div class="migration-commit-bar" style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" class="btn btn-success" id="btnCommitMigration" ${res.validCount === 0 ? 'disabled' : ''}>
            🚀 Impor ${res.validCount} Data Valid ke Firestore Emulator
          </button>
        </div>
      </div>
    `;
  }

  function bindEvents(): void {
    // Tab switching
    const tabReportBtn = container.querySelector('#btnTabReport');
    const tabMigBtn = container.querySelector('#btnTabMigration');

    if (tabReportBtn) {
      tabReportBtn.addEventListener('click', () => {
        activeTab = 'report';
        render();
      });
    }
    if (tabMigBtn) {
      tabMigBtn.addEventListener('click', () => {
        activeTab = 'migration';
        render();
      });
    }

    // Filter inputs
    const startInput = container.querySelector<HTMLInputElement>('#inputReportStartDate');
    const endInput = container.querySelector<HTMLInputElement>('#inputReportEndDate');
    const catSelect = container.querySelector<HTMLSelectElement>('#selectReportCategory');
    const stSelect = container.querySelector<HTMLSelectElement>('#selectReportStatus');

    if (startInput) startInput.onchange = (e) => { startDate = (e.target as HTMLInputElement).value; render(); };
    if (endInput) endInput.onchange = (e) => { endDate = (e.target as HTMLInputElement).value; render(); };
    if (catSelect) catSelect.onchange = (e) => { selectedCategory = (e.target as HTMLSelectElement).value; render(); };
    if (stSelect) stSelect.onchange = (e) => { selectedStatus = (e.target as HTMLSelectElement).value; render(); };

    // Refresh button
    const refreshBtn = container.querySelector('#btnRefreshReport');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        currentActivities = await loadActivities();
        render();
      });
    }

    // Print button
    const printBtn = container.querySelector('#btnPrintReport');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const rows = getFilteredRows();
        const html = generateEightColumnHtmlReport({
          startDate,
          endDate,
          rows,
          departmentName: currentSignatory.department || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
          signatory: currentSignatory
        });

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 300);
        } else {
          // Fallback in-page
          const printContainer = container.querySelector('#printContainer');
          if (printContainer) {
            printContainer.innerHTML = html;
            window.print();
          }
        }
      });
    }

    // Export XLSX button
    const xlsxBtn = container.querySelector('#btnDownloadXlsx');
    if (xlsxBtn) {
      xlsxBtn.addEventListener('click', async () => {
        try {
          const rows = getFilteredRows();
          const periodLabel = formatIndonesianDateSpan(startDate, endDate);
          const buffer = await generateEightColumnXlsx({
            departmentName: currentSignatory.department || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
            periodLabel,
            rows,
            signatory: currentSignatory
          });

          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Laporan_Agenda_Batam_${startDate}_sd_${endDate}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          alert(`Gagal membuat file Excel: ${err}`);
        }
      });
    }

    // Migration Dry Run
    const dryRunBtn = container.querySelector('#btnRunDryRun');
    if (dryRunBtn) {
      dryRunBtn.addEventListener('click', () => {
        const txtArea = container.querySelector<HTMLTextAreaElement>('#txtMigrationInput');
        if (!txtArea) return;
        try {
          const parsed = JSON.parse(txtArea.value) as LegacySpreadsheetRow[];
          migrationResult = parseLegacySpreadsheetData(parsed, currentActivities, lookups);
          render();
        } catch (err) {
          alert(`Format data JSON tidak valid: ${err}`);
        }
      });
    }

    // Sample data loader
    const loadSampleBtn = container.querySelector('#btnLoadSampleMigration');
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        const txtArea = container.querySelector<HTMLTextAreaElement>('#txtMigrationInput');
        if (txtArea) {
          txtArea.value = JSON.stringify(sampleLegacySpreadsheet, null, 2);
          migrationResult = parseLegacySpreadsheetData(sampleLegacySpreadsheet, currentActivities, lookups);
          render();
        }
      });
    }

    // Migration Commit
    const commitBtn = container.querySelector('#btnCommitMigration');
    if (commitBtn && migrationResult) {
      commitBtn.addEventListener('click', async () => {
        if (!migrationResult) return;
        const validRecords = migrationResult.records.filter(r => r.isValid && !r.isDuplicate);
        if (validRecords.length === 0) {
          alert('Tidak ada data baru yang valid untuk diimpor.');
          return;
        }

        if (!confirm(`Impor ${validRecords.length} data kegiatan ke Firestore Emulator?`)) {
          return;
        }

        let imported = 0;
        try {
          for (const rec of validRecords) {
            const actDoc: ActivityDocument = {
              id: `legacy_${Date.now()}_${rec.sourceRowIndex}`,
              title: rec.title,
              startDate: rec.startDate,
              startTime: rec.startTime,
              endDate: rec.endDate,
              endTime: rec.endTime,
              openEnded: rec.openEnded,
              locationId: rec.locationId,
              organizerId: rec.organizerId,
              categoryId: rec.categoryId,
              attendeeIds: rec.attendeeIds,
              attendeeSnapshots: rec.attendeeNames.map((name, i) => ({
                employeeId: rec.attendeeIds[i] || `guest_${i}`,
                name,
                position: 'Pegawai Dinas',
                label: `${i + 1}. ${name}`
              })),
              guestAttendees: rec.guestAttendees,
              status: 'SCHEDULED',
              publicNotes: rec.publicNotes,
              privateNotes: rec.privateNotes,
              privateMeetingUrl: rec.privateMeetingUrl,
              version: 1,
              createdAt: new Date().toISOString(),
              createdBy: 'migration_tool',
              updatedAt: new Date().toISOString(),
              updatedBy: 'migration_tool'
            };

            await saveActivity(db, actDoc, lookups, {
              identitySource: 'UNVERIFIED',
              actorLabel: 'migration_tool'
            });
            imported++;
          }

          alert(`Berhasil mengimpor ${imported} kegiatan ke Firestore Emulator!`);
          currentActivities = await loadActivities();
          migrationResult = null;
          activeTab = 'report';
          render();
        } catch (err) {
          alert(`Gagal mengimpor kegiatan: ${err}`);
        }
      });
    }
  }

  render();
}
