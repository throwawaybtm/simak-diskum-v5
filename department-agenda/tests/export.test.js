const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ExportFormatter = require('../shared/ExportFormatter.js');
const synthetic = require('./fixtures/synthetic_agenda.json');

describe('ExportFormatter (Official 8-Column Layout & Genuine XLSX)', () => {
  const sampleActivities = [
    {
      activity_id: 'act-1',
      title: 'Upacara Hari Kesaktian Pancasila',
      start_date: '2026-10-01',
      start_time: '07:00',
      end_date: '2026-10-01',
      end_time: null,
      location_id: 'loc-3',
      organizer_id: 'org-1',
      status: 'SCHEDULED',
      public_notes: 'Pakaian : PSL',
      attendee_labels: ['1. Kadis', '2. Sekretaris', '3. Kabid']
    },
    {
      activity_id: 'act-2',
      title: 'Batam Halal Expo (Multi-day)',
      start_date: '2026-10-01',
      start_time: '09:00',
      end_date: '2026-10-03',
      end_time: '17:00',
      location_id: 'loc-3',
      organizer_id: 'org-2',
      status: 'SCHEDULED',
      public_notes: 'Stan UMKM Binaan Diskum',
      attendee_labels: ['1. Kadis', '2. Kabid Usaha Mikro']
    }
  ];

  const lookups = {
    locations: synthetic.Locations,
    organizers: synthetic.Organizers,
    categories: synthetic.Categories
  };

  const headerInfo = {
    title: 'JADWAL KEGIATAN',
    department: 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
    period: 'BULAN OKTOBER 2026'
  };

  test('formatEightColumnRows produces exact 8 columns with sequential No', () => {
    const rows = ExportFormatter.formatEightColumnRows(sampleActivities, lookups);
    assert.strictEqual(rows.length, 2);

    const row1 = rows[0];
    assert.strictEqual(row1.no, 1);
    assert.strictEqual(row1.hariTanggal, 'Kamis, 1 Oktober 2026');
    assert.strictEqual(row1.pukul, '07.00 WIB s.d. selesai');
    assert.strictEqual(row1.kegiatan, 'Upacara Hari Kesaktian Pancasila');
    assert.strictEqual(row1.tempat, 'Dataran Engku Putri, Kantor Wali Kota Batam');
    assert.strictEqual(row1.penyelenggara, 'Sekretariat Daerah Kota Batam');
    assert.strictEqual(row1.dihadiriOleh, '1. Kadis\n2. Sekretaris\n3. Kabid');
    assert.strictEqual(row1.keterangan, 'Pakaian : PSL');

    // Multi-day row test
    const row2 = rows[1];
    assert.strictEqual(row2.no, 2);
    assert.strictEqual(row2.hariTanggal, 'Kamis - Sabtu, 1 - 3 Oktober 2026');
  });

  test('generateHtmlPrintView produces landscape printable document with department headers', () => {
    const html = ExportFormatter.generateHtmlPrintView(sampleActivities, lookups, headerInfo);
    assert.ok(html.includes('size: landscape;'));
    assert.ok(html.includes('DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM'));
    assert.ok(html.includes('BULAN OKTOBER 2026'));
    assert.ok(html.includes('Hari / Tanggal</th>'));
    assert.ok(html.includes('Dihadiri Oleh</th>'));
  });

  test('generateXlsxBuffer produces genuine OpenXML XLSX file (ZIP PK header)', () => {
    const buffer = ExportFormatter.generateXlsxBuffer(sampleActivities, lookups, headerInfo);
    assert.ok(Buffer.isBuffer(buffer), 'Output must be a binary buffer');

    // Genuine ZIP archive starts with magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    assert.strictEqual(buffer[0], 0x50, 'Byte 0 must be 0x50 (P)');
    assert.strictEqual(buffer[1], 0x4B, 'Byte 1 must be 0x4B (K)');
    assert.strictEqual(buffer[2], 0x03, 'Byte 2 must be 0x03');
    assert.strictEqual(buffer[3], 0x04, 'Byte 3 must be 0x04');

    // Verify it contains workbook.xml and [Content_Types].xml in the ZIP entries
    const asString = buffer.toString('binary');
    assert.ok(asString.includes('[Content_Types].xml'), 'Must contain [Content_Types].xml');
    assert.ok(asString.includes('xl/workbook.xml'), 'Must contain xl/workbook.xml');
    assert.ok(asString.includes('xl/worksheets/sheet1.xml'), 'Must contain xl/worksheets/sheet1.xml');
  });
});
