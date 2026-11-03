/**
 * tests/helpers/mock_gas.js
 * In-memory mock of Google Apps Script SpreadsheetApp, PropertiesService, and LockService
 * for offline integration testing.
 */

// Enable Node require to natively load Google Apps Script .gs files
if (typeof require !== 'undefined' && require.extensions && !require.extensions['.gs']) {
  require.extensions['.gs'] = require.extensions['.js'];
}

class MockSheet {
  constructor(name, dataRows = [], headers = []) {
    this.name = name;
    this.headers = headers;
    this.rows = dataRows.map(r => Object.assign({}, r));
  }

  getDataRange() {
    return {
      getValues: () => {
        if (this.rows.length === 0) {
          return [this.headers];
        }
        const values = [this.headers];
        this.rows.forEach(r => {
          values.push(this.headers.map(h => (r[h] !== undefined ? r[h] : '')));
        });
        return values;
      }
    };
  }

  appendRow(rowArray) {
    const rowObj = {};
    this.headers.forEach((h, idx) => {
      rowObj[h] = rowArray[idx] !== undefined ? rowArray[idx] : '';
    });
    this.rows.push(rowObj);
  }

  getRange(row, col, numRows = 1, numCols = 1) {
    return {
      setValues: (values) => {
        for (let r = 0; r < numRows; r++) {
          const targetRowIdx = row - 2 + r; // row 1 is header
          if (this.rows[targetRowIdx]) {
            for (let c = 0; c < numCols; c++) {
              const headerKey = this.headers[col - 1 + c];
              if (headerKey) {
                this.rows[targetRowIdx][headerKey] = values[r][c];
              }
            }
          }
        }
      }
    };
  }

  deleteRow(rowNumber) {
    const targetIdx = rowNumber - 2;
    if (targetIdx >= 0 && targetIdx < this.rows.length) {
      this.rows.splice(targetIdx, 1);
    }
  }

  getLastRow() {
    return this.rows.length + 1;
  }
}

class MockSpreadsheet {
  constructor(initialData = {}) {
    this.sheets = new Map();
    const Schema = require('../../shared/Schema.js');

    // Create sheets from schema
    Object.keys(Schema.TABLES).forEach(tableName => {
      const headers = Schema.TABLES[tableName].columns;
      const initialRows = initialData[tableName] || [];
      this.sheets.set(tableName, new MockSheet(tableName, initialRows, headers));
    });
  }

  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }

  insertSheet(name) {
    const sheet = new MockSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

let activeSpreadsheet = null;

const MockSpreadsheetApp = {
  reset(initialData = {}) {
    activeSpreadsheet = new MockSpreadsheet(initialData);
  },

  openById(id) {
    if (!activeSpreadsheet) {
      activeSpreadsheet = new MockSpreadsheet();
    }
    return activeSpreadsheet;
  },

  getActiveSpreadsheet() {
    return MockSpreadsheetApp.openById('default');
  }
};

let isLocked = false;
const MockLock = {
  waitLock: (timeout) => {
    isLocked = true;
    return true;
  },
  releaseLock: () => {
    isLocked = false;
  }
};

const MockLockService = {
  reset() {
    isLocked = false;
  },
  getScriptLock() {
    return MockLock;
  }
};

const mockProperties = new Map();
const MockPropertiesService = {
  reset() {
    mockProperties.clear();
  },
  getScriptProperties() {
    return {
      getProperty: (key) => mockProperties.get(key) || null,
      setProperty: (key, val) => mockProperties.set(key, String(val)),
      deleteProperty: (key) => mockProperties.delete(key)
    };
  }
};

module.exports = {
  MockSpreadsheetApp,
  MockLockService,
  MockPropertiesService
};
