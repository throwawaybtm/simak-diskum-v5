/**
 * Unit Tests for Activity & Master Data Deterministic Sorting
 * Verifies Part A, Part D, and Part H requirements:
 * 1. Default newest-first ordering (startDate desc, startTime desc, id asc)
 * 2. Oldest-first exact reversal
 * 3. Title A-Z and Z-A
 * 4. Status hierarchy
 * 5. Master items A-Z and Z-A
 * 6. Non-mutation of input arrays and objects
 */

import { describe, it, expect } from 'vitest';
import {
  sortActivities,
  sortMasterItems,
  type ActivitySortable,
  type ActivitySortOption
} from '../../shared/src/scheduling/sortUtils';

describe('Deterministic Activity Sorting Engine', () => {
  const sampleActivities: ActivitySortable[] = [
    { id: 'act_01', title: 'Rapat Koordinasi UMKM', startDate: '2026-10-30', startTime: '09:00', status: 'SCHEDULED' },
    { id: 'act_02', title: 'Pelatihan Laporan Keuangan', startDate: '2026-10-30', startTime: '14:00', status: 'COMPLETED' },
    { id: 'act_03', title: 'Bimbingan Teknis Koperasi', startDate: '2026-10-29', startTime: '15:30', status: 'SCHEDULED' },
    { id: 'act_04', title: 'Sosialisasi Sertifikasi Halal', startDate: '2026-10-28', startTime: '08:00', status: 'CANCELLED' },
    { id: 'act_05', title: 'Pameran Produk Unggulan 3 Hari', startDate: '2026-10-28', startTime: '10:00', endDate: '2026-10-30', endTime: null, status: 'SCHEDULED' },
    { id: 'act_06', title: 'Rapat Evaluasi Anggaran', startDate: '2026-10-30', startTime: '14:00', status: 'SCHEDULED' } // Tie on date & time with act_02
  ];

  it('preserves input immutability and never mutates original array or elements', () => {
    const input = Object.freeze([...sampleActivities.map(a => Object.freeze({ ...a }))]);
    const sorted = sortActivities(input, 'NEWEST');

    expect(sorted).not.toBe(input);
    expect(sorted).toHaveLength(input.length);
    // Original input ordering unchanged
    expect(input[0].id).toBe('act_01');
    expect(input[1].id).toBe('act_02');
  });

  it('orders NEWEST-first by default: later date first, later time within date first', () => {
    const sorted = sortActivities(sampleActivities, 'NEWEST');

    // 2026-10-30 14:00 (act_02, act_06) -> 2026-10-30 09:00 (act_01) -> 2026-10-29 15:30 (act_03) -> 2026-10-28 10:00 (act_05) -> 2026-10-28 08:00 (act_04)
    expect(sorted.map(a => a.id)).toEqual([
      'act_02', // 10-30 14:00 (tie-breaker act_02 < act_06)
      'act_06', // 10-30 14:00
      'act_01', // 10-30 09:00
      'act_03', // 10-29 15:30
      'act_05', // 10-28 10:00
      'act_04'  // 10-28 08:00
    ]);
  });

  it('orders OLDEST-first: earlier date first, earlier time within date first', () => {
    const sorted = sortActivities(sampleActivities, 'OLDEST');

    expect(sorted.map(a => a.id)).toEqual([
      'act_04', // 10-28 08:00
      'act_05', // 10-28 10:00
      'act_03', // 10-29 15:30
      'act_01', // 10-30 09:00
      'act_02', // 10-30 14:00
      'act_06'  // 10-30 14:00
    ]);
  });

  it('verifies OLDEST is the exact reversal of NEWEST for distinct date/time values', () => {
    const distinct = sampleActivities.filter(a => a.id !== 'act_06');
    const newest = sortActivities(distinct, 'NEWEST');
    const oldest = sortActivities(distinct, 'OLDEST');

    expect([...newest].reverse().map(a => a.id)).toEqual(oldest.map(a => a.id));
  });

  it('sorts multi-day and open-ended events consistently by their start date and start time', () => {
    const events: ActivitySortable[] = [
      { id: 'single_day', title: 'Single Day', startDate: '2026-10-28', startTime: '11:00' },
      { id: 'multi_day', title: 'Multi Day Expo', startDate: '2026-10-28', startTime: '09:00', endDate: '2026-10-31', endTime: null }
    ];

    const newest = sortActivities(events, 'NEWEST');
    expect(newest[0].id).toBe('single_day'); // 11:00 > 09:00
    expect(newest[1].id).toBe('multi_day');

    const oldest = sortActivities(events, 'OLDEST');
    expect(oldest[0].id).toBe('multi_day'); // 09:00 < 11:00
    expect(oldest[1].id).toBe('single_day');
  });

  it('sorts TITLE_ASC and TITLE_DESC using Indonesian locale collation', () => {
    const asc = sortActivities(sampleActivities, 'TITLE_ASC');
    expect(asc.map(a => a.title)).toEqual([
      'Bimbingan Teknis Koperasi',
      'Pameran Produk Unggulan 3 Hari',
      'Pelatihan Laporan Keuangan',
      'Rapat Evaluasi Anggaran',
      'Rapat Koordinasi UMKM',
      'Sosialisasi Sertifikasi Halal'
    ]);

    const desc = sortActivities(sampleActivities, 'TITLE_DESC');
    expect(desc.map(a => a.title)).toEqual([
      'Sosialisasi Sertifikasi Halal',
      'Rapat Koordinasi UMKM',
      'Rapat Evaluasi Anggaran',
      'Pelatihan Laporan Keuangan',
      'Pameran Produk Unggulan 3 Hari',
      'Bimbingan Teknis Koperasi'
    ]);
  });

  it('sorts by STATUS: SCHEDULED -> COMPLETED -> CANCELLED, with newest-first secondary', () => {
    const sorted = sortActivities(sampleActivities, 'STATUS');

    const statuses = sorted.map(a => a.status);
    expect(statuses).toEqual([
      'SCHEDULED',
      'SCHEDULED',
      'SCHEDULED',
      'SCHEDULED',
      'COMPLETED',
      'CANCELLED'
    ]);
  });
});

describe('Deterministic Master Data Sorting', () => {
  const departments = [
    { id: 'dept_03', name: 'Bidang Pengembangan Usaha Mikro' },
    { id: 'dept_01', name: 'Sekretariat' },
    { id: 'dept_02', name: 'Bidang Pemberdayaan Koperasi' },
    { id: 'dept_04', name: 'UPTD PLUT KUKM' }
  ];

  it('sorts master items A-Z by default', () => {
    const sorted = sortMasterItems(departments, 'ASC');
    expect(sorted.map(d => d.name)).toEqual([
      'Bidang Pemberdayaan Koperasi',
      'Bidang Pengembangan Usaha Mikro',
      'Sekretariat',
      'UPTD PLUT KUKM'
    ]);
  });

  it('sorts master items Z-A on toggle', () => {
    const sorted = sortMasterItems(departments, 'DESC');
    expect(sorted.map(d => d.name)).toEqual([
      'UPTD PLUT KUKM',
      'Sekretariat',
      'Bidang Pengembangan Usaha Mikro',
      'Bidang Pemberdayaan Koperasi'
    ]);
  });

  it('guarantees non-mutation of input array', () => {
    const copy = [...departments];
    sortMasterItems(copy, 'ASC');
    expect(copy[0].id).toBe('dept_03');
  });
});
