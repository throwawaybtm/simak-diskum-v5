# Department Activity Scheduling System (v4.0) - Deployment & Push Guide

**Client:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Target Environment:** Google Apps Script (GAS) Web Applications & Private Google Sheets Database  
**Timezone:** Asia/Jakarta (WIB / UTC+7)  

---

## 1. Overview of Deployed Architecture

The solution consists of **three Google resources**:
1. **One Private Google Sheet:** Stores the 10 relational tabs (`Activities`, `ActivityAttendees`, `Employees`, `Departments`, `Locations`, `Organizers`, `Categories`, `Announcements`, `AuditLogs`, `Settings`). End-users never access or edit this spreadsheet directly.
2. **Public Standalone GAS Project (`public-app/`):** Read-only web app deployed anonymously. Authorized strictly with `spreadsheets.readonly` scope. Projects safe DTOs only; completely excludes private meeting URLs and internal notes.
3. **Admin Standalone GAS Project (`admin-app/`):** Full-screen responsive web app for authorized operators. Uses `LockService`, optimistic concurrency checks (`expectedVersion`), overlap conflict warnings, and audit logging.

---

## 2. Setting Up the Private Google Sheet Database

1. Create a new Google Sheet in Google Drive (name: `Database - Agenda Kegiatan Diskum Batam`).
2. Copy the Spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`
3. Create the 10 sheets (tabs) with Row 1 frozen and column headers matching `shared/Schema.js`:
   - **`Activities`**: `activity_id`, `title`, `start_date`, `start_time`, `end_date`, `end_time`, `location_id`, `organizer_id`, `category_id`, `status`, `public_notes`, `private_notes`, `private_meeting_url`, `cancel_reason`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`
   - **`ActivityAttendees`**: `attendee_id`, `activity_id`, `employee_id`, `guest_name`, `attendee_role`, `name_snapshot`, `position_snapshot`, `public_label`
   - **`Employees`**: `employee_id`, `full_name`, `position`, `department_id`, `active`
   - **`Departments`**: `department_id`, `name`, `active`
   - **`Locations`**: `location_id`, `name`, `location_type`, `active`
   - **`Organizers`**: `organizer_id`, `name`, `active`
   - **`Categories`**: `category_id`, `name`, `active`
   - **`Announcements`**: `announcement_id`, `title`, `body`, `publish_at`, `expires_at`, `active`
   - **`AuditLogs`**: `log_id`, `request_id`, `timestamp`, `actor_label`, `action`, `entity_id`, `before_json`, `after_json`
   - **`Settings`**: `key`, `value`

> **Tip:** You can populate the initial seed data from `tests/fixtures/initial_seed.json`.

---

## 3. Creating the Apps Script Projects

1. Visit [script.google.com](https://script.google.com) and create two standalone projects:
   - Project 1: `Diskum Batam - Agenda Publik`
   - Project 2: `Diskum Batam - Agenda Admin`
2. In each project, go to **Project Settings** (gear icon) and copy its **Script ID**.
3. In **Project Settings**, scroll down to **Script Properties** and add:
   - Property: `SPREADSHEET_ID`
   - Value: `<YOUR_SPREADSHEET_ID>`

---

## 4. Configuring Clasp & Pushing Code

From your developer workstation:

### Step 4.1: Login to Google via Clasp
```bash
cmd /c "clasp login"
```
Follow the browser authorization prompt to generate `~/.clasprc.json`.

### Step 4.2: Update `.clasp.json`
- In `public-app/.clasp.json`:
  ```json
  {
    "scriptId": "<YOUR_PUBLIC_SCRIPT_ID>",
    "rootDir": "src"
  }
  ```
- In `admin-app/.clasp.json`:
  ```json
  {
    "scriptId": "<YOUR_ADMIN_SCRIPT_ID>",
    "rootDir": "src"
  }
  ```

### Step 4.3: Synchronize and Push
From the repository root:
```bash
# Sync shared modules
npm run sync

# Push Public App
cd public-app
clasp push

# Push Admin App
cd ../admin-app
clasp push
```

---

## 5. Web App Deployment Settings

### Deploy Public Web App:
1. In the Public Apps Script editor, click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Description: `Public Agenda v4.0`.
4. Execute as: **Me** (deployer).
5. Who has access: **Anyone** (allows citizens and staff to browse without login).
6. Click **Deploy** and copy the `/exec` URL.

### Deploy Admin Web App (Staging Mode):
1. In the Admin Apps Script editor, click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Description: `Admin Staging v4.0`.
4. Execute as: **Me**.
5. Who has access: **Anyone** (STAGING ONLY with synthetic data).
6. Click **Deploy** and copy the `/exec` URL.

---

## 6. Gate 5: Production Security Decision & Launch Gate

> [!WARNING]
> **CRITICAL SECURITY REQUIREMENT (v4.0 Handbook Section 08):**
> Deploying the Admin Web App as "Anyone" executing as "Me" allows any visitor who discovers or accesses the URL to invoke administrative mutations.
> 
> **Do not launch an unauthenticated admin app against live departmental records.**
> 
> Before switching from staging to live production data:
> 1. Approve a production access control policy (e.g., Google Workspace organizational domain restriction, or deployer-only access with server-side authorized email checks).
> 2. Ensure all operators are identified and verified (`identity_source` updated from `UNVERIFIED` to `GOOGLE_WORKSPACE`).
> 3. Verify that the private Google Sheet is restricted strictly to the deployment service account/owner.
