/**
 * Add / Edit Activity Page Component
 * Multi-panel responsive form with real-time privacy scanner and live public preview.
 */

import type { Location, Organizer, Category, Employee } from '@department-agenda/shared';
import { isValidGoogleDriveUrl } from '@department-agenda/shared';
import type { ActivityFormState, FormValidationResult } from '../components/ActivityFormController';
import { renderPublicPreviewCard } from '../components/PublicPreviewCard';
import { generateLivePreviewDto } from '../components/ActivityFormController';

export function renderActivityEditPage(
  form: ActivityFormState,
  validation: FormValidationResult,
  locations: Location[],
  organizers: Organizer[],
  categories: Category[],
  employees: Employee[]
): string {
  const isNew = form.version === 0;
  const previewDto = generateLivePreviewDto(form, locations, organizers, categories, employees);
  const previewHtml = renderPublicPreviewCard(previewDto);

  const isDriveUrlValid = form.invitationLetter?.driveUrl ? isValidGoogleDriveUrl(form.invitationLetter.driveUrl) : false;
  const driveLinkHtml = isDriveUrlValid
    ? `<a href="${form.invitationLetter!.driveUrl}" id="linkOpenDriveFile" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm drive-external-link">📄 Buka Berkas di Google Drive ↗</a>`
    : `<button type="button" id="linkOpenDriveFile" class="btn btn-secondary btn-sm drive-external-link" disabled style="opacity: 0.5;">📄 Buka Berkas di Google Drive</button>`;

  const locOptions = locations.map(l => `
    <option value="${l.id}" ${form.locationId === l.id ? 'selected' : ''}>
      ${l.name} (${l.type}${l.isBookableRoom ? ' - Ruang Rapat Bookable' : ''})
    </option>
  `).join('');

  const orgOptions = organizers.map(o => `
    <option value="${o.id}" ${form.organizerId === o.id ? 'selected' : ''}>
      ${o.name}
    </option>
  `).join('');

  const catOptions = categories.map(c => `
    <option value="${c.id}" ${form.categoryId === c.id ? 'selected' : ''}>
      ${c.name}
    </option>
  `).join('');

  const empCheckboxes = employees.map(emp => {
    const isChecked = form.attendeeIds.includes(emp.id);
    return `
      <label class="checkbox-label">
        <input type="checkbox" name="empAttendee" value="${emp.id}" ${isChecked ? 'checked' : ''}>
        <span><strong>${emp.position}</strong> — ${emp.name}</span>
      </label>
    `;
  }).join('');

  const privacyWarningHtml = validation.privacyViolations.length > 0 ? `
    <div class="alert alert-danger privacy-alert">
      <strong>⚠️ Pelanggaran Privasi Terdeteksi (Publikasi Diblokir):</strong>
      <ul>
        ${validation.privacyViolations.map(v => `<li>${v}</li>`).join('')}
      </ul>
      <small>Pindahkan kata sandi atau tautan rapat ke kolom Catatan Internal & Tautan Privat di bawah.</small>
    </div>
  ` : '';

  const advisoryWarningsHtml = validation.warnings.length > 0 ? `
    <div class="alert alert-warning advisory-alert">
      ${validation.warnings.map(w => `<p>ℹ️ ${w}</p>`).join('')}
    </div>
  ` : '';

  const errorMessagesHtml = validation.errors.length > 0 ? `
    <div class="alert alert-danger error-alert">
      <strong>Harap perbaiki kesalahan berikut sebelum menyimpan:</strong>
      <ul>
        ${validation.errors.map(e => `<li>${e}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `
    <div class="page-container edit-activity-page">
      <div class="page-header">
        <div class="header-left">
          <h2>${isNew ? 'Tambah Jadwal Kegiatan Baru' : 'Edit Jadwal Kegiatan'}</h2>
          <span class="version-tag">ID: <code>${form.id}</code> | Versi: ${form.version}</span>
        </div>
        <div class="header-actions">
          <a href="#activities" class="btn btn-secondary">Kembali</a>
          ${!isNew ? `<a href="#activities/duplicate/${form.id}" class="btn btn-secondary btn-duplicate-header">Duplikat</a>` : ''}
          <button type="button" class="btn btn-primary" id="btnSaveActivity">Simpan & Publikasikan</button>
        </div>
      </div>

      <div id="errorMessagesContainer">${errorMessagesHtml}</div>
      <div id="privacyWarningContainer">${privacyWarningHtml}</div>
      <div id="advisoryWarningsContainer">${advisoryWarningsHtml}</div>

      <div class="form-and-preview-grid">
        <!-- FORM COLUMN -->
        <div class="form-column">
          <!-- 1. IDENTITAS & STATUS -->
          <div class="panel form-panel">
            <h3 class="panel-title">1. Identitas & Status Kegiatan</h3>
            <div class="form-group">
              <label for="inputTitle">Judul Kegiatan <span class="required">*</span></label>
              <input type="text" id="inputTitle" value="${form.title}" placeholder="Contoh: Rapat Koordinasi Evaluasi Program Koperasi Triwulan III" required>
            </div>
            <div class="form-row">
              <div class="form-group col">
                <label for="selectCategory">Kategori Kegiatan <span class="required">*</span></label>
                <select id="selectCategory">
                  <option value="">-- Pilih Kategori --</option>
                  ${catOptions}
                </select>
              </div>
              <div class="form-group col">
                <label for="selectStatus">Status Kegiatan</label>
                <select id="selectStatus">
                  <option value="SCHEDULED" ${form.status === 'SCHEDULED' ? 'selected' : ''}>Terjadwal (SCHEDULED)</option>
                  <option value="COMPLETED" ${form.status === 'COMPLETED' ? 'selected' : ''}>Selesai (COMPLETED)</option>
                  <option value="CANCELLED" ${form.status === 'CANCELLED' ? 'selected' : ''}>Dibatalkan (CANCELLED)</option>
                </select>
              </div>
            </div>

            <div class="cancellation-fields alert alert-danger" id="cancellationFieldsContainer" style="${form.status === 'CANCELLED' ? '' : 'display: none;'}">
              <div class="form-group">
                <label for="inputCancelReason"><strong>Alasan Pembatalan Internal (Wajib, hanya untuk arsip):</strong></label>
                <input type="text" id="inputCancelReason" value="${form.cancelReason || ''}" placeholder="Alasan internal pembatalan...">
              </div>
              <div class="form-group">
                <label for="inputPublicCancelNotice"><strong>Pemberitahuan Pembatalan Resmi (Publik):</strong></label>
                <input type="text" id="inputPublicCancelNotice" value="${form.publicCancellationNotice || ''}" placeholder="Pemberitahuan yang akan ditampilkan ke masyarakat...">
              </div>
            </div>

            <div class="form-group stage-selector-group" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #e2e8f0);">
              <label for="selectAdministrativeStage"><strong>Tahap Administrasi Kegiatan:</strong></label>
              <select id="selectAdministrativeStage">
                <option value="INITIAL_ENTRY" ${form.administrativeStage === 'INITIAL_ENTRY' ? 'selected' : ''}>1. Input Awal (INITIAL_ENTRY) — Rujukan awal masuk</option>
                <option value="OFFLINE_PROCESS" ${form.administrativeStage === 'OFFLINE_PROCESS' ? 'selected' : ''}>2. Proses Offline (OFFLINE_PROCESS) — Disposisi & koordinasi internal</option>
                <option value="DETAILS_COMPLETED" ${form.administrativeStage === 'DETAILS_COMPLETED' ? 'selected' : ''}>3. Detail Dilengkapi (DETAILS_COMPLETED) — Peserta & catatan siap</option>
                <option value="ADMIN_COMPLETE" ${form.administrativeStage === 'ADMIN_COMPLETE' ? 'selected' : ''}>4. Administrasi Lengkap (ADMIN_COMPLETE) — Arsip, No. Agenda & berkas tervalidasi</option>
              </select>
              <small class="hint-text">Tahapan alur administrasi internal dinas, tidak mempengaruhi status operasional acara.</small>
            </div>

            <div id="stageRegressionContainer" class="alert alert-warning stage-regression-alert" style="${form.stageChangeReason ? '' : 'display: none;'} margin-top: 1rem;">
              <label for="inputStageChangeReason"><strong>⚠️ Alasan Pemindahan ke Tahap Sebelumnya (Wajib untuk audit trail):</strong></label>
              <input type="text" id="inputStageChangeReason" value="${form.stageChangeReason || ''}" placeholder="Contoh: Koreksi penugasan pejabat dinas sesuai arahan pimpinan">
              <small>Alasan ini akan direkam ke dalam log audit resmi.</small>
            </div>
          </div>

          <!-- 2. WAKTU & JADWAL (WIB) -->
          <div class="panel form-panel">
            <h3 class="panel-title">2. Waktu & Tanggal Kegiatan (WIB - UTC+7)</h3>
            <div class="form-row">
              <div class="form-group col">
                <label for="inputStartDate">Tanggal Mulai <span class="required">*</span></label>
                <input type="date" id="inputStartDate" value="${form.startDate}" required>
              </div>
              <div class="form-group col">
                <label for="inputEndDate">Tanggal Selesai <span class="required">*</span></label>
                <input type="date" id="inputEndDate" value="${form.endDate}" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group col">
                <label for="inputStartTime">Waktu Mulai (WIB) <span class="required">*</span></label>
                <input type="time" id="inputStartTime" value="${form.startTime}" required>
              </div>
              <div class="form-group col">
                <label for="inputEndTime">Waktu Selesai (WIB)</label>
                <input type="time" id="inputEndTime" value="${form.endTime || ''}" ${form.openEnded ? 'disabled' : ''}>
              </div>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-inline">
                <input type="checkbox" id="checkOpenEnded" ${form.openEnded ? 'checked' : ''}>
                <span><strong>s.d. Selesai (Waktu Berakhir Terbuka)</strong> — Centang jika kegiatan tidak memiliki jam selesai pasti.</span>
              </label>
            </div>
          </div>

          <!-- 3. LOKASI & PENYELENGGARA -->
          <div class="panel form-panel">
            <h3 class="panel-title">3. Lokasi & Penyelenggara</h3>
            <div class="form-group">
              <label for="selectLocation">Lokasi Kegiatan <span class="required">*</span></label>
              <select id="selectLocation">
                <option value="">-- Pilih Lokasi --</option>
                ${locOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="selectOrganizer">Penyelenggara <span class="required">*</span></label>
              <select id="selectOrganizer">
                <option value="">-- Pilih Penyelenggara --</option>
                ${orgOptions}
              </select>
            </div>
          </div>

          <!-- 4. PESERTA & PEJABAT -->
          <div class="panel form-panel">
            <h3 class="panel-title">4. Peserta & Pejabat yang Ditugaskan</h3>
            <p class="field-hint">Pilih pejabat atau staf dinas yang menghadiri kegiatan (Daftar snapshot beku pada saat jadwal disimpan):</p>
            <div class="employee-checkbox-list">
              ${empCheckboxes}
            </div>
            <div class="form-group" style="margin-top: 1rem;">
              <label for="inputGuestAttendees">Tamu Undangan / Eksternal (Pisahkan dengan koma):</label>
              <input type="text" id="inputGuestAttendees" value="${form.guestAttendees.join(', ')}" placeholder="Contoh: Walikota Batam, Narasumber Kemenkop UKM">
            </div>
          </div>

          <!-- 5. CATATAN & PRIVASI -->
          <div class="panel form-panel privacy-panel">
            <h3 class="panel-title">5. Catatan & Pemisahan Data Privat</h3>
            <div class="form-group">
              <label for="inputPublicNotes"><strong>Catatan Publik (Akan tampil pada portal publik):</strong></label>
              <textarea id="inputPublicNotes" rows="3" placeholder="Contoh: Pakaian: PSL Lengkap. Harap membawa dokumen neraca.">${form.publicNotes}</textarea>
              <small class="hint-text">DILARANG mencantumkan tautan Zoom/Meet, PIN, atau kata sandi pada kolom ini.</small>
            </div>

            <div class="private-section">
              <div class="private-badge">🔒 RUANG DATA PRIVAT (TIDAK AKAN DITAYANGKAN KE PUBLIK)</div>
              <div class="form-group">
                <label for="inputPrivateNotes">Catatan Internal Rahasia:</label>
                <textarea id="inputPrivateNotes" rows="2" placeholder="Catatan internal dinas, nomor kontak personal, disposisi pimpinan...">${form.privateNotes}</textarea>
              </div>
              <div class="form-group">
                <label for="inputPrivateMeetingUrl">Tautan Rapat Daring & Kredensial Privat:</label>
                <input type="text" id="inputPrivateMeetingUrl" value="${form.privateMeetingUrl || ''}" placeholder="https://us02web.zoom.us/j/... (hanya dapat dilihat di admin)">
              </div>
            </div>
          </div>

          <!-- 6. RUJUKAN SURAT UNDANGAN & ARSIP -->
          <div class="panel form-panel invitation-letter-panel">
            <h3 class="panel-title">6. Berkas & Rujukan Surat Undangan (Arsip Internal)</h3>
            <p class="field-hint">Catat rujukan surat masuk fisik dan tautan dokumen Google Drive dinas. Data ini bersifat <strong>PRIVAT</strong> dan tidak dipublikasikan ke portal publik.</p>
            <div class="form-row">
              <div class="form-group col">
                <label for="inputAgendaNumber">No. Agenda Surat Masuk:</label>
                <input type="text" id="inputAgendaNumber" value="${form.invitationLetter?.agendaNumber || ''}" placeholder="Contoh: 045.2/DKUM/XI/2026">
                <small class="hint-text">Nomor agenda registrasi buku surat masuk dinas (bukan kolom No urut laporan).</small>
              </div>
              <div class="form-group col">
                <label for="inputLetterDate">Tanggal Surat:</label>
                <input type="date" id="inputLetterDate" value="${form.invitationLetter?.letterDate || ''}">
                <small class="hint-text">Tanggal surat fisik yang tertera pada lembar dokumen.</small>
              </div>
            </div>
            <div class="form-group">
              <label for="inputLetterTopic">Topik / Perihal Surat Masuk:</label>
              <input type="text" id="inputLetterTopic" value="${form.invitationLetter?.letterTopic || ''}" placeholder="Contoh: Undangan Rapat Koordinasi Penataan PKL Batam Center">
            </div>
            <div class="form-group">
              <label for="inputDriveUrl">Tautan Google Drive Dokumen Surat (HTTPS):</label>
              <div class="drive-url-input-wrap">
                <input type="url" id="inputDriveUrl" value="${form.invitationLetter?.driveUrl || ''}" placeholder="https://drive.google.com/file/d/... atau docs.google.com/...">
                ${driveLinkHtml}
              </div>
              <small class="hint-text">Wajib berupa tautan HTTPS resmi dari drive.google.com atau docs.google.com.</small>
            </div>
            <div class="form-group missing-exception-wrap">
              <label class="checkbox-inline">
                <input type="checkbox" id="checkMissingDocException" ${form.invitationLetter?.missingDocumentReason ? 'checked' : ''}>
                <span><strong>Pengecualian Berkas Fisik:</strong> Centang jika kegiatan berasal dari undangan lisan/verbal atau tanpa dokumen surat masuk fisik.</span>
              </label>
              <div id="missingReasonGroup" style="${form.invitationLetter?.missingDocumentReason ? '' : 'display: none;'} margin-top: 0.5rem;">
                <label for="inputMissingDocReason">Alasan Pengecualian (Wajib untuk tahap Administrasi Lengkap tanpa surat):</label>
                <input type="text" id="inputMissingDocReason" value="${form.invitationLetter?.missingDocumentReason || ''}" placeholder="Contoh: Undangan lisan langsung dari Walikota Batam">
              </div>
            </div>
          </div>
        </div>

        <!-- LIVE PREVIEW COLUMN -->
        <div class="preview-column">
          <div class="sticky-preview">
            <div class="preview-title-bar">
              <h4>👁️ Pratinjau Tampilan Publik Langsung</h4>
              <small>Memperlihatkan persis apa yang akan dilihat masyarakat</small>
            </div>
            <div id="livePreviewContainer">
              ${previewHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
