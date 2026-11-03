const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// We test the backend service logic using an in-memory sheets adapter that mimics SpreadsheetApp & LockService
const synthetic = require('./fixtures/synthetic_agenda.json');
const Schema = require('../shared/Schema.js');
const TimeUtils = require('../shared/TimeUtils.js');
const Validation = require('../shared/Validation.js');
const ConflictDetector = require('../shared/ConflictDetector.js');
const Projection = require('../shared/Projection.js');

// Setup global environment for Apps Script simulation
global.Schema = Schema;
global.TimeUtils = TimeUtils;
global.Validation = Validation;
global.ConflictDetector = ConflictDetector;
global.Projection = Projection;

// Load Admin backend modules
const { MockSpreadsheetApp, MockLockService } = require('./helpers/mock_gas.js');
global.SpreadsheetApp = MockSpreadsheetApp;
global.LockService = MockLockService;
global.Utilities = {
  getUuid: () => 'uuid-' + Math.random().toString(36).substring(2, 10)
};

// Now load backend scripts
const Repository = require('../admin-app/src/Repository.js');
const ActivityApi = require('../admin-app/src/ActivityApi.js');
const MasterApi = require('../admin-app/src/MasterApi.js');

describe('Admin Backend Integration & Concurrency', () => {
  beforeEach(() => {
    // Reset mock database with fresh synthetic seed data
    MockSpreadsheetApp.reset(JSON.parse(JSON.stringify(synthetic)));
    MockLockService.reset();
  });

  test('createActivity successfully saves activity, attendees, and audit log with UNVERIFIED identity', () => {
    const payload = {
      title: 'Pelatihan Manajemen Keuangan Koperasi',
      start_date: '2026-10-15',
      start_time: '08:30',
      end_date: '2026-10-15',
      end_time: '12:00',
      location_id: 'loc-2',
      organizer_id: 'org-2',
      category_id: 'cat-3',
      public_notes: 'Membawa laptop masing-masing',
      private_notes: 'Konsumsi snack 50 kotak disiapkan oleh Koperasi Bina Usaha',
      private_meeting_url: '',
      attendees: [
        { employee_id: 'emp-3', public_label: '1. Kabid Koperasi' }
      ]
    };

    const res = ActivityApi.createActivity(payload, 'req-101', 'Operator Budi');
    assert.strictEqual(res.ok, true);
    assert.ok(res.data.id);
    assert.strictEqual(res.data.version, 1);
    assert.strictEqual(res.data.status, 'SCHEDULED');

    // Verify stored in Activities sheet
    const saved = Repository.readById('Activities', 'activity_id', res.data.id);
    assert.strictEqual(saved.title, 'Pelatihan Manajemen Keuangan Koperasi');
    assert.strictEqual(saved.version, 1);

    // Verify audit log has UNVERIFIED identity source
    const audits = Repository.readAll('AuditLogs');
    const createAudit = audits.find(a => a.entity_id === res.data.id && a.action === 'CREATE');
    assert.ok(createAudit);
    assert.strictEqual(createAudit.actor_label, 'Operator Budi');
    assert.ok(createAudit.after_json.includes('UNVERIFIED'));
  });

  test('createActivity detects conflict and rejects without acknowledgeConflict', () => {
    // Try to create overlapping meeting in loc-1 where emp-1 (Kadis) is scheduled
    const payload = {
      title: 'Audiensi Mendesak',
      start_date: '2026-10-01',
      start_time: '07:30',
      end_date: '2026-10-01',
      end_time: '09:00',
      location_id: 'loc-1',
      attendees: [{ employee_id: 'emp-1' }] // Kadis is busy in act-1
    };

    const res = ActivityApi.createActivity(payload, 'req-102', 'Operator Andi');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error.code, 'OVERLAP');
    assert.ok(res.error.conflicts.length > 0);

    // Now retry with acknowledgeConflict = true and overrideReason
    const overrideRes = ActivityApi.createActivity(payload, 'req-102', 'Operator Andi', true, 'Dispensasi pimpinan untuk menghadiri sesi awal saja');
    assert.strictEqual(overrideRes.ok, true);
    assert.ok(overrideRes.data.id);
  });

  test('updateActivity rejects on VERSION_CONFLICT when record has been modified', () => {
    // act-1 has version 1
    const updatePayload = {
      title: 'Judul Diubah Editor A',
      start_date: '2026-10-01',
      start_time: '07:00',
      expectedVersion: 1
    };

    // First update succeeds
    const res1 = ActivityApi.updateActivity('act-1', updatePayload, 1, 'req-103', 'Editor A');
    assert.strictEqual(res1.ok, true);
    assert.strictEqual(res1.data.version, 2);

    // Second update with stale version 1 fails with VERSION_CONFLICT
    const res2 = ActivityApi.updateActivity('act-1', updatePayload, 1, 'req-104', 'Editor B');
    assert.strictEqual(res2.ok, false);
    assert.strictEqual(res2.error.code, 'VERSION_CONFLICT');
  });

  test('cancelActivity updates status to CANCELLED and stores reason', () => {
    const res = ActivityApi.cancelActivity('act-1', 'Jadwal diundur oleh panitia pusat', 1, 'req-105', 'Operator C');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.data.status, 'CANCELLED');

    const updated = Repository.readById('Activities', 'activity_id', 'act-1');
    assert.strictEqual(updated.status, 'CANCELLED');
    assert.strictEqual(updated.cancel_reason, 'Jadwal diundur oleh panitia pusat');
  });

  test('duplicateActivity clears private meeting credentials', () => {
    const duplicated = ActivityApi.duplicateActivity('act-1');
    assert.strictEqual(duplicated.ok, true);
    assert.strictEqual(duplicated.data.title, 'Upacara Peringatan Hari Kesaktian Pancasila Tingkat Kota Batam (Salinan)');
    assert.strictEqual(duplicated.data.private_meeting_url, '');
    assert.strictEqual(duplicated.data.version, 1);
  });
});
