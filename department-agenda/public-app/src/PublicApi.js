/**
 * public-app/src/PublicApi.js / PublicApi.gs
 * Read-Only Public RPC API for Citizens and External Visitors.
 * Guarantees zero sensitive data leakage by channeling all responses through Projection.
 */

let PublicRepoModule;
let ProjectionModule;
let TimeUtilsModule;
let ExportFormatterModule;

if (typeof require !== 'undefined') {
  try {
    PublicRepoModule = require('./PublicRepository.js');
    ProjectionModule = require('../../shared/Projection.js');
    TimeUtilsModule = require('../../shared/TimeUtils.js');
    ExportFormatterModule = require('../../shared/ExportFormatter.js');
  } catch (e) {
    PublicRepoModule = globalThis.PublicRepository;
    ProjectionModule = globalThis.Projection;
    TimeUtilsModule = globalThis.TimeUtils;
    ExportFormatterModule = globalThis.ExportFormatter;
  }
} else {
  PublicRepoModule = globalThis.PublicRepository;
  ProjectionModule = globalThis.Projection;
  TimeUtilsModule = globalThis.TimeUtils;
  ExportFormatterModule = globalThis.ExportFormatter;
}

const PublicApi = {
  getDashboardData() {
    const todayWib = TimeUtilsModule.getTodayWib();
    const activities = PublicRepoModule.readAll('Activities');
    const attendees = PublicRepoModule.readAll('ActivityAttendees');
    const locations = PublicRepoModule.readAll('Locations');
    const organizers = PublicRepoModule.readAll('Organizers');
    const categories = PublicRepoModule.readAll('Categories');
    const announcements = PublicRepoModule.readAll('Announcements');

    const lookups = { locations, organizers, categories };

    // Calculate 7-day window
    const todayParts = todayWib.split('-').map(Number);
    const todayD = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
    const next7D = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2] + 7));
    const next7Str = `${next7D.getUTCFullYear()}-${String(next7D.getUTCMonth() + 1).padStart(2, '0')}-${String(next7D.getUTCDate()).padStart(2, '0')}`;

    // Filter today
    const rawToday = activities.filter(a => {
      const end = a.end_date || a.start_date;
      return a.start_date <= todayWib && end >= todayWib && a.status !== 'CANCELLED';
    });

    // Filter next 7 days
    const rawUpcoming = activities.filter(a => {
      const end = a.end_date || a.start_date;
      return a.start_date <= next7Str && end >= todayWib && a.status !== 'CANCELLED';
    });

    // Active announcements
    const nowIso = new Date().toISOString();
    const activeAnnouncements = announcements.filter(ann => {
      if (ann.active === false || ann.active === 'FALSE') return false;
      if (ann.publish_at && ann.publish_at > nowIso) return false;
      if (ann.expires_at && ann.expires_at < nowIso) return false;
      return true;
    }).map(ann => ({
      id: ann.announcement_id,
      title: ann.title,
      body: ann.body
    }));

    // Safe projections
    const todayActivities = ProjectionModule.projectPublicList(rawToday, attendees, lookups);
    const upcomingActivities = ProjectionModule.projectPublicList(rawUpcoming, attendees, lookups);

    // Derived counts
    const monthPrefix = todayWib.substring(0, 7); // YYYY-MM
    const monthCount = activities.filter(a => (a.start_date && a.start_date.startsWith(monthPrefix)) && a.status !== 'CANCELLED').length;

    return {
      ok: true,
      data: {
        todayWib,
        todayActivities,
        upcomingActivities,
        activeAnnouncements,
        counts: {
          today: todayActivities.length,
          upcomingWeek: upcomingActivities.length,
          thisMonth: monthCount
        }
      }
    };
  },

  getPublicActivities(filters = {}) {
    const activities = PublicRepoModule.readAll('Activities');
    const attendees = PublicRepoModule.readAll('ActivityAttendees');
    const locations = PublicRepoModule.readAll('Locations');
    const organizers = PublicRepoModule.readAll('Organizers');
    const categories = PublicRepoModule.readAll('Categories');

    const lookups = { locations, organizers, categories };

    const startDate = filters.startDate;
    const endDate = filters.endDate;
    const categoryId = filters.categoryId;
    const status = filters.status;
    const query = filters.query ? filters.query.toLowerCase() : null;

    // Filter raw activities
    const filtered = activities.filter(act => {
      const actEnd = act.end_date || act.start_date;

      // Multi-day date range intersection
      if (startDate && actEnd < startDate) return false;
      if (endDate && act.start_date > endDate) return false;

      // Category
      if (categoryId && act.category_id !== categoryId) return false;

      // Status
      if (status && act.status !== status) return false;

      // Text query
      if (query) {
        const titleMatch = (act.title || '').toLowerCase().includes(query);
        const notesMatch = (act.public_notes || '').toLowerCase().includes(query);
        if (!titleMatch && !notesMatch) return false;
      }

      return true;
    });

    // Sort ascending by start_date, start_time
    filtered.sort((a, b) => {
      const cmpDate = (a.start_date || '').localeCompare(b.start_date || '');
      if (cmpDate !== 0) return cmpDate;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    const safeItems = ProjectionModule.projectPublicList(filtered, attendees, lookups);

    return {
      ok: true,
      data: {
        items: safeItems,
        total: safeItems.length
      }
    };
  },

  getPublicExport(filters = {}, format = 'PRINT') {
    const activities = PublicRepoModule.readAll('Activities');
    const attendees = PublicRepoModule.readAll('ActivityAttendees');
    const locations = PublicRepoModule.readAll('Locations');
    const organizers = PublicRepoModule.readAll('Organizers');
    const categories = PublicRepoModule.readAll('Categories');
    const settings = PublicRepoModule.readAll('Settings');

    const lookups = { locations, organizers, categories };

    const startDate = filters.startDate;
    const endDate = filters.endDate;

    const filtered = activities.filter(act => {
      if (act.status === 'CANCELLED') return false; // Exclude cancelled from official export
      const actEnd = act.end_date || act.start_date;
      if (startDate && actEnd < startDate) return false;
      if (endDate && act.start_date > endDate) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const cmpDate = (a.start_date || '').localeCompare(b.start_date || '');
      if (cmpDate !== 0) return cmpDate;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    // Enrich attendee labels
    const attendeesByAct = new Map();
    attendees.forEach(a => {
      if (!attendeesByAct.has(a.activity_id)) attendeesByAct.set(a.activity_id, []);
      attendeesByAct.get(a.activity_id).push(a.public_label || a.name_snapshot);
    });

    const enriched = filtered.map(act => {
      return Object.assign({}, act, {
        attendee_labels: attendeesByAct.get(act.activity_id) || []
      });
    });

    const deptSetting = settings.find(s => s.key === 'DEPARTMENT_NAME');
    const titleSetting = settings.find(s => s.key === 'EXPORT_TITLE');

    const headerInfo = {
      title: titleSetting ? titleSetting.value : 'JADWAL KEGIATAN',
      department: deptSetting ? deptSetting.value : 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
      period: (startDate && endDate) ? `PERIODE ${startDate} S.D. ${endDate}` : ''
    };

    if (format === 'XLSX') {
      const buffer = ExportFormatterModule.generateXlsxBuffer(enriched, lookups, headerInfo);
      return {
        ok: true,
        format: 'XLSX',
        base64: buffer.toString('base64'),
        filename: `Jadwal_Kegiatan_Diskum_Batam_${startDate || 'Semua'}.xlsx`
      };
    } else {
      const html = ExportFormatterModule.generateHtmlPrintView(enriched, lookups, headerInfo);
      return {
        ok: true,
        format: 'PRINT',
        html
      };
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PublicApi;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PublicApi = PublicApi;
}
