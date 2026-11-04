import { SYSTEM_VERSION, TIMEZONE } from '@department-agenda/shared';

console.log(`[Admin App] Initialized v${SYSTEM_VERSION} (Timezone: ${TIMEZONE})`);

const root = document.getElementById('admin-main');
if (root) {
  root.innerHTML = `
    <div class="admin-card">
      <h3>Panel Administrasi Kegiatan</h3>
      <p>Zona waktu operasional sistem: <strong>${TIMEZONE} (WIB)</strong></p>
      <div class="alert-box">
        <strong>Pemberitahuan Status Gerbang:</strong> Otentikasi dan hak akses produksi ditangguhkan hingga Gerbang 5. Operasi penulisan saat ini diarahkan ke Firebase Emulator lokal.
      </div>
    </div>
  `;
}
