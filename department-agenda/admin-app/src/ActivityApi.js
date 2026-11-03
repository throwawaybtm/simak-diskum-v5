/**
 * admin-app/src/ActivityApi.js / ActivityApi.gs
 * Activity Management RPC Controller for Admin App.
 * Handles concurrency control via LockService, optimistic locking (expectedVersion),
 * conflict warnings with audited overrides, and audit trails.
 */

let RepositoryModule;
let ValidationModule;
let ConflictDetectorModule;

if (typeof require !== 'undefined') {
  try {
    RepositoryModule = require('./Repository.js');
    ValidationModule = require('../../shared/Validation.js');
    ConflictDetectorModule = require('../../shared/ConflictDetector.js');
  } catch (e) {
    RepositoryModule = globalThis.Repository;
    ValidationModule = globalThis.Validation;
    ConflictDetectorModule = globalThis.ConflictDetector;
  }
} else {
  RepositoryModule = globalThis.Repository;
  ValidationModule = globalThis.Validation;
  ConflictDetectorModule = globalThis.ConflictDetector;
}

const ActivityApi = {
  createActivity(input, requestId, actorLabel, acknowledgeConflict = false, overrideReason = '') {
    const lock = typeof LockService !== 'undefined' ? LockService.getScriptLock() : null;
    if (lock) lock.waitLock(10000);

    try {
      // 1. Idempotency check via requestId
      if (requestId) {
        const audits = RepositoryModule.readAll('AuditLogs');
        const existing = audits.find(a => a.request_id === requestId && a.action === 'CREATE');
        if (existing) {
          const act = RepositoryModule.readById('Activities', 'activity_id', existing.entity_id);
          if (act) {
            return { ok: true, data: { id: act.activity_id, version: act.version, status: act.status } };
          }
        }
      }

      // 2. Validation
      const valRes = ValidationModule.validateActivity(input, false);
      if (!valRes.ok) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION',
            message: valRes.errors[0]?.message || 'Validasi gagal',
            fields: valRes.errors
          }
        };
      }

      // 3. Conflict Detection
      const existingActivities = RepositoryModule.readAll('Activities');
      const existingAttendees = RepositoryModule.readAll('ActivityAttendees');
      const locations = RepositoryModule.readAll('Locations');
      const employees = RepositoryModule.readAll('Employees');

      const conflictRes = ConflictDetectorModule.findConflicts(
        input,
        existingActivities,
        existingAttendees,
        locations,
        employees
      );

      if (conflictRes.hasConflict && !acknowledgeConflict) {
        return {
          ok: false,
          error: {
            code: 'OVERLAP',
            message: 'Terdapat potensi bentrok jadwal ruangan atau pegawai.',
            conflicts: conflictRes.conflicts
          }
        };
      }

      // 4. Persistence
      const uuid = typeof Utilities !== 'undefined' ? Utilities.getUuid() : ('act-' + Date.now());
      const nowIso = new Date().toISOString();
      const actor = actorLabel || 'Operator (Staging)';

      const activityRecord = {
        activity_id: uuid,
        title: input.title.trim(),
        start_date: input.start_date,
        start_time: input.start_time || '',
        end_date: input.end_date || input.start_date,
        end_time: input.end_time || '',
        location_id: input.location_id || '',
        organizer_id: input.organizer_id || '',
        category_id: input.category_id || '',
        status: input.status || 'SCHEDULED',
        public_notes: input.public_notes || '',
        private_notes: input.private_notes || '',
        private_meeting_url: input.private_meeting_url || '',
        cancel_reason: '',
        version: 1,
        created_at: nowIso,
        created_by: actor,
        updated_at: nowIso,
        updated_by: actor
      };

      RepositoryModule.insertRow('Activities', activityRecord);

      // Insert attendees
      if (Array.isArray(input.attendees)) {
        input.attendees.forEach((att, idx) => {
          const emp = att.employee_id ? employees.find(e => e.employee_id === att.employee_id) : null;
          const attId = typeof Utilities !== 'undefined' ? Utilities.getUuid() : (`att-${uuid}-${idx + 1}`);
          const attendeeRecord = {
            attendee_id: attId,
            activity_id: uuid,
            employee_id: att.employee_id || '',
            guest_name: att.guest_name || '',
            attendee_role: att.attendee_role || (emp ? emp.position : 'Peserta'),
            name_snapshot: emp ? emp.full_name : (att.guest_name || ''),
            position_snapshot: emp ? emp.position : (att.position || ''),
            public_label: att.public_label || (emp ? `${idx + 1}. ${emp.position}` : `${idx + 1}. ${att.guest_name || 'Tamu'}`)
          };
          RepositoryModule.insertRow('ActivityAttendees', attendeeRecord);
        });
      }

      // Audit log
      const auditPayload = Object.assign({}, activityRecord);
      if (acknowledgeConflict) {
        auditPayload.conflict_acknowledged = true;
        auditPayload.override_reason = overrideReason || 'Diabaikan oleh operator';
      }

      RepositoryModule.appendAudit({
        request_id: requestId,
        actor_label: actor,
        action: 'CREATE',
        entity_id: uuid,
        before: null,
        after: auditPayload
      });

      return {
        ok: true,
        data: {
          id: uuid,
          version: 1,
          status: 'SCHEDULED'
        }
      };
    } finally {
      if (lock) lock.releaseLock();
    }
  },

  updateActivity(id, input, expectedVersion, requestId, actorLabel, acknowledgeConflict = false, overrideReason = '') {
    const lock = typeof LockService !== 'undefined' ? LockService.getScriptLock() : null;
    if (lock) lock.waitLock(10000);

    try {
      const current = RepositoryModule.readById('Activities', 'activity_id', id);
      if (!current) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Kegiatan tidak ditemukan' } };
      }

      // Optimistic concurrency check
      if (Number(current.version) !== Number(expectedVersion)) {
        return {
          ok: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: 'Data kegiatan telah diubah oleh operator lain. Silakan muat ulang halaman untuk melihat perubahan terbaru.'
          }
        };
      }

      // Validation on merged record
      const mergedToValidate = Object.assign({}, current, input, { expectedVersion });
      const valRes = ValidationModule.validateActivity(mergedToValidate, true);
      if (!valRes.ok) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION',
            message: valRes.errors[0]?.message || 'Validasi gagal',
            fields: valRes.errors
          }
        };
      }

      // Conflict detection
      const existingActivities = RepositoryModule.readAll('Activities');
      const existingAttendees = RepositoryModule.readAll('ActivityAttendees');
      const locations = RepositoryModule.readAll('Locations');
      const employees = RepositoryModule.readAll('Employees');

      const targetActivityWithId = Object.assign({}, input, { activity_id: id });
      const conflictRes = ConflictDetectorModule.findConflicts(
        targetActivityWithId,
        existingActivities,
        existingAttendees,
        locations,
        employees
      );

      if (conflictRes.hasConflict && !acknowledgeConflict) {
        return {
          ok: false,
          error: {
            code: 'OVERLAP',
            message: 'Terdapat bentrok jadwal pada perubahan ini.',
            conflicts: conflictRes.conflicts
          }
        };
      }

      const nowIso = new Date().toISOString();
      const actor = actorLabel || 'Operator (Staging)';
      const nextVersion = Number(current.version) + 1;

      const updateFields = {
        title: input.title !== undefined ? input.title.trim() : current.title,
        start_date: input.start_date !== undefined ? input.start_date : current.start_date,
        start_time: input.start_time !== undefined ? input.start_time : current.start_time,
        end_date: input.end_date !== undefined ? input.end_date : current.end_date,
        end_time: input.end_time !== undefined ? input.end_time : current.end_time,
        location_id: input.location_id !== undefined ? input.location_id : current.location_id,
        organizer_id: input.organizer_id !== undefined ? input.organizer_id : current.organizer_id,
        category_id: input.category_id !== undefined ? input.category_id : current.category_id,
        status: input.status !== undefined ? input.status : current.status,
        public_notes: input.public_notes !== undefined ? input.public_notes : current.public_notes,
        private_notes: input.private_notes !== undefined ? input.private_notes : current.private_notes,
        private_meeting_url: input.private_meeting_url !== undefined ? input.private_meeting_url : current.private_meeting_url,
        cancel_reason: input.cancel_reason !== undefined ? input.cancel_reason : current.cancel_reason,
        version: nextVersion,
        updated_at: nowIso,
        updated_by: actor
      };

      const updated = RepositoryModule.updateRow('Activities', 'activity_id', id, updateFields);

      // Replace attendees if supplied
      if (Array.isArray(input.attendees)) {
        RepositoryModule.deleteRowsMatching('ActivityAttendees', 'activity_id', id);
        input.attendees.forEach((att, idx) => {
          const emp = att.employee_id ? employees.find(e => e.employee_id === att.employee_id) : null;
          const attId = typeof Utilities !== 'undefined' ? Utilities.getUuid() : (`att-${id}-${idx + 1}`);
          const attendeeRecord = {
            attendee_id: attId,
            activity_id: id,
            employee_id: att.employee_id || '',
            guest_name: att.guest_name || '',
            attendee_role: att.attendee_role || (emp ? emp.position : 'Peserta'),
            name_snapshot: emp ? emp.full_name : (att.guest_name || ''),
            position_snapshot: emp ? emp.position : (att.position || ''),
            public_label: att.public_label || (emp ? `${idx + 1}. ${emp.position}` : `${idx + 1}. ${att.guest_name || 'Tamu'}`)
          };
          RepositoryModule.insertRow('ActivityAttendees', attendeeRecord);
        });
      }

      // Audit log
      const auditPayload = Object.assign({}, updated);
      if (acknowledgeConflict) {
        auditPayload.conflict_acknowledged = true;
        auditPayload.override_reason = overrideReason || 'Diabaikan oleh operator';
      }

      RepositoryModule.appendAudit({
        request_id: requestId,
        actor_label: actor,
        action: 'UPDATE',
        entity_id: id,
        before: current,
        after: auditPayload
      });

      return {
        ok: true,
        data: {
          id,
          version: nextVersion,
          status: updated.status
        }
      };
    } finally {
      if (lock) lock.releaseLock();
    }
  },

  cancelActivity(id, reason, expectedVersion, requestId, actorLabel) {
    return ActivityApi.updateActivity(
      id,
      {
        status: 'CANCELLED',
        cancel_reason: reason || 'Dibatalkan oleh operator'
      },
      expectedVersion,
      requestId,
      actorLabel,
      true,
      'Pembatalan kegiatan'
    );
  },

  completeActivity(id, expectedVersion, requestId, actorLabel) {
    return ActivityApi.updateActivity(
      id,
      {
        status: 'COMPLETED'
      },
      expectedVersion,
      requestId,
      actorLabel,
      true,
      'Penyelesaian kegiatan'
    );
  },

  duplicateActivity(id) {
    const current = RepositoryModule.readById('Activities', 'activity_id', id);
    if (!current) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Kegiatan tidak ditemukan' } };
    }

    const allAttendees = RepositoryModule.readAll('ActivityAttendees');
    const activityAttendees = allAttendees.filter(a => a.activity_id === id);

    // Deep clone and reset sensitive credentials & version
    const prefilled = {
      title: `${current.title} (Salinan)`,
      start_date: current.start_date,
      start_time: current.start_time,
      end_date: current.end_date,
      end_time: current.end_time,
      location_id: current.location_id,
      organizer_id: current.organizer_id,
      category_id: current.category_id,
      status: 'SCHEDULED',
      public_notes: current.public_notes,
      private_notes: '',        // reset private notes
      private_meeting_url: '',  // reset meeting url
      cancel_reason: '',
      version: 1,
      attendees: activityAttendees.map(a => ({
        employee_id: a.employee_id,
        guest_name: a.guest_name,
        attendee_role: a.attendee_role,
        public_label: a.public_label
      }))
    };

    return {
      ok: true,
      data: prefilled
    };
  },

  getAdminActivities(filters = {}) {
    const activities = RepositoryModule.readAll('Activities');
    const attendees = RepositoryModule.readAll('ActivityAttendees');
    const locations = RepositoryModule.readAll('Locations');
    const organizers = RepositoryModule.readAll('Organizers');
    const categories = RepositoryModule.readAll('Categories');

    const attendeesByAct = new Map();
    attendees.forEach(a => {
      if (!attendeesByAct.has(a.activity_id)) attendeesByAct.set(a.activity_id, []);
      attendeesByAct.get(a.activity_id).push(a);
    });

    const locMap = new Map(locations.map(l => [l.location_id, l.name]));
    const orgMap = new Map(organizers.map(o => [o.organizer_id, o.name]));
    const catMap = new Map(categories.map(c => [c.category_id, c.name]));

    const enriched = activities.map(act => {
      return Object.assign({}, act, {
        location_name: locMap.get(act.location_id) || '-',
        organizer_name: orgMap.get(act.organizer_id) || '-',
        category_name: catMap.get(act.category_id) || '-',
        attendees: attendeesByAct.get(act.activity_id) || []
      });
    });

    return {
      ok: true,
      data: enriched
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActivityApi;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ActivityApi = ActivityApi;
}
