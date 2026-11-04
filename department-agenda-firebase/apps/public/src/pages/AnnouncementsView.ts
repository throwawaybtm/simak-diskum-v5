/**
 * Public Announcements View Component
 * Renders official active announcements from publicAnnouncements collection.
 */

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category?: string;
  publishedAt: string;
}

export function renderAnnouncementsView(announcements: AnnouncementItem[]): string {
  const listHtml = announcements.length > 0
    ? announcements.map(ann => `
        <article class="announcement-item-card category-${(ann.category || 'info').toLowerCase()}">
          <div class="ann-item-top">
            <span class="ann-badge-pill">${ann.category || 'INFORMASI'}</span>
            <span class="ann-date-text">📅 ${new Date(ann.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })} WIB</span>
          </div>
          <h3 class="ann-item-title">${ann.title}</h3>
          <div class="ann-item-body">
            <p>${ann.content}</p>
          </div>
        </article>
      `).join('')
    : `
      <div class="empty-state-card">
        <div class="empty-icon">📢</div>
        <p class="empty-title">Belum Ada Pengumuman Resmi</p>
        <p class="empty-desc">Saat ini belum ada pengumuman publik yang diterbitkan. Silakan periksa kembali di lain waktu.</p>
      </div>
    `;

  return `
    <div class="public-page announcements-view">
      <div class="page-title-banner">
        <h2>📢 Pengumuman & Informasi Kedinasan</h2>
        <p class="subtitle">Warta resmi, himbauan, dan informasi kegiatan bagi pelaku koperasi dan UMKM Kota Batam</p>
      </div>

      <div class="announcements-container">
        ${listHtml}
      </div>
    </div>
  `;
}
