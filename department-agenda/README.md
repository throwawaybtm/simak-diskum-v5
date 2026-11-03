# Department Activity Scheduling System (v4.0)

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Technology:** Google Apps Script (V8 runtime), HTML Service, Google Sheets  
**Timezone:** Asia/Jakarta (WIB / UTC+7)  

---

## Architecture Summary

This repository contains the complete implementation for the **Department Activity Scheduling System v4.0** for Dinas Koperasi dan Usaha Mikro Kota Batam. It consists of two standalone Google Apps Script web applications sharing one private Google Sheets database:

- **`public-app/`**: Standalone anonymous, read-only web portal for citizens and external partners.
  - Interactive Dashboard, Monthly/Weekly/Daily Calendar, and searchable Agenda.
  - Generates official 8-column print layouts and genuine OpenXML `.xlsx` exports.
  - Strict privacy boundary: zero private meeting credentials or internal notes.
- **`admin-app/`**: Standalone full-screen responsive admin web app (NOT a Google Sheets sidebar).
  - Complete CRUD for activities and soft-deactivated master data.
  - Concurrency management via `LockService` and optimistic locking (`expectedVersion`).
  - Intelligent conflict detection for bookable office rooms and shared personnel.
  - Live public preview and privacy leak detection on public notes.
- **`shared/`**: Pure business logic (WIB time intervals, schemas, validation, conflict detection, projection, export formatting, and migration parser).
- **`tests/`**: Comprehensive offline test suite (40 unit and end-to-end integration tests).

---

## Local Development & Testing

Run all unit and integration tests locally using Node.js:
```bash
# Run all 40 tests across 9 test suites
npm test

# Synchronize shared modules into Apps Script projects
npm run sync
```

---

## Project Structure

```text
department-agenda/
├── admin-app/                  # Admin Apps Script Project
│   ├── .clasp.json
│   └── src/
│       ├── appsscript.json     # Edit scopes
│       ├── Code.gs             # Admin entrypoint & RPC endpoints
│       ├── ActivityApi.gs      # CRUD, locking, versioning, conflicts
│       ├── MasterApi.gs        # Master data & audit history
│       ├── Repository.gs       # Sheets data access layer
│       ├── Index.html          # Full-screen responsive management app
│       ├── AdminStyles.html    # Municipal CSS theme
│       ├── AdminScripts.html   # Client controller, live preview & modals
│       └── shared/             # Synced pure business logic
├── public-app/                 # Public Apps Script Project
│   ├── .clasp.json
│   └── src/
│       ├── appsscript.json     # spreadsheets.readonly scope
│       ├── Code.gs             # Public entrypoint & read-only proxies
│       ├── PublicApi.gs        # Read-only public endpoints
│       ├── PublicRepository.gs # Read-only sheets reader
│       ├── Index.html          # Public dashboard, calendar & agenda portal
│       ├── Styles.html         # Responsive styling
│       ├── Scripts.html        # Interactive calendar & export handlers
│       └── shared/             # Synced pure business logic
├── shared/                     # Pure JS core business logic
│   ├── ConflictDetector.js     # Half-open interval conflict detection
│   ├── ExportFormatter.js      # 8-column layout & landscape print view
│   ├── Migration.js            # Legacy October 2026 agenda row parser
│   ├── Projection.js           # Safe public DTO sanitizer
│   ├── Schema.js               # 10 sheet tables & column schemas
│   ├── SeedGenerator.js        # Initial database seed generator
│   ├── TimeUtils.js            # Asia/Jakarta WIB interval math & date text
│   └── XlsxBuilder.js          # Genuine OpenXML (.xlsx) ZIP builder
├── tests/                      # Automated test suites
├── DEPLOYMENT.md               # Step-by-step clasp push & Google deployment guide
└── package.json
```

---

## Pushing to Google Apps Script

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed configuration, script ID setup, and clasp push commands.
