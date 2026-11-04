/**
 * Audit log schema for tracking all administrative writes
 */

export type AuditAction = 'CREATE' | 'UPDATE' | 'CANCEL' | 'DELETE' | 'MIGRATE';

export interface AuditLogDocument {
  id: string;                      // UUID
  requestId: string;               // Client-generated idempotency key
  timestamp: string;               // ISO 8601 UTC
  actorLabel: string;              // "UNVERIFIED" in emulator mode, or user UID
  identitySource: 'UNVERIFIED' | 'AUTH_UID';
  action: AuditAction;
  recordId: string;
  version: number;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown>;
}
