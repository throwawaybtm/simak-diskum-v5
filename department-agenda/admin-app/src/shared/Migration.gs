/**
 * shared/Migration.js
 * Migration and import parser for legacy 8-column department agenda spreadsheets.
 * Intelligently separates private Zoom credentials from public notes.
 */

const MONTH_MAP = {
  januari: '01', januari: '01', februari: '02', maret: '03', april: '04',
  mei: '05', juni: '06', juli: '07', agustus: '08', september: '09',
  oktober: '10', november: '11', desember: '12'
};

const Migration = {
  /**
   * Parse Indonesian date strings like "Kamis 1 Oktober 2026" or "1 Oktober 2026"
   * into ISO YYYY-MM-DD.
   */
  parseIndonesianDate(str) {
    if (!str) return null;
    const clean = str.replace(',', ' ').trim();
    const tokens = clean.split(/\s+/);

    // Look for day, monthName, year
    let day = null;
    let month = null;
    let year = null;

    for (let i = 0; i < tokens.length; i++) {
      const lower = tokens[i].toLowerCase();
      if (MONTH_MAP[lower]) {
        month = MONTH_MAP[lower];
        if (i > 0 && /^\d{1,2}$/.test(tokens[i - 1])) {
          day = String(tokens[i - 1]).padStart(2, '0');
        }
        if (i < tokens.length - 1 && /^\d{4}$/.test(tokens[i + 1])) {
          year = tokens[i + 1];
        }
      }
    }

    if (day && month && year) {
      return `${year}-${month}-${day}`;
    }
    return null;
  },

  /**
   * Parse Indonesian time expressions:
   * e.g. "07.00 WIB s.d. selesai", "09.00 WIB s.d Selesai", "09.00 - 11.00 WIB"
   */
  parseTime(str) {
    if (!str) return { startTime: null, endTime: null, isUntilFinished: false };

    const isUntilFinished = /s\.?d\.?\s*selesai/i.test(str);
    const times = [];
    const timeMatch = str.matchAll(/(\d{1,2})[.:](\d{2})/g);
    for (const match of timeMatch) {
      const h = String(match[1]).padStart(2, '0');
      const m = String(match[2]);
      times.push(`${h}:${m}`);
    }

    const startTime = times.length > 0 ? times[0] : null;
    const endTime = times.length > 1 && !isUntilFinished ? times[1] : null;

    return {
      startTime,
      endTime,
      isUntilFinished: isUntilFinished || (times.length === 1 && !endTime)
    };
  },

  /**
   * Parse multiline attendee column:
   * e.g. "1. Kadis\n2. Sekretaris\n3. Kabid"
   */
  parseAttendees(str) {
    if (!str) return [];
    const lines = str.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map((line, idx) => {
      const role = line.replace(/^\d+[\.\)]\s*/, '').trim();
      return {
        attendee_id: `migrated-att-${idx + 1}`,
        public_label: line,
        attendee_role: role,
        name_snapshot: role,
        position_snapshot: role
      };
    });
  },

  /**
   * Parse a single legacy 8-column row object.
   */
  parseLegacyRow(row) {
    const rawDate = row.hari_tanggal || row['Hari / Tanggal'] || '';
    const rawTime = row.pukul || row['Pukul'] || '';
    const title = (row.kegiatan || row['Kegiatan'] || '').trim();
    const locationName = (row.tempat || row['Tempat'] || '').trim();
    const organizerName = (row.penyelenggara || row['Penyelenggara'] || '').trim();
    const rawAttendees = row.dihadiri_oleh || row['Dihadiri Oleh'] || '';
    const rawNotes = row.keterangan || row['Keterangan'] || '';

    const startDate = Migration.parseIndonesianDate(rawDate);
    const timeInfo = Migration.parseTime(rawTime);
    const attendees = Migration.parseAttendees(rawAttendees);

    // Split rawNotes into private meeting credentials and public remarks
    let privateMeetingUrl = '';
    const privateNotesLines = [];
    const publicNotesLines = [];

    const noteLines = rawNotes.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    noteLines.forEach(line => {
      // Zoom or meeting URL
      const urlMatch = line.match(/https?:\/\/[^\s]+(zoom\.us|meet\.google\.com|teams\.microsoft\.com)[^\s]*/i);
      if (urlMatch) {
        privateMeetingUrl = urlMatch[0];
      }

      // Meeting ID / Passcode
      if (/meeting\s*id|passcode|pwd=|password|pin/i.test(line)) {
        privateNotesLines.push(line);
      } else if (!urlMatch) {
        publicNotesLines.push(line);
      }
    });

    const activity = {
      title,
      start_date: startDate,
      start_time: timeInfo.startTime,
      end_date: startDate,
      end_time: timeInfo.endTime,
      is_until_finished: timeInfo.isUntilFinished,
      location_name: locationName,
      organizer_name: organizerName,
      status: 'SCHEDULED',
      public_notes: publicNotesLines.join('\n'),
      private_notes: privateNotesLines.join('\n'),
      private_meeting_url: privateMeetingUrl,
      version: 1
    };

    return {
      activity,
      attendees
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Migration;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Migration = Migration;
}
