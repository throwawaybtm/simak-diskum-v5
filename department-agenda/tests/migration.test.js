const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Migration = require('../shared/Migration.js');
const legacySample = require('./fixtures/legacy_october_sample.json');

describe('Migration (Legacy 8-Column Agenda Import)', () => {
  test('parses Row 1 (Upacara Pancasila) into structured activity record', () => {
    const row1 = legacySample.rows[0];
    const parsed = Migration.parseLegacyRow(row1);

    assert.strictEqual(parsed.activity.title, 'Upacara Peringatan Hari Kesaktian Pancasila Tingkat Kota Batam Tahun 2026');
    assert.strictEqual(parsed.activity.start_date, '2026-10-01');
    assert.strictEqual(parsed.activity.start_time, '07:00');
    assert.strictEqual(parsed.activity.end_time, null);
    assert.strictEqual(parsed.activity.public_notes, 'Pakaian : PSL');
    assert.strictEqual(parsed.attendees.length, 3);
    assert.strictEqual(parsed.attendees[0].public_label, '1. Kadis');
    assert.strictEqual(parsed.attendees[1].public_label, '2. Sekretaris');
    assert.strictEqual(parsed.attendees[2].public_label, '3. Kabid');
  });

  test('parses Row 2 (Zoom Pitching) and isolates Zoom credentials from public notes', () => {
    const row2 = legacySample.rows[1];
    const parsed = Migration.parseLegacyRow(row2);

    assert.strictEqual(parsed.activity.title, 'Pitching Misi Dagang Provinsi Jawa Barat dengan Provinsi Kepulauan Riau');
    assert.strictEqual(parsed.activity.start_date, '2026-10-01');
    assert.strictEqual(parsed.activity.start_time, '09:00');
    assert.strictEqual(parsed.activity.end_time, null);

    // Zoom URL and Passcode must be moved to private_meeting_url / private_notes
    assert.ok(parsed.activity.private_meeting_url.includes('zoom.us'));
    assert.ok(parsed.activity.private_notes.includes('Passcode: ppdn146'));

    // Public notes must NOT contain Zoom passcode or meeting ID
    assert.strictEqual(parsed.activity.public_notes.includes('Passcode: ppdn146'), false);
    assert.strictEqual(parsed.activity.public_notes.includes('zoom.us'), false);
    assert.ok(parsed.activity.public_notes.includes('para pelaku usaha yang dapat diisi'));
  });

  test('parses Indonesian date strings into ISO format', () => {
    assert.strictEqual(Migration.parseIndonesianDate('Kamis 1 Oktober 2026'), '2026-10-01');
    assert.strictEqual(Migration.parseIndonesianDate('Jumat, 2 Oktober 2026'), '2026-10-02');
  });

  test('parses Indonesian time strings with s.d. selesai', () => {
    const time1 = Migration.parseTime('07.00 WIB s.d. selesai');
    assert.strictEqual(time1.startTime, '07:00');
    assert.strictEqual(time1.endTime, null);
    assert.strictEqual(time1.isUntilFinished, true);

    const time2 = Migration.parseTime('09.00 - 11.00 WIB');
    assert.strictEqual(time2.startTime, '09:00');
    assert.strictEqual(time2.endTime, '11:00');
    assert.strictEqual(time2.isUntilFinished, false);
  });
});
