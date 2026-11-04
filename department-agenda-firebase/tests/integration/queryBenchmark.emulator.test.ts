import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import { doc, writeBatch } from 'firebase/firestore';
import { fetchPublicActivities } from '../../shared/src/repository/publicRepository';
import type { PublicActivityDTO } from '../../shared/src/schema/publicDto';

describe('Firestore Query Benchmark & Long-Running Activity Verification', () => {
  const emulatorRules = fs.readFileSync(
    path.resolve(__dirname, '../../firebase/emulator.rules'),
    'utf8'
  );

  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-department-agenda-benchmark',
      firestore: {
        rules: emulatorRules,
        host: '127.0.0.1',
        port: 8080
      }
    });

    await testEnv.clearFirestore();

    // Seed 520 synthetic public activities to benchmark query performance
    const db = testEnv.unauthenticatedContext().firestore();

    const batchSize = 100;
    let currentBatch = writeBatch(db);
    let batchCount = 0;

    for (let i = 1; i <= 520; i++) {
      let startDate: string;
      let endDate: string;
      let title: string;

      if (i === 1) {
        // Multi-month long-running activity (August 1 to December 15)
        startDate = '2026-08-01';
        endDate = '2026-12-15';
        title = 'Program Pendampingan UMKM Skala Besar 2026';
      } else if (i === 2) {
        // Cross-month event (September 28 to October 3)
        startDate = '2026-09-28';
        endDate = '2026-10-03';
        title = 'Pekan Koperasi Batam 2026';
      } else if (i <= 40) {
        // Inside October 2026
        const day = String((i % 28) + 1).padStart(2, '0');
        startDate = `2026-10-${day}`;
        endDate = `2026-10-${day}`;
        title = `Kegiatan Reguler Oktober #${i}`;
      } else if (i <= 280) {
        // Past events (before October 2026)
        startDate = '2026-05-01';
        endDate = '2026-05-02';
        title = `Kegiatan Masa Lalu #${i}`;
      } else {
        // Future events (after October 2026)
        startDate = '2026-11-15';
        endDate = '2026-11-16';
        title = `Kegiatan Masa Depan #${i}`;
      }

      const dto: PublicActivityDTO = {
        id: `bench_act_${i}`,
        title,
        startDate,
        startTime: '08:00',
        endDate,
        endTime: '12:00',
        openEnded: false,
        timeDisplay: '08.00 - 12.00 WIB',
        dateDisplay: `${startDate} s.d. ${endDate}`,
        status: i % 20 === 0 ? 'CANCELLED' : 'SCHEDULED',
        locationName: 'Pusat PLUT Batam',
        locationType: 'OFFICE',
        organizerName: 'Dinas Koperasi Batam',
        categoryName: 'Pelatihan',
        publicNotes: 'Catatan umum',
        attendeeLabels: ['1. Kadis'],
        version: 1,
        updatedAt: new Date().toISOString()
      };

      currentBatch.set(doc(db, 'publicActivities', dto.id), dto);
      batchCount++;

      if (batchCount >= batchSize) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await currentBatch.commit();
    }
  }, 60000);

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  it('correctly retrieves multi-month and intersecting activities while excluding past and future events', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    const visibleStart = '2026-10-01';
    const visibleEnd = '2026-10-31';

    const result = await fetchPublicActivities(db, visibleStart, visibleEnd);

    // 1. Verify long-running multi-month activity starting Aug 1 and ending Dec 15 is returned!
    const longRunning = result.activities.find(a => a.id === 'bench_act_1');
    expect(longRunning).toBeDefined();
    expect(longRunning?.title).toBe('Program Pendampingan UMKM Skala Besar 2026');

    // 2. Verify cross-month event (Sep 28 to Oct 3) is returned!
    const crossMonth = result.activities.find(a => a.id === 'bench_act_2');
    expect(crossMonth).toBeDefined();
    expect(crossMonth?.title).toBe('Pekan Koperasi Batam 2026');

    // 3. Verify non-intersecting past events (May 2026) are NOT returned
    const pastEvent = result.activities.find(a => a.id === 'bench_act_100');
    expect(pastEvent).toBeUndefined();

    // 4. Verify non-intersecting future events (Nov 2026) are NOT returned
    const futureEvent = result.activities.find(a => a.id === 'bench_act_400');
    expect(futureEvent).toBeUndefined();

    // 5. Verify total reads returned: only intersecting events (40 events) out of 520 documents!
    expect(result.readCount).toBe(40);

    // 6. Benchmark performance telemetry:
    // Firestore index scan with 520 documents should return well under 500ms in emulator
    expect(result.latencyMs).toBeLessThan(1000);
    console.log(`[Benchmark Telemetry] Read count: ${result.readCount} docs | Latency: ${result.latencyMs} ms for 520 database entries`);
  });
});
