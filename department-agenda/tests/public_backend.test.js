const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const synthetic = require('./fixtures/synthetic_agenda.json');
const Schema = require('../shared/Schema.js');
const TimeUtils = require('../shared/TimeUtils.js');
const Projection = require('../shared/Projection.js');
const ExportFormatter = require('../shared/ExportFormatter.js');

global.Schema = Schema;
global.TimeUtils = TimeUtils;
global.Projection = Projection;
global.ExportFormatter = ExportFormatter;

const { MockSpreadsheetApp } = require('./helpers/mock_gas.js');
global.SpreadsheetApp = MockSpreadsheetApp;

const PublicRepository = require('../public-app/src/PublicRepository.js');
const PublicApi = require('../public-app/src/PublicApi.js');

describe('Public Backend & Read-Only Privacy Enforcement', () => {
  beforeEach(() => {
    MockSpreadsheetApp.reset(JSON.parse(JSON.stringify(synthetic)));
  });

  test('getDashboardData returns today, next 7 days, and active notices with zero private fields', () => {
    const res = PublicApi.getDashboardData();
    assert.strictEqual(res.ok, true);
    assert.ok(res.data.todayWib);
    assert.ok(Array.isArray(res.data.todayActivities));
    assert.ok(Array.isArray(res.data.upcomingActivities));
    assert.ok(Array.isArray(res.data.activeAnnouncements));

    // Verify zero sensitive fields in JSON
    const jsonStr = JSON.stringify(res.data);
    assert.strictEqual(jsonStr.includes('private_notes'), false);
    assert.strictEqual(jsonStr.includes('private_meeting_url'), false);
    assert.strictEqual(jsonStr.includes('created_by'), false);
    assert.strictEqual(jsonStr.includes('emp-1'), false, 'Internal employee IDs must not leak');
  });

  test('getPublicActivities filters by date range and returns safe DTOs', () => {
    const res = PublicApi.getPublicActivities({
      startDate: '2026-10-01',
      endDate: '2026-10-02'
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.items.length, 1);
    assert.strictEqual(res.data.items[0].title, 'Upacara Peringatan Hari Kesaktian Pancasila Tingkat Kota Batam');
    assert.strictEqual(res.data.items[0].timeDisplay, '07.00 WIB s.d. selesai');
    assert.deepStrictEqual(res.data.items[0].attendeeLabels, ['1. Kadis', '2. Sekretaris']);
  });

  test('getPublicExport generates genuine XLSX base64 download payload', () => {
    const res = PublicApi.getPublicExport({ startDate: '2026-10-01', endDate: '2026-10-31' }, 'XLSX');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.format, 'XLSX');
    assert.ok(res.base64);

    const binary = Buffer.from(res.base64, 'base64');
    assert.strictEqual(binary[0], 0x50); // P
    assert.strictEqual(binary[1], 0x4b); // K
  });
});
