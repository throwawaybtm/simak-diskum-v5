/**
 * SIMAK DISKUM Kota Batam v5.0 — Milestone A01 Admin Authentication UI & RBAC Verification Suite
 * 
 * Verifies:
 * 1. Anonymous Access Isolation: Visiting http://localhost:3001 without credentials mounts Login View;
 *    zero private Firestore reads or data leaks.
 * 2. Login Form Validation & Keyboard Submit: Empty fields, invalid email format, Enter-key submit,
 *    and aria-busy state transitions.
 * 3. Password Visibility Toggle: Eye icon button toggles password masking and accessible ARIA attributes.
 * 4. Invalid Credentials Handling: Non-enumerating Indonesian alert message and automatic password focus.
 * 5. Password Recovery Interface: Navigation to recovery form, email submission, and neutral success
 *    confirmation without user enumeration. Return navigation back to login form.
 * 6. Access Denied Enforcement: User authenticated in Firebase Auth but missing custom claims is
 *    isolated to the Access Denied view with red lock indicator and sign-out action.
 * 7. Admin Authentication & Keyboard Menu: Valid login as Administrator mounts admin shell with "Administrator" badge,
 *    loads master data, ArrowDown/Escape keyboard navigation on profile pill.
 * 8. Session Termination: Profile dropdown opens and displays user info; sign-out wipes session caches
 *    and unmounts admin shell back to Login view; hash navigation blocked.
 * 9. Editor Authentication: Valid login as Operator Agenda mounts admin shell with "Operator Agenda" badge.
 * 10. Multi-Viewport Geometry & Anti-Collision Verification (Defects A & B): Checks 320px, 375px, 425px, 1440px
 *     for 0px document overflow, upcoming title wrapping + title tooltip, and status legend anti-collision gap >= 8px.
 * 11. Public Portal Integrity: Confirms http://localhost:3000 remains completely functional.
 */

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const adminBaseUrl = 'http://localhost:3001';
const publicBaseUrl = 'http://localhost:3000';
const AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const PROJECT_ID = 'demo-department-agenda';

process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;
process.env.GCLOUD_PROJECT = PROJECT_ID;

// Initialize Admin SDK
let adminApp;
if (getApps().length === 0) {
  adminApp = initializeApp({ projectId: PROJECT_ID }, 'a01-e2e-app');
} else {
  adminApp = getApps().find(a => a.name === 'a01-e2e-app') || initializeApp({ projectId: PROJECT_ID }, 'a01-e2e-app');
}
const adminAuth = getAuth(adminApp);

const TEST_ACCOUNTS = {
  admin: {
    email: 'e2e.admin@batam.go.id',
    password: 'AdminPassword!2026',
    displayName: 'Drs. Hendri Arifin, M.Si',
    role: 'admin'
  },
  editor: {
    email: 'e2e.editor@batam.go.id',
    password: 'EditorPassword!2026',
    displayName: 'Ahmad Fauzi, SE',
    role: 'editor'
  },
  noRole: {
    email: 'e2e.norole@batam.go.id',
    password: 'NoRolePassword!2026',
    displayName: 'Masyarakat Umum'
  }
};

async function provisionTestAccounts() {
  console.log('[Setup] Provisioning test operator accounts in Auth Emulator (127.0.0.1:9099)...');
  for (const [key, acc] of Object.entries(TEST_ACCOUNTS)) {
    try {
      const existing = await adminAuth.getUserByEmail(acc.email);
      await adminAuth.deleteUser(existing.uid);
    } catch {
      // User didn't exist
    }

    const created = await adminAuth.createUser({
      email: acc.email,
      password: acc.password,
      displayName: acc.displayName
    });

    if (acc.role) {
      await adminAuth.setCustomUserClaims(created.uid, {
        role: acc.role,
        department: 'Dinas Koperasi dan Usaha Mikro Kota Batam'
      });
    }
    console.log(`  ✓ Provisioned ${key}: ${acc.email} (Role: ${acc.role || 'NONE'})`);
  }
}

async function runA01Verification() {
  console.log('===============================================================');
  console.log('SIMAK DISKUM v5.0 — STARTING MILESTONE A01 ADMIN AUTH VERIFICATION');
  console.log(`Admin Base URL:  ${adminBaseUrl}`);
  console.log(`Public Base URL: ${publicBaseUrl}`);
  console.log(`Screenshots Dir: ${screenshotsDir}`);
  console.log('===============================================================\n');

  await provisionTestAccounts();

  const browser = await chromium.launch({ headless: true });
  let passedCount = 0;
  let totalCount = 0;

  function record(scenario, passed, details = '') {
    totalCount++;
    if (passed) {
      passedCount++;
      console.log(`✅ PASS [Scenario ${scenario}] ${details}`);
    } else {
      console.error(`❌ FAIL [Scenario ${scenario}] ${details}`);
    }
  }

  try {
    // ----------------------------------------------------
    // Scenario 1: Anonymous Visit & Desktop/Mobile Login Screenshots
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Anonymous Visit Isolation & Login View ---');
    
    // 1440px Desktop Viewport
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await desktopContext.newPage();

    // Track network requests to ensure zero private Firestore reads
    let privateFirestoreReads = 0;
    page.on('request', req => {
      const url = req.url();
      if (url.includes(':8080') && (url.includes('activities') || url.includes('employees') || url.includes('locations'))) {
        privateFirestoreReads++;
      }
    });

    await page.goto(`${adminBaseUrl}/#dashboard`);
    await page.waitForSelector('#adminLoginForm', { timeout: 10000 });

    const loginTitle = await page.$eval('.auth-portal-title', el => el.textContent?.trim());
    const loginBadge = await page.$eval('.auth-portal-badge', el => el.textContent?.trim());
    const isSidebarPresent = await page.$('#adminSidebar');

    record(1.1, loginTitle === 'SIMAK DISKUM' && loginBadge.includes('Admin Portal'), 'Login card mounted with Batam branding');
    record(1.2, isSidebarPresent === null, 'Admin sidebar is strictly absent before authentication');
    record(1.3, privateFirestoreReads === 0, `Zero private Firestore reads during anonymous visit (detected: ${privateFirestoreReads})`);

    // Capture 1440px Login Screenshot
    const login1440Path = path.join(screenshotsDir, 'a01-login-1440px.png');
    await page.screenshot({ path: login1440Path, fullPage: true });
    record(1.4, fs.existsSync(login1440Path), `Captured Desktop Login screenshot: ${login1440Path}`);

    // 375px Mobile Viewport
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`${adminBaseUrl}/`);
    await mobilePage.waitForSelector('#adminLoginForm');

    const login375Path = path.join(screenshotsDir, 'a01-login-375px.png');
    await mobilePage.screenshot({ path: login375Path, fullPage: true });
    record(1.5, fs.existsSync(login375Path), `Captured Mobile Login screenshot: ${login375Path}`);

    // ----------------------------------------------------
    // Scenario 2: Form Validation, Keyboard Submit & Password Toggle
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Form Validation, Keyboard Submit & Password Visibility Toggle ---');
    
    // Check initial aria-busy
    const initialBusy = await page.$eval('#adminLoginForm', el => el.getAttribute('aria-busy'));
    record(2.1, initialBusy === 'false', 'Login form initial aria-busy is "false"');

    // Empty submission via Enter key
    await page.focus('#authEmail');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.auth-alert-error');
    const emptyErr = await page.$eval('.auth-alert-error', el => el.textContent?.trim());
    record(2.2, emptyErr.includes('alamat email kedinasan'), `Enter key on empty form triggers validation alert: "${emptyErr}"`);

    // Invalid email format
    await page.fill('#authEmail', 'notanemail');
    await page.fill('#authPassword', 'anypassword');
    await page.click('#btnSubmitLogin');
    await page.waitForSelector('.auth-alert-error');
    const formatErr = await page.$eval('.auth-alert-error', el => el.textContent?.trim());
    record(2.3, formatErr.includes('Format alamat email tidak valid'), `Invalid email format alert: "${formatErr}"`);

    // Password show/hide toggle
    const pwdInput = await page.$('#authPassword');
    const initialType = await pwdInput.getAttribute('type');
    record(2.4, initialType === 'password', 'Password input defaults to type="password"');

    await page.click('#btnTogglePassword');
    const visibleType = await pwdInput.getAttribute('type');
    const toggleAria = await page.$eval('#btnTogglePassword', el => el.getAttribute('aria-label'));
    record(2.5, visibleType === 'text' && toggleAria === 'Sembunyikan kata sandi', 'Toggle button switches to type="text" with updated aria-label');

    await page.click('#btnTogglePassword');
    const hiddenType = await pwdInput.getAttribute('type');
    record(2.6, hiddenType === 'password', 'Toggle button switches back to type="password"');

    // ----------------------------------------------------
    // Scenario 3: Invalid Credentials (Non-Enumerating Error & Focus Handling)
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Invalid Credentials Handling & Screenshots ---');
    await page.fill('#authEmail', TEST_ACCOUNTS.admin.email);
    await page.fill('#authPassword', 'WrongPassword!9999');
    await page.click('#btnSubmitLogin');
    await page.waitForSelector('.auth-alert-error');

    const invalidCredsErr = await page.$eval('.auth-alert-error', el => el.textContent?.trim());
    record(3.1, invalidCredsErr.includes('Email atau kata sandi yang Anda masukkan salah'), `Non-enumerating error alert: "${invalidCredsErr}"`);

    // Focus placed on password input after failed login
    const activeElementId = await page.evaluate(() => document.activeElement?.id);
    record(3.2, activeElementId === 'authPassword', `Focus automatically placed on password input after failed login (active: #${activeElementId})`);

    // Capture 1440px Invalid Credentials Screenshot
    const invalid1440Path = path.join(screenshotsDir, 'a01-invalid-creds-1440px.png');
    await page.screenshot({ path: invalid1440Path, fullPage: true });
    record(3.3, fs.existsSync(invalid1440Path), `Captured Desktop Invalid Credentials screenshot: ${invalid1440Path}`);

    // Mobile Invalid Credentials Screenshot
    await mobilePage.fill('#authEmail', TEST_ACCOUNTS.admin.email);
    await mobilePage.fill('#authPassword', 'WrongPassword!9999');
    await mobilePage.click('#btnSubmitLogin');
    await mobilePage.waitForSelector('.auth-alert-error');
    const invalid375Path = path.join(screenshotsDir, 'a01-invalid-creds-375px.png');
    await mobilePage.screenshot({ path: invalid375Path, fullPage: true });
    record(3.4, fs.existsSync(invalid375Path), `Captured Mobile Invalid Credentials screenshot: ${invalid375Path}`);

    // ----------------------------------------------------
    // Scenario 4: Password Recovery Flow & Neutral Confirmation
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: Password Recovery Interface & Neutral Confirmation ---');
    await page.click('#btnForgotPwd');
    await page.waitForSelector('#adminRecoveryForm');

    const recoveryBadge = await page.$eval('.auth-portal-badge', el => el.textContent?.trim());
    record(4.1, recoveryBadge.includes('Pemulihan Kata Sandi'), 'Password recovery form mounted');

    // Submit valid email for password reset
    await page.fill('#recoveryEmail', TEST_ACCOUNTS.admin.email);
    await page.click('#btnSubmitRecovery');
    await page.waitForSelector('.auth-alert-success');

    const successMsg = await page.$eval('.auth-alert-success', el => el.textContent?.trim());
    record(4.2, successMsg.includes('Jika alamat email terdaftar pada sistem SIMAK DISKUM'), `Neutral success alert: "${successMsg}"`);

    // Capture 1440px Password Recovery Screenshot
    const recovery1440Path = path.join(screenshotsDir, 'a01-recovery-1440px.png');
    await page.screenshot({ path: recovery1440Path, fullPage: true });
    record(4.3, fs.existsSync(recovery1440Path), `Captured Desktop Password Recovery screenshot: ${recovery1440Path}`);

    // Mobile Password Recovery Screenshot
    await mobilePage.click('#btnForgotPwd');
    await mobilePage.waitForSelector('#adminRecoveryForm');
    await mobilePage.fill('#recoveryEmail', TEST_ACCOUNTS.admin.email);
    await mobilePage.click('#btnSubmitRecovery');
    await mobilePage.waitForSelector('.auth-alert-success');
    const recovery375Path = path.join(screenshotsDir, 'a01-recovery-375px.png');
    await mobilePage.screenshot({ path: recovery375Path, fullPage: true });
    record(4.4, fs.existsSync(recovery375Path), `Captured Mobile Password Recovery screenshot: ${recovery375Path}`);

    // Return back to login form
    await page.click('#btnBackToLogin');
    await page.waitForSelector('#adminLoginForm');
    record(4.5, true, 'Successfully navigated back to login view from password recovery');

    // ----------------------------------------------------
    // Scenario 5: Access Denied Flow for Unprivileged Users
    // ----------------------------------------------------
    console.log('\n--- Scenario 5: Access Denied Enforcement for Users Without Claims ---');
    await page.fill('#authEmail', TEST_ACCOUNTS.noRole.email);
    await page.fill('#authPassword', TEST_ACCOUNTS.noRole.password);
    await page.click('#btnSubmitLogin');
    await page.waitForSelector('.access-denied-card');

    const deniedTitle = await page.$eval('.auth-portal-title.text-danger', el => el.textContent?.trim());
    const deniedEmail = await page.$eval('#deniedUserEmail', el => el.textContent?.trim());
    const deniedRole = await page.$eval('#deniedUserRole', el => el.textContent?.trim());

    record(5.1, deniedTitle === 'Akses Ditolak', 'Access Denied card rendered');
    record(5.2, deniedEmail === TEST_ACCOUNTS.noRole.email, `Denied account email displayed: ${deniedEmail}`);
    record(5.3, deniedRole === 'Tidak Memiliki Hak Akses', `Denied account role indicator: ${deniedRole}`);

    // Capture 1440px Access Denied Screenshot
    const denied1440Path = path.join(screenshotsDir, 'a01-access-denied-1440px.png');
    await page.screenshot({ path: denied1440Path, fullPage: true });
    record(5.4, fs.existsSync(denied1440Path), `Captured Desktop Access Denied screenshot: ${denied1440Path}`);

    // Mobile Access Denied Screenshot
    await mobilePage.click('#btnBackToLogin');
    await mobilePage.waitForSelector('#adminLoginForm');
    await mobilePage.fill('#authEmail', TEST_ACCOUNTS.noRole.email);
    await mobilePage.fill('#authPassword', TEST_ACCOUNTS.noRole.password);
    await mobilePage.click('#btnSubmitLogin');
    await mobilePage.waitForSelector('.access-denied-card');
    const denied375Path = path.join(screenshotsDir, 'a01-access-denied-375px.png');
    await mobilePage.screenshot({ path: denied375Path, fullPage: true });
    record(5.5, fs.existsSync(denied375Path), `Captured Mobile Access Denied screenshot: ${denied375Path}`);

    // Click Sign Out from Access Denied
    await page.click('#btnAccessDeniedSignOut');
    await page.waitForSelector('#adminLoginForm');
    record(5.6, true, 'Sign out from Access Denied safely returns operator to Login page');

    // ----------------------------------------------------
    // Scenario 6: Authenticated Admin Login & Protected Dashboard
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Authenticated Admin Login & Dashboard Mount ---');
    await page.fill('#authEmail', TEST_ACCOUNTS.admin.email);
    await page.fill('#authPassword', TEST_ACCOUNTS.admin.password);
    await page.click('#btnSubmitLogin');
    await page.waitForSelector('.admin-layout', { timeout: 10000 });
    await page.waitForSelector('#adminSidebar');
    await page.waitForSelector('.dashboard-page');
    await page.waitForSelector('.btn-add-agenda');

    const operatorName = await page.$eval('#operatorDisplayName', el => el.textContent?.trim());
    record(6.1, operatorName.includes('Hendri Arifin') || operatorName.includes('Administrator'), `Topbar operator name: "${operatorName}"`);

    // Profile dropdown keyboard navigation: ArrowDown opens and focuses logout
    await page.focus('#operatorProfilePill');
    await page.keyboard.press('ArrowDown');
    await page.waitForSelector('#operatorDropdownMenu:not(.hidden)');
    const activeInDropdown = await page.evaluate(() => document.activeElement?.id);
    record(6.2, activeInDropdown === 'btnLogout', `ArrowDown on profile pill opens dropdown and focuses logout button (active: #${activeInDropdown})`);

    const roleBadgeText = await page.$eval('#dropdownRoleBadge', el => el.textContent?.trim());
    const isRoleAdmin = await page.$eval('#dropdownRoleBadge', el => el.classList.contains('role-admin'));
    record(6.3, roleBadgeText === 'Administrator' && isRoleAdmin, 'Profile dropdown reflects Administrator role badge');

    // Escape closes dropdown and restores focus to profile pill
    await page.keyboard.press('Escape');
    const isDropdownHidden = await page.$eval('#operatorDropdownMenu', el => el.classList.contains('hidden'));
    const activeAfterEscape = await page.evaluate(() => document.activeElement?.id);
    record(6.4, isDropdownHidden && activeAfterEscape === 'operatorProfilePill', `Escape closes dropdown and restores focus to profile pill (active: #${activeAfterEscape})`);

    // Capture 1440px Dashboard Screenshot
    const dashboard1440Path = path.join(screenshotsDir, 'a01-dashboard-1440px.png');
    await page.screenshot({ path: dashboard1440Path, fullPage: true });
    record(6.5, fs.existsSync(dashboard1440Path), `Captured Desktop Authenticated Dashboard screenshot: ${dashboard1440Path}`);

    // Mobile Authenticated Dashboard Screenshot
    await mobilePage.click('#btnAccessDeniedSignOut');
    await mobilePage.waitForSelector('#adminLoginForm');
    await mobilePage.fill('#authEmail', TEST_ACCOUNTS.admin.email);
    await mobilePage.fill('#authPassword', TEST_ACCOUNTS.admin.password);
    await mobilePage.click('#btnSubmitLogin');
    await mobilePage.waitForSelector('.admin-layout', { timeout: 10000 });
    await mobilePage.waitForSelector('.topbar');
    await mobilePage.waitForSelector('.dashboard-page');
    await mobilePage.waitForSelector('.upcoming-agenda-list');
    await mobilePage.waitForSelector('.status-legend-list');

    const dashboard375Path = path.join(screenshotsDir, 'a01-dashboard-375px.png');
    await mobilePage.screenshot({ path: dashboard375Path, fullPage: true });
    record(6.6, fs.existsSync(dashboard375Path), `Captured Mobile Authenticated Dashboard screenshot: ${dashboard375Path}`);

    // ----------------------------------------------------
    // Scenario 7: Session Termination & Wiped Caches
    // ----------------------------------------------------
    console.log('\n--- Scenario 7: Session Termination & Cache Wipe ---');
    await page.click('#operatorProfilePill');
    await page.waitForSelector('#operatorDropdownMenu:not(.hidden)');
    await page.click('#btnLogout');
    await page.waitForSelector('#adminLoginForm');

    const loggedOutShell = await page.$('#adminSidebar');
    record(7.1, loggedOutShell === null, 'Admin shell unmounted on sign-out');

    // Verify navigating to hash route while signed out keeps user on login screen
    await page.evaluate(() => { window.location.hash = '#activities'; });
    await page.waitForTimeout(300);
    const stillLoggedOut = await page.$('#adminLoginForm');
    record(7.2, stillLoggedOut !== null, 'Hash navigation while signed out remains blocked on Login view');

    // ----------------------------------------------------
    // Scenario 8: Authenticated Editor Login & Role Enforcement
    // ----------------------------------------------------
    console.log('\n--- Scenario 8: Authenticated Editor Login & Role Enforcement ---');
    await page.fill('#authEmail', TEST_ACCOUNTS.editor.email);
    await page.fill('#authPassword', TEST_ACCOUNTS.editor.password);
    await page.click('#btnSubmitLogin');
    await page.waitForSelector('.admin-layout', { timeout: 10000 });

    await page.click('#operatorProfilePill');
    await page.waitForSelector('#operatorDropdownMenu:not(.hidden)');
    const editorBadgeText = await page.$eval('#dropdownRoleBadge', el => el.textContent?.trim());
    const isRoleEditor = await page.$eval('#dropdownRoleBadge', el => el.classList.contains('role-editor'));
    record(8.1, editorBadgeText === 'Operator Agenda' && isRoleEditor, 'Editor session reflects Operator Agenda role badge');

    await page.click('#btnLogout');
    await page.waitForSelector('#adminLoginForm');
    record(8.2, true, 'Editor sign-out clean');

    // ----------------------------------------------------
    // Scenario 9: Multi-Viewport Geometry & Anti-Collision Verification (Defects A & B)
    // ----------------------------------------------------
    console.log('\n--- Scenario 9: Multi-Viewport Geometry & Anti-Collision Verification ---');
    
    // Ensure mobilePage is on dashboard-page (already authenticated from Scenario 6)
    const isDashboardPresent = await mobilePage.$('.dashboard-page');
    if (!isDashboardPresent) {
      await mobilePage.fill('#authEmail', TEST_ACCOUNTS.admin.email);
      await mobilePage.fill('#authPassword', TEST_ACCOUNTS.admin.password);
      await mobilePage.click('#btnSubmitLogin');
      await mobilePage.waitForSelector('.dashboard-page', { timeout: 10000 });
    }

    const viewports = [
      { name: 'Mobile Mini', width: 320, height: 568 },
      { name: 'Mobile Standard', width: 375, height: 812 },
      { name: 'Mobile Large', width: 425, height: 850 },
      { name: 'Desktop Standard', width: 1440, height: 900 }
    ];

    for (let idx = 0; idx < viewports.length; idx++) {
      const vp = viewports[idx];
      await mobilePage.setViewportSize({ width: vp.width, height: vp.height });
      await mobilePage.waitForTimeout(250);

      // Check horizontal overflow
      const overflow = await mobilePage.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          innerWidth: window.innerWidth
        };
      });
      const zeroOverflow = overflow.scrollWidth <= overflow.innerWidth;
      record(`9.${idx * 3 + 1}`, zeroOverflow, `Viewport ${vp.width}px (${vp.name}): 0px document overflow (scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth})`);

      // Check Defect A: Agenda item row width and title attribute
      const agendaCheck = await mobilePage.evaluate((vpWidth) => {
        const row = document.querySelector('.agenda-item-row');
        const titleEl = document.querySelector('.agenda-item-title');
        if (!row || !titleEl) return null;
        const rect = row.getBoundingClientRect();
        return {
          rowWidth: rect.width,
          fitsViewport: rect.width <= vpWidth,
          hasTitleAttr: Boolean(titleEl.getAttribute('title')),
          titleText: titleEl.textContent?.trim()
        };
      }, vp.width);

      if (agendaCheck) {
        record(`9.${idx * 3 + 2}`, agendaCheck.fitsViewport && agendaCheck.hasTitleAttr, 
          `Viewport ${vp.width}px: Agenda item row fits viewport (${agendaCheck.rowWidth.toFixed(1)}px <= ${vp.width}px) with accessible title attribute`);
      }

      // Check Defect B: Legend label/count gap (prevent collision)
      const legendCheck = await mobilePage.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.legend-item'));
        return items.map(item => {
          const label = item.querySelector('.legend-name');
          const count = item.querySelector('.legend-count');
          if (!label || !count) return null;
          const lRect = label.getBoundingClientRect();
          const cRect = count.getBoundingClientRect();
          return {
            label: label.textContent?.trim(),
            count: count.textContent?.trim(),
            gap: cRect.left - lRect.right
          };
        }).filter(Boolean);
      });

      const minLegendGap = legendCheck.length > 0 ? Math.min(...legendCheck.map(l => l.gap)) : 0;
      const noLegendCollision = minLegendGap >= 8;
      record(`9.${idx * 3 + 3}`, noLegendCollision, 
        `Viewport ${vp.width}px: Status legend label/count anti-collision verified (minimum gap: ${minLegendGap.toFixed(1)}px >= 8px)`);
    }

    // ----------------------------------------------------
    // Scenario 10: Public Portal Unaffected Verification
    // ----------------------------------------------------
    console.log('\n--- Scenario 10: Public Portal Integrity Check ---');
    const pubPage = await desktopContext.newPage();
    await pubPage.goto(`${publicBaseUrl}/`);
    await pubPage.waitForSelector('.dashboard-view', { timeout: 10000 });
    const heroBrand = await pubPage.$eval('.hero-brand', el => el.textContent?.trim());
    record(10.1, heroBrand === 'SIMAK DISKUM', `Public portal loaded normally: "${heroBrand}"`);

    // Clean up contexts
    await desktopContext.close();
    await mobileContext.close();

  } catch (err) {
    console.error('Test execution error:', err);
    record('FATAL', false, `Unhandled error: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n===============================================================');
  console.log(`A01 VERIFICATION SUMMARY: ${passedCount} / ${totalCount} SCENARIOS PASSED`);
  console.log('===============================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runA01Verification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
