/**
 * Administrative Settings Page Component
 * Allows authorized operators to configure official report signatories,
 * municipal agency metadata, and system preferences.
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
  const { db, onSettingsSaved } = context;

  const [{ doc, getDoc, setDoc, serverTimestamp }] = await Promise.all([
    import('firebase/firestore')
  ]);

  let currentSettings: SignatorySettings = { ...DEFAULT_SIGNATORY_SETTINGS };
  let isSaving = false;

  // 1. Fetch current settings from Firestore
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
          <h2>Pengaturan Sistem & Penandatangan Resmi</h2>
          <p class="subtitle" style="color: #64748b; margin-top: 0.25rem;">
            Konfigurasi data pejabat penandatangan laporan resmi 8 kolom, nama instansi, dan parameter dinas.
          </p>
        </div>

        <div class="panel" style="max-width: 800px;">
          <h3 style="margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;">
            Pejabat Penandatangan Laporan (Official Signatory)
          </h3>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0.85rem; margin-bottom: 1.25rem; font-size: 0.85rem; color: #1e40af;">
            ℹ️ <strong>Informasi Penandatangan:</strong> Data pejabat ini otomatis dicantumkan pada bagian akhir lembar cetak Laporan Resmi 8 Kolom (A4 Landscape) dan berkas unduhan spreadsheet Excel (.xlsx).
          </div>

          <form id="signatorySettingsForm">
            <div class="form-group">
              <label for="cfgSignatoryName">Nama Pejabat Penandatangan (beserta Gelar):</label>
              <input type="text" id="cfgSignatoryName" value="${currentSettings.name}" required placeholder="Contoh: Drs. Hendri Arifin, M.Si">
            </div>

            <div class="form-group">
              <label for="cfgSignatoryNip">NIP Pejabat Penandatangan:</label>
              <input type="text" id="cfgSignatoryNip" value="${currentSettings.nip}" required placeholder="Contoh: 19710312 199803 1 004">
            </div>

            <div class="form-group">
              <label for="cfgSignatoryPosition">Jabatan Kedinasan:</label>
              <input type="text" id="cfgSignatoryPosition" value="${currentSettings.position}" required placeholder="Contoh: Kepala Dinas / Plt. Kepala Dinas">
            </div>

            <div class="form-group">
              <label for="cfgDepartmentName">Nama Instansi / Satuan Kerja:</label>
              <input type="text" id="cfgDepartmentName" value="${currentSettings.department}" required placeholder="Contoh: Dinas Koperasi dan Usaha Mikro Kota Batam">
            </div>

            <div class="form-group">
              <label for="cfgCityName">Kota Kedudukan:</label>
              <input type="text" id="cfgCityName" value="${currentSettings.city}" required placeholder="Contoh: Batam">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
              <div style="font-size: 0.8rem; color: #64748b;">
                ${currentSettings.updatedAt ? `Terakhir diperbarui: ${currentSettings.updatedAt} oleh ${currentSettings.updatedBy || 'admin'}` : 'Menggunakan konfigurasi bawaan dinas'}
              </div>
              <div class="btn-group">
                <button type="button" class="btn btn-secondary" id="btnResetSignatoryDefault">Kembalikan Default</button>
                <button type="submit" class="btn btn-primary" id="btnSaveSignatorySettings" ${isSaving ? 'disabled' : ''}>
                  ${isSaving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents(): void {
    const form = container.querySelector<HTMLFormElement>('#signatorySettingsForm');
    const resetBtn = container.querySelector<HTMLButtonElement>('#btnResetSignatoryDefault');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Kembalikan konfigurasi penandatangan ke nilai default dinas?')) {
          currentSettings = { ...DEFAULT_SIGNATORY_SETTINGS };
          render();
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = container.querySelector<HTMLInputElement>('#cfgSignatoryName');
        const nipInput = container.querySelector<HTMLInputElement>('#cfgSignatoryNip');
        const posInput = container.querySelector<HTMLInputElement>('#cfgSignatoryPosition');
        const deptInput = container.querySelector<HTMLInputElement>('#cfgDepartmentName');
        const cityInput = container.querySelector<HTMLInputElement>('#cfgCityName');

        if (!nameInput?.value.trim() || !nipInput?.value.trim() || !posInput?.value.trim()) {
          alert('Nama pejabat, NIP, dan jabatan wajib diisi.');
          return;
        }

        isSaving = true;
        render();

        try {
          const updatedSettings: SignatorySettings = {
            name: nameInput.value.trim(),
            nip: nipInput.value.trim(),
            position: posInput.value.trim(),
            department: deptInput?.value.trim() || DEFAULT_SIGNATORY_SETTINGS.department,
            city: cityInput?.value.trim() || DEFAULT_SIGNATORY_SETTINGS.city,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin'
          };

          // Save to Firestore
          await setDoc(doc(db, 'settings', 'signatory'), updatedSettings);

          // Write audit log
          const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await setDoc(doc(db, 'auditLogs', auditId), {
            id: auditId,
            actorId: 'admin',
            timestamp: serverTimestamp(),
            action: 'UPDATE',
            collectionName: 'settings',
            documentId: 'signatory',
            actorLabel: 'admin',
            identitySource: 'UNVERIFIED',
            requestId: `req_${Date.now()}`,
            details: {
              previousSignatory: currentSettings.name,
              newSignatory: updatedSettings.name,
              newNip: updatedSettings.nip
            }
          });

          currentSettings = updatedSettings;
          alert('Pengaturan penandatangan resmi berhasil disimpan!');
          if (onSettingsSaved) {
            await onSettingsSaved();
          }
        } catch (err) {
          alert(`Gagal menyimpan pengaturan: ${err}`);
        } finally {
          isSaving = false;
          render();
        }
      });
    }
  }

  render();
}
