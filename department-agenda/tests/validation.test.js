const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Validation = require('../shared/Validation.js');

describe('Validation', () => {
  test('rejects activity with missing title', () => {
    const res = Validation.validateActivity({
      start_date: '2026-10-01'
    });
    assert.strictEqual(res.ok, false);
    assert.ok(res.errors.some(e => e.field === 'title'));
  });

  test('rejects activity with invalid date format', () => {
    const res = Validation.validateActivity({
      title: 'Rapat Koordinasi',
      start_date: '01-10-2026'
    });
    assert.strictEqual(res.ok, false);
    assert.ok(res.errors.some(e => e.field === 'start_date'));
  });

  test('rejects activity where end_date is before start_date', () => {
    const res = Validation.validateActivity({
      title: 'Rapat Koordinasi',
      start_date: '2026-10-05',
      end_date: '2026-10-03'
    });
    assert.strictEqual(res.ok, false);
    assert.ok(res.errors.some(e => e.field === 'end_date'));
  });

  test('validates update requires expectedVersion positive integer', () => {
    const res = Validation.validateActivity({
      title: 'Rapat Koordinasi',
      start_date: '2026-10-05'
    }, true);
    assert.strictEqual(res.ok, false);
    assert.ok(res.errors.some(e => e.field === 'expectedVersion'));
  });

  test('privacy leak check flags Zoom/Meet credentials or passcodes in public_notes', () => {
    const res = Validation.validateActivity({
      title: 'Pitching Misi Dagang',
      start_date: '2026-10-01',
      public_notes: 'Meeting ID: 850 000 5418 Passcode: ppdn146 https://zoom.us/j/8500005418'
    });
    assert.strictEqual(res.ok, false);
    assert.ok(res.errors.some(e => e.field === 'public_notes' && e.code === 'PRIVACY_LEAK_RISK'));
  });

  test('accepts public_notes with safe clothing/general instructions', () => {
    const res = Validation.validateActivity({
      title: 'Upacara Hari Kesaktian Pancasila',
      start_date: '2026-10-01',
      public_notes: 'Pakaian: PDU I bagi pejabat eselon II dan III'
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.errors.length, 0);
  });
});
