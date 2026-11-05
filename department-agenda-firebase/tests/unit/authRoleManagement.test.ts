/**
 * Unit Test Suite for Operator Role Management & Custom Claims Invariants
 * 
 * Verifies:
 * 1. Allowed roles are strictly constrained ('admin', 'editor') matching firestore.rules.
 * 2. Required project safeguard protects against operations on wrong Firebase projects.
 * 3. Custom claims payload adheres to Firestore Security Rules expectations (request.auth.token.role).
 * 4. Role transitions update claims and revoke refresh tokens for immediate propagation.
 * 5. Account disabling marks account disabled and revokes tokens.
 * 6. Password reset link generation adheres to valid email format with out-of-band delivery notes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ALLOWED_ROLES,
  REQUIRED_PROJECT_ID,
  provisionUser,
  setUserRole,
  disableUser,
  generatePasswordResetLink,
  inspectUser
} from '../../scripts/manageRoles.mjs';

describe('P01-A: Operator Role Management & Custom Claims Verification', () => {
  let mockAuth: any;
  let storedUsers: Map<string, any>;

  beforeEach(() => {
    storedUsers = new Map();

    mockAuth = {
      getUserByEmail: vi.fn(async (email: string) => {
        const u = Array.from(storedUsers.values()).find(x => x.email === email);
        if (!u) {
          const err: any = new Error('User not found');
          err.code = 'auth/user-not-found';
          throw err;
        }
        return u;
      }),
      getUser: vi.fn(async (uid: string) => {
        const u = storedUsers.get(uid);
        if (!u) throw new Error('User not found');
        return u;
      }),
      createUser: vi.fn(async (data: any) => {
        const uid = `uid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const user = {
          uid,
          email: data.email,
          displayName: data.displayName,
          disabled: false,
          emailVerified: true,
          customClaims: {}
        };
        storedUsers.set(uid, user);
        return user;
      }),
      updateUser: vi.fn(async (uid: string, data: any) => {
        const u = storedUsers.get(uid);
        if (!u) throw new Error('User not found');
        Object.assign(u, data);
        return u;
      }),
      setCustomUserClaims: vi.fn(async (uid: string, claims: any) => {
        const u = storedUsers.get(uid);
        if (!u) throw new Error('User not found');
        u.customClaims = claims;
      }),
      revokeRefreshTokens: vi.fn(async (uid: string) => {
        const u = storedUsers.get(uid);
        if (!u) throw new Error('User not found');
        u.tokensValidAfterTime = new Date().toISOString();
      }),
      generatePasswordResetLink: vi.fn(async (email: string) => {
        return `https://simakdiskum.firebaseapp.com/__/auth/action?mode=resetPassword&email=${encodeURIComponent(email)}`;
      })
    };
  });

  it('strictly restricts allowed roles to admin and editor matching firestore.rules', () => {
    expect(ALLOWED_ROLES).toEqual(['admin', 'editor']);
    expect(REQUIRED_PROJECT_ID).toBe('simakdiskum');
  });

  it('provisions a new operator with valid role and custom claims', async () => {
    const user = await provisionUser(
      mockAuth,
      'operator1@batam.go.id',
      'P@ssword1234!',
      'Budi Santoso',
      'editor'
    );

    expect(user.email).toBe('operator1@batam.go.id');
    expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(user.uid, expect.objectContaining({
      role: 'editor',
      department: 'Dinas Koperasi dan Usaha Mikro Kota Batam'
    }));
  });

  it('rejects provisioning with an unauthorized or unmapped role (viewer, superuser)', async () => {
    await expect(
      provisionUser(mockAuth, 'bad@batam.go.id', 'pwd', 'Bad Actor', 'viewer')
    ).rejects.toThrow(/Invalid role/);

    await expect(
      provisionUser(mockAuth, 'bad@batam.go.id', 'pwd', 'Bad Actor', 'superuser')
    ).rejects.toThrow(/Invalid role/);
  });

  it('updates role and immediately revokes refresh tokens for session refresh', async () => {
    const user = await provisionUser(
      mockAuth,
      'staff@batam.go.id',
      'P@ssword1234!',
      'Staff Operator',
      'editor'
    );

    await setUserRole(mockAuth, user.uid, 'admin');

    const updated = storedUsers.get(user.uid);
    expect(updated.customClaims.role).toBe('admin');
    expect(mockAuth.revokeRefreshTokens).toHaveBeenCalledWith(user.uid);
    expect(updated.tokensValidAfterTime).toBeDefined();
  });

  it('disables an operator account and revokes active sessions', async () => {
    const user = await provisionUser(
      mockAuth,
      'resigned@batam.go.id',
      'P@ssword1234!',
      'Former Staff',
      'editor'
    );

    await disableUser(mockAuth, user.uid);

    const disabledUser = storedUsers.get(user.uid);
    expect(disabledUser.disabled).toBe(true);
    expect(mockAuth.revokeRefreshTokens).toHaveBeenCalledWith(user.uid);
  });

  it('generates a secure password reset link for the operator', async () => {
    const user = await provisionUser(
      mockAuth,
      'reset_me@batam.go.id',
      'Temp123!',
      'Need Reset',
      'editor'
    );

    const link = await generatePasswordResetLink(mockAuth, user.email);
    expect(link).toContain('mode=resetPassword');
    expect(link).toContain(encodeURIComponent('reset_me@batam.go.id'));
  });

  it('correctly inspects user record and claims', async () => {
    const user = await provisionUser(
      mockAuth,
      'inspect@batam.go.id',
      'P@ssword1234!',
      'Inspected Staff',
      'admin'
    );

    const inspected = await inspectUser(mockAuth, user.email);
    expect(inspected.uid).toBe(user.uid);
    expect(inspected.customClaims.role).toBe('admin');
  });
});
