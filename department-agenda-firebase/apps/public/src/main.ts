import { SYSTEM_VERSION, TIMEZONE } from '@department-agenda/shared';

console.log(`[Public App] Initialized v${SYSTEM_VERSION} (Timezone: ${TIMEZONE})`);

const root = document.getElementById('main-content');
if (root) {
  root.innerHTML = `
    <div class="welcome-card">
      <h2>Selamat Datang di Portal Jadwal Kegiatan</h2>
      <p>Zona Waktu Operasional: <strong>${TIMEZONE} (WIB)</strong></p>
      <div id="status-badge" class="badge">Sistem Aktif - Versi ${SYSTEM_VERSION}</div>
    </div>
  `;
}
