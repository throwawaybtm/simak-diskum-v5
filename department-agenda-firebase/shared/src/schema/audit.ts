/**
 * Audit log schema for tracking all administrative writes
 */

export type AuditAction = 'CREATE' | 'UPDATE' | 'CANCEL' | 'DELETE' | 'MIGRATE';

export interface AuditLogDocument {
  id: string;                      // UUID
  actorId?: string;                // Authenticated user UID (required in production rules)
  requestId: string;               // Client-generated idempotency key
  timestamp: any;                  // Firestore serverTimestamp() on create, Timestamp/ISO string on read
  actorLabel: string;              // "UNVERIFIED" in emulator mode, or user display email/name
  identitySource: 'UNVERIFIED' | 'AUTH_UID';
  action: AuditAction;
  recordId: string;
  version: number;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown>;
  collectionName?: string;
  documentId?: string;
  details?: Record<string, unknown> | null;
}
