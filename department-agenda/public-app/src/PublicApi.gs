/**
 * public-app/src/PublicApi.gs
 * Read-Only Public RPC API for Google Apps Script.
 */

var PublicApi = (function() {
  return {
    getDashboardData: function() {
      var todayWib = TimeUtils.getTodayWib();
      var activities = PublicRepository.readAll('Activities');
      var attendees = PublicRepository.readAll('ActivityAttendees');
      var locations = PublicRepository.readAll('Locations');
      var organizers = PublicRepository.readAll('Organizers');
      var categories = PublicRepository.readAll('Categories');
      var announcements = PublicRepository.readAll('Announcements');

      var lookups = { locations: locations, organizers: organizers, categories: categories };

      var todayParts = todayWib.split('-').map(Number);
      var todayD = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]));
      var next7D = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2] + 7));
      var next7Str = next7D.getUTCFullYear() + '-' + String(next7D.getUTCMonth() + 1).padStart(2, '0') + '-' + String(next7D.getUTCDate()).padStart(2, '0');

      var rawToday = activities.filter(function(a) {
        var end = a.end_date || a.start_date;
        return a.start_date <= todayWib && end >= todayWib && a.status !== 'CANCELLED';
      });

      var rawUpcoming = activities.filter(function(a) {
        var end = a.end_date || a.start_date;
        return a.start_date <= next7Str && end >= todayWib && a.status !== 'CANCELLED';
      });

      var nowIso = new Date().toISOString();
      var activeAnnouncements = announcements.filter(function(ann) {
        if (ann.active === false || ann.active === 'FALSE') return false;
        if (ann.publish_at && ann.publish_at > nowIso) return false;
        if (ann.expires_at && ann.expires_at < nowIso) return false;
        return true;
      }).map(function(ann) {
        return {
          id: ann.announcement_id,
          title: ann.title,
          body: ann.body
        };
      });

      var todayActivities = Projection.projectPublicList(rawToday, attendees, lookups);
      var upcomingActivities = Projection.projectPublicList(rawUpcoming, attendees, lookups);

      var monthPrefix = todayWib.substring(0, 7);
      var monthCount = activities.filter(function(a) {
        return a.start_date && a.start_date.indexOf(monthPrefix) === 0 && a.status !== 'CANCELLED';
      }).length;

      return {
        ok: true,
        data: {
          todayWib: todayWib,
          todayActivities: todayActivities,
          upcomingActivities: upcomingActivities,
          activeAnnouncements: activeAnnouncements,
          counts: {
            today: todayActivities.length,
            upcomingWeek: upcomingActivities.length,
            thisMonth: monthCount
          }
        }
      };
    },

    getPublicActivities: function(filters) {
      filters = filters || {};
      var activities = PublicRepository.readAll('Activities');
      var attendees = PublicRepository.readAll('ActivityAttendees');
      var locations = PublicRepository.readAll('Locations');
      var organizers = PublicRepository.readAll('Organizers');
      var categories = PublicRepository.readAll('Categories');

      var lookups = { locations: locations, organizers: organizers, categories: categories };

      var startDate = filters.startDate;
      var endDate = filters.endDate;
      var categoryId = filters.categoryId;
      var status = filters.status;
      var query = filters.query ? filters.query.toLowerCase() : null;

      var filtered = activities.filter(function(act) {
        var actEnd = act.end_date || act.start_date;

        if (startDate && actEnd < startDate) return false;
        if (endDate && act.start_date > endDate) return false;
        if (categoryId && act.category_id !== categoryId) return false;
        if (status && act.status !== status) return false;

        if (query) {
          var titleMatch = (act.title || '').toLowerCase().indexOf(query) !== -1;
          var notesMatch = (act.public_notes || '').toLowerCase().indexOf(query) !== -1;
          if (!titleMatch && !notesMatch) return false;
        }

        return true;
      });

      filtered.sort(function(a, b) {
        var cmpDate = (a.start_date || '').localeCompare(b.start_date || '');
        if (cmpDate !== 0) return cmpDate;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      var safeItems = Projection.projectPublicList(filtered, attendees, lookups);

      return {
        ok: true,
        data: {
          items: safeItems,
          total: safeItems.length
        }
      };
    },

    getPublicExport: function(filters, format) {
      filters = filters || {};
      format = format || 'PRINT';

      var activities = PublicRepository.readAll('Activities');
      var attendees = PublicRepository.readAll('ActivityAttendees');
      var locations = PublicRepository.readAll('Locations');
      var organizers = PublicRepository.readAll('Organizers');
      var categories = PublicRepository.readAll('Categories');
      var settings = PublicRepository.readAll('Settings');

      var lookups = { locations: locations, organizers: organizers, categories: categories };

      var startDate = filters.startDate;
      var endDate = filters.endDate;

      var filtered = activities.filter(function(act) {
        if (act.status === 'CANCELLED') return false;
        var actEnd = act.end_date || act.start_date;
        if (startDate && actEnd < startDate) return false;
        if (endDate && act.start_date > endDate) return false;
        return true;
      });

      filtered.sort(function(a, b) {
        var cmpDate = (a.start_date || '').localeCompare(b.start_date || '');
        if (cmpDate !== 0) return cmpDate;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      var attendeesByAct = new Map();
      attendees.forEach(function(a) {
        if (!attendeesByAct.has(a.activity_id)) attendeesByAct.set(a.activity_id, []);
        attendeesByAct.get(a.activity_id).push(a.public_label || a.name_snapshot);
      });

      var enriched = filtered.map(function(act) {
        return Object.assign({}, act, {
          attendee_labels: attendeesByAct.get(act.activity_id) || []
        });
      });

      var deptSetting = settings.find(function(s) { return s.key === 'DEPARTMENT_NAME'; });
      var titleSetting = settings.find(function(s) { return s.key === 'EXPORT_TITLE'; });

      var headerInfo = {
        title: titleSetting ? titleSetting.value : 'JADWAL KEGIATAN',
        department: deptSetting ? deptSetting.value : 'DINAS KOPERASI DAN USAHA MIKRO KOTA BATAM',
        period: (startDate && endDate) ? ('PERIODE ' + startDate + ' S.D. ' + endDate) : ''
      };

      if (format === 'XLSX') {
        var buffer = ExportFormatter.generateXlsxBuffer(enriched, lookups, headerInfo);
        var base64Str = Utilities.base64Encode(buffer);
        return {
          ok: true,
          format: 'XLSX',
          base64: base64Str,
          filename: 'Jadwal_Kegiatan_Diskum_Batam_' + (startDate || 'Semua') + '.xlsx'
        };
      } else {
        var html = ExportFormatter.generateHtmlPrintView(enriched, lookups, headerInfo);
        return {
          ok: true,
          format: 'PRINT',
          html: html
        };
      }
    }
  };
})();
