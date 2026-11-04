/**
 * Pure TypeScript Master Data Repository
 * Manages CRUD operations, referential integrity guards, duplicate checks,
 * and immutable audit trail logging for all master entities.
 */

import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import type { MasterCollectionName } from '../validation/masterValidator';
import { validateMasterRecord, isDuplicateMasterName } from '../validation/masterValidator';
import type { AuditLogDocument, AuditAction } from '../schema/audit';

export interface ReferentialUsageResult {
  inUse: boolean;
  count: number;
  referencingTitles: string[];
}

export interface SaveMasterResult {
  success: boolean;
  id: string;
  isNew: boolean;
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

/**
 * Fetches all records from a master collection
 */
export async function fetchMasterRecords<T = Record<string, any>>(
  db: Firestore,
  collectionName: MasterCollectionName | 'auditLogs'
): Promise<T[]> {
  const colRef = collection(db, collectionName);
  const snap = await getDocs(colRef);
  const results: T[] = [];
  snap.forEach(d => {
    results.push({ id: d.id, ...d.data() } as unknown as T);
  });
  return results;
}

/**
 * Validates, checks duplicate names, saves a master record, and creates an audit log
 */
export async function saveMasterRecord<T extends { id: string; name: string }>(
  db: Firestore,
  collectionName: MasterCollectionName,
  record: T,
  actorLabel?: string
): Promise<SaveMasterResult> {
  // 1. Validation
  const validation = validateMasterRecord(collectionName, record);
  if (!validation.valid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(' ')}`);
  }

  // 2. Duplicate name check
  const existingRecords = await fetchMasterRecords<{ id: string; name: string }>(db, collectionName);
  if (isDuplicateMasterName(existingRecords, record.name, record.id)) {
    throw new Error(`Nama "${record.name}" sudah terdaftar dalam master ${collectionName}.`);
  }

  // 3. Existence & Before Summary
  const docRef = doc(db, collectionName, record.id);
  const snap = await getDoc(docRef);
  const isNew = !snap.exists();
  const beforeSummary = isNew ? null : snap.data();

  // 4. Save sanitized document
  const sanitized = sanitizeDocumentData(record);
  await setDoc(docRef, sanitized, { merge: true });

  // 5. Audit Logging
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const auditDoc: AuditLogDocument = {
    id: auditId,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actorLabel: actorLabel || 'UNVERIFIED',
    identitySource: 'UNVERIFIED',
    action: isNew ? 'CREATE' : 'UPDATE',
    recordId: record.id,
    version: 1,
    beforeSummary: beforeSummary ? sanitizeDocumentData(beforeSummary) : null,
    afterSummary: sanitized
  };

  try {
    await setDoc(doc(db, 'auditLogs', auditId), sanitizeDocumentData(auditDoc));
  } catch (err) {
    console.warn('[Master Repository] Warning: Could not write audit log:', err);
  }

  return {
    success: true,
    id: record.id,
    isNew
  };
}

/**
 * Toggles the active status of a master entity (soft-delete / reactivation)
 */
export async function toggleMasterRecordActive(
  db: Firestore,
  collectionName: MasterCollectionName,
  id: string,
  active: boolean,
  actorLabel?: string
): Promise<{ success: boolean; active: boolean }> {
  const docRef = doc(db, collectionName, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Dokumen ${id} tidak ditemukan dalam koleksi ${collectionName}.`);
  }

  const beforeSummary = snap.data();
  await updateDoc(docRef, { active });

  // Audit Logging
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const auditDoc: AuditLogDocument = {
    id: auditId,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actorLabel: actorLabel || 'UNVERIFIED',
    identitySource: 'UNVERIFIED',
    action: active ? 'UPDATE' : 'DELETE',
    recordId: id,
    version: 1,
    beforeSummary: sanitizeDocumentData(beforeSummary),
    afterSummary: { ...beforeSummary, active }
  };

  try {
    await setDoc(doc(db, 'auditLogs', auditId), sanitizeDocumentData(auditDoc));
  } catch (err) {
    console.warn('[Master Repository] Warning: Could not write audit log:', err);
  }

  return {
    success: true,
    active
  };
}

/**
 * Checks whether a master record is currently referenced by activities or subordinate records
 */
export async function checkMasterReferentialUsage(
  db: Firestore,
  collectionName: MasterCollectionName,
  id: string
): Promise<ReferentialUsageResult> {
  const referencingTitles: string[] = [];

  try {
    if (collectionName === 'locations') {
      const q = query(collection(db, 'activities'), where('locationId', '==', id));
      const snap = await getDocs(q);
      snap.forEach(d => referencingTitles.push(d.data().title || d.id));
    } else if (collectionName === 'organizers') {
      const q = query(collection(db, 'activities'), where('organizerId', '==', id));
      const snap = await getDocs(q);
      snap.forEach(d => referencingTitles.push(d.data().title || d.id));
    } else if (collectionName === 'categories') {
      const q = query(collection(db, 'activities'), where('categoryId', '==', id));
      const snap = await getDocs(q);
      snap.forEach(d => referencingTitles.push(d.data().title || d.id));
    } else if (collectionName === 'employees') {
      const q = query(collection(db, 'activities'), where('attendeeIds', 'array-contains', id));
      const snap = await getDocs(q);
      snap.forEach(d => referencingTitles.push(d.data().title || d.id));
    } else if (collectionName === 'departments') {
      const q = query(collection(db, 'employees'), where('departmentId', '==', id));
      const snap = await getDocs(q);
      snap.forEach(d => referencingTitles.push(d.data().name || d.id));
    }
  } catch (err) {
    console.warn(`[Master Repository] Warning checking referential usage for ${collectionName}/${id}:`, err);
  }

  return {
    inUse: referencingTitles.length > 0,
    count: referencingTitles.length,
    referencingTitles
  };
}
