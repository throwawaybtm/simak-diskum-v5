/**
 * Shared business logic, schemas, and time utilities
 * for Department Activity Scheduling System v5.0
 */

export const SYSTEM_VERSION = '5.0.0';
export const TIMEZONE = 'Asia/Jakarta'; // WIB (UTC+7)

export * from './schema/index';
export * from './scheduling/timeUtils';
export * from './scheduling/attendeeSnapshot';
export * from './scheduling/conflictDetector';
export * from './validation/activityValidator';
export * from './validation/masterValidator';
export * from './validation/privacyScanner';
export * from './projection/publicProjector';
export * from './repository/activityRepository';
export * from './repository/publicRepository';
export * from './repository/masterRepository';
