const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const TimeUtils = require('../shared/TimeUtils.js');

describe('TimeUtils (WIB Asia/Jakarta)', () => {
  test('parseWibDate parses WIB date and time into exact UTC epoch ms', () => {
    // 2026-10-01 07:00:00 WIB (UTC+7) = 2026-10-01 00:00:00 UTC
    const epochMs = TimeUtils.parseWibDate('2026-10-01', '07:00');
    const expectedUtc = Date.UTC(2026, 9, 1, 0, 0, 0); // Month is 0-indexed: 9 = Oct
    assert.strictEqual(epochMs, expectedUtc);
  });

  test('parseWibDate handles Indonesian dot notation for time (07.00)', () => {
    const epochMs = TimeUtils.parseWibDate('2026-10-01', '07.00');
    const expectedUtc = Date.UTC(2026, 9, 1, 0, 0, 0);
    assert.strictEqual(epochMs, expectedUtc);
  });

  test('makeInterval constructs half-open [start, end) interval for standard event', () => {
    const interval = TimeUtils.makeInterval('2026-10-01', '09:00', '2026-10-01', '10:00', false);
    const expectedStart = Date.UTC(2026, 9, 1, 2, 0, 0); // 09:00 WIB = 02:00 UTC
    const expectedEnd = Date.UTC(2026, 9, 1, 3, 0, 0);   // 10:00 WIB = 03:00 UTC
    assert.deepStrictEqual(interval, [expectedStart, expectedEnd]);
  });

  test('makeInterval for open-ended event sets end to 00:00 WIB on day following end_date', () => {
    const interval = TimeUtils.makeInterval('2026-10-01', '07:00', '2026-10-01', null, true);
    const expectedStart = Date.UTC(2026, 9, 1, 0, 0, 0);
    // 2026-10-02 00:00:00 WIB = 2026-10-01 17:00:00 UTC
    const expectedEnd = Date.UTC(2026, 9, 1, 17, 0, 0);
    assert.deepStrictEqual(interval, [expectedStart, expectedEnd]);
  });

  test('intervalsIntersect correctly identifies non-overlapping adjacent slots', () => {
    const slot1 = TimeUtils.makeInterval('2026-10-01', '09:00', '2026-10-01', '10:00', false);
    const slot2 = TimeUtils.makeInterval('2026-10-01', '10:00', '2026-10-01', '11:00', false);
    assert.strictEqual(TimeUtils.intervalsIntersect(slot1, slot2), false, 'Adjacent intervals must not overlap');
  });

  test('intervalsIntersect correctly identifies overlapping slots', () => {
    const slot1 = TimeUtils.makeInterval('2026-10-01', '09:00', '2026-10-01', '11:00', false);
    const slot2 = TimeUtils.makeInterval('2026-10-01', '10:00', '2026-10-01', '12:00', false);
    assert.strictEqual(TimeUtils.intervalsIntersect(slot1, slot2), true, 'Overlapping intervals must intersect');
  });

  test('formatIndonesianDate returns localized Indonesian day and date', () => {
    const formatted = TimeUtils.formatIndonesianDate('2026-10-01');
    assert.strictEqual(formatted, 'Kamis, 1 Oktober 2026');
  });

  test('formatIndonesianDateRange formats same-month multi-day range', () => {
    const formatted = TimeUtils.formatIndonesianDateRange('2026-10-01', '2026-10-03');
    assert.strictEqual(formatted, 'Kamis - Sabtu, 1 - 3 Oktober 2026');
  });

  test('formatIndonesianDateRange formats single-day range as single date', () => {
    const formatted = TimeUtils.formatIndonesianDateRange('2026-10-01', '2026-10-01');
    assert.strictEqual(formatted, 'Kamis, 1 Oktober 2026');
  });

  test('formatTimeRange formats open-ended time as "s.d. selesai"', () => {
    const formatted = TimeUtils.formatTimeRange('07:00', null);
    assert.strictEqual(formatted, '07.00 WIB s.d. selesai');
  });

  test('formatTimeRange formats bounded time span', () => {
    const formatted = TimeUtils.formatTimeRange('09:00', '11:00');
    assert.strictEqual(formatted, '09.00 - 11.00 WIB');
  });
});
