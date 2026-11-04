/**
 * Admin Application Entrypoint & Interactive Router
 * Ties together Sidebar, Activities List, Add/Edit Workflow, Conflict Warning Modal,
 * and live Firestore Emulator operations.
 */

import { SYSTEM_VERSION, TIMEZONE } from '@department-agenda/shared';
import type { Location, Organizer, Category, Employee, ActivityDocument } from '@department-agenda/shared';
import { saveActivity, deleteActivity } from '@department-agenda/shared';
import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import { renderSidebar } from './components/Sidebar';
import { renderDashboardPage } from './pages/DashboardPage';
import { renderActivitiesPage } from './pages/ActivitiesPage';
import { renderActivityEditPage } from './pages/ActivityEditPage';
import { renderConflictWarningModal } from './components/ConflictWarningModal';
import { renderVersionConflictDialog } from './components/VersionConflictDialog';
import { renderPublicPreviewCard } from './components/PublicPreviewCard';
import {
  createInitialActivityFormState,
  validateActivityForm,
  generateLivePreviewDto,
  evaluateActivityConflicts,
  type ActivityFormState
} from './components/ActivityFormController';

// In-memory master data cache for administrative session
let masterLocations: Location[] = [];
let masterOrganizers: Organizer[] = [];
let masterCategories: Category[] = [];
let masterEmployees: Employee[] = [];
let cachedActivities: ActivityDocument[] = [];

let currentFormState: ActivityFormState | null = null;
let currentLookups = {
  locations: new Map<string, Location>(),
  organizers: new Map<string, Organizer>(),
  categories: new Map<string, Category>()
};

async function loadMasterData() {
  try {
    const locSnap = await getDocs(collection(db, 'locations'));
    masterLocations = locSnap.docs.map(d => ({ id: d.id, ...d.data() } as Location));

    const orgSnap = await getDocs(collection(db, 'organizers'));
    masterOrganizers = orgSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organizer));

    const catSnap = await getDocs(collection(db, 'categories'));
    masterCategories = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));

    const empSnap = await getDocs(collection(db, 'employees'));
    masterEmployees = empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
  } catch (err) {
    console.warn('[Admin] Could not load master data from Firestore, using fallback fixtures:', err);
  }

  // Ensure default fallback data if collections are empty (e.g. freshly initialized emulator)
  if (masterLocations.length === 0) {
    masterLocations = [
      { id: 'loc_01', name: 'Ruang Rapat Kadis (Lt. 2)', type: 'OFFICE', isBookableRoom: true, active: true },
      { id: 'loc_02', name: 'Aula PLUT Batam', type: 'OFFICE', isBookableRoom: true, active: true },
      { id: 'loc_03', name: 'Zoom Cloud Meeting Dinas', type: 'ONLINE', isBookableRoom: false, active: true },
      { id: 'loc_04', name: 'Hotel Planet Holiday Batam', type: 'EXTERNAL', isBookableRoom: false, active: true }
    ];
  }

  if (masterOrganizers.length === 0) {
    masterOrganizers = [
      { id: 'org_01', name: 'Sekretariat Dinas', active: true },
      { id: 'org_02', name: 'Bidang Pemberdayaan Koperasi', active: true },
      { id: 'org_03', name: 'Bidang Pengembangan Usaha Mikro', active: true }
    ];
  }

  if (masterCategories.length === 0) {
    masterCategories = [
      { id: 'cat_01', name: 'Rapat Koordinasi', colorHex: '#0284c7', active: true },
      { id: 'cat_02', name: 'Pelatihan / Bimtek', colorHex: '#16a34a', active: true },
      { id: 'cat_03', name: 'Pameran & Ekspo', colorHex: '#ea580c', active: true }
    ];
  }

  if (masterEmployees.length === 0) {
    masterEmployees = [
      { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true },
      { id: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris Dinas', departmentId: 'dept_01', active: true },
      { id: 'emp_03', name: 'Ahmad Fauzi, SE', position: 'Kabid Koperasi', departmentId: 'dept_02', active: true },
      { id: 'emp_04', name: 'Dewi Sartika, S.Si', position: 'Kabid Pengawasan UMKM', departmentId: 'dept_03', active: true }
    ];
  }

  currentLookups = {
    locations: new Map(masterLocations.map(l => [l.id, l])),
    organizers: new Map(masterOrganizers.map(o => [o.id, o])),
    categories: new Map(masterCategories.map(c => [c.id, c]))
  };
}

async function loadActivities(): Promise<ActivityDocument[]> {
  try {
    const snap = await getDocs(collection(db, 'activities'));
    cachedActivities = snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityDocument));
    return cachedActivities;
  } catch (err) {
    console.warn('[Admin] Could not fetch activities from Firestore, using in-memory cache:', err);
    return cachedActivities;
  }
}

// Router and View Renderer
async function router() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const sidebarContainer = document.querySelector('.admin-sidebar');
  if (sidebarContainer) {
    sidebarContainer.outerHTML = renderSidebar(hash);
  }

  const contentContainer = document.getElementById('admin-main');
  if (!contentContainer) return;

  if (hash === 'dashboard') {
    const activities = await loadActivities();
    contentContainer.innerHTML = renderDashboardPage(activities);
  } else if (hash === 'activities') {
    const activities = await loadActivities();
    contentContainer.innerHTML = renderActivitiesPage(activities);
    bindActivitiesListEvents();
  } else if (hash === 'activities/new') {
    currentFormState = createInitialActivityFormState();
    renderEditWorkflow(contentContainer);
  } else if (hash.startsWith('activities/edit/')) {
    const activityId = hash.replace('activities/edit/', '');
    contentContainer.innerHTML = '<div class="loading-shell">Memuat data kegiatan...</div>';
    try {
      const snap = await getDoc(doc(db, 'activities', activityId));
      if (snap.exists()) {
        const docData = snap.data() as ActivityDocument;
        currentFormState = {
          ...docData,
          guestAttendees: docData.guestAttendees || []
        };
        renderEditWorkflow(contentContainer);
      } else {
        contentContainer.innerHTML = '<div class="alert alert-danger">Kegiatan tidak ditemukan di database.</div>';
      }
    } catch (err) {
      contentContainer.innerHTML = `<div class="alert alert-danger">Gagal memuat data: ${err}</div>`;
    }
  } else {
    contentContainer.innerHTML = `
      <div class="panel">
        <h3>Modul "${hash}"</h3>
        <p>Modul ini siap dikembangkan pada tahapan berikutnya sesuai jadwal Gate.</p>
      </div>
    `;
  }
}

function renderEditWorkflow(container: HTMLElement) {
  if (!currentFormState) return;

  const validation = validateActivityForm(currentFormState);
  container.innerHTML = renderActivityEditPage(
    currentFormState,
    validation,
    masterLocations,
    masterOrganizers,
    masterCategories,
    masterEmployees
  );

  bindFormInputListeners();
}

function bindFormInputListeners() {
  if (!currentFormState) return;

  const updateStateFromInputs = () => {
    if (!currentFormState) return;

    const titleInput = document.getElementById('inputTitle') as HTMLInputElement | null;
    const catSelect = document.getElementById('selectCategory') as HTMLSelectElement | null;
    const statusSelect = document.getElementById('selectStatus') as HTMLSelectElement | null;
    const startDateInput = document.getElementById('inputStartDate') as HTMLInputElement | null;
    const endDateInput = document.getElementById('inputEndDate') as HTMLInputElement | null;
    const startTimeInput = document.getElementById('inputStartTime') as HTMLInputElement | null;
    const endTimeInput = document.getElementById('inputEndTime') as HTMLInputElement | null;
    const openEndedCheck = document.getElementById('checkOpenEnded') as HTMLInputElement | null;
    const locSelect = document.getElementById('selectLocation') as HTMLSelectElement | null;
    const orgSelect = document.getElementById('selectOrganizer') as HTMLSelectElement | null;
    const publicNotesInput = document.getElementById('inputPublicNotes') as HTMLTextAreaElement | null;
    const privateNotesInput = document.getElementById('inputPrivateNotes') as HTMLTextAreaElement | null;
    const privateUrlInput = document.getElementById('inputPrivateMeetingUrl') as HTMLInputElement | null;
    const cancelReasonInput = document.getElementById('inputCancelReason') as HTMLInputElement | null;
    const publicNoticeInput = document.getElementById('inputPublicCancelNotice') as HTMLInputElement | null;
    const guestInput = document.getElementById('inputGuestAttendees') as HTMLInputElement | null;

    if (titleInput) currentFormState.title = titleInput.value;
    if (catSelect) currentFormState.categoryId = catSelect.value;
    if (statusSelect) currentFormState.status = statusSelect.value as any;
    if (startDateInput) currentFormState.startDate = startDateInput.value;
    if (endDateInput) currentFormState.endDate = endDateInput.value;
    if (startTimeInput) currentFormState.startTime = startTimeInput.value;
    if (endTimeInput) currentFormState.endTime = openEndedCheck?.checked ? null : (endTimeInput.value || null);
    if (openEndedCheck) currentFormState.openEnded = openEndedCheck.checked;
    if (locSelect) currentFormState.locationId = locSelect.value;
    if (orgSelect) currentFormState.organizerId = orgSelect.value;
    if (publicNotesInput) currentFormState.publicNotes = publicNotesInput.value;
    if (privateNotesInput) currentFormState.privateNotes = privateNotesInput.value;
    if (privateUrlInput) currentFormState.privateMeetingUrl = privateUrlInput.value || null;
    if (cancelReasonInput) currentFormState.cancelReason = cancelReasonInput.value;
    if (publicNoticeInput) currentFormState.publicCancellationNotice = publicNoticeInput.value;

    if (guestInput) {
      currentFormState.guestAttendees = guestInput.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // Attendees checkboxes
    const checkedBoxes = document.querySelectorAll<HTMLInputElement>('input[name="empAttendee"]:checked');
    currentFormState.attendeeIds = Array.from(checkedBoxes).map(cb => cb.value);

    // Update live preview card
    const previewContainer = document.getElementById('livePreviewContainer');
    if (previewContainer) {
      const previewDto = generateLivePreviewDto(
        currentFormState,
        masterLocations,
        masterOrganizers,
        masterCategories,
        masterEmployees
      );
      previewContainer.innerHTML = renderPublicPreviewCard(previewDto);
    }
  };

  // Bind real-time input listeners
  const formPanel = document.querySelector('.edit-activity-page');
  if (formPanel) {
    formPanel.addEventListener('input', updateStateFromInputs);
    formPanel.addEventListener('change', updateStateFromInputs);
  }

  // Open-ended toggle logic
  const openEndedCheck = document.getElementById('checkOpenEnded') as HTMLInputElement | null;
  const endTimeInput = document.getElementById('inputEndTime') as HTMLInputElement | null;
  if (openEndedCheck && endTimeInput) {
    openEndedCheck.addEventListener('change', () => {
      endTimeInput.disabled = openEndedCheck.checked;
      if (openEndedCheck.checked) {
        endTimeInput.value = '';
      }
    });
  }

  // Save button action
  const saveBtn = document.getElementById('btnSaveActivity');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSaveActivity);
  }
}

async function handleSaveActivity() {
  if (!currentFormState) return;

  const validation = validateActivityForm(currentFormState);
  if (!validation.valid) {
    alert(`Formulir belum valid:\n\n${validation.errors.concat(validation.privacyViolations).join('\n')}`);
    return;
  }

  // Check conflicts
  const conflicts = evaluateActivityConflicts(currentFormState, cachedActivities, masterLocations);
  if (conflicts.length > 0 && !currentFormState.conflictOverrideReason) {
    // Show conflict modal
    showConflictModal(conflicts);
    return;
  }

  try {
    const actDoc: ActivityDocument = {
      ...currentFormState,
      createdAt: new Date().toISOString(),
      createdBy: 'admin_session',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin_session'
    };

    const isNew = currentFormState.version === 0;
    const saveOptions = {
      expectedVersion: isNew ? undefined : currentFormState.version,
      actorLabel: 'UNVERIFIED',
      conflictOverrideReason: currentFormState.conflictOverrideReason,
      employeesMasterList: masterEmployees,
      isAttendeeEdited: true
    };

    const result = await saveActivity(db, actDoc, currentLookups, saveOptions);
    alert(`Kegiatan berhasil disimpan dan dipublikasikan!\nID: ${actDoc.id}\nVersi: ${result.newVersion}`);
    window.location.hash = 'activities';
  } catch (err: any) {
    if (err.message && err.message.includes('VERSION_CONFLICT')) {
      showVersionConflictDialog(currentFormState.version + 1, currentFormState.version);
    } else {
      alert(`Gagal menyimpan kegiatan: ${err.message || err}`);
    }
  }
}

function showConflictModal(conflicts: any[]) {
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = renderConflictWarningModal(conflicts);
  document.body.appendChild(modalContainer);

  const closeBtn = document.getElementById('conflictModalClose');
  const cancelBtn = document.getElementById('conflictCancelBtn');
  const confirmBtn = document.getElementById('conflictConfirmBtn');
  const reasonInput = document.getElementById('conflictOverrideInput') as HTMLTextAreaElement | null;

  const cleanup = () => modalContainer.remove();

  if (closeBtn) closeBtn.onclick = cleanup;
  if (cancelBtn) cancelBtn.onclick = cleanup;

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const reason = reasonInput?.value.trim();
      if (!reason) {
        alert('Harap masukkan alasan override bentrok sebelum melanjutkan!');
        return;
      }
      if (currentFormState) {
        currentFormState.conflictOverrideReason = reason;
      }
      cleanup();
      handleSaveActivity();
    };
  }
}

function showVersionConflictDialog(storedVersion: number, currentVersion: number) {
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = renderVersionConflictDialog(storedVersion, currentVersion);
  document.body.appendChild(modalContainer);

  const cleanup = () => modalContainer.remove();
  const closeBtn = document.getElementById('versionConflictClose');
  const reviewBtn = document.getElementById('versionConflictReviewBtn');
  const reloadBtn = document.getElementById('versionConflictReloadBtn');

  if (closeBtn) closeBtn.onclick = cleanup;
  if (reviewBtn) reviewBtn.onclick = cleanup;
  if (reloadBtn) {
    reloadBtn.onclick = () => {
      cleanup();
      window.location.reload();
    };
  }
}

function bindActivitiesListEvents() {
  document.querySelectorAll<HTMLButtonElement>('button[data-delete-id]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-delete-id');
      if (!id) return;
      if (confirm(`Yakin ingin menghapus kegiatan ID ${id}?`)) {
        try {
          await deleteActivity(db, id, 'UNVERIFIED');
          alert('Kegiatan berhasil dihapus.');
          router();
        } catch (err) {
          alert(`Gagal menghapus kegiatan: ${err}`);
        }
      }
    };
  });
}

// Bootstrap
window.addEventListener('DOMContentLoaded', async () => {
  console.log(`[Admin App] v${SYSTEM_VERSION} (${TIMEZONE}) loaded.`);
  await loadMasterData();
  await router();
});

window.addEventListener('hashchange', router);
