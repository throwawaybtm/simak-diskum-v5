/**
 * shared/ExportFormatter.js
 * Formats official 8-column department reports for Dinas Koperasi dan Usaha Mikro Kota Batam.
 * Produces:
 * 1. Exact 8-column structured rows
 * 2. Landscape print/PDF HTML view with repeating headers
 * 3. Genuine OpenXML (.xlsx) binary buffers via XlsxBuilder
 */

let TimeUtilsModule;
let XlsxBuilderModule;

if (typeof require !== 'undefined') {
  try {
    TimeUtilsModule = require('./TimeUtils.js');
    XlsxBuilderModule = require('./XlsxBuilder.js');
  } catch (e) {
    TimeUtilsModule = globalThis.TimeUtils;
    XlsxBuilderModule = globalThis.XlsxBuilder;
  }
} else {
  TimeUtilsModule = globalThis.TimeUtils;
  XlsxBuilderModule = globalThis.XlsxBuilder;
}

const HEADERS_8 = [
  'No',
  'Hari / Tanggal',
  'Pukul',
  'Kegiatan',
  'Tempat',
  'Penyelenggara',
  'Dihadiri Oleh',
  'Keterangan'
];

const ExportFormatter = {
  HEADERS_8,

  /**
   * Produce structured 8-column rows from activities.
   * Multi-day events render as exactly ONE row with date range text.
   */
  formatEightColumnRows(activities = [], lookups = {}) {
    const findInLookup = (listOrMap, idKey, idVal) => {
      if (!listOrMap || !idVal) return null;
      if (Array.isArray(listOrMap)) {
        return listOrMap.find(item => item && item[idKey] === idVal) || null;
      }
      if (listOrMap instanceof Map) {
        return listOrMap.get(idVal) || null;
      }
      if (typeof listOrMap === 'object') {
        return listOrMap[idVal] || null;
      }
      return null;
    };

    return activities.map((act, index) => {
      const loc = findInLookup(lookups.locations, 'location_id', act.location_id);
      const org = findInLookup(lookups.organizers, 'organizer_id', act.organizer_id);

      const effectiveEndDate = act.end_date || act.start_date;
      const hariTanggal = TimeUtilsModule.formatIndonesianDateRange(act.start_date, effectiveEndDate);
      const pukul = TimeUtilsModule.formatTimeRange(act.start_time, act.end_time);

      let dihadiriOleh = '';
      if (Array.isArray(act.attendee_labels) && act.attendee_labels.length > 0) {
        dihadiriOleh = act.attendee_labels.join('\n');
      } else if (Array.isArray(act.attendees) && act.attendees.length > 0) {
        dihadiriOleh = act.attendees.map(a => a.public_label || a.name_snapshot || a.employee_id).join('\n');
      }

      return {
        no: index + 1,
        hariTanggal,
        pukul,
        kegiatan: act.title || '',
        tempat: loc ? loc.name : (act.location_name || '-'),
        penyelenggara: org ? org.name : (act.organizer_name || '-'),
        dihadiriOleh,
        keterangan: act.public_notes || ''
      };
    });
  },

  /**
   * Generates landscape print-to-PDF HTML with repeating table headers.
   */
  generateHtmlPrintView(activities = [], lookups = {}, headerInfo = {}) {
    const rows = ExportFormatter.formatEightColumnRows(activities, lookups);
    const title = headerInfo.title || 'JADWAL KEGIATAN';
    const dept = headerInfo.department || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM';
    const period = headerInfo.period || '';

    const escape = s => (s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
    const nl2br = s => escape(s).replace(/\n/g, '<br/>');

    let rowsHtml = '';
    rows.forEach(r => {
      rowsHtml += `<tr>
        <td style="text-align: center; vertical-align: top;">${r.no}</td>
        <td style="vertical-align: top; white-space: nowrap;">${escape(r.hariTanggal)}</td>
        <td style="vertical-align: top; white-space: nowrap;">${escape(r.pukul)}</td>
        <td style="vertical-align: top;">${nl2br(r.kegiatan)}</td>
        <td style="vertical-align: top;">${nl2br(r.tempat)}</td>
        <td style="vertical-align: top;">${nl2br(r.penyelenggara)}</td>
        <td style="vertical-align: top;">${nl2br(r.dihadiriOleh)}</td>
        <td style="vertical-align: top;">${nl2br(r.keterangan)}</td>
      </tr>`;
    });

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escape(title)} - ${escape(dept)}</title>
  <style>
    @page {
      size: landscape;
      margin: 15mm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: #000;
      margin: 0;
      padding: 10px;
    }
    .header-container {
      text-align: center;
      margin-bottom: 20px;
      font-weight: bold;
    }
    .header-title { font-size: 13pt; text-transform: uppercase; margin: 2px 0; }
    .header-dept { font-size: 14pt; text-transform: uppercase; margin: 2px 0; }
    .header-period { font-size: 11pt; text-transform: uppercase; margin: 2px 0; }

    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    th {
      border: 1px solid #000;
      background-color: #f2f2f2;
      padding: 8px 6px;
      font-weight: bold;
      text-align: center;
    }
    td {
      border: 1px solid #000;
      padding: 8px 6px;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="header-title">${escape(title)}</div>
    <div class="header-dept">${escape(dept)}</div>
    ${period ? `<div class="header-period">${escape(period)}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 4%;">No</th>
        <th style="width: 14%;">Hari / Tanggal</th>
        <th style="width: 12%;">Pukul</th>
        <th style="width: 20%;">Kegiatan</th>
        <th style="width: 14%;">Tempat</th>
        <th style="width: 14%;">Penyelenggara</th>
        <th style="width: 12%;">Dihadiri Oleh</th>
        <th style="width: 10%;">Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
  },

  /**
   * Generates genuine OpenXML .xlsx binary buffer.
   */
  generateXlsxBuffer(activities = [], lookups = {}, headerInfo = {}) {
    const rows = ExportFormatter.formatEightColumnRows(activities, lookups);
    const headerLines = [
      headerInfo.title || 'JADWAL KEGIATAN',
      headerInfo.department || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM'
    ];
    if (headerInfo.period) {
      headerLines.push(headerInfo.period);
    }

    const tableRows = rows.map(r => [
      r.no,
      r.hariTanggal,
      r.pukul,
      r.kegiatan,
      r.tempat,
      r.penyelenggara,
      r.dihadiriOleh,
      r.keterangan
    ]);

    return XlsxBuilderModule.buildWorkbook(headerLines, HEADERS_8, tableRows);
  },

  /**
   * Generates standard Uint8Array containing genuine OpenXML .xlsx archive.
   */
  generateXlsxUint8Array(activities = [], lookups = {}, headerInfo = {}) {
    const rows = ExportFormatter.formatEightColumnRows(activities, lookups);
    const headerLines = [
      headerInfo.title || 'JADWAL KEGIATAN',
      headerInfo.department || 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM'
    ];
    if (headerInfo.period) {
      headerLines.push(headerInfo.period);
    }

    const tableRows = rows.map(r => [
      r.no,
      r.hariTanggal,
      r.pukul,
      r.kegiatan,
      r.tempat,
      r.penyelenggara,
      r.dihadiriOleh,
      r.keterangan
    ]);

    return XlsxBuilderModule.buildWorkbookUint8Array(headerLines, HEADERS_8, tableRows);
  },

  /**
   * Generates base64 string for genuine OpenXML .xlsx archive.
   * Compatible across Google Apps Script (Utilities.base64Encode) and Node.js.
   */
  generateXlsxBase64(activities = [], lookups = {}, headerInfo = {}) {
    const uint8 = ExportFormatter.generateXlsxUint8Array(activities, lookups, headerInfo);
    if (typeof Utilities !== 'undefined' && Utilities.base64Encode) {
      return Utilities.base64Encode(uint8);
    }
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      return Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength).toString('base64');
    }
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportFormatter;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ExportFormatter = ExportFormatter;
}
