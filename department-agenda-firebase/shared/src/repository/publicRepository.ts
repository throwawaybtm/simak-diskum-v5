/**
 * Pure TypeScript Public Repository
 * Executes range intersection queries and tracks performance metrics
 */

import {
  type Firestore,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import type { PublicActivityDTO } from '../schema/publicDto';

export interface QueryTelemetryResult {
  activities: PublicActivityDTO[];
  latencyMs: number;
  readCount: number;
}

/**
 * Fetches public activities intersecting [visibleStart, visibleEnd]
 * Uses fundamental range intersection: startDate <= visibleEnd && endDate >= visibleStart
 */
export async function fetchPublicActivities(
  db: Firestore,
  visibleStart: string,
  visibleEnd: string
): Promise<QueryTelemetryResult> {
  const startTs = performance.now();

  const activitiesCol = collection(db, 'publicActivities');
  // Fundamental intersection query on composite index (startDate, endDate)
  const q = query(
    activitiesCol,
    where('startDate', '<=', visibleEnd),
    where('endDate', '>=', visibleStart)
  );

  const snapshot = await getDocs(q);
  const latencyMs = Math.round((performance.now() - startTs) * 100) / 100;

  const activities: PublicActivityDTO[] = [];
  snapshot.forEach(docSnap => {
    activities.push(docSnap.data() as PublicActivityDTO);
  });

  return {
    activities,
    latencyMs,
    readCount: snapshot.size
  };
}
