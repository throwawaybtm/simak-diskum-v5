/**
 * SIMAK DISKUM Kota Batam v5.0 — Milestone A01 Admin Authentication Service Integration Tests
 * 
 * Verifies:
 * 1. Email format validation (civic and general formats).
 * 2. Strict RBAC role claim resolution matching Gate 5A firestore.rules.
 * 3. Uppercase role claims and missing claims correctly evaluated to ACCESS_DENIED.
 * 4. Real Firebase Auth Emulator integration:
 *    - Valid admin credentials yield AUTHENTICATED_ADMIN.
 *    - Valid editor credentials yield AUTHENTICATED_EDITOR.
 *    - Authenticated user without role claim yields ACCESS_DENIED.
 *    - Disabled account throws Indonesian disabled-account notification.
 *    - Non-existent user or invalid password returns non-enumerating error.
 *    - Password reset request returns uniform neutral message (zero enumeration).
 *    - Token refresh and sign-out lifecycle.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initClientApp } from 'firebase/app';
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signOut as clientSignOut,
  signInWithEmailAndPassword
} from 'firebase/auth';

import {
  isValidEmailFormat,
  resolveUserProfile,
  signInOperator,
  requestPasswordReset,
  signOutOperator,
  refreshUserClaims
} from '../../apps/admin/src/auth/authService';
import { auth as clientAuthInstance } from '../../apps/admin/src/firebase';

const AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const PROJECT_ID = 'demo-department-agenda';

describe('Milestone A01: Administrative Authentication & Session RBAC Service', () => {
  let adminAuth: ReturnType<typeof getAdminAuth>;
  const testUsers = {
    admin: { email: 'a01.admin@batam.go.id', pass: 'AdminSecr3t!2026', role: 'admin', uid: '' },
    editor: { email: 'a01.editor@batam.go.id', pass: 'EditorSecr3t!2026', role: 'editor', uid: '' },
    noRole: { email: 'a01.norole@batam.go.id', pass: 'NoRoleSecr3t!2026', uid: '' },
    disabled: { email: 'a01.disabled@batam.go.id', pass: 'DisabledSecr3t!2026', role: 'editor', uid: '' }
  };

  beforeAll(async () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;
    process.env.GCLOUD_PROJECT = PROJECT_ID;

    // Initialize Admin SDK for test user provisioning
    let adminApp;
    if (getAdminApps().length === 0) {
      adminApp = initAdminApp({ projectId: PROJECT_ID }, 'a01-auth-test');
    } else {
      adminApp = getAdminApps().find(a => a.name === 'a01-auth-test') || initAdminApp({ projectId: PROJECT_ID }, 'a01-auth-test');
    }
    adminAuth = getAdminAuth(adminApp);

    // Clean up or provision test accounts in the Auth emulator
    for (const [key, user] of Object.entries(testUsers)) {
      try {
        const existing = await adminAuth.getUserByEmail(user.email);
        await adminAuth.deleteUser(existing.uid);
      } catch {
        // User didn't exist, proceed
      }

      const created = await adminAuth.createUser({
        email: user.email,
        password: user.pass,
        displayName: key.toUpperCase() + ' Operator',
        disabled: key === 'disabled'
      });
      user.uid = created.uid;

      if ((user as any).role) {
        await adminAuth.setCustomUserClaims(created.uid, {
          role: (user as any).role,
          department: 'Dinas Koperasi dan Usaha Mikro Kota Batam'
        });
      }
    }
  });

  afterAll(async () => {
    // Clean up test accounts
    for (const user of Object.values(testUsers)) {
      if (user.uid) {
        try {
          await adminAuth.deleteUser(user.uid);
        } catch {
          // ignore
        }
      }
    }
    await signOutOperator();
  });

  // ========================================================================
  // 1. Email Format Validation
  // ========================================================================
  describe('Email Format Validation', () => {
    it('accepts standard governmental and civic email formats', () => {
      expect(isValidEmailFormat('operator@batam.go.id')).toBe(true);
      expect(isValidEmailFormat('admin.diskum@batam.go.id')).toBe(true);
      expect(isValidEmailFormat('john.doe123@example.com')).toBe(true);
    });

    it('rejects invalid email formats and empty inputs', () => {
      expect(isValidEmailFormat('')).toBe(false);
      expect(isValidEmailFormat('   ')).toBe(false);
      expect(isValidEmailFormat('not-an-email')).toBe(false);
      expect(isValidEmailFormat('operator@')).toBe(false);
      expect(isValidEmailFormat('@batam.go.id')).toBe(false);
      expect(isValidEmailFormat('operator@batam')).toBe(false);
      expect(isValidEmailFormat(null as any)).toBe(false);
    });
  });

  // ========================================================================
  // 2. Strict Custom Claims Resolution & RBAC Evaluation
  // ========================================================================
  describe('Custom Claims Resolution & RBAC State Machine', () => {
    it('evaluates role: "admin" to AUTHENTICATED_ADMIN with Administrator label', async () => {
      const mockUser: any = {
        uid: 'test_uid_1',
        email: 'kadis@batam.go.id',
        displayName: 'Kepala Dinas',
        getIdTokenResult: async () => ({
          claims: { role: 'admin', department: 'Dinas Koperasi' }
        })
      };

      const { state, profile } = await resolveUserProfile(mockUser, false);
      expect(state).toBe('AUTHENTICATED_ADMIN');
      expect(profile.role).toBe('admin');
      expect(profile.roleLabel).toBe('Administrator');
      expect(profile.email).toBe('kadis@batam.go.id');
    });

    it('evaluates role: "editor" to AUTHENTICATED_EDITOR with Operator Agenda label', async () => {
      const mockUser: any = {
        uid: 'test_uid_2',
        email: 'staff@batam.go.id',
        displayName: 'Staf Agenda',
        getIdTokenResult: async () => ({
          claims: { role: 'editor', department: 'Sekretariat' }
        })
      };

      const { state, profile } = await resolveUserProfile(mockUser, false);
      expect(state).toBe('AUTHENTICATED_EDITOR');
      expect(profile.role).toBe('editor');
      expect(profile.roleLabel).toBe('Operator Agenda');
    });

    it('strictly denies uppercase "ADMIN" or "EDITOR" as ACCESS_DENIED matching Firestore Rules', async () => {
      const mockUserUpper: any = {
        uid: 'test_uid_3',
        email: 'upper@batam.go.id',
        getIdTokenResult: async () => ({
          claims: { role: 'ADMIN' } // uppercase forbidden
        })
      };

      const { state, profile } = await resolveUserProfile(mockUserUpper, false);
      expect(state).toBe('ACCESS_DENIED');
      expect(profile.role).toBe('unauthorized');
      expect(profile.roleLabel).toBe('Tidak Memiliki Hak Akses');
    });

    it('strictly denies users without custom claims or unrecognized roles as ACCESS_DENIED', async () => {
      const mockUserNoRole: any = {
        uid: 'test_uid_4',
        email: 'public@gmail.com',
        getIdTokenResult: async () => ({
          claims: {}
        })
      };

      const { state, profile } = await resolveUserProfile(mockUserNoRole, false);
      expect(state).toBe('ACCESS_DENIED');
      expect(profile.role).toBe('unauthorized');

      const mockUserViewer: any = {
        uid: 'test_uid_5',
        email: 'viewer@batam.go.id',
        getIdTokenResult: async () => ({
          claims: { role: 'viewer' } // non-whitelisted role
        })
      };

      const resViewer = await resolveUserProfile(mockUserViewer, false);
      expect(resViewer.state).toBe('ACCESS_DENIED');
      expect(resViewer.profile.role).toBe('unauthorized');
    });
  });

  // ========================================================================
  // 3. Real Auth Emulator Integration: Login & Input Validation
  // ========================================================================
  describe('Operator Authentication & Real Auth Emulator Integration', () => {
    it('validates empty email before network call', async () => {
      await expect(signInOperator('', 'P@ssword1234!')).rejects.toThrow('Silakan masukkan alamat email kedinasan.');
    });

    it('validates invalid email format before network call', async () => {
      await expect(signInOperator('invalid-format', 'P@ssword1234!')).rejects.toThrow('Format alamat email tidak valid.');
    });

    it('validates empty password before network call', async () => {
      await expect(signInOperator('operator@batam.go.id', '')).rejects.toThrow('Silakan masukkan kata sandi Anda.');
    });

    it('returns uniform non-enumerating error message for wrong password', async () => {
      await expect(
        signInOperator(testUsers.admin.email, 'WrongPassword123!')
      ).rejects.toThrow('Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
    });

    it('returns uniform non-enumerating error message for non-existent user', async () => {
      await expect(
        signInOperator('ghost.operator@batam.go.id', 'SomePassword123!')
      ).rejects.toThrow('Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
    });

    it('returns descriptive disabled error message when account is disabled', async () => {
      await expect(
        signInOperator(testUsers.disabled.email, testUsers.disabled.pass)
      ).rejects.toThrow('Akun ini telah dinonaktifkan oleh administrator. Silakan hubungi pengelola sistem.');
    });

    it('successfully signs in as Admin and resolves verified claims', async () => {
      const user = await signInOperator(testUsers.admin.email, testUsers.admin.pass);
      expect(user.email).toBe(testUsers.admin.email);

      const { state, profile } = await resolveUserProfile(user, true);
      expect(state).toBe('AUTHENTICATED_ADMIN');
      expect(profile.role).toBe('admin');
      expect(profile.roleLabel).toBe('Administrator');

      // Test token refresh
      const refreshedProfile = await refreshUserClaims();
      expect(refreshedProfile?.role).toBe('admin');

      await signOutOperator();
      expect(clientAuthInstance.currentUser).toBeNull();
    });

    it('successfully signs in as Editor and resolves verified claims', async () => {
      const user = await signInOperator(testUsers.editor.email, testUsers.editor.pass);
      expect(user.email).toBe(testUsers.editor.email);

      const { state, profile } = await resolveUserProfile(user, true);
      expect(state).toBe('AUTHENTICATED_EDITOR');
      expect(profile.role).toBe('editor');
      expect(profile.roleLabel).toBe('Operator Agenda');

      await signOutOperator();
      expect(clientAuthInstance.currentUser).toBeNull();
    });

    it('signs in user without claims but state resolves to ACCESS_DENIED', async () => {
      const user = await signInOperator(testUsers.noRole.email, testUsers.noRole.pass);
      expect(user.email).toBe(testUsers.noRole.email);

      const { state, profile } = await resolveUserProfile(user, true);
      expect(state).toBe('ACCESS_DENIED');
      expect(profile.role).toBe('unauthorized');

      await signOutOperator();
    });
  });

  // ========================================================================
  // 4. Password Recovery & Anti-Enumeration Protection
  // ========================================================================
  describe('Password Recovery & Anti-Enumeration Defense', () => {
    it('validates empty email before sending reset request', async () => {
      await expect(requestPasswordReset('')).rejects.toThrow('Silakan masukkan alamat email kedinasan.');
    });

    it('validates invalid email format before sending reset request', async () => {
      await expect(requestPasswordReset('bad-email')).rejects.toThrow('Format alamat email tidak valid.');
    });

    it('returns neutral success message for registered email address', async () => {
      const res = await requestPasswordReset(testUsers.admin.email);
      expect(res.success).toBe(true);
      expect(res.message).toBe(
        'Jika alamat email terdaftar pada sistem SIMAK DISKUM, instruksi dan tautan pemulihan kata sandi telah dikirimkan ke email tersebut.'
      );
    });

    it('returns IDENTICAL neutral success message for non-registered email to defeat account enumeration', async () => {
      const res = await requestPasswordReset('nonexistent.staff@batam.go.id');
      expect(res.success).toBe(true);
      expect(res.message).toBe(
        'Jika alamat email terdaftar pada sistem SIMAK DISKUM, instruksi dan tautan pemulihan kata sandi telah dikirimkan ke email tersebut.'
      );
    });
  });
});
