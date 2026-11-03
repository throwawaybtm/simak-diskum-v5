/**
 * shared/XlsxBuilder.js
 * Pure ECMAScript OpenXML (.xlsx) builder.
 * Uses standard Uint8Array, DataView, and TextEncoder for 100% compatibility across
 * Google Apps Script V8 and Node.js.
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
 * Standard ECMAScript ZIP archive builder using Uint8Array and DataView.
 */
class SimpleZip {
  constructor() {
    this.entries = [];
    this.encoder = new TextEncoder();
  }

  addFile(path, contentStr) {
    const data = typeof contentStr === 'string' ? this.encoder.encode(contentStr) : contentStr;
    const crc = this._crc32(data);
    let compressedData = data;
    let method = 0; // STORE

    if (zlibModule && zlibModule.deflateRawSync) {
      try {
        compressedData = new Uint8Array(zlibModule.deflateRawSync(data));
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

  toUint8Array() {
    const chunks = [];
    const centralDirs = [];
    let offset = 0;

    for (const entry of this.entries) {
      const nameBytes = this.encoder.encode(entry.path);

      // Local file header: 30 bytes + filename length
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const dv = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);

      dv.setUint32(0, 0x04034b50, true);          // PK\x03\x04
      dv.setUint16(4, 20, true);                  // version needed: 2.0
      dv.setUint16(6, 0, true);                   // flags
      dv.setUint16(8, entry.method, true);        // method
      dv.setUint16(10, 0, true);                  // time
      dv.setUint16(12, 0, true);                  // date
      dv.setUint32(14, entry.crc, true);          // crc-32
      dv.setUint32(18, entry.compressedSize, true);
      dv.setUint32(22, entry.uncompressedSize, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);                  // extra len
      localHeader.set(nameBytes, 30);

      chunks.push(localHeader);
      chunks.push(entry.data);

      // Central directory header: 46 bytes + filename length
      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cdDv = new DataView(cdHeader.buffer, cdHeader.byteOffset, cdHeader.byteLength);

      cdDv.setUint32(0, 0x02014b50, true);        // PK\x01\x02
      cdDv.setUint16(4, 20, true);                // version made by
      cdDv.setUint16(6, 20, true);                // version needed
      cdDv.setUint16(8, 0, true);                 // flags
      cdDv.setUint16(10, entry.method, true);     // method
      cdDv.setUint16(12, 0, true);                // time
      cdDv.setUint16(14, 0, true);                // date
      cdDv.setUint32(16, entry.crc, true);        // crc
      cdDv.setUint32(20, entry.compressedSize, true);
      cdDv.setUint32(24, entry.uncompressedSize, true);
      cdDv.setUint16(28, nameBytes.length, true);
      cdDv.setUint16(30, 0, true);                // extra len
      cdDv.setUint16(32, 0, true);                // comment len
      cdDv.setUint16(34, 0, true);                // disk start
      cdDv.setUint16(36, 0, true);                // internal attr
      cdDv.setUint32(38, 0, true);                // external attr
      cdDv.setUint32(42, offset, true);           // offset of local header
      cdHeader.set(nameBytes, 46);

      centralDirs.push(cdHeader);
      offset += localHeader.length + entry.data.length;
    }

    const cdStart = offset;
    let cdSize = 0;
    for (const cd of centralDirs) {
      chunks.push(cd);
      cdSize += cd.length;
    }

    // End of central directory record (22 bytes)
    const eocd = new Uint8Array(22);
    const eocdDv = new DataView(eocd.buffer, eocd.byteOffset, eocd.byteLength);
    eocdDv.setUint32(0, 0x06054b50, true);         // PK\x05\x06
    eocdDv.setUint16(4, 0, true);                  // disk number
    eocdDv.setUint16(6, 0, true);                  // disk with CD
    eocdDv.setUint16(8, this.entries.length, true); // entries on disk
    eocdDv.setUint16(10, this.entries.length, true); // total entries
    eocdDv.setUint32(12, cdSize, true);            // CD size
    eocdDv.setUint32(16, cdStart, true);           // CD start offset
    eocdDv.setUint16(20, 0, true);                 // comment len
    chunks.push(eocd);

    // Calculate total length and concatenate
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }

    const result = new Uint8Array(totalLength);
    let curOffset = 0;
    for (const chunk of chunks) {
      result.set(chunk, curOffset);
      curOffset += chunk.length;
    }

    return result;
  }

  _crc32(bytes) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ SimpleZip.CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
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
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    return str;
  },

  generateXmlParts(headerLines, tableHeaders, rows) {
    const parts = {};

    parts['[Content_Types].xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    parts['_rels/.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    parts['xl/_rels/workbook.xml.rels'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    parts['xl/workbook.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Jadwal Kegiatan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

    parts['xl/styles.xml'] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</styleSheet>`;

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
    headerLines.forEach(line => {
      sheetXml += `<row r="${rowIdx}">`;
      sheetXml += `<c r="A${rowIdx}" s="1" t="inlineStr"><is><t>${XlsxBuilder.escapeXml(line)}</t></is></c>`;
      sheetXml += `</row>`;
      rowIdx++;
    });

    rowIdx++; // Empty row

    const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    sheetXml += `<row r="${rowIdx}">`;
    tableHeaders.forEach((th, cIdx) => {
      const cellRef = `${colLetters[cIdx]}${rowIdx}`;
      sheetXml += `<c r="${cellRef}" s="2" t="inlineStr"><is><t>${XlsxBuilder.escapeXml(th)}</t></is></c>`;
    });
    sheetXml += `</row>`;
    rowIdx++;

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

    parts['xl/worksheets/sheet1.xml'] = sheetXml;
    return parts;
  },

  /**
   * Generates a standard Uint8Array containing genuine OpenXML .xlsx archive.
   */
  buildWorkbookUint8Array(headerLines, tableHeaders, rows) {
    const zip = new SimpleZip();
    const parts = XlsxBuilder.generateXmlParts(headerLines, tableHeaders, rows);

    for (const filePath of Object.keys(parts)) {
      zip.addFile(filePath, parts[filePath]);
    }

    return zip.toUint8Array();
  },

  /**
   * Generates Node.js Buffer or Uint8Array.
   */
  buildWorkbook(headerLines, tableHeaders, rows) {
    const uint8 = XlsxBuilder.buildWorkbookUint8Array(headerLines, tableHeaders, rows);
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      return Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength);
    }
    return uint8;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = XlsxBuilder;
}
if (typeof globalThis !== 'undefined') {
  globalThis.XlsxBuilder = XlsxBuilder;
}
