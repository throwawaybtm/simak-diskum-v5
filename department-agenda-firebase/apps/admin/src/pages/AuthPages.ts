/**
 * SIMAK DISKUM Kota Batam v5.0 — Administrative Authentication Views
 * 
 * Provides production-quality Indonesian authentication interfaces matching
 * the approved minimalist civic design system:
 * 1. Operator Sign-In Page (with non-enumerating error alerts and password toggle)
 * 2. Password Recovery Page (neutral success responses)
 * 3. Access Denied Page (unauthorized account isolation with logout CTA)
 */

import type { CurrentUserProfile } from '../auth/authService';

const isStaging = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'staging';

function renderStagingBanner(): string {
  if (!isStaging) return '';
  return `
    <div class="staging-indicator-banner" role="status" aria-label="Informasi Lingkungan Staging" style="position: absolute; top: 0; left: 0; width: 100%;">
      <span class="staging-badge">UJI COBA</span>
      <span class="staging-text">LINGKUNGAN UJI COBA / STAGING — DATA SIMULASI</span>
    </div>
  `;
}

export function renderLoginPage(error?: string, isSubmitting = false, initialEmail = ''): string {
  return `
    <div class="auth-page-wrapper">
      ${renderStagingBanner()}
      <div class="auth-card" role="region" aria-label="Form Masuk Operator SIMAK DISKUM">
        <div class="auth-brand-header">
          <img src="/batam-emblem.png" alt="Lambang Kota Batam" class="auth-brand-crest" width="48" height="58">
          <div class="auth-brand-titles">
            <h1 class="auth-portal-title">SIMAK DISKUM</h1>
            <p class="auth-portal-subtitle">Kota Batam</p>
          </div>
          <span class="auth-portal-badge">Admin Portal — Masuk Operator</span>
          <p class="auth-agency-desc">Sistem Informasi Manajemen Agenda Kedinasan<br>Dinas Koperasi dan Usaha Mikro Kota Batam</p>
        </div>

        ${error ? `
          <div class="auth-alert auth-alert-error" role="alert" aria-live="assertive">
            <svg class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="alert-content">${error}</div>
          </div>
        ` : ''}

        <form id="adminLoginForm" class="auth-form" aria-busy="${isSubmitting ? 'true' : 'false'}" novalidate>
          <div class="form-group">
            <label for="authEmail" class="auth-label">Alamat Email Kedinasan</label>
            <div class="input-with-icon">
              <input 
                type="email" 
                id="authEmail" 
                name="email" 
                class="auth-input" 
                placeholder="nama@batam.go.id" 
                required 
                autocomplete="username" 
                value="${initialEmail ? initialEmail.replace(/"/g, '&quot;') : ''}"
                ${isSubmitting ? 'disabled' : ''}
              >
            </div>
          </div>

          <div class="form-group">
            <div class="auth-label-row">
              <label for="authPassword" class="auth-label">Kata Sandi</label>
              <button type="button" id="btnForgotPwd" class="btn-link-forgot" tabindex="0" ${isSubmitting ? 'disabled' : ''}>
                Lupa Kata Sandi?
              </button>
            </div>
            <div class="password-input-wrap">
              <input 
                type="password" 
                id="authPassword" 
                name="password" 
                class="auth-input input-password" 
                placeholder="Masukkan kata sandi" 
                required 
                autocomplete="current-password"
                ${isSubmitting ? 'disabled' : ''}
              >
              <button 
                type="button" 
                id="btnTogglePassword" 
                class="btn-toggle-pwd" 
                aria-label="Tampilkan kata sandi" 
                title="Tampilkan kata sandi"
                ${isSubmitting ? 'disabled' : ''}
              >
                <svg id="iconEyeOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg id="iconEyeClosed" class="hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" id="btnSubmitLogin" class="btn-auth-primary" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting ? '<span class="auth-spinner" aria-hidden="true"></span> Memverifikasi...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div class="auth-security-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Khusus aparatur dan operator resmi Dinas Koperasi dan Usaha Mikro Kota Batam. Pendaftaran mandiri tidak tersedia.</span>
        </div>
      </div>
    </div>
  `;
}

export function renderPasswordRecoveryPage(
  message?: { type: 'success' | 'error'; text: string },
  isSubmitting = false,
  initialEmail = ''
): string {
  return `
    <div class="auth-page-wrapper">
      ${renderStagingBanner()}
      <div class="auth-card" role="region" aria-label="Form Pemulihan Kata Sandi Operator SIMAK DISKUM">
        <div class="auth-brand-header">
          <img src="/batam-emblem.png" alt="Lambang Kota Batam" class="auth-brand-crest" width="48" height="58">
          <div class="auth-brand-titles">
            <h1 class="auth-portal-title">SIMAK DISKUM</h1>
            <p class="auth-portal-subtitle">Kota Batam</p>
          </div>
          <span class="auth-portal-badge">Pemulihan Kata Sandi</span>
          <p class="auth-agency-desc">Masukkan alamat email kedinasan Anda. Sistem akan mengirimkan tautan untuk mengatur ulang kata sandi Anda.</p>
        </div>

        ${message ? `
          <div class="auth-alert auth-alert-${message.type}" role="${message.type === 'error' ? 'alert' : 'status'}" aria-live="polite">
            <svg class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              ${message.type === 'success' ? `
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              ` : `
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              `}
            </svg>
            <div class="alert-content">${message.text}</div>
          </div>
        ` : ''}

        <form id="adminRecoveryForm" class="auth-form" aria-busy="${isSubmitting ? 'true' : 'false'}" novalidate>
          <div class="form-group">
            <label for="recoveryEmail" class="auth-label">Alamat Email Kedinasan</label>
            <input 
              type="email" 
              id="recoveryEmail" 
              name="email" 
              class="auth-input" 
              placeholder="nama@batam.go.id" 
              required 
              autocomplete="email" 
              value="${initialEmail ? initialEmail.replace(/"/g, '&quot;') : ''}"
              ${isSubmitting ? 'disabled' : ''}
            >
          </div>

          <button type="submit" id="btnSubmitRecovery" class="btn-auth-primary" ${isSubmitting ? 'disabled' : ''}>
            ${isSubmitting ? '<span class="auth-spinner" aria-hidden="true"></span> Mengirim Instruksi...' : 'Kirim Tautan Pemulihan'}
          </button>

          <button type="button" id="btnBackToLogin" class="btn-auth-secondary" ${isSubmitting ? 'disabled' : ''}>
            ← Kembali ke Halaman Masuk
          </button>
        </form>

        <div class="auth-security-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4Z"/>
            <path d="M22 2 11 13"/>
          </svg>
          <span>Layanan email pemulihan dikirimkan langsung melalui Firebase mailer resmi sesuai kuota operasional Spark plan.</span>
        </div>
      </div>
    </div>
  `;
}

export function renderAccessDeniedPage(profile: CurrentUserProfile | null, customMessage?: string): string {
  const emailDisplay = profile?.email || 'Akun Tidak Dikenal';
  const roleDisplay = profile?.roleLabel || 'Tidak Memiliki Hak Akses';

  return `
    <div class="auth-page-wrapper">
      ${renderStagingBanner()}
      <div class="auth-card access-denied-card" role="region" aria-label="Akses Ditolak SIMAK DISKUM">
        <div class="auth-brand-header">
          <div class="access-denied-icon-wrap" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 class="auth-portal-title text-danger">Akses Ditolak</h1>
          <span class="auth-portal-badge badge-denied">Akun Tidak Memiliki Izin Operasional</span>
        </div>

        <div class="access-denied-details">
          <p class="denied-summary">
            ${customMessage || 'Akun Anda berhasil diautentikasi oleh Google Identity, namun belum diberikan hak akses (role claim) sebagai Administrator atau Operator Agenda pada SIMAK DISKUM Kota Batam.'}
          </p>

          <div class="account-meta-box">
            <div class="meta-row">
              <span class="meta-label">Alamat Email:</span>
              <span class="meta-val" id="deniedUserEmail">${emailDisplay}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Status Peran:</span>
              <span class="meta-val text-danger" id="deniedUserRole">${roleDisplay}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Otoritas Database:</span>
              <span class="meta-val text-muted">Cloud Firestore Security Rules (Strict Deny)</span>
            </div>
          </div>

          <p class="denied-guidance">
            Seluruh data agenda, master pegawai, dan laporan dilindungi secara ketat. Hubungi <strong>Administrator IT Dinas Koperasi dan Usaha Mikro Kota Batam</strong> untuk proses verifikasi dan pemberian hak akses.
          </p>
        </div>

        <div class="denied-actions">
          <button type="button" id="btnAccessDeniedSignOut" class="btn-auth-primary">
            Keluar dari Akun Ini (Sign Out)
          </button>
        </div>
      </div>
    </div>
  `;
}
