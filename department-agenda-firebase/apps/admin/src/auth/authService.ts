/**
 * SIMAK DISKUM Kota Batam v5.0 — Administrative Authentication Service
 * 
 * Implements strict RBAC state machine, session persistence, non-enumerating error messages,
 * and verified custom claims resolution matching Gate 5A firestore.rules.
 */

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
  type IdTokenResult
} from 'firebase/auth';
import { auth } from '../firebase';

export type AuthState = 
  | 'AUTH_LOADING'
  | 'SIGNED_OUT'
  | 'AUTHENTICATED_ADMIN'
  | 'AUTHENTICATED_EDITOR'
  | 'ACCESS_DENIED'
  | 'AUTH_ERROR';

export interface CurrentUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'editor' | 'unauthorized';
  roleLabel: string;
  department: string;
  claims: Record<string, any>;
}

export type AuthStateListener = (
  state: AuthState,
  profile: CurrentUserProfile | null,
  errorMessage?: string
) => void;

/**
 * Validates basic email address formatting
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Resolves user profile and custom claims from verified Firebase ID token
 * Note: Only strictly lowercase 'admin' and 'editor' are granted access.
 */
export async function resolveUserProfile(user: User, forceRefresh = true): Promise<{
  state: AuthState;
  profile: CurrentUserProfile;
}> {
  const tokenResult: IdTokenResult = await user.getIdTokenResult(forceRefresh);
  const claims = tokenResult.claims || {};
  const rawRole = claims.role;

  let role: 'admin' | 'editor' | 'unauthorized' = 'unauthorized';
  let roleLabel = 'Tidak Memiliki Hak Akses';
  let state: AuthState = 'ACCESS_DENIED';

  if (rawRole === 'admin') {
    role = 'admin';
    roleLabel = 'Administrator';
    state = 'AUTHENTICATED_ADMIN';
  } else if (rawRole === 'editor') {
    role = 'editor';
    roleLabel = 'Operator Agenda';
    state = 'AUTHENTICATED_EDITOR';
  }

  const profile: CurrentUserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || (role === 'admin' ? 'Administrator' : 'Operator Agenda'),
    role,
    roleLabel,
    department: (claims.department as string) || 'Dinas Koperasi dan Usaha Mikro Kota Batam',
    claims
  };

  return { state, profile };
}

/**
 * Subscribes to Firebase Authentication state changes with fresh claim resolution
 */
export function subscribeAuthState(callback: AuthStateListener): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback('SIGNED_OUT', null);
      return;
    }

    try {
      const { state, profile } = await resolveUserProfile(user, true);
      callback(state, profile);
    } catch (err: any) {
      console.warn('[Admin Auth] Error resolving user token claims:', err);
      if (err.code === 'auth/user-disabled' || err.message?.includes('user-disabled')) {
        callback('ACCESS_DENIED', null, 'Akun ini telah dinonaktifkan oleh administrator.');
      } else {
        callback('AUTH_ERROR', null, 'Gagal memverifikasi hak akses operator. Silakan muat ulang halaman.');
      }
    }
  });
}

/**
 * Authenticates operator using Email and Password
 * Returns user-friendly, non-enumerating Indonesian error messages.
 */
export async function signInOperator(email: string, password: string): Promise<User> {
  const cleanEmail = (email || '').trim();
  const cleanPassword = password || '';

  if (!cleanEmail) {
    throw new Error('Silakan masukkan alamat email kedinasan.');
  }

  if (!isValidEmailFormat(cleanEmail)) {
    throw new Error('Format alamat email tidak valid.');
  }

  if (!cleanPassword) {
    throw new Error('Silakan masukkan kata sandi Anda.');
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    return credential.user;
  } catch (err: any) {
    console.warn('[Admin Auth] Sign in rejected:', err.code);

    // Non-enumerating authentication error message for bad credentials
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/wrong-password' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-login-credentials'
    ) {
      throw new Error('Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
    }

    if (err.code === 'auth/user-disabled') {
      throw new Error('Akun ini telah dinonaktifkan oleh administrator. Silakan hubungi pengelola sistem.');
    }

    if (err.code === 'auth/too-many-requests') {
      throw new Error('Terlalu banyak percobaan masuk yang gagal. Silakan tunggu beberapa saat sebelum mencoba kembali.');
    }

    if (err.code === 'auth/network-request-failed') {
      throw new Error('Gagal terhubung ke server autentikasi. Periksa koneksi internet Anda.');
    }

    throw new Error('Gagal masuk ke sistem. Silakan periksa kembali data Anda atau hubungi admin.');
  }
}

/**
 * Sends a password reset email using Firebase native mailer
 * Enforces a neutral success response that does not disclose account existence.
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = (email || '').trim();

  if (!cleanEmail) {
    throw new Error('Silakan masukkan alamat email kedinasan.');
  }

  if (!isValidEmailFormat(cleanEmail)) {
    throw new Error('Format alamat email tidak valid.');
  }

  const NEUTRAL_SUCCESS_MESSAGE = 
    'Jika alamat email terdaftar pada sistem SIMAK DISKUM, instruksi dan tautan pemulihan kata sandi telah dikirimkan ke email tersebut.';

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true, message: NEUTRAL_SUCCESS_MESSAGE };
  } catch (err: any) {
    console.warn('[Admin Auth] Password reset request error:', err.code);

    // Prevent account enumeration: treat user-not-found identically to success
    if (err.code === 'auth/user-not-found') {
      return { success: true, message: NEUTRAL_SUCCESS_MESSAGE };
    }

    if (err.code === 'auth/too-many-requests') {
      throw new Error('Terlalu banyak permintaan pemulihan kata sandi. Silakan tunggu beberapa saat.');
    }

    if (err.code === 'auth/network-request-failed') {
      throw new Error('Gagal terhubung ke server autentikasi. Periksa koneksi internet Anda.');
    }

    throw new Error('Gagal memproses permintaan pemulihan kata sandi. Silakan coba beberapa saat lagi.');
  }
}

/**
 * Signs out the currently authenticated operator
 */
export async function signOutOperator(): Promise<void> {
  await signOut(auth);
}

/**
 * Refreshes current user's ID token and claims
 */
export async function refreshUserClaims(): Promise<CurrentUserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const { profile } = await resolveUserProfile(user, true);
  return profile;
}
