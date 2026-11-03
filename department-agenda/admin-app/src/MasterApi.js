/**
 * admin-app/src/MasterApi.js / MasterApi.gs
 * Controller for Master Data management, announcements, and audit history.
 * Enforces soft-deactivation (active = false) instead of hard-deleting historical entities.
 */

let RepositoryModule;
let ValidationModule;

if (typeof require !== 'undefined') {
  try {
    RepositoryModule = require('./Repository.js');
    ValidationModule = require('../../shared/Validation.js');
  } catch (e) {
    RepositoryModule = globalThis.Repository;
    ValidationModule = globalThis.Validation;
  }
} else {
  RepositoryModule = globalThis.Repository;
  ValidationModule = globalThis.Validation;
}

const PK_MAP = {
  Employees: 'employee_id',
  Departments: 'department_id',
  Locations: 'location_id',
  Organizers: 'organizer_id',
  Categories: 'category_id',
  Announcements: 'announcement_id',
  Settings: 'key'
};

const MasterApi = {
  getMasterData() {
    return {
      ok: true,
      data: {
        Employees: RepositoryModule.readAll('Employees'),
        Departments: RepositoryModule.readAll('Departments'),
        Locations: RepositoryModule.readAll('Locations'),
        Organizers: RepositoryModule.readAll('Organizers'),
        Categories: RepositoryModule.readAll('Categories'),
        Announcements: RepositoryModule.readAll('Announcements'),
        Settings: RepositoryModule.readAll('Settings')
      }
    };
  },

  saveMasterData(kind, input, actorLabel) {
    const valRes = ValidationModule.validateMasterData(kind, input);
    if (!valRes.ok) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: valRes.errors[0]?.message || 'Validasi gagal', fields: valRes.errors }
      };
    }

    const pk = PK_MAP[kind];
    const id = input[pk];
    const actor = actorLabel || 'Operator (Staging)';

    let saved;
    if (id) {
      // Update existing
      saved = RepositoryModule.updateRow(kind, pk, id, input);
      RepositoryModule.appendAudit({
        actor_label: actor,
        action: `UPDATE_${kind.toUpperCase()}`,
        entity_id: id,
        after: saved
      });
    } else {
      // Insert new
      const uuid = typeof Utilities !== 'undefined' ? Utilities.getUuid() : (`${kind.toLowerCase().slice(0, 3)}-${Date.now()}`);
      const newRecord = Object.assign({}, input, { [pk]: uuid, active: true });
      saved = RepositoryModule.insertRow(kind, newRecord);
      RepositoryModule.appendAudit({
        actor_label: actor,
        action: `CREATE_${kind.toUpperCase()}`,
        entity_id: uuid,
        after: saved
      });
    }

    return { ok: true, data: saved };
  },

  deactivateMasterData(kind, id, actorLabel) {
    const pk = PK_MAP[kind];
    const updated = RepositoryModule.updateRow(kind, pk, id, { active: false });
    RepositoryModule.appendAudit({
      actor_label: actorLabel || 'Operator (Staging)',
      action: `DEACTIVATE_${kind.toUpperCase()}`,
      entity_id: id,
      after: updated
    });
    return { ok: true, data: updated };
  },

  saveAnnouncement(input, actorLabel) {
    const id = input.announcement_id;
    const actor = actorLabel || 'Operator (Staging)';
    let saved;

    if (id) {
      saved = RepositoryModule.updateRow('Announcements', 'announcement_id', id, input);
      RepositoryModule.appendAudit({
        actor_label: actor,
        action: 'UPDATE_ANNOUNCEMENT',
        entity_id: id,
        after: saved
      });
    } else {
      const uuid = typeof Utilities !== 'undefined' ? Utilities.getUuid() : (`ann-${Date.now()}`);
      const record = Object.assign({}, input, {
        announcement_id: uuid,
        active: input.active !== undefined ? input.active : true,
        publish_at: input.publish_at || new Date().toISOString()
      });
      saved = RepositoryModule.insertRow('Announcements', record);
      RepositoryModule.appendAudit({
        actor_label: actor,
        action: 'CREATE_ANNOUNCEMENT',
        entity_id: uuid,
        after: saved
      });
    }

    return { ok: true, data: saved };
  },

  getAuditHistory(limit = 100) {
    const audits = RepositoryModule.readAll('AuditLogs');
    // Sort descending by timestamp
    audits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return {
      ok: true,
      data: audits.slice(0, limit)
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MasterApi;
}
if (typeof globalThis !== 'undefined') {
  globalThis.MasterApi = MasterApi;
}
