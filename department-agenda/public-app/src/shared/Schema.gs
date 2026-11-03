/**
 * shared/Schema.js
 * Database schema definitions, column layouts, and enumeration constants
 * for Dinas Koperasi dan Usaha Mikro Kota Batam Activity Scheduling System v4.0.
 */

const Schema = {
  TABLES: {
    Activities: {
      name: 'Activities',
      columns: [
        'activity_id', 'title', 'start_date', 'start_time', 'end_date', 'end_time',
        'location_id', 'organizer_id', 'category_id', 'status', 'public_notes',
        'private_notes', 'private_meeting_url', 'cancel_reason', 'version',
        'created_at', 'created_by', 'updated_at', 'updated_by'
      ],
      primaryKey: 'activity_id'
    },
    ActivityAttendees: {
      name: 'ActivityAttendees',
      columns: [
        'attendee_id', 'activity_id', 'employee_id', 'guest_name', 'attendee_role',
        'name_snapshot', 'position_snapshot', 'public_label'
      ],
      primaryKey: 'attendee_id'
    },
    Employees: {
      name: 'Employees',
      columns: ['employee_id', 'full_name', 'position', 'department_id', 'active'],
      primaryKey: 'employee_id'
    },
    Departments: {
      name: 'Departments',
      columns: ['department_id', 'name', 'active'],
      primaryKey: 'department_id'
    },
    Locations: {
      name: 'Locations',
      columns: ['location_id', 'name', 'location_type', 'active'],
      primaryKey: 'location_id'
    },
    Organizers: {
      name: 'Organizers',
      columns: ['organizer_id', 'name', 'active'],
      primaryKey: 'organizer_id'
    },
    Categories: {
      name: 'Categories',
      columns: ['category_id', 'name', 'active'],
      primaryKey: 'category_id'
    },
    Announcements: {
      name: 'Announcements',
      columns: ['announcement_id', 'title', 'body', 'publish_at', 'expires_at', 'active'],
      primaryKey: 'announcement_id'
    },
    AuditLogs: {
      name: 'AuditLogs',
      columns: [
        'log_id', 'request_id', 'timestamp', 'actor_label', 'action',
        'entity_id', 'before_json', 'after_json'
      ],
      primaryKey: 'log_id'
    },
    Settings: {
      name: 'Settings',
      columns: ['key', 'value'],
      primaryKey: 'key'
    }
  },

  STATUS: {
    SCHEDULED: 'SCHEDULED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED'
  },

  LOCATION_TYPE: {
    OFFICE: 'OFFICE',
    EXTERNAL: 'EXTERNAL',
    ONLINE: 'ONLINE'
  },

  TIMEZONE: 'Asia/Jakarta',
  WIB_OFFSET_HOURS: 7,

  OFFICIAL_HEADERS_8: [
    'No',
    'Hari / Tanggal',
    'Pukul',
    'Kegiatan',
    'Tempat',
    'Penyelenggara',
    'Dihadiri Oleh',
    'Keterangan'
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Schema;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Schema = Schema;
}
