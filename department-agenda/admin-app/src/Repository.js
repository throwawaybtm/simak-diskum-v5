/**
 * admin-app/src/Repository.js / Repository.gs
 * Data access layer for Google Sheets.
 * Provides atomic operations, UUID lookups, batch reads, and audit logging.
 */

let SchemaModule;
if (typeof require !== 'undefined') {
  try {
    SchemaModule = require('../../shared/Schema.js');
  } catch (e) {
    SchemaModule = globalThis.Schema;
  }
} else {
  SchemaModule = globalThis.Schema;
}

const Repository = {
  getSpreadsheet() {
    let sheetId = null;
    if (typeof PropertiesService !== 'undefined') {
      try {
        sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      } catch (e) {
        // fallback to active spreadsheet
      }
    }
    if (sheetId && typeof SpreadsheetApp !== 'undefined') {
      return SpreadsheetApp.openById(sheetId);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  getSheet(tableName) {
    const ss = Repository.getSpreadsheet();
    let sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      // Initialize headers if schema exists
      const tableDef = SchemaModule?.TABLES ? SchemaModule.TABLES[tableName] : null;
      if (tableDef && tableDef.columns) {
        sheet.appendRow(tableDef.columns);
      }
    }
    return sheet;
  },

  readAll(tableName) {
    const sheet = Repository.getSheet(tableName);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    if (!values || values.length <= 1) {
      return [];
    }

    const headers = values[0];
    const results = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      // Check if row has at least one non-empty value
      const hasData = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
      if (!hasData) continue;

      const obj = { _rowNumber: r + 1 };
      headers.forEach((h, c) => {
        obj[h] = row[c];
      });
      results.push(obj);
    }
    return results;
  },

  readById(tableName, idKey, idVal) {
    const all = Repository.readAll(tableName);
    return all.find(item => String(item[idKey]) === String(idVal)) || null;
  },

  insertRow(tableName, rowObj) {
    const sheet = Repository.getSheet(tableName);
    const tableDef = SchemaModule?.TABLES ? SchemaModule.TABLES[tableName] : null;
    const columns = tableDef?.columns || Object.keys(rowObj);

    const rowArray = columns.map(col => {
      const val = rowObj[col];
      return val !== undefined && val !== null ? val : '';
    });

    sheet.appendRow(rowArray);
    return rowObj;
  },

  updateRow(tableName, idKey, idVal, updateFields) {
    const existing = Repository.readById(tableName, idKey, idVal);
    if (!existing) {
      throw new Error(`Record with ${idKey}=${idVal} not found in ${tableName}`);
    }

    const sheet = Repository.getSheet(tableName);
    const tableDef = SchemaModule?.TABLES ? SchemaModule.TABLES[tableName] : null;
    const columns = tableDef?.columns || sheet.getDataRange().getValues()[0];

    const merged = Object.assign({}, existing, updateFields);
    const rowArray = columns.map(col => {
      const val = merged[col];
      return val !== undefined && val !== null ? val : '';
    });

    sheet.getRange(existing._rowNumber, 1, 1, columns.length).setValues([rowArray]);
    return merged;
  },

  deleteRowsMatching(tableName, matchKey, matchVal) {
    const all = Repository.readAll(tableName);
    const sheet = Repository.getSheet(tableName);
    // Delete in reverse to preserve row indexes
    for (let i = all.length - 1; i >= 0; i--) {
      if (String(all[i][matchKey]) === String(matchVal)) {
        sheet.deleteRow(all[i]._rowNumber);
      }
    }
  },

  appendAudit(log) {
    const auditDef = SchemaModule?.TABLES?.AuditLogs?.columns || [
      'log_id', 'request_id', 'timestamp', 'actor_label', 'action',
      'entity_id', 'before_json', 'after_json'
    ];

    const uuid = typeof Utilities !== 'undefined' ? Utilities.getUuid() : ('audit-' + Date.now());
    let afterObj = log.after;
    if (typeof afterObj === 'string') {
      try { afterObj = JSON.parse(afterObj); } catch (e) { afterObj = { raw: log.after }; }
    }
    const afterWithIdentity = Object.assign({}, afterObj || {}, { identity_source: 'UNVERIFIED' });

    const auditRow = {
      log_id: uuid,
      request_id: log.request_id || '',
      timestamp: new Date().toISOString(),
      actor_label: log.actor_label || 'Operator (Staging)',
      action: log.action || 'UNKNOWN',
      entity_id: log.entity_id || '',
      before_json: log.before ? (typeof log.before === 'string' ? log.before : JSON.stringify(log.before)) : '',
      after_json: JSON.stringify(afterWithIdentity)
    };

    Repository.insertRow('AuditLogs', auditRow);
    return auditRow;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Repository;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Repository = Repository;
}
