/**
 * Administrative Settings & System Specifications Page Component
 * Displays system operational parameters, S01-QA-R2 official 8-column export standards,
 * timezone conventions, and historical municipal department reference data.
 */

import {
  type SignatorySettings,
  DEFAULT_SIGNATORY_SETTINGS
} from '@department-agenda/shared';

export interface SettingsPageContext {
  db: any;
  onSettingsSaved?: () => Promise<void>;
}

export async function mountSettingsPage(
  container: HTMLElement,
  context: SettingsPageContext
): Promise<void> {
  const { db } = context;

  const [{ doc, getDoc }] = await Promise.all([
    import('firebase/firestore')
  ]);

  let currentSettings: SignatorySettings = { ...DEFAULT_SIGNATORY_SETTINGS };

  // Fetch current settings from Firestore for read-only informational display
  try {
    const snap = await getDoc(doc(db, 'settings', 'signatory'));
    if (snap.exists()) {
      currentSettings = { ...DEFAULT_SIGNATORY_SETTINGS, ...snap.data() } as SignatorySettings;
    }
  } catch (err) {
    console.warn('[SettingsPage] Could not load settings from Firestore, using default fallback:', err);
  }

  function render(): void {
    container.innerHTML = `
      <div class="settings-page-wrapper">
        <div class="panel-header" style="margin-bottom: 1.5rem;">
          <h2>Pengaturan Sistem & Parameter Operasional</h2>
          <p class="subtitle" style="color: #64748b; margin-top: 0.25rem;">
            Dokumentasi spesifikasi ekspor agenda resmi 8 kolom, standar waktu operasional, dan arsip data instansi SIMAK DISKUM.
          </p>
        </div>

        <!-- SPECIFICATION CARD: 8-COLUMN EXPORT STANDARD -->
        <div class="panel settings-info-panel" style="margin-bottom: 1.25rem;">
          <h3 style="margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; color: #0f172a;">
            📋 Spesifikasi Ekspor Laporan Resmi 8 Kolom (Standar S01-QA-R2)
          </h3>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 0.85rem; margin-bottom: 1rem; font-size: 0.875rem; color: #166534;">
            ✅ <strong>Standar Dokumen Operasional:</strong> Seluruh modul ekspor agenda kedinasan telah disesuaikan dengan format resmi 8 kolom Pemerintah Kota Batam.
          </div>
          <ul class="settings-spec-list" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.875rem; color: #334155;">
            <li style="display: flex; gap: 0.5rem; align-items: baseline;">
              <span style="font-weight: 700; color: #0284c7;">•</span>
              <div><strong>Struktur 8 Kolom Resmi:</strong> Terdiri dari No, Hari / Tanggal, Pukul, Kegiatan, Tempat, Penyelenggara, Dihadiri Oleh (Nama Pejabat Sahaja), dan Keterangan.</div>
            </li>
            <li style="display: flex; gap: 0.5rem; align-items: baseline;">
              <span style="font-weight: 700; color: #0284c7;">•</span>
              <div><strong>Judul Dokumen 3 Baris:</strong> Judul terpusat (Pemerintah Kota Batam, Dinas Koperasi dan Usaha Mikro, Agenda Kegiatan Kedinasan) tanpa kop surat manual.</div>
            </li>
            <li style="display: flex; gap: 0.5rem; align-items: baseline;">
              <span style="font-weight: 700; color: #0284c7;">•</span>
              <div><strong>Format Lembar Kerja Operasional:</strong> Dokumen jadwal operasional dicetak dan diunduh tanpa blok tanda tangan pejabat, tanpa NIP, dan tanpa blok persetujuan guna menjamin fleksibilitas kompilasi harian.</div>
            </li>
            <li style="display: flex; gap: 0.5rem; align-items: baseline;">
              <span style="font-weight: 700; color: #0284c7;">•</span>
              <div><strong>Integritas Lingkungan Staging:</strong> Watermark <em>"DATA SIMULASI — TIDAK UNTUK PENGGUNAAN RESMI"</em> otomatis dicantumkan pada seluruh keluaran laporan staging.</div>
            </li>
          </ul>
        </div>

        <!-- PARAMETERS CARD -->
        <div class="panel settings-info-panel" style="margin-bottom: 1.25rem;">
          <h3 style="margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; color: #0f172a;">
            ⚙️ Parameter Operasional & Zona Waktu
          </h3>
          <div class="settings-params-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; font-size: 0.875rem;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem;">
              <div style="font-weight: 600; color: #475569; margin-bottom: 0.25rem;">Zona Waktu Aplikasi</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a;">Asia/Jakarta (WIB)</div>
              <div style="color: #64748b; font-size: 0.8rem; margin-top: 0.25rem;">UTC+07:00 waktu operasional dinas</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem;">
              <div style="font-weight: 600; color: #475569; margin-bottom: 0.25rem;">Format Input Tanggal</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a;">dd/mm/yyyy</div>
              <div style="color: #64748b; font-size: 0.8rem; margin-top: 0.25rem;">Validasi ketat kalender & tahun kabisat</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem;">
              <div style="font-weight: 600; color: #475569; margin-bottom: 0.25rem;">Penyimpanan Database</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a;">YYYY-MM-DD (ISO)</div>
              <div style="color: #64748b; font-size: 0.8rem; margin-top: 0.25rem;">Format kanonikal Cloud Firestore</div>
            </div>
          </div>
        </div>

        <!-- HISTORICAL METADATA CARD (READ-ONLY) -->
        <div class="panel settings-info-panel">
          <h3 style="margin-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; color: #0f172a;">
            🏛️ Arsip Profil Instansi & Pejabat Historis
          </h3>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0.85rem; margin-bottom: 1rem; font-size: 0.85rem; color: #1e40af;">
            ℹ️ <strong>Arsip Referensi:</strong> Data di bawah tersimpan sebagai catatan referensi instansi pada Firestore dan tidak dicantumkan sebagai penandatangan pada rekap laporan operasional 8 kolom.
          </div>

          <div class="historical-metadata-table-wrap" style="overflow-x: auto;">
            <table class="data-table" style="width: 100%; font-size: 0.875rem;">
              <tbody>
                <tr>
                  <td style="font-weight: 600; width: 35%; color: #475569;">Nama Instansi / Satuan Kerja</td>
                  <td><strong>${currentSettings.department || DEFAULT_SIGNATORY_SETTINGS.department}</strong></td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #475569;">Kota Kedudukan</td>
                  <td>${currentSettings.city || DEFAULT_SIGNATORY_SETTINGS.city}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #475569;">Pejabat Historis Tercatat</td>
                  <td>${currentSettings.name || DEFAULT_SIGNATORY_SETTINGS.name}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #475569;">Jabatan Kedinasan</td>
                  <td>${currentSettings.position || DEFAULT_SIGNATORY_SETTINGS.position}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #475569;">NIP Pejabat</td>
                  <td><code>${currentSettings.nip || DEFAULT_SIGNATORY_SETTINGS.nip}</code></td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #475569;">Status Pembaruan</td>
                  <td style="color: #64748b; font-size: 0.8rem;">
                    ${currentSettings.updatedAt ? `Tercatat pada ${currentSettings.updatedAt} oleh ${currentSettings.updatedBy || 'admin'}` : 'Menggunakan konfigurasi bawaan dinas'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  render();
}
