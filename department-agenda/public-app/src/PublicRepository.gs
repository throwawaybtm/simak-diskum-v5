/**
 * public-app/src/PublicRepository.gs
 * Read-Only Sheets Reader for Google Apps Script.
 */

var PublicRepository = (function() {
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

    readAll: function(tableName) {
      var ss = PublicRepository.getSpreadsheet();
      var sheet = ss.getSheetByName(tableName);
      if (!sheet) return [];

      var values = sheet.getDataRange().getValues();
      if (!values || values.length <= 1) return [];

      var headers = values[0];
      var results = [];
      for (var r = 1; r < values.length; r++) {
        var row = values[r];
        var hasData = row.some(function(cell) { return cell !== '' && cell !== null && cell !== undefined; });
        if (!hasData) continue;

        var obj = {};
        headers.forEach(function(h, c) {
          obj[h] = row[c];
        });
        results.push(obj);
      }
      return results;
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PublicRepository;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PublicRepository = PublicRepository;
}
