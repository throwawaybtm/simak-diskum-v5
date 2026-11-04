/**
 * Administrative Master Data Management View & Controller
 * Dinas Koperasi dan Usaha Mikro Kota Batam
 * Provides searchable tables, Add/Edit modals, duplicate checks, and referential integrity guards.
 */

import type { Firestore } from 'firebase/firestore';
import type { Employee, Department, Location, Organizer, Category, LocationType } from '@department-agenda/shared';
import {
  fetchMasterRecords,
  saveMasterRecord,
  toggleMasterRecordActive,
  checkMasterReferentialUsage,
  type MasterCollectionName,
  validateMasterRecord
} from '@department-agenda/shared';

export type MasterTab = 'employees' | 'departments' | 'locations' | 'organizers' | 'categories';

export interface MasterDataContext {
  db: Firestore;
  onDataChanged?: () => Promise<void>;
}

interface MasterState {
  activeTab: MasterTab;
  searchQuery: string;
  employees: Employee[];
  departments: Department[];
  locations: Location[];
  organizers: Organizer[];
  categories: Category[];
  isLoading: boolean;
  editingRecord: Record<string, any> | null;
  isModalOpen: boolean;
}

const state: MasterState = {
  activeTab: 'employees',
  searchQuery: '',
  employees: [],
  departments: [],
  locations: [],
  organizers: [],
  categories: [],
  isLoading: false,
  editingRecord: null,
  isModalOpen: false
};

export async function mountMasterDataPage(container: HTMLElement, context: MasterDataContext) {
  state.isLoading = true;
  renderPage(container, context);

  await loadAllMasterData(context);
  state.isLoading = false;
  renderPage(container, context);
}

async function loadAllMasterData(context: MasterDataContext) {
  try {
    const [emp, dept, loc, org, cat] = await Promise.all([
      fetchMasterRecords<Employee>(context.db, 'employees'),
      fetchMasterRecords<Department>(context.db, 'departments'),
      fetchMasterRecords<Location>(context.db, 'locations'),
      fetchMasterRecords<Organizer>(context.db, 'organizers'),
      fetchMasterRecords<Category>(context.db, 'categories')
    ]);

    state.employees = emp;
    state.departments = dept;
    state.locations = loc;
    state.organizers = org;
    state.categories = cat;
  } catch (err) {
    console.error('[Master Data] Failed to load data from Firestore:', err);
  }
}

function renderPage(container: HTMLElement, context: MasterDataContext) {
  const tabTitles: Record<MasterTab, { label: string; icon: string }> = {
    employees: { label: 'Daftar Pegawai & Pejabat', icon: '👤' },
    departments: { label: 'Bidang & Bagian', icon: '🏛️' },
    locations: { label: 'Lokasi & Ruangan', icon: '📍' },
    organizers: { label: 'Penyelenggara', icon: '🏢' },
    categories: { label: 'Kategori Kegiatan', icon: '🏷️' }
  };

  const tabsHtml = (Object.keys(tabTitles) as MasterTab[]).map(tab => {
    const info = tabTitles[tab];
    const isActive = state.activeTab === tab;
    return `
      <button type="button" class="tab-btn ${isActive ? 'active' : ''}" data-tab="${tab}">
        <span>${info.icon}</span> ${info.label}
      </button>
    `;
  }).join('');

  // Table body content
  let tableHtml = '';
  if (state.isLoading) {
    tableHtml = '<div class="loading-shell">Memuat data master...</div>';
  } else {
    tableHtml = renderTableContent(context);
  }

  container.innerHTML = `
    <div class="master-data-page">
      <div class="page-header">
        <div class="header-left">
          <h2>Master Data Kedinasan</h2>
          <p class="subtitle">Kelola direktori pegawai, bidang/bagian, ruangan rapat, penyelenggara, dan kategori kegiatan</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-primary" id="btnAddMasterRecord">
            ➕ Tambah ${tabTitles[state.activeTab].label.split(' ')[0]}
          </button>
        </div>
      </div>

      <!-- TABS -->
      <div class="master-tabs-bar">
        ${tabsHtml}
      </div>

      <!-- TOOLBAR: SEARCH & STATS -->
      <div class="master-toolbar">
        <div class="search-box">
          <input type="text" id="masterSearchInput" placeholder="Cari nama, jabatan, atau rincian..." value="${state.searchQuery}">
        </div>
      </div>

      <!-- TABLE CONTAINER -->
      <div class="panel master-table-panel">
        ${tableHtml}
      </div>

      <!-- MODAL CONTAINER -->
      <div id="masterModalMount"></div>
    </div>
  `;

  attachPageListeners(container, context);
  if (state.isModalOpen) {
    renderModal(context);
  }
}

function renderTableContent(context: MasterDataContext): string {
  const query = state.searchQuery.toLowerCase().trim();

  if (state.activeTab === 'employees') {
    const deptMap = new Map(state.departments.map(d => [d.id, d.name]));
    const filtered = state.employees.filter(e =>
      !query || e.name.toLowerCase().includes(query) || e.position.toLowerCase().includes(query)
    );

    if (filtered.length === 0) return '<div class="empty-state">Tidak ada data pegawai yang ditemukan.</div>';

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Pegawai / Pejabat</th>
            <th>Jabatan</th>
            <th>Bidang / Bagian</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((emp, i) => `
            <tr class="${emp.active === false ? 'row-inactive' : ''}">
              <td>${i + 1}</td>
              <td><strong>${emp.name}</strong></td>
              <td>${emp.position}</td>
              <td>${deptMap.get(emp.departmentId) || '-'}</td>
              <td>
                <span class="badge ${emp.active !== false ? 'badge-active' : 'badge-inactive'}">
                  ${emp.active !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td>
                <button type="button" class="btn btn-sm btn-secondary btn-edit-master" data-id="${emp.id}">Edit</button>
                <button type="button" class="btn btn-sm ${emp.active !== false ? 'btn-danger' : 'btn-secondary'} btn-toggle-master" data-id="${emp.id}" data-active="${emp.active !== false}">
                  ${emp.active !== false ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (state.activeTab === 'departments') {
    const filtered = state.departments.filter(d =>
      !query || d.name.toLowerCase().includes(query)
    );

    if (filtered.length === 0) return '<div class="empty-state">Tidak ada data bidang yang ditemukan.</div>';

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Bidang / Bagian</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((d, i) => `
            <tr class="${d.active === false ? 'row-inactive' : ''}">
              <td>${i + 1}</td>
              <td><strong>${d.name}</strong></td>
              <td>
                <span class="badge ${d.active !== false ? 'badge-active' : 'badge-inactive'}">
                  ${d.active !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td>
                <button type="button" class="btn btn-sm btn-secondary btn-edit-master" data-id="${d.id}">Edit</button>
                <button type="button" class="btn btn-sm ${d.active !== false ? 'btn-danger' : 'btn-secondary'} btn-toggle-master" data-id="${d.id}" data-active="${d.active !== false}">
                  ${d.active !== false ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (state.activeTab === 'locations') {
    const filtered = state.locations.filter(l =>
      !query || l.name.toLowerCase().includes(query) || l.type.toLowerCase().includes(query)
    );

    if (filtered.length === 0) return '<div class="empty-state">Tidak ada data lokasi yang ditemukan.</div>';

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Tempat / Ruangan</th>
            <th>Tipe Lokasi</th>
            <th>Ruangan Rapat Bookable?</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((loc, i) => `
            <tr class="${loc.active === false ? 'row-inactive' : ''}">
              <td>${i + 1}</td>
              <td><strong>${loc.name}</strong></td>
              <td><span class="badge badge-category">${loc.type}</span></td>
              <td>${loc.isBookableRoom ? '✅ Ya (Pemicu Bentrok)' : '— Tidak'}</td>
              <td>
                <span class="badge ${loc.active !== false ? 'badge-active' : 'badge-inactive'}">
                  ${loc.active !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td>
                <button type="button" class="btn btn-sm btn-secondary btn-edit-master" data-id="${loc.id}">Edit</button>
                <button type="button" class="btn btn-sm ${loc.active !== false ? 'btn-danger' : 'btn-secondary'} btn-toggle-master" data-id="${loc.id}" data-active="${loc.active !== false}">
                  ${loc.active !== false ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (state.activeTab === 'organizers') {
    const filtered = state.organizers.filter(o =>
      !query || o.name.toLowerCase().includes(query)
    );

    if (filtered.length === 0) return '<div class="empty-state">Tidak ada data penyelenggara yang ditemukan.</div>';

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Penyelenggara Kedinasan</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((org, i) => `
            <tr class="${org.active === false ? 'row-inactive' : ''}">
              <td>${i + 1}</td>
              <td><strong>${org.name}</strong></td>
              <td>
                <span class="badge ${org.active !== false ? 'badge-active' : 'badge-inactive'}">
                  ${org.active !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td>
                <button type="button" class="btn btn-sm btn-secondary btn-edit-master" data-id="${org.id}">Edit</button>
                <button type="button" class="btn btn-sm ${org.active !== false ? 'btn-danger' : 'btn-secondary'} btn-toggle-master" data-id="${org.id}" data-active="${org.active !== false}">
                  ${org.active !== false ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (state.activeTab === 'categories') {
    const filtered = state.categories.filter(c =>
      !query || c.name.toLowerCase().includes(query)
    );

    if (filtered.length === 0) return '<div class="empty-state">Tidak ada data kategori yang ditemukan.</div>';

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Kategori</th>
            <th>Warna Label</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((cat, i) => `
            <tr class="${cat.active === false ? 'row-inactive' : ''}">
              <td>${i + 1}</td>
              <td><strong>${cat.name}</strong></td>
              <td>
                <span class="color-pill" style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${cat.colorHex}; margin-right:6px; vertical-align:middle;"></span>
                <code>${cat.colorHex}</code>
              </td>
              <td>
                <span class="badge ${cat.active !== false ? 'badge-active' : 'badge-inactive'}">
                  ${cat.active !== false ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td>
                <button type="button" class="btn btn-sm btn-secondary btn-edit-master" data-id="${cat.id}">Edit</button>
                <button type="button" class="btn btn-sm ${cat.active !== false ? 'btn-danger' : 'btn-secondary'} btn-toggle-master" data-id="${cat.id}" data-active="${cat.active !== false}">
                  ${cat.active !== false ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return '';
}

function attachPageListeners(container: HTMLElement, context: MasterDataContext) {
  // Tab switching
  container.querySelectorAll<HTMLButtonElement>('.master-tabs-bar .tab-btn').forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab as MasterTab;
      if (tab && tab !== state.activeTab) {
        state.activeTab = tab;
        state.searchQuery = '';
        renderPage(container, context);
      }
    };
  });

  // Search input
  const searchInput = container.querySelector<HTMLInputElement>('#masterSearchInput');
  if (searchInput) {
    searchInput.oninput = () => {
      state.searchQuery = searchInput.value;
      const tablePanel = container.querySelector('.master-table-panel');
      if (tablePanel) {
        tablePanel.innerHTML = renderTableContent(context);
        bindTableActionButtons(container, context);
      }
    };
  }

  // Add button
  const addBtn = container.querySelector<HTMLButtonElement>('#btnAddMasterRecord');
  if (addBtn) {
    addBtn.onclick = () => {
      state.editingRecord = null;
      state.isModalOpen = true;
      renderModal(context);
    };
  }

  bindTableActionButtons(container, context);
}

function bindTableActionButtons(container: HTMLElement, context: MasterDataContext) {
  // Edit buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-edit-master').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const list = getCurrentTabList();
      const item = list.find(x => x.id === id);
      if (item) {
        state.editingRecord = { ...item };
        state.isModalOpen = true;
        renderModal(context);
      }
    };
  });

  // Toggle active/inactive with referential integrity check
  container.querySelectorAll<HTMLButtonElement>('.btn-toggle-master').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const isCurrentlyActive = btn.dataset.active === 'true';
      if (!id) return;

      if (isCurrentlyActive) {
        // Deactivation safeguard: check referential usage
        btn.disabled = true;
        btn.textContent = 'Memeriksa...';
        const usage = await checkMasterReferentialUsage(context.db, state.activeTab, id);
        btn.disabled = false;

        if (usage.inUse) {
          const proceed = confirm(
            `⚠️ PERINGATAN INTEGRITAS REFERENSIAL:\n\n` +
            `Data ini sedang dirujuk oleh ${usage.count} kegiatan dinas:\n` +
            usage.referencingTitles.slice(0, 3).map(t => `- "${t}"`).join('\n') +
            (usage.count > 3 ? `\n...dan ${usage.count - 3} kegiatan lainnya.` : '') +
            `\n\nMenonaktifkan data ini tidak akan mengubah catatan kegiatan lampau, tetapi tidak dapat dipilih untuk kegiatan baru.\n\nLanjutkan penonaktifan?`
          );
          if (!proceed) {
            renderPage(container, context);
            return;
          }
        } else {
          if (!confirm('Yakin ingin menonaktifkan data ini?')) {
            renderPage(container, context);
            return;
          }
        }
      }

      try {
        await toggleMasterRecordActive(context.db, state.activeTab, id, !isCurrentlyActive, 'ADMIN_PORTAL');
        alert(`Status berhasil diubah menjadi: ${!isCurrentlyActive ? 'Aktif' : 'Nonaktif'}.`);
        await loadAllMasterData(context);
        if (context.onDataChanged) await context.onDataChanged();
        renderPage(container, context);
      } catch (err: any) {
        alert(`Gagal mengubah status: ${err.message || err}`);
      }
    };
  });
}

function getCurrentTabList(): any[] {
  if (state.activeTab === 'employees') return state.employees;
  if (state.activeTab === 'departments') return state.departments;
  if (state.activeTab === 'locations') return state.locations;
  if (state.activeTab === 'organizers') return state.organizers;
  return state.categories;
}

// --- MODAL DIALOG CONTROLLER ---

function renderModal(context: MasterDataContext) {
  const mount = document.getElementById('masterModalMount');
  if (!mount) return;

  const isEdit = Boolean(state.editingRecord && state.editingRecord.id);
  const rec = state.editingRecord || {};

  let formFieldsHtml = '';

  if (state.activeTab === 'employees') {
    const deptOptions = state.departments.map(d => `
      <option value="${d.id}" ${rec.departmentId === d.id ? 'selected' : ''}>${d.name}</option>
    `).join('');

    formFieldsHtml = `
      <div class="form-group">
        <label for="modalInputName">Nama Pegawai / Pejabat <span class="required">*</span></label>
        <input type="text" id="modalInputName" value="${rec.name || ''}" placeholder="Contoh: Drs. Hendri Arifin, M.Si" required>
      </div>
      <div class="form-group">
        <label for="modalInputPosition">Jabatan Kedinasan <span class="required">*</span></label>
        <input type="text" id="modalInputPosition" value="${rec.position || ''}" placeholder="Contoh: Kepala Dinas" required>
      </div>
      <div class="form-group">
        <label for="modalSelectDept">Bidang / Bagian <span class="required">*</span></label>
        <select id="modalSelectDept">
          <option value="">-- Pilih Bidang --</option>
          ${deptOptions}
        </select>
      </div>
    `;
  } else if (state.activeTab === 'departments') {
    formFieldsHtml = `
      <div class="form-group">
        <label for="modalInputName">Nama Bidang / Bagian <span class="required">*</span></label>
        <input type="text" id="modalInputName" value="${rec.name || ''}" placeholder="Contoh: Bidang Pemberdayaan Koperasi" required>
      </div>
    `;
  } else if (state.activeTab === 'locations') {
    formFieldsHtml = `
      <div class="form-group">
        <label for="modalInputName">Nama Tempat / Ruangan <span class="required">*</span></label>
        <input type="text" id="modalInputName" value="${rec.name || ''}" placeholder="Contoh: Ruang Rapat Kadis (Lantai 2)" required>
      </div>
      <div class="form-group">
        <label for="modalSelectType">Tipe Lokasi <span class="required">*</span></label>
        <select id="modalSelectType">
          <option value="OFFICE" ${rec.type === 'OFFICE' ? 'selected' : ''}>OFFICE (Kantor Dinas / PLUT)</option>
          <option value="EXTERNAL" ${rec.type === 'EXTERNAL' ? 'selected' : ''}>EXTERNAL (Hotel / Lapangan)</option>
          <option value="ONLINE" ${rec.type === 'ONLINE' ? 'selected' : ''}>ONLINE (Zoom / Cloud Meeting)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="checkbox-inline">
          <input type="checkbox" id="modalCheckBookable" ${rec.isBookableRoom ? 'checked' : ''}>
          <span><strong>Ruangan Rapat Internal (Bookable Room)</strong> — Pemicu sistem peringatan bentrok ruangan fisik.</span>
        </label>
      </div>
    `;
  } else if (state.activeTab === 'organizers') {
    formFieldsHtml = `
      <div class="form-group">
        <label for="modalInputName">Nama Penyelenggara <span class="required">*</span></label>
        <input type="text" id="modalInputName" value="${rec.name || ''}" placeholder="Contoh: Bidang Pengawasan UMKM" required>
      </div>
    `;
  } else if (state.activeTab === 'categories') {
    formFieldsHtml = `
      <div class="form-group">
        <label for="modalInputName">Nama Kategori <span class="required">*</span></label>
        <input type="text" id="modalInputName" value="${rec.name || ''}" placeholder="Contoh: Pelatihan / Bimtek" required>
      </div>
      <div class="form-group">
        <label for="modalInputColor">Warna Label (Hex Kode) <span class="required">*</span></label>
        <input type="color" id="modalInputColor" value="${rec.colorHex || '#0284c7'}" style="height:40px; cursor:pointer;">
      </div>
    `;
  }

  mount.innerHTML = `
    <div class="modal-backdrop master-modal-backdrop" id="masterModalBackdrop">
      <div class="modal-card master-modal-card">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Data Master' : 'Tambah Data Master Baru'}</h3>
          <button type="button" class="modal-close" id="btnMasterModalClose">✕</button>
        </div>

        <div class="modal-body">
          <div id="masterModalError" class="alert alert-danger" style="display:none;"></div>
          ${formFieldsHtml}
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="btnMasterModalCancel">Batal</button>
          <button type="button" class="btn btn-primary" id="btnMasterModalSave">Simpan Perubahan</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => {
    state.isModalOpen = false;
    state.editingRecord = null;
    mount.innerHTML = '';
  };

  const closeBtn = document.getElementById('btnMasterModalClose');
  const cancelBtn = document.getElementById('btnMasterModalCancel');
  const saveBtn = document.getElementById('btnMasterModalSave');
  const backdrop = document.getElementById('masterModalBackdrop');

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (backdrop) {
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeModal();
    };
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const errBox = document.getElementById('masterModalError');
      if (errBox) errBox.style.display = 'none';

      const nameInput = document.getElementById('modalInputName') as HTMLInputElement | null;
      const candidateName = nameInput?.value || '';

      const newRecord: Record<string, any> = {
        id: isEdit ? rec.id : `${state.activeTab.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: candidateName,
        active: isEdit ? (rec.active !== false) : true
      };

      if (state.activeTab === 'employees') {
        newRecord.position = (document.getElementById('modalInputPosition') as HTMLInputElement)?.value || '';
        newRecord.departmentId = (document.getElementById('modalSelectDept') as HTMLSelectElement)?.value || '';
      } else if (state.activeTab === 'locations') {
        newRecord.type = (document.getElementById('modalSelectType') as HTMLSelectElement)?.value || 'OFFICE';
        newRecord.isBookableRoom = (document.getElementById('modalCheckBookable') as HTMLInputElement)?.checked || false;
      } else if (state.activeTab === 'categories') {
        newRecord.colorHex = (document.getElementById('modalInputColor') as HTMLInputElement)?.value || '#0284c7';
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';

      try {
        await saveMasterRecord(context.db, state.activeTab, newRecord as any, 'ADMIN_PORTAL');
        alert('Data master berhasil disimpan!');
        closeModal();
        await loadAllMasterData(context);
        if (context.onDataChanged) await context.onDataChanged();
        const main = document.getElementById('admin-main');
        if (main) renderPage(main, context);
      } catch (err: any) {
        if (errBox) {
          errBox.textContent = err.message || 'Terjadi kesalahan saat menyimpan data.';
          errBox.style.display = 'block';
        } else {
          alert(`Gagal menyimpan: ${err.message || err}`);
        }
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan Perubahan';
      }
    };
  }
}
