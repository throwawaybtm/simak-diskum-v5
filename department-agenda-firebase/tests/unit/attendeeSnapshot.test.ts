import { describe, it, expect } from 'vitest';
import { captureAttendeeSnapshots } from '../../shared/src/scheduling/attendeeSnapshot';
import type { Employee } from '../../shared/src/schema/master';

describe('Historical Attendee Snapshot Immutability Engine', () => {
  const employeesDirectory: Employee[] = [
    { id: 'emp_01', name: 'Drs. Hendri Arifin, M.Si', position: 'Kepala Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_02', name: 'Rini Marlina, S.Sos', position: 'Sekretaris Dinas', departmentId: 'dept_01', active: true },
    { id: 'emp_03', name: 'Ahmad Fauzi, SE', position: 'Kepala Bidang Koperasi', departmentId: 'dept_02', active: true }
  ];

  it('captures attendee snapshots with sequential numbering and official position', () => {
    const snapshots = captureAttendeeSnapshots(['emp_01', 'emp_03'], employeesDirectory, ['Ketua Dekranasda']);

    expect(snapshots).toHaveLength(3);
    expect(snapshots[0]).toEqual({
      employeeId: 'emp_01',
      name: 'Drs. Hendri Arifin, M.Si',
      position: 'Kepala Dinas',
      departmentId: 'dept_01',
      label: '1. Kadis (Drs. Hendri Arifin, M.Si)'
    });
    expect(snapshots[1]).toEqual({
      employeeId: 'emp_03',
      name: 'Ahmad Fauzi, SE',
      position: 'Kepala Bidang Koperasi',
      departmentId: 'dept_02',
      label: '2. Kabid Koperasi (Ahmad Fauzi, SE)'
    });
    expect(snapshots[2]).toEqual({
      employeeId: 'guest_0',
      name: 'Ketua Dekranasda',
      position: 'Tamu Undangan',
      label: '3. Tamu Undangan: Ketua Dekranasda'
    });
  });

  it('guarantees snapshot immutability when the master directory is subsequently updated', () => {
    // 1. Capture snapshot at time T0
    const snapshotT0 = captureAttendeeSnapshots(['emp_01'], employeesDirectory);
    expect(snapshotT0[0].name).toBe('Drs. Hendri Arifin, M.Si');

    // 2. Simulate master directory mutation at time T1 (e.g. employee gets promoted or replaced)
    const modifiedDirectory: Employee[] = [
      { id: 'emp_01', name: 'Pejabat Baru, S.STP', position: 'Plt. Kepala Dinas', departmentId: 'dept_01', active: true }
    ];

    // 3. Verify original snapshot remains unchanged
    expect(snapshotT0[0].name).toBe('Drs. Hendri Arifin, M.Si');
    expect(snapshotT0[0].position).toBe('Kepala Dinas');

    // 4. Verify new capture at T1 reflects changes
    const snapshotT1 = captureAttendeeSnapshots(['emp_01'], modifiedDirectory);
    expect(snapshotT1[0].name).toBe('Pejabat Baru, S.STP');
  });
});
