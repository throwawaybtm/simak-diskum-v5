/**
 * Activity Edit / Create / Duplicate Workflow Controller
 * Encapsulates dynamic form binding, conflict resolution, live preview, and Firestore saving.
 */

import type { Firestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import type { Location, Organizer, Category, Employee, ActivityDocument, AdministrativeStage } from '@department-agenda/shared';
import { saveActivity, isValidGoogleDriveUrl } from '@department-agenda/shared';

import { renderActivityEditPage } from './ActivityEditPage';
import { renderConflictWarningModal } from '../components/ConflictWarningModal';
import { renderVersionConflictDialog } from '../components/VersionConflictDialog';
import { renderPublicPreviewCard } from '../components/PublicPreviewCard';
import {
  createInitialActivityFormState,
  validateActivityForm,
  generateLivePreviewDto,
  evaluateActivityConflicts,
  type ActivityFormState
} from '../components/ActivityFormController';

export interface WorkflowContext {
  db: Firestore;
  masterLocations: Location[];
  masterOrganizers: Organizer[];
  masterCategories: Category[];
  masterEmployees: Employee[];
  cachedActivities: ActivityDocument[];
  currentLookups: {
    locations: Map<string, Location>;
    organizers: Map<string, Organizer>;
    categories: Map<string, Category>;
  };
  refreshActivities: () => Promise<ActivityDocument[]>;
}

let currentFormState: ActivityFormState | null = null;
let initialLoadedStage: AdministrativeStage = 'INITIAL_ENTRY';

export async function handleEditRoute(hash: string, container: HTMLElement, context: WorkflowContext) {
  if (hash === 'activities/new') {
    currentFormState = createInitialActivityFormState();
    initialLoadedStage = 'INITIAL_ENTRY';
    renderWorkflow(container, context);
  } else if (hash.startsWith('activities/edit/')) {
    const activityId = hash.replace('activities/edit/', '');
    container.innerHTML = '<div class="loading-shell">Memuat data kegiatan...</div>';
    try {
      const snap = await getDoc(doc(context.db, 'activities', activityId));
      if (snap.exists()) {
        const docData = snap.data() as ActivityDocument;
        initialLoadedStage = docData.administrativeStage || 'INITIAL_ENTRY';
        currentFormState = {
          ...docData,
          guestAttendees: docData.guestAttendees || [],
          administrativeStage: docData.administrativeStage || 'INITIAL_ENTRY',
          invitationLetter: docData.invitationLetter || {
            agendaNumber: '',
            letterDate: '',
            letterTopic: '',
            driveUrl: '',
            documentVisibility: 'INTERNAL',
            missingDocumentReason: ''
          }
        };
        renderWorkflow(container, context);
      } else {
        container.innerHTML = '<div class="alert alert-danger">Kegiatan tidak ditemukan di database.</div>';
      }
    } catch (err) {
      container.innerHTML = `<div class="alert alert-danger">Gagal memuat data: ${err}</div>`;
    }
  } else if (hash.startsWith('activities/duplicate/')) {
    const activityId = hash.replace('activities/duplicate/', '');
    container.innerHTML = '<div class="loading-shell">Menduplikasi data kegiatan...</div>';
    try {
      const snap = await getDoc(doc(context.db, 'activities', activityId));
      if (snap.exists()) {
        const docData = snap.data() as ActivityDocument;
        initialLoadedStage = 'INITIAL_ENTRY';
        currentFormState = {
          ...docData,
          id: crypto.randomUUID(),
          version: 0,
          title: `[Duplikat] ${docData.title}`,
          conflictOverrideReason: undefined,
          stageChangeReason: undefined,
          guestAttendees: docData.guestAttendees ? [...docData.guestAttendees] : [],
          administrativeStage: docData.administrativeStage || 'INITIAL_ENTRY',
          invitationLetter: docData.invitationLetter ? { ...docData.invitationLetter } : {
            agendaNumber: '',
            letterDate: '',
            letterTopic: '',
            driveUrl: '',
            documentVisibility: 'INTERNAL',
            missingDocumentReason: ''
          }
        };
        renderWorkflow(container, context);
      } else {
        container.innerHTML = '<div class="alert alert-danger">Kegiatan asal tidak ditemukan di database.</div>';
      }
    } catch (err) {
      container.innerHTML = `<div class="alert alert-danger">Gagal menduplikasi kegiatan: ${err}</div>`;
    }
  }
}

function renderWorkflow(container: HTMLElement, context: WorkflowContext) {
  if (!currentFormState) return;

  const validation = validateActivityForm(currentFormState);
  container.innerHTML = renderActivityEditPage(
    currentFormState,
    validation,
    context.masterLocations,
    context.masterOrganizers,
    context.masterCategories,
    context.masterEmployees
  );

  bindListeners(context);
}

function syncStateFromInputs(context: WorkflowContext) {
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

  // Feature F01: Administrative Stage & Invitation Letter Sync
  const stageSelect = document.getElementById('selectAdministrativeStage') as HTMLSelectElement | null;
  const agendaInput = document.getElementById('inputAgendaNumber') as HTMLInputElement | null;
  const letterDateInput = document.getElementById('inputLetterDate') as HTMLInputElement | null;
  const letterTopicInput = document.getElementById('inputLetterTopic') as HTMLInputElement | null;
  const driveUrlInput = document.getElementById('inputDriveUrl') as HTMLInputElement | null;
  const checkMissingException = document.getElementById('checkMissingDocException') as HTMLInputElement | null;
  const missingReasonInput = document.getElementById('inputMissingDocReason') as HTMLInputElement | null;
  const stageChangeReasonInput = document.getElementById('inputStageChangeReason') as HTMLInputElement | null;

  if (stageSelect) currentFormState.administrativeStage = stageSelect.value as AdministrativeStage;

  currentFormState.invitationLetter = {
    agendaNumber: agendaInput ? agendaInput.value : (currentFormState.invitationLetter?.agendaNumber || ''),
    letterDate: letterDateInput ? letterDateInput.value : (currentFormState.invitationLetter?.letterDate || ''),
    letterTopic: letterTopicInput ? letterTopicInput.value : (currentFormState.invitationLetter?.letterTopic || ''),
    driveUrl: driveUrlInput ? driveUrlInput.value : (currentFormState.invitationLetter?.driveUrl || ''),
    documentVisibility: 'INTERNAL',
    missingDocumentReason: (checkMissingException && checkMissingException.checked && missingReasonInput) ? missingReasonInput.value : ''
  };

  if (stageChangeReasonInput) {
    currentFormState.stageChangeReason = stageChangeReasonInput.value;
  }

  // Handle stage regression alert visibility
  const regressionContainer = document.getElementById('stageRegressionContainer');
  if (regressionContainer && stageSelect) {
    const STAGE_ORDER: Record<string, number> = {
      INITIAL_ENTRY: 1,
      OFFLINE_PROCESS: 2,
      DETAILS_COMPLETED: 3,
      ADMIN_COMPLETE: 4
    };
    const currentOrder = STAGE_ORDER[currentFormState.administrativeStage] || 1;
    const initialOrder = STAGE_ORDER[initialLoadedStage] || 1;
    regressionContainer.style.display = (currentOrder < initialOrder) ? 'block' : 'none';
  }

  // Handle missing document exception reason visibility
  const missingReasonGroup = document.getElementById('missingReasonGroup');
  if (missingReasonGroup && checkMissingException) {
    missingReasonGroup.style.display = checkMissingException.checked ? 'block' : 'none';
  }

  // Dynamically update the Google Drive external link button
  const driveUrl = currentFormState.invitationLetter?.driveUrl || '';
  const driveLink = document.getElementById('linkOpenDriveFile');
  if (driveLink) {
    if (driveUrl && isValidGoogleDriveUrl(driveUrl)) {
      driveLink.setAttribute('href', driveUrl);
      driveLink.removeAttribute('disabled');
      (driveLink as HTMLElement).style.opacity = '1';
      driveLink.className = 'btn btn-secondary btn-sm drive-external-link';
    } else {
      driveLink.removeAttribute('href');
      driveLink.setAttribute('disabled', 'true');
      (driveLink as HTMLElement).style.opacity = '0.5';
    }
  }

  if (guestInput) {
    currentFormState.guestAttendees = guestInput.value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  const checkedBoxes = document.querySelectorAll<HTMLInputElement>('input[name="empAttendee"]:checked');
  currentFormState.attendeeIds = Array.from(checkedBoxes).map(cb => cb.value);

  // Dynamic cancellation fields toggle
  const cancelContainer = document.getElementById('cancellationFieldsContainer');
  if (cancelContainer && statusSelect) {
    cancelContainer.style.display = statusSelect.value === 'CANCELLED' ? 'block' : 'none';
  }

  // Dynamic Privacy & Validation scanner update in the DOM
  const validation = validateActivityForm(currentFormState);
  const privacyContainer = document.getElementById('privacyWarningContainer');
  if (privacyContainer) {
    if (validation.privacyViolations.length > 0) {
      privacyContainer.innerHTML = `
        <div class="alert alert-danger privacy-alert">
          <strong>⚠️ Pelanggaran Privasi Terdeteksi (Publikasi Diblokir):</strong>
          <ul>
            ${validation.privacyViolations.map(v => `<li>${v}</li>`).join('')}
          </ul>
          <small>Pindahkan kata sandi atau tautan rapat ke kolom Catatan Internal & Tautan Privat di bawah.</small>
        </div>
      `;
    } else {
      privacyContainer.innerHTML = '';
    }
  }

  // Dynamic Live Preview update
  const previewContainer = document.getElementById('livePreviewContainer');
  if (previewContainer) {
    const previewDto = generateLivePreviewDto(
      currentFormState,
      context.masterLocations,
      context.masterOrganizers,
      context.masterCategories,
      context.masterEmployees
    );
    previewContainer.innerHTML = renderPublicPreviewCard(previewDto);
  }
}

function bindListeners(context: WorkflowContext) {
  if (!currentFormState) return;

  const onInputHandler = () => syncStateFromInputs(context);

  const formPanel = document.querySelector('.edit-activity-page');
  if (formPanel) {
    formPanel.addEventListener('input', onInputHandler);
    formPanel.addEventListener('change', onInputHandler);
  }

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

  const saveBtn = document.getElementById('btnSaveActivity');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveWorkflowActivity(context));
  }
}

async function saveWorkflowActivity(context: WorkflowContext) {
  if (!currentFormState) return;

  // Sync latest DOM inputs first
  syncStateFromInputs(context);

  const validation = validateActivityForm(currentFormState);
  if (!validation.valid) {
    const errContainer = document.getElementById('errorMessagesContainer');
    if (errContainer && validation.errors.length > 0) {
      errContainer.innerHTML = `
        <div class="alert alert-danger error-alert">
          <strong>Harap perbaiki kesalahan berikut sebelum menyimpan:</strong>
          <ul>
            ${validation.errors.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    alert(`Formulir belum valid:\n\n${validation.errors.concat(validation.privacyViolations).join('\n')}`);
    return;
  }

  // Always fetch fresh activities from Firestore to guarantee up-to-date conflict detection
  const freshActivities = await context.refreshActivities();
  const conflicts = evaluateActivityConflicts(currentFormState, freshActivities, context.masterLocations);
  if (conflicts.length > 0 && !currentFormState.conflictOverrideReason) {
    showConflictModal(conflicts, (reason) => {
      if (currentFormState) {
        currentFormState.conflictOverrideReason = reason;
      }
      saveWorkflowActivity(context);
    });
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
      stageChangeReason: currentFormState.stageChangeReason,
      employeesMasterList: context.masterEmployees,
      isAttendeeEdited: true
    };

    const result = await saveActivity(context.db, actDoc, context.currentLookups, saveOptions);
    alert(`Kegiatan berhasil disimpan dan dipublikasikan!\nID: ${actDoc.id}\nVersi: ${result.newVersion}`);
    await context.refreshActivities();
    window.location.hash = 'activities';
  } catch (err: any) {
    if (err.message && err.message.includes('VERSION_CONFLICT')) {
      showVersionConflictDialog(currentFormState.version + 1, currentFormState.version);
    } else {
      alert(`Gagal menyimpan kegiatan: ${err.message || err}`);
    }
  }
}

function showConflictModal(conflicts: any[], onConfirm: (reason: string) => void) {
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
      cleanup();
      onConfirm(reason);
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
