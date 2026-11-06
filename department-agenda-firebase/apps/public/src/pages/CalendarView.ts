/**
 * Public Calendar View Component
 * Supports Month, Week, Day, and List views with multi-day activities and mobile adaptation.
 */

import type { PublicActivityDTO } from '@department-agenda/shared';
import { formatIndonesianDate, formatIndonesianMonthYear } from '@department-agenda/shared';
import { groupActivitiesByDay } from '../components/PublicController';

export type CalendarMode = 'month' | 'week' | 'day' | 'list';

export interface CalendarViewProps {
  mode: CalendarMode;
  year: number;
  month: number; // 1-12
  selectedDate: string; // YYYY-MM-DD
  visibleStart: string; // YYYY-MM-DD
  visibleEnd: string;   // YYYY-MM-DD
  activities: PublicActivityDTO[];
  categories: string[];
  selectedCategory?: string;
}

export function renderCalendarView(props: CalendarViewProps): string {
  const { mode, year, month, selectedDate, visibleStart, visibleEnd, activities, categories, selectedCategory } = props;

  // Filter activities by category if selected
  const filteredActivities = selectedCategory && selectedCategory !== 'ALL'
    ? activities.filter(a => a.categoryName.toLowerCase() === selectedCategory.toLowerCase())
    : activities;

  // Group activities across visible range
  const dayMap = groupActivitiesByDay(filteredActivities, visibleStart, visibleEnd);

  // Month navigation title
  const monthYearLabel = formatIndonesianMonthYear(year, month);

  // Navigation Title based on mode
  let periodTitle = monthYearLabel;
  if (mode === 'day') {
    periodTitle = formatIndonesianDate(selectedDate);
  } else if (mode === 'week') {
    periodTitle = `Minggu: ${formatIndonesianDate(visibleStart)} s.d. ${formatIndonesianDate(visibleEnd)}`;
  }

  // Category filter pills
  const categoryPillsHtml = `
    <button type="button" class="cat-pill ${!selectedCategory || selectedCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">Semua Kategori</button>
    ${categories.map(cat => `
      <button type="button" class="cat-pill ${selectedCategory === cat ? 'active' : ''}" data-cat="${cat}">${cat}</button>
    `).join('')}
  `;

  // Render view body
  let viewBodyHtml = '';
  if (mode === 'month') {
    viewBodyHtml = renderMonthGrid(year, month, visibleStart, visibleEnd, dayMap, selectedDate);
  } else if (mode === 'week') {
    viewBodyHtml = renderWeekGrid(visibleStart, visibleEnd, dayMap, selectedDate);
  } else if (mode === 'day') {
    viewBodyHtml = renderDayView(selectedDate, dayMap.get(selectedDate) || []);
  } else {
    viewBodyHtml = renderListView(filteredActivities, visibleStart, visibleEnd);
  }

  return `
    <div class="public-page calendar-view">
      <!-- CALENDAR CONTROLS TOOLBAR -->
      <div class="calendar-toolbar">
        <div class="toolbar-nav">
          <div class="nav-btn-group">
            <button type="button" class="btn btn-secondary btn-icon" id="btnCalPrev" aria-label="Sebelumnya">‹</button>
            <button type="button" class="btn btn-secondary" id="btnCalToday">Hari Ini</button>
            <button type="button" class="btn btn-secondary btn-icon" id="btnCalNext" aria-label="Selanjutnya">›</button>
          </div>
          <h2 class="calendar-period-title" id="calendarPeriodTitle">${periodTitle}</h2>
        </div>

        <div class="toolbar-modes">
          <div class="mode-toggle-group">
            <button type="button" class="mode-btn ${mode === 'month' ? 'active' : ''}" data-mode="month">Bulan</button>
            <button type="button" class="mode-btn ${mode === 'week' ? 'active' : ''}" data-mode="week">Minggu</button>
            <button type="button" class="mode-btn ${mode === 'day' ? 'active' : ''}" data-mode="day">Hari</button>
            <button type="button" class="mode-btn ${mode === 'list' ? 'active' : ''}" data-mode="list">Daftar</button>
          </div>
        </div>
      </div>

      <!-- CATEGORY FILTER BAR -->
      <div class="category-filter-bar">
        ${categoryPillsHtml}
      </div>

      <!-- CALENDAR BODY -->
      <div class="calendar-container">
        ${viewBodyHtml}
      </div>
    </div>
  `;
}

function renderMonthGrid(
  year: number,
  month: number,
  visibleStart: string,
  visibleEnd: string,
  dayMap: Map<string, PublicActivityDTO[]>,
  todayStr: string
): string {
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const shortDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const headerHtml = dayNames.map((d, idx) => `
    <div class="month-col-header" data-day-idx="${idx}">
      <span class="day-full">${d}</span>
      <span class="day-short">${shortDayNames[idx]}</span>
    </div>
  `).join('');

  // Collect all dates from visibleStart to visibleEnd
  const cells: string[] = [];
  let curr = new Date(visibleStart + 'T00:00:00Z');
  const end = new Date(visibleEnd + 'T00:00:00Z');

  const targetMonthStr = String(month).padStart(2, '0');

  while (curr <= end) {
    const yyyy = curr.getUTCFullYear();
    const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(curr.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const isCurrentMonth = mm === targetMonthStr;
    const isToday = dateStr === todayStr;
    const activities = dayMap.get(dateStr) || [];

    const actsHtml = activities.map(act => {
      const isCancelled = act.status === 'CANCELLED';
      const isMultiDay = act.startDate !== act.endDate;
      return `
        <div class="cal-activity-item ${isCancelled ? 'item-cancelled' : ''} ${isMultiDay ? 'item-multiday' : ''}" data-open-detail="${act.id}" title="${act.title}">
          <span class="item-time">${act.openEnded ? 's.d. Selesai' : act.startTime}</span>
          <span class="item-title ${isCancelled ? 'text-strikethrough' : ''}">${act.title}</span>
        </div>
      `;
    }).join('');

    cells.push(`
      <div class="month-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today-cell' : ''}" data-date="${dateStr}">
        <div class="cell-top">
          <span class="cell-day-num">${parseInt(dd, 10)}</span>
          ${activities.length > 0 ? `<span class="cell-act-count">${activities.length}</span>` : ''}
        </div>
        <div class="cell-activities-list">
          ${actsHtml}
        </div>
      </div>
    `);

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return `
    <div class="calendar-scroll-hint" aria-hidden="true">
      <span>👉 Geser untuk melihat hari lainnya</span>
    </div>
    <div class="month-grid-wrapper">
      <div class="month-headers-row">
        ${headerHtml}
      </div>
      <div class="month-cells-grid">
        ${cells.join('')}
      </div>
    </div>
  `;
}

function formatAttendeeChip(label: string): string {
  if (!label) return '';
  const parenMatch = label.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    return `<span class="attendee-chip"><strong class="attendee-name">${parenMatch[1].trim()}</strong> <span class="attendee-role">(${parenMatch[2].trim()})</span></span>`;
  }
  const dashMatch = label.match(/^([^\u2014\-]+)[\u2014\-]\s*(.+)$/);
  if (dashMatch) {
    return `<span class="attendee-chip"><strong class="attendee-name">${dashMatch[2].trim()}</strong> <span class="attendee-role">(${dashMatch[1].trim()})</span></span>`;
  }
  return `<span class="attendee-chip"><strong class="attendee-name">${label}</strong></span>`;
}

function renderWeekGrid(
  visibleStart: string,
  visibleEnd: string,
  dayMap: Map<string, PublicActivityDTO[]>,
  todayStr: string
): string {
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const shortDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  let curr = new Date(visibleStart + 'T00:00:00Z');
  const colsHtml: string[] = [];
  const stackedDaysHtml: string[] = [];

  for (let i = 0; i < 7; i++) {
    const yyyy = curr.getUTCFullYear();
    const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(curr.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const isToday = dateStr === todayStr;
    const activities = dayMap.get(dateStr) || [];

    // Chronological order (earliest time first)
    const sortedActs = [...activities].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    // Desktop 7-column view
    const actsHtml = sortedActs.length > 0
      ? sortedActs.map(act => `
          <div class="week-activity-card ${act.status === 'CANCELLED' ? 'card-cancelled' : ''}" data-open-detail="${act.id}">
            <div class="act-time">${act.timeDisplay}</div>
            <div class="act-title ${act.status === 'CANCELLED' ? 'text-strikethrough' : ''}"><strong>${act.title}</strong></div>
            <div class="act-venue">📍 ${act.locationName}</div>
          </div>
        `).join('')
      : '<p class="week-empty-text">Tidak ada kegiatan</p>';

    colsHtml.push(`
      <div class="week-day-col ${isToday ? 'week-today' : ''}">
        <div class="week-col-header">
          <span class="week-day-name">
            <span class="day-full">${dayNames[i]}</span>
            <span class="day-short">${shortDayNames[i]}</span>
          </span>
          <span class="week-day-number">${dd}/${mm}</span>
        </div>
        <div class="week-col-body">
          ${actsHtml}
        </div>
      </div>
    `);

    // Mobile stacked day view
    const mobileActsHtml = sortedActs.length > 0
      ? sortedActs.map(act => {
          const isCancelled = act.status === 'CANCELLED';
          const statusIndonesian = isCancelled ? 'Dibatalkan' : (act.status === 'COMPLETED' ? 'Selesai' : 'Terjadwal');
          const locTypeIndonesian = act.locationType === 'OFFICE' ? 'Kantor Dinas'
            : (act.locationType === 'ONLINE' ? 'Daring' : 'Luar Kantor');
          return `
            <div class="week-stacked-card ${isCancelled ? 'card-cancelled' : ''}" data-open-detail="${act.id}">
              <div class="week-stacked-card-header">
                <span class="status-pill status-${act.status.toLowerCase()}">${statusIndonesian}</span>
                <span class="week-stacked-time">⏰ ${act.timeDisplay}</span>
              </div>
              <h4 class="week-stacked-title ${isCancelled ? 'text-strikethrough' : ''}">${act.title}</h4>
              ${isCancelled && act.publicCancellationNotice ? `
                <div class="card-cancellation-notice">
                  <strong>Pemberitahuan:</strong> ${act.publicCancellationNotice}
                </div>
              ` : ''}
              <div class="week-stacked-meta">
                <span>📍 <strong>${act.locationName}</strong> (${locTypeIndonesian})</span>
                <span>🏛️ ${act.organizerName}</span>
                ${act.attendeeLabels && act.attendeeLabels.length > 0
                  ? `<div class="agenda-attendees-list">👥 ${act.attendeeLabels.map(formatAttendeeChip).join(' ')}</div>`
                  : ''}
              </div>
              <div class="week-stacked-actions">
                <button type="button" class="btn btn-secondary btn-sm" data-open-detail="${act.id}">Rincian</button>
              </div>
            </div>
          `;
        }).join('')
      : `<p class="week-stacked-empty">☕ Tidak ada kegiatan kedinasan</p>`;

    stackedDaysHtml.push(`
      <section class="week-stacked-day-section ${isToday ? 'is-today' : ''}">
        <div class="week-stacked-day-header">
          <span class="stacked-day-title">${formatIndonesianDate(dateStr)}</span>
          ${isToday ? '<span class="badge-today-pill">Hari Ini</span>' : ''}
        </div>
        <div class="week-stacked-day-body">
          ${mobileActsHtml}
        </div>
      </section>
    `);

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return `
    <div class="week-grid-container desktop-only">
      ${colsHtml.join('')}
    </div>
    <div class="week-stacked-container mobile-only">
      ${stackedDaysHtml.join('')}
    </div>
  `;
}

function renderDayView(selectedDate: string, activities: PublicActivityDTO[]): string {
  const formattedDate = formatIndonesianDate(selectedDate);

  if (activities.length === 0) {
    return `
      <div class="empty-state-card">
        <div class="empty-icon">☕</div>
        <p class="empty-title">Tidak Ada Agenda pada Hari Ini</p>
        <p class="empty-desc">Tidak ada kegiatan kedinasan yang dijadwalkan pada ${formattedDate}.</p>
      </div>
    `;
  }

  const itemsHtml = activities.map(act => {
    const isCancelled = act.status === 'CANCELLED';
    const statusIndonesian = isCancelled ? 'Dibatalkan' : (act.status === 'COMPLETED' ? 'Selesai' : 'Terjadwal');
    const locTypeIndonesian = act.locationType === 'OFFICE' ? 'Kantor Dinas'
      : (act.locationType === 'ONLINE' ? 'Daring' : 'Luar Kantor');

    return `
      <div class="day-view-item ${isCancelled ? 'day-item-cancelled' : ''}" data-open-detail="${act.id}">
        <div class="day-item-time">
          <strong>${act.timeDisplay}</strong>
          <span class="status-pill status-${act.status.toLowerCase()}">${statusIndonesian}</span>
        </div>
        <div class="day-item-content">
          <h4 class="${isCancelled ? 'text-strikethrough' : ''}">${act.title}</h4>
          <p class="day-item-venue">📍 Tempat: <strong>${act.locationName}</strong> (${locTypeIndonesian})</p>
          <p class="day-item-org">🏛️ Penyelenggara: ${act.organizerName}</p>
          ${act.attendeeLabels && act.attendeeLabels.length > 0
            ? `<p class="day-item-attendees">👥 Dihadiri: ${act.attendeeLabels.join(', ')}</p>`
            : ''}
          ${isCancelled && act.publicCancellationNotice ? `
            <div class="card-cancellation-notice">
              <strong>Pemberitahuan:</strong> ${act.publicCancellationNotice}
            </div>
          ` : ''}
        </div>
        <div class="day-item-action">
          <button type="button" class="btn btn-secondary btn-sm" data-open-detail="${act.id}">Rincian</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="day-view-wrapper">
      <div class="day-view-header">
        <h3>Jadwal Agenda: ${formattedDate} (${activities.length} Kegiatan)</h3>
      </div>
      <div class="day-view-list">
        ${itemsHtml}
      </div>
    </div>
  `;
}

function renderListView(activities: PublicActivityDTO[], rangeStart: string, rangeEnd: string): string {
  if (activities.length === 0) {
    return `
      <div class="empty-state-card">
        <div class="empty-icon">📅</div>
        <p class="empty-title">Tidak Ada Kegiatan pada Periode Ini</p>
        <p class="empty-desc">Tidak ditemukan jadwal agenda dinas dalam rentang waktu yang dipilih.</p>
      </div>
    `;
  }

  // Sort activities by startDate then startTime
  const sorted = [...activities].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    return a.startTime.localeCompare(b.startTime);
  });

  const cardsHtml = sorted.map(act => {
    const isCancelled = act.status === 'CANCELLED';
    const statusIndonesian = isCancelled ? 'Dibatalkan' : (act.status === 'COMPLETED' ? 'Selesai' : 'Terjadwal');
    return `
      <div class="list-activity-row ${isCancelled ? 'row-cancelled' : ''}" data-open-detail="${act.id}">
        <div class="row-date-badge">
          <strong>${act.dateDisplay}</strong>
          <span class="row-time">${act.timeDisplay}</span>
        </div>
        <div class="row-content">
          <div class="row-badges">
            <span class="badge badge-category">${act.categoryName}</span>
            <span class="status-pill status-${act.status.toLowerCase()}">${statusIndonesian}</span>
          </div>
          <h4 class="${isCancelled ? 'text-strikethrough' : ''}">${act.title}</h4>
          <p class="row-meta">📍 ${act.locationName} • 🏛️ ${act.organizerName}</p>
        </div>
        <div class="row-action">
          <button type="button" class="btn btn-secondary btn-sm" data-open-detail="${act.id}">Lihat Rincian</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="list-view-container">
      ${cardsHtml}
    </div>
  `;
}
