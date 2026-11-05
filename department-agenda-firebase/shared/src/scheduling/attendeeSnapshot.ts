/**
 * Historical Attendee Snapshot Engine
 * 
 * Freezes participant names and positions into an immutable snapshot array
 * at the exact time of scheduling. Ensures historical governmental reports
 * never change when the employee directory is modified.
 */

import type { AttendeeSnapshot } from '../schema/activity';
import type { Employee } from '../schema/master';

/**
 * Standardizes common Indonesian civil service position abbreviations
 */
function abbreviatePosition(position: string): string {
  if (/kepala dinas/i.test(position)) return 'Kadis';
  if (/sekretaris dinas/i.test(position) || /sekretaris/i.test(position)) return 'Sekretaris';
  if (/kepala bidang koperasi/i.test(position) || /kabid koperasi/i.test(position)) return 'Kabid Koperasi';
  if (/kepala bidang pengawasan umkm/i.test(position) || /kabid umkm/i.test(position)) return 'Kabid UMKM';
  if (/kepala bidang/i.test(position)) return position.replace(/kepala bidang/i, 'Kabid');
  return position;
}

/**
 * Captures an immutable snapshot of attendees from current employee master data and guest names
 */
export function captureAttendeeSnapshots(
  attendeeIds: string[],
  employeeMasterList: Employee[],
  guestAttendees: string[] = []
): AttendeeSnapshot[] {
  const snapshots: AttendeeSnapshot[] = [];
  const empMap = new Map<string, Employee>(employeeMasterList.map(emp => [emp.id, emp]));

  // Deduplicate employee IDs while preserving input order
  const uniqueAttendeeIds = [...new Set(attendeeIds.filter(Boolean))];

  let counter = 1;

  // 1. Process employee attendees
  for (const empId of uniqueAttendeeIds) {
    const emp = empMap.get(empId);
    if (emp) {
      const shortPos = abbreviatePosition(emp.position);
      snapshots.push({
        employeeId: emp.id,
        name: emp.name,
        position: emp.position,
        departmentId: emp.departmentId,
        label: `${counter}. ${shortPos} (${emp.name})`
      });
      counter++;
    } else {
      // Fallback if employee was not found in active master list (Strict Privacy: zero raw IDs exposed)
      snapshots.push({
        employeeId: empId,
        name: 'Pegawai Dinas',
        position: 'Pegawai Dinas',
        label: `${counter}. Pegawai Dinas`
      });
      counter++;
    }
  }

  // 2. Process guest attendees
  for (let i = 0; i < guestAttendees.length; i++) {
    const guest = guestAttendees[i].trim();
    if (guest) {
      snapshots.push({
        employeeId: `guest_${i}`,
        name: guest,
        position: 'Tamu Undangan',
        label: `${counter}. Tamu Undangan: ${guest}`
      });
      counter++;
    }
  }

  return snapshots;
}

/**
 * Preserves existing snapshots when attendeeIds are unchanged and isAttendeeEdited is false.
 * Only regenerates snapshots when participants are explicitly edited.
 */
export function resolveActivitySnapshots(
  existingSnapshots: AttendeeSnapshot[] | undefined,
  currentAttendeeIds: string[],
  previousAttendeeIds: string[] | undefined,
  employeeMasterList: Employee[],
  guestAttendees: string[] = [],
  isExplicitAttendeeEdit: boolean = false
): AttendeeSnapshot[] {
  const hasExisting = Array.isArray(existingSnapshots) && existingSnapshots.length > 0;
  const idsMatch = Array.isArray(previousAttendeeIds) &&
    currentAttendeeIds.length === previousAttendeeIds.length &&
    currentAttendeeIds.every((id, idx) => id === previousAttendeeIds[idx]);

  if (hasExisting && idsMatch && !isExplicitAttendeeEdit) {
    return existingSnapshots;
  }

  return captureAttendeeSnapshots(currentAttendeeIds, employeeMasterList, guestAttendees);
}
