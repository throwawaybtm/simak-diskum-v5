const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const synthetic = require('./fixtures/synthetic_agenda.json');
const Schema = require('../shared/Schema.js');
const TimeUtils = require('../shared/TimeUtils.js');
const Validation = require('../shared/Validation.js');
const ConflictDetector = require('../shared/ConflictDetector.js');
const Projection = require('../shared/Projection.js');
const ExportFormatter = require('../shared/ExportFormatter.js');

global.Schema = Schema;
global.TimeUtils = TimeUtils;
global.Validation = Validation;
global.ConflictDetector = ConflictDetector;
global.Projection = Projection;
global.ExportFormatter = ExportFormatter;

const { MockSpreadsheetApp, MockLockService } = require('./helpers/mock_gas.js');
global.SpreadsheetApp = MockSpreadsheetApp;
global.LockService = MockLockService;
global.Utilities = {
  getUuid: () => 'uuid-' + Math.random().toString(36).substring(2, 10),
  base64Encode: (buf) => Buffer.from(buf).toString('base64')
};

const Repository = require('../admin-app/src/Repository.gs');
const ActivityApi = require('../admin-app/src/ActivityApi.gs');
const PublicRepository = require('../public-app/src/PublicRepository.gs');
const PublicApi = require('../public-app/src/PublicApi.gs');
const SeedGenerator = require('../shared/SeedGenerator.js');

global.Repository = Repository;
global.ActivityApi = ActivityApi;
global.PublicRepository = PublicRepository;
global.PublicApi = PublicApi;

describe('Full End-to-End System Flow', () => {
  beforeEach(() => {
    // Start with fresh seed
    const initialSeed = SeedGenerator.getInitialDatabase();
    MockSpreadsheetApp.reset(initialSeed);
    MockLockService.reset();
  });

  test('end-to-end: seed -> admin CRUD with conflict & versioning -> public privacy -> 8-col export', () => {
    // 1. Verify seed loaded
    const initialActs = Repository.readAll('Activities');
    assert.strictEqual(initialActs.length, 3, 'Must contain 3 October 2026 sample activities');

    // 2. Admin creates a multi-day activity (2026-10-10 to 2026-10-12)
    const newMultiDay = {
      title: 'Pameran Produk Unggulan UMKM Batam',
      start_date: '2026-10-10',
      start_time: '08:00',
      end_date: '2026-10-12',
      end_time: '17:00',
      location_id: 'loc-1', // OFFICE (Ruang Rapat Kadis)
      organizer_id: 'org-2',
      category_id: 'cat-3',
      public_notes: 'Dihadiri seluruh pelaku UMKM terpilih',
      private_notes: 'Anggaran konsumsi Rp 15.000.000',
      private_meeting_url: 'https://zoom.us/j/999888777?pwd=topsecret',
      attendees: [
        { employee_id: 'emp-1', public_label: '1. Kadis' }
      ]
    };

    const createRes = ActivityApi.createActivity(newMultiDay, 'req-e2e-1', 'Operator E2E');
    assert.strictEqual(createRes.ok, true);
    const createdId = createRes.data.id;

    // 3. Admin attempts to schedule conflicting meeting in loc-1 on 2026-10-11 at 10:00
    const conflicting = {
      title: 'Rapat Internal Mendadak',
      start_date: '2026-10-11',
      start_time: '10:00',
      end_date: '2026-10-11',
      end_time: '11:00',
      location_id: 'loc-1'
    };

    const conflictRes = ActivityApi.createActivity(conflicting, 'req-e2e-2', 'Operator E2E', false);
    assert.strictEqual(conflictRes.ok, false);
    assert.strictEqual(conflictRes.error.code, 'OVERLAP');

    // 4. Admin edits multi-day event with optimistic lock check
    const editRes = ActivityApi.updateActivity(
      createdId,
      { public_notes: 'Dihadiri seluruh pelaku UMKM terpilih (Pakaian Bebas Rapi)' },
      1, // expectedVersion
      'req-e2e-3',
      'Operator E2E'
    );
    assert.strictEqual(editRes.ok, true);
    assert.strictEqual(editRes.data.version, 2);

    // 5. Public visits Dashboard: ensure zero leakage
    const dashRes = PublicApi.getDashboardData();
    assert.strictEqual(dashRes.ok, true);
    const jsonStr = JSON.stringify(dashRes.data);
    assert.strictEqual(jsonStr.includes('topsecret'), false, 'Private meeting URL must not leak');
    assert.strictEqual(jsonStr.includes('15.000.000'), false, 'Private notes must not leak');

    // 6. Public views calendar on 2026-10-11 (day 2 of multi-day event)
    const calActivities = PublicApi.getPublicActivities({
      startDate: '2026-10-11',
      endDate: '2026-10-11'
    });
    assert.strictEqual(calActivities.ok, true);
    // Multi-day event must appear on 2026-10-11!
    const foundOnDay2 = calActivities.data.items.find(a => a.id === createdId);
    assert.ok(foundOnDay2, 'Multi-day event must appear on day 2 in calendar view');

    // 7. Public exports official 8-column table for October 2026
    const exportRes = PublicApi.getPublicExport({ startDate: '2026-10-01', endDate: '2026-10-31' }, 'PRINT');
    assert.strictEqual(exportRes.ok, true);
    assert.ok(exportRes.html.includes('DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM'));
    // In export table, multi-day event must render as single row with date range text
    assert.ok(exportRes.html.includes('10 - 12 Oktober 2026'));

    // 8. Public exports genuine XLSX
    const xlsxRes = PublicApi.getPublicExport({ startDate: '2026-10-01', endDate: '2026-10-31' }, 'XLSX');
    assert.strictEqual(xlsxRes.ok, true);
    const xlsxBuf = Buffer.from(xlsxRes.base64, 'base64');
    assert.strictEqual(xlsxBuf[0], 0x50); // P
    assert.strictEqual(xlsxBuf[1], 0x4b); // K

    // 9. Verify audit trail has UNVERIFIED identity source
    const audits = Repository.readAll('AuditLogs');
    const updateAudit = audits.find(a => a.entity_id === createdId && a.action === 'UPDATE');
    assert.ok(updateAudit);
    assert.ok(updateAudit.after_json.includes('UNVERIFIED'));
  });
});
