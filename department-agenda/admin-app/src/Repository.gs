/**
 * admin-app/src/Repository.gs
 * Google Apps Script Data Access Layer.
 */
// Same code as Repository.js for GAS global scope
var Repository = (function() {
  return {
    getSpreadsheet: function() {
      var sheetId = null;
      if (typeof PropertiesService !== 'undefined') {
        try {
          sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        } catch (e) {}
      }
      if (sheetId && typeof SpreadsheetApp !== 'undefined') {
        return SpreadsheetApp.openById(sheetId);
      }
      var active = typeof SpreadsheetApp !== 'undefined' ? SpreadsheetApp.getActiveSpreadsheet() : null;
      if (active) return active;
      throw new Error("SPREADSHEET_ID script property is missing. Please configure SPREADSHEET_ID in Project Settings > Script Properties with the target Google Sheet ID.");
    },

    getSheet: function(tableName) {
      var ss = Repository.getSpreadsheet();
      var sheet = ss.getSheetByName(tableName);
      if (!sheet) {
        sheet = ss.insertSheet(tableName);
        var tableDef = Schema.TABLES ? Schema.TABLES[tableName] : null;
        if (tableDef && tableDef.columns) {
          sheet.appendRow(tableDef.columns);
        }
      }
      return sheet;
    },

    readAll: function(tableName) {
      var sheet = Repository.getSheet(tableName);
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      if (!values || values.length <= 1) return [];

      var headers = values[0];
      var results = [];
      for (var r = 1; r < values.length; r++) {
        var row = values[r];
        var hasData = row.some(function(cell) { return cell !== '' && cell !== null && cell !== undefined; });
        if (!hasData) continue;

        var obj = { _rowNumber: r + 1 };
        headers.forEach(function(h, c) {
          obj[h] = row[c];
        });
        results.push(obj);
      }
      return results;
    },

    readById: function(tableName, idKey, idVal) {
      var all = Repository.readAll(tableName);
      return all.find(function(item) { return String(item[idKey]) === String(idVal); }) || null;
    },

    insertRow: function(tableName, rowObj) {
      var sheet = Repository.getSheet(tableName);
      var tableDef = Schema.TABLES ? Schema.TABLES[tableName] : null;
      var columns = tableDef ? tableDef.columns : Object.keys(rowObj);

      var rowArray = columns.map(function(col) {
        var val = rowObj[col];
        return val !== undefined && val !== null ? val : '';
      });

      sheet.appendRow(rowArray);
      return rowObj;
    },

    updateRow: function(tableName, idKey, idVal, updateFields) {
      var existing = Repository.readById(tableName, idKey, idVal);
      if (!existing) {
        throw new Error('Record not found in ' + tableName);
      }

      var sheet = Repository.getSheet(tableName);
      var tableDef = Schema.TABLES ? Schema.TABLES[tableName] : null;
      var columns = tableDef ? tableDef.columns : sheet.getDataRange().getValues()[0];

      var merged = Object.assign({}, existing, updateFields);
      var rowArray = columns.map(function(col) {
        var val = merged[col];
        return val !== undefined && val !== null ? val : '';
      });

      sheet.getRange(existing._rowNumber, 1, 1, columns.length).setValues([rowArray]);
      return merged;
    },

    deleteRowsMatching: function(tableName, matchKey, matchVal) {
      var all = Repository.readAll(tableName);
      var sheet = Repository.getSheet(tableName);
      for (var i = all.length - 1; i >= 0; i--) {
        if (String(all[i][matchKey]) === String(matchVal)) {
          sheet.deleteRow(all[i]._rowNumber);
        }
      }
    },

    appendAudit: function(log) {
      var uuid = typeof Utilities !== 'undefined' ? Utilities.getUuid() : ('audit-' + Date.now());
      var afterObj = log.after;
      if (typeof afterObj === 'string') {
        try { afterObj = JSON.parse(afterObj); } catch (e) { afterObj = { raw: log.after }; }
      }
      var afterWithIdentity = Object.assign({}, afterObj || {}, { identity_source: 'UNVERIFIED' });

      var auditRow = {
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
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Repository;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Repository = Repository;
}
