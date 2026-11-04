/**
 * Pure TypeScript Admin Activity Repository
 * Coordinates atomic transactions between private activities, public projections, and audit logs.
 */

import {
  type Firestore,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import type { ActivityDocument } from '../schema/activity';
import type { AuditLogDocument } from '../schema/audit';
import type { PublicActivityDTO } from '../schema/publicDto';
import { projectPublicActivity, type ProjectorLookups } from '../projection/publicProjector';
import { resolveActivitySnapshots } from '../scheduling/attendeeSnapshot';
import type { Employee } from '../schema/master';

export interface SaveActivityOptions {
  expectedVersion?: number;
  actorId?: string;
  actorLabel?: string;
  identitySource?: 'UNVERIFIED' | 'AUTH_UID';
  requestId?: string;
  conflictOverrideReason?: string;
  isAttendeeEdited?: boolean;
  employeesMasterList?: Employee[];
}

export interface SaveActivityResult {
  newVersion: number;
  publicDto: PublicActivityDTO;
  auditId: string;
}

function sanitizeDocumentData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export async function saveActivity(
  db: Firestore,
  activity: ActivityDocument,
  lookups: ProjectorLookups,
  options: SaveActivityOptions = {}
): Promise<SaveActivityResult> {
  const actor = options.actorLabel || 'UNVERIFIED';
  const identitySource = options.identitySource || 'UNVERIFIED';
  const reqId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return await runTransaction(db, async (transaction) => {
    const actRef = doc(db, 'activities', activity.id);
    const pubRef = doc(db, 'publicActivities', activity.id);
    const auditRef = doc(db, 'auditLogs', auditId);

    const existingSnap = await transaction.get(actRef);
    let newVersion = 1;
    let beforeSummary: Record<string, unknown> | null = null;
    let existingRecord: ActivityDocument | null = null;

    if (existingSnap.exists()) {
      existingRecord = existingSnap.data() as ActivityDocument;

      // Optimistic concurrency check
      if (options.expectedVersion !== undefined && existingRecord.version !== options.expectedVersion) {
        throw new Error(`VERSION_CONFLICT: Expected version ${options.expectedVersion}, but found ${existingRecord.version}`);
      }

      newVersion = (existingRecord.version || 0) + 1;
      beforeSummary = {
        title: existingRecord.title,
        status: existingRecord.status,
        startDate: existingRecord.startDate,
        endDate: existingRecord.endDate,
        startTime: existingRecord.startTime,
        endTime: existingRecord.endTime,
        version: existingRecord.version
      };
    }

    // Resolve attendee snapshots (preserve if unrelated edit)
    const resolvedSnapshots = resolveActivitySnapshots(
      existingRecord ? existingRecord.attendeeSnapshots : activity.attendeeSnapshots,
      activity.attendeeIds || [],
      existingRecord ? existingRecord.attendeeIds : undefined,
      options.employeesMasterList || [],
      activity.guestAttendees || [],
      options.isAttendeeEdited ?? false
    );

    const now = new Date().toISOString();
    const updatedRecord: ActivityDocument = {
      ...activity,
      attendeeSnapshots: resolvedSnapshots,
      version: newVersion,
      updatedAt: now,
      updatedBy: actor,
      createdAt: existingRecord ? existingRecord.createdAt : (activity.createdAt || now),
      createdBy: existingRecord ? existingRecord.createdBy : (activity.createdBy || actor)
    };

    // Build sanitized public projection
    const publicDto = projectPublicActivity(updatedRecord, lookups);

    // Prepare audit record
    const auditLog: AuditLogDocument = {
      id: auditId,
      actorId: options.actorId || (options.identitySource === 'AUTH_UID' ? actor : (actor !== 'UNVERIFIED' ? actor : undefined)),
      requestId: reqId,
      timestamp: serverTimestamp(),
      actorLabel: actor,
      identitySource,
      action: existingRecord ? (activity.status === 'CANCELLED' ? 'CANCEL' : 'UPDATE') : 'CREATE',
      recordId: activity.id,
      version: newVersion,
      beforeSummary,
      afterSummary: {
        title: updatedRecord.title,
        status: updatedRecord.status,
        startDate: updatedRecord.startDate,
        endDate: updatedRecord.endDate,
        startTime: updatedRecord.startTime,
        endTime: updatedRecord.endTime,
        conflictOverrideReason: options.conflictOverrideReason || null
      }
    };

    // Atomic transaction writes
    const cleanRecord = sanitizeDocumentData(updatedRecord);
    const cleanPublicDto = sanitizeDocumentData(publicDto as Record<string, any>);
    const cleanAuditLog = sanitizeDocumentData(auditLog as Record<string, any>);

    transaction.set(actRef, cleanRecord);
    transaction.set(pubRef, cleanPublicDto);
    transaction.set(auditRef, cleanAuditLog);

    return {
      newVersion,
      publicDto,
      auditId
    };
  });
}

export async function deleteActivity(
  db: Firestore,
  activityId: string,
  actorLabel = 'UNVERIFIED',
  actorId?: string
): Promise<void> {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  await runTransaction(db, async (transaction) => {
    const actRef = doc(db, 'activities', activityId);
    const pubRef = doc(db, 'publicActivities', activityId);
    const auditRef = doc(db, 'auditLogs', auditId);

    const snap = await transaction.get(actRef);
    if (!snap.exists()) {
      return;
    }
    const data = snap.data() as ActivityDocument;

    const auditLog: AuditLogDocument = {
      id: auditId,
      actorId: actorId || (actorLabel !== 'UNVERIFIED' ? actorLabel : undefined),
      requestId: `req_del_${Date.now()}`,
      timestamp: serverTimestamp(),
      actorLabel,
      identitySource: 'UNVERIFIED',
      action: 'DELETE',
      recordId: activityId,
      version: data.version,
      beforeSummary: { title: data.title, status: data.status },
      afterSummary: { deleted: true }
    };

    transaction.delete(actRef);
    transaction.delete(pubRef);
    transaction.set(auditRef, auditLog);
  });
}
