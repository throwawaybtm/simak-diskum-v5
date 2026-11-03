/**
 * public-app/src/PublicRepository.js / PublicRepository.gs
 * Read-only Sheets Reader for Public Portal.
 * Operates strictly with read-only permissions (spreadsheets.readonly).
 * Contains ZERO mutation methods.
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

const PublicRepository = {
  getSpreadsheet() {
    let sheetId = null;
    if (typeof PropertiesService !== 'undefined') {
      try {
        sheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      } catch (e) {}
    }
    if (sheetId && typeof SpreadsheetApp !== 'undefined') {
      return SpreadsheetApp.openById(sheetId);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  readAll(tableName) {
    const ss = PublicRepository.getSpreadsheet();
    const sheet = ss.getSheetByName(tableName);
    if (!sheet) return [];

    const values = sheet.getDataRange().getValues();
    if (!values || values.length <= 1) return [];

    const headers = values[0];
    const results = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const hasData = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
      if (!hasData) continue;

      const obj = {};
      headers.forEach((h, c) => {
        obj[h] = row[c];
      });
      results.push(obj);
    }
    return results;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PublicRepository;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PublicRepository = PublicRepository;
}
