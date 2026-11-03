/**
 * admin-app/src/ActivityApi.gs
 * Activity Management RPC Controller for Google Apps Script.
 */

var ActivityApi = (function() {
  return {
    createActivity: function(input, requestId, actorLabel, acknowledgeConflict, overrideReason) {
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);

      try {
        if (requestId) {
          var audits = Repository.readAll('AuditLogs');
          var existing = audits.find(function(a) { return a.request_id === requestId && a.action === 'CREATE'; });
          if (existing) {
            var act = Repository.readById('Activities', 'activity_id', existing.entity_id);
            if (act) {
              return { ok: true, data: { id: act.activity_id, version: act.version, status: act.status } };
            }
          }
        }

        var valRes = Validation.validateActivity(input, false);
        if (!valRes.ok) {
          return {
            ok: false,
            error: {
              code: 'VALIDATION',
              message: valRes.errors[0] ? valRes.errors[0].message : 'Validasi gagal',
              fields: valRes.errors
            }
          };
        }

        var existingActivities = Repository.readAll('Activities');
        var existingAttendees = Repository.readAll('ActivityAttendees');
        var locations = Repository.readAll('Locations');
        var employees = Repository.readAll('Employees');

        var conflictRes = ConflictDetector.findConflicts(
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

        var uuid = Utilities.getUuid();
        var nowIso = new Date().toISOString();
        var actor = actorLabel || 'Operator (Staging)';

        var activityRecord = {
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

        Repository.insertRow('Activities', activityRecord);

        if (Array.isArray(input.attendees)) {
          input.attendees.forEach(function(att, idx) {
            var emp = att.employee_id ? employees.find(function(e) { return e.employee_id === att.employee_id; }) : null;
            var attId = Utilities.getUuid();
            var attendeeRecord = {
              attendee_id: attId,
              activity_id: uuid,
              employee_id: att.employee_id || '',
              guest_name: att.guest_name || '',
              attendee_role: att.attendee_role || (emp ? emp.position : 'Peserta'),
              name_snapshot: emp ? emp.full_name : (att.guest_name || ''),
              position_snapshot: emp ? emp.position : (att.position || ''),
              public_label: att.public_label || (emp ? ((idx + 1) + '. ' + emp.position) : ((idx + 1) + '. ' + (att.guest_name || 'Tamu')))
            };
            Repository.insertRow('ActivityAttendees', attendeeRecord);
          });
        }

        var auditPayload = Object.assign({}, activityRecord);
        if (acknowledgeConflict) {
          auditPayload.conflict_acknowledged = true;
          auditPayload.override_reason = overrideReason || 'Diabaikan oleh operator';
        }

        Repository.appendAudit({
          request_id: requestId,
          actor_label: actor,
          action: 'CREATE',
          entity_id: uuid,
          before: null,
          after: auditPayload
        });

        return {
          ok: true,
          data: { id: uuid, version: 1, status: 'SCHEDULED' }
        };
      } finally {
        lock.releaseLock();
      }
    },

    updateActivity: function(id, input, expectedVersion, requestId, actorLabel, acknowledgeConflict, overrideReason) {
      var lock = LockService.getScriptLock();
      lock.waitLock(10000);

      try {
        var current = Repository.readById('Activities', 'activity_id', id);
        if (!current) {
          return { ok: false, error: { code: 'NOT_FOUND', message: 'Kegiatan tidak ditemukan' } };
        }

        if (Number(current.version) !== Number(expectedVersion)) {
          return {
            ok: false,
            error: {
              code: 'VERSION_CONFLICT',
              message: 'Data kegiatan telah diubah oleh operator lain. Silakan muat ulang halaman.'
            }
          };
        }

        var mergedToValidate = Object.assign({}, current, input, { expectedVersion: expectedVersion });
        var valRes = Validation.validateActivity(mergedToValidate, true);
        if (!valRes.ok) {
          return {
            ok: false,
            error: {
              code: 'VALIDATION',
              message: valRes.errors[0] ? valRes.errors[0].message : 'Validasi gagal',
              fields: valRes.errors
            }
          };
        }

        var existingActivities = Repository.readAll('Activities');
        var existingAttendees = Repository.readAll('ActivityAttendees');
        var locations = Repository.readAll('Locations');
        var employees = Repository.readAll('Employees');

        var targetActivityWithId = Object.assign({}, input, { activity_id: id });
        var conflictRes = ConflictDetector.findConflicts(
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

        var nowIso = new Date().toISOString();
        var actor = actorLabel || 'Operator (Staging)';
        var nextVersion = Number(current.version) + 1;

        var updateFields = {
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

        var updated = Repository.updateRow('Activities', 'activity_id', id, updateFields);

        if (Array.isArray(input.attendees)) {
          Repository.deleteRowsMatching('ActivityAttendees', 'activity_id', id);
          input.attendees.forEach(function(att, idx) {
            var emp = att.employee_id ? employees.find(function(e) { return e.employee_id === att.employee_id; }) : null;
            var attId = Utilities.getUuid();
            var attendeeRecord = {
              attendee_id: attId,
              activity_id: id,
              employee_id: att.employee_id || '',
              guest_name: att.guest_name || '',
              attendee_role: att.attendee_role || (emp ? emp.position : 'Peserta'),
              name_snapshot: emp ? emp.full_name : (att.guest_name || ''),
              position_snapshot: emp ? emp.position : (att.position || ''),
              public_label: att.public_label || (emp ? ((idx + 1) + '. ' + emp.position) : ((idx + 1) + '. ' + (att.guest_name || 'Tamu')))
            };
            Repository.insertRow('ActivityAttendees', attendeeRecord);
          });
        }

        var auditPayload = Object.assign({}, updated);
        if (acknowledgeConflict) {
          auditPayload.conflict_acknowledged = true;
          auditPayload.override_reason = overrideReason || 'Diabaikan oleh operator';
        }

        Repository.appendAudit({
          request_id: requestId,
          actor_label: actor,
          action: 'UPDATE',
          entity_id: id,
          before: current,
          after: auditPayload
        });

        return {
          ok: true,
          data: { id: id, version: nextVersion, status: updated.status }
        };
      } finally {
        lock.releaseLock();
      }
    },

    cancelActivity: function(id, reason, expectedVersion, requestId, actorLabel) {
      return ActivityApi.updateActivity(
        id,
        { status: 'CANCELLED', cancel_reason: reason || 'Dibatalkan oleh operator' },
        expectedVersion,
        requestId,
        actorLabel,
        true,
        'Pembatalan kegiatan'
      );
    },

    completeActivity: function(id, expectedVersion, requestId, actorLabel) {
      return ActivityApi.updateActivity(
        id,
        { status: 'COMPLETED' },
        expectedVersion,
        requestId,
        actorLabel,
        true,
        'Penyelesaian kegiatan'
      );
    },

    duplicateActivity: function(id) {
      var current = Repository.readById('Activities', 'activity_id', id);
      if (!current) {
        return { ok: false, error: { code: 'NOT_FOUND', message: 'Kegiatan tidak ditemukan' } };
      }

      var allAttendees = Repository.readAll('ActivityAttendees');
      var activityAttendees = allAttendees.filter(function(a) { return a.activity_id === id; });

      var prefilled = {
        title: current.title + ' (Salinan)',
        start_date: current.start_date,
        start_time: current.start_time,
        end_date: current.end_date,
        end_time: current.end_time,
        location_id: current.location_id,
        organizer_id: current.organizer_id,
        category_id: current.category_id,
        status: 'SCHEDULED',
        public_notes: current.public_notes,
        private_notes: '',
        private_meeting_url: '',
        cancel_reason: '',
        version: 1,
        attendees: activityAttendees.map(function(a) {
          return {
            employee_id: a.employee_id,
            guest_name: a.guest_name,
            attendee_role: a.attendee_role,
            public_label: a.public_label
          };
        })
      };

      return { ok: true, data: prefilled };
    },

    getAdminActivities: function(filters) {
      var activities = Repository.readAll('Activities');
      var attendees = Repository.readAll('ActivityAttendees');
      var locations = Repository.readAll('Locations');
      var organizers = Repository.readAll('Organizers');
      var categories = Repository.readAll('Categories');

      var attendeesByAct = new Map();
      attendees.forEach(function(a) {
        if (!attendeesByAct.has(a.activity_id)) attendeesByAct.set(a.activity_id, []);
        attendeesByAct.get(a.activity_id).push(a);
      });

      var locMap = new Map(locations.map(function(l) { return [l.location_id, l.name]; }));
      var orgMap = new Map(organizers.map(function(o) { return [o.organizer_id, o.name]; }));
      var catMap = new Map(categories.map(function(c) { return [c.category_id, c.name]; }));

      var enriched = activities.map(function(act) {
        return Object.assign({}, act, {
          location_name: locMap.get(act.location_id) || '-',
          organizer_name: orgMap.get(act.organizer_id) || '-',
          category_name: catMap.get(act.category_id) || '-',
          attendees: attendeesByAct.get(act.activity_id) || []
        });
      });

      return { ok: true, data: enriched };
    }
  };
})();
