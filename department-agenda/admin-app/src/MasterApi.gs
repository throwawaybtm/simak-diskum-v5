/**
 * admin-app/src/MasterApi.gs
 * Master Data Controller for Google Apps Script.
 */

var MasterApi = (function() {
  var PK_MAP = {
    Employees: 'employee_id',
    Departments: 'department_id',
    Locations: 'location_id',
    Organizers: 'organizer_id',
    Categories: 'category_id',
    Announcements: 'announcement_id',
    Settings: 'key'
  };

  return {
    getMasterData: function() {
      return {
        ok: true,
        data: {
          Employees: Repository.readAll('Employees'),
          Departments: Repository.readAll('Departments'),
          Locations: Repository.readAll('Locations'),
          Organizers: Repository.readAll('Organizers'),
          Categories: Repository.readAll('Categories'),
          Announcements: Repository.readAll('Announcements'),
          Settings: Repository.readAll('Settings')
        }
      };
    },

    saveMasterData: function(kind, input, actorLabel) {
      var valRes = Validation.validateMasterData(kind, input);
      if (!valRes.ok) {
        return {
          ok: false,
          error: { code: 'VALIDATION', message: valRes.errors[0] ? valRes.errors[0].message : 'Validasi gagal', fields: valRes.errors }
        };
      }

      var pk = PK_MAP[kind];
      var id = input[pk];
      var actor = actorLabel || 'Operator (Staging)';
      var saved;

      if (id) {
        saved = Repository.updateRow(kind, pk, id, input);
        Repository.appendAudit({
          actor_label: actor,
          action: 'UPDATE_' + kind.toUpperCase(),
          entity_id: id,
          after: saved
        });
      } else {
        var uuid = Utilities.getUuid();
        var newRecord = Object.assign({}, input, { active: true });
        newRecord[pk] = uuid;
        saved = Repository.insertRow(kind, newRecord);
        Repository.appendAudit({
          actor_label: actor,
          action: 'CREATE_' + kind.toUpperCase(),
          entity_id: uuid,
          after: saved
        });
      }

      return { ok: true, data: saved };
    },

    deactivateMasterData: function(kind, id, actorLabel) {
      var pk = PK_MAP[kind];
      var updated = Repository.updateRow(kind, pk, id, { active: false });
      Repository.appendAudit({
        actor_label: actorLabel || 'Operator (Staging)',
        action: 'DEACTIVATE_' + kind.toUpperCase(),
        entity_id: id,
        after: updated
      });
      return { ok: true, data: updated };
    },

    saveAnnouncement: function(input, actorLabel) {
      var id = input.announcement_id;
      var actor = actorLabel || 'Operator (Staging)';
      var saved;

      if (id) {
        saved = Repository.updateRow('Announcements', 'announcement_id', id, input);
        Repository.appendAudit({
          actor_label: actor,
          action: 'UPDATE_ANNOUNCEMENT',
          entity_id: id,
          after: saved
        });
      } else {
        var uuid = Utilities.getUuid();
        var record = Object.assign({}, input, {
          announcement_id: uuid,
          active: input.active !== undefined ? input.active : true,
          publish_at: input.publish_at || new Date().toISOString()
        });
        saved = Repository.insertRow('Announcements', record);
        Repository.appendAudit({
          actor_label: actor,
          action: 'CREATE_ANNOUNCEMENT',
          entity_id: uuid,
          after: saved
        });
      }

      return { ok: true, data: saved };
    },

    getAuditHistory: function(limit) {
      var audits = Repository.readAll('AuditLogs');
      audits.sort(function(a, b) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      return {
        ok: true,
        data: audits.slice(0, limit || 100)
      };
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MasterApi;
}
if (typeof globalThis !== 'undefined') {
  globalThis.MasterApi = MasterApi;
}
