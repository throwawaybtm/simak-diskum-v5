/**
 * shared/XlsxBuilder.js
 * Pure JavaScript OpenXML (.xlsx) builder.
 * Produces genuine, standards-compliant .xlsx files (ZIP container with workbook, worksheet, styles, and content types).
 * Escapes formula characters (=, +, -, @) to prevent formula injection.
 */

let zlibModule;
if (typeof require !== 'undefined') {
  try {
    zlibModule = require('zlib');
  } catch (e) {
    zlibModule = null;
  }
}

/**
 * Lightweight ZIP archive builder that works in Node.js and Google Apps Script.
 */
class SimpleZip {
  constructor() {
    this.entries = [];
  }

  addFile(path, contentStr) {
    const data = Buffer.from(contentStr, 'utf8');
    const crc = this._crc32(data);
    let compressedData = data;
    let method = 0; // STORE

    if (zlibModule && zlibModule.deflateRawSync) {
      try {
        compressedData = zlibModule.deflateRawSync(data);
        method = 8; // DEFLATE
      } catch (e) {
        compressedData = data;
        method = 0;
      }
    }

    this.entries.push({
      path,
      data: compressedData,
      uncompressedSize: data.length,
      compressedSize: compressedData.length,
      crc,
      method
    });
  }

  toBuffer() {
    const buffers = [];
    const centralDirs = [];
    let offset = 0;

    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.path, 'utf8');

      // Local file header: 30 bytes + filename
      const localHeader = Buffer.alloc(30 + nameBuf.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
      localHeader.writeUInt16LE(20, 4);          // version needed: 2.0
      localHeader.writeUInt16LE(0, 6);           // flags
      localHeader.writeUInt16LE(entry.method, 8); // compression method
      localHeader.writeUInt16LE(0, 10);          // time
      localHeader.writeUInt16LE(0, 12);          // date
      localHeader.writeUInt32LE(entry.crc, 14);  // crc-32
      localHeader.writeUInt32LE(entry.compressedSize, 18);
      localHeader.writeUInt32LE(entry.uncompressedSize, 22);
      localHeader.writeUInt16LE(nameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);          // extra len
      nameBuf.copy(localHeader, 30);

      buffers.push(localHeader);
      buffers.push(entry.data);

      // Central directory header: 46 bytes + filename
      const cdHeader = Buffer.alloc(46 + nameBuf.length);
      cdHeader.writeUInt32LE(0x02014b50, 0);   // PK\x01\x02
      cdHeader.writeUInt16LE(20, 4);           // version made by
      cdHeader.writeUInt16LE(20, 6);           // version needed
      cdHeader.writeUInt16LE(0, 8);            // flags
      cdHeader.writeUInt16LE(entry.method, 10); // method
      cdHeader.writeUInt16LE(0, 12);           // time
      cdHeader.writeUInt16LE(0, 14);           // date
      cdHeader.writeUInt32LE(entry.crc, 16);   // crc
      cdHeader.writeUInt32LE(entry.compressedSize, 20);
      cdHeader.writeUInt32LE(entry.uncompressedSize, 24);
      cdHeader.writeUInt16LE(nameBuf.length, 28);
      cdHeader.writeUInt16LE(0, 30);           // extra len
      cdHeader.writeUInt16LE(0, 32);           // comment len
      cdHeader.writeUInt16LE(0, 34);           // disk start
      cdHeader.writeUInt16LE(0, 36);           // internal attr
      cdHeader.writeUInt32LE(0, 38);           // external attr
      cdHeader.writeUInt32LE(offset, 42);      // relative offset of local header
      nameBuf.copy(cdHeader, 46);

      centralDirs.push(cdHeader);
      offset += localHeader.length + entry.data.length;
    }

    const cdStart = offset;
    let cdSize = 0;
    for (const cd of centralDirs) {
      buffers.push(cd);
      cdSize += cd.length;
    }

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);          // PK\x05\x06
    eocd.writeUInt16LE(0, 4);                   // disk number
    eocd.writeUInt16LE(0, 6);                   // disk with start of CD
    eocd.writeUInt16LE(this.entries.length, 8); // entries on disk
    eocd.writeUInt16LE(this.entries.length, 10); // total entries
    eocd.writeUInt32LE(cdSize, 12);             // CD size
    eocd.writeUInt32LE(cdStart, 16);            // CD start offset
    eocd.writeUInt16LE(0, 20);                  // comment len
    buffers.push(eocd);

    return Buffer.concat(buffers);
  }

  _crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ SimpleZip.CRC_TABLE[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }
}

SimpleZip.CRC_TABLE = (() => {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const XlsxBuilder = {
  escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  sanitizeCellValue(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    // Formula injection mitigation: escape leading =, +, -, @
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    return str;
  },

  /**
   * Generates a genuine OpenXML .xlsx binary buffer from table headers and rows.
   */
  buildWorkbook(headerLines, tableHeaders, rows) {
    const zip = new SimpleZip();

    // 1. [Content_Types].xml
    zip.addFile('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);

    // 2. _rels/.rels
    zip.addFile('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

    // 3. xl/_rels/workbook.xml.rels
    zip.addFile('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

    // 4. xl/workbook.xml
    zip.addFile('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Jadwal Kegiatan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

    // 5. xl/styles.xml
    zip.addFile('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><name val="Calibri"/><sz val="11"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/></font>
    <font><b/><name val="Calibri"/><sz val="13"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAEAEA"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color auto="1"/></left>
      <right style="thin"><color auto="1"/></right>
      <top style="thin"><color auto="1"/></top>
      <bottom style="thin"><color auto="1"/></bottom>
    </border>
  </borders>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
  </cellXfs>
</styleSheet>`);

    // 6. xl/worksheets/sheet1.xml
    let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="3" width="18" customWidth="1"/>
    <col min="4" max="4" width="35" customWidth="1"/>
    <col min="5" max="5" width="25" customWidth="1"/>
    <col min="6" max="6" width="25" customWidth="1"/>
    <col min="7" max="7" width="28" customWidth="1"/>
    <col min="8" max="8" width="30" customWidth="1"/>
  </cols>
  <sheetData>`;

    let rowIdx = 1;
    // Header title lines
    headerLines.forEach(line => {
      sheetXml += `<row r="${rowIdx}">`;
      sheetXml += `<c r="A${rowIdx}" s="1" t="inlineStr"><is><t>${XlsxBuilder.escapeXml(line)}</t></is></c>`;
      sheetXml += `</row>`;
      rowIdx++;
    });

    rowIdx++; // Empty spacer row

    // Table Header row (style 2)
    const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    sheetXml += `<row r="${rowIdx}">`;
    tableHeaders.forEach((th, cIdx) => {
      const cellRef = `${colLetters[cIdx]}${rowIdx}`;
      sheetXml += `<c r="${cellRef}" s="2" t="inlineStr"><is><t>${XlsxBuilder.escapeXml(th)}</t></is></c>`;
    });
    sheetXml += `</row>`;
    rowIdx++;

    // Data rows (style 3)
    rows.forEach(r => {
      sheetXml += `<row r="${rowIdx}">`;
      r.forEach((cellVal, cIdx) => {
        const cellRef = `${colLetters[cIdx]}${rowIdx}`;
        const sanitized = XlsxBuilder.sanitizeCellValue(cellVal);
        sheetXml += `<c r="${cellRef}" s="3" t="inlineStr"><is><t>${XlsxBuilder.escapeXml(sanitized)}</t></is></c>`;
      });
      sheetXml += `</row>`;
      rowIdx++;
    });

    sheetXml += `</sheetData>
  <mergeCells count="${headerLines.length}">`;
    for (let m = 1; m <= headerLines.length; m++) {
      sheetXml += `<mergeCell ref="A${m}:H${m}"/>`;
    }
    sheetXml += `</mergeCells>
</worksheet>`;

    zip.addFile('xl/worksheets/sheet1.xml', sheetXml);
    return zip.toBuffer();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = XlsxBuilder;
}
if (typeof globalThis !== 'undefined') {
  globalThis.XlsxBuilder = XlsxBuilder;
}
