import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { ActivityDocument, AttendeeSnapshot } from '../../shared/src/schema/activity';
import type { Employee, Location, Organizer, Category } from '../../shared/src/schema/master';
import type { PublicActivityDTO } from '../../shared/src/schema/publicDto';

describe('Data Models & Schema Contract Verification', () => {
  const fixturePath = path.resolve(__dirname, '../fixtures/syntheticSchedule.json');

  it('loads and validates the synthetic schedule fixture structure', () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    expect(fixture.system.timezone).toBe('Asia/Jakarta');
    expect(fixture.master.employees.length).toBeGreaterThan(0);
    expect(fixture.master.locations.length).toBeGreaterThan(0);
    expect(fixture.activities.length).toBeGreaterThan(0);
  });

  it('validates activity document schema including attendeeSnapshots and publicCancellationNotice', () => {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const activities: ActivityDocument[] = fixture.activities;

    for (const act of activities) {
      expect(act.id).toBeDefined();
      expect(typeof act.title).toBe('string');
      expect(act.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(act.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(act.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(typeof act.openEnded).toBe('boolean');
      expect(Array.isArray(act.attendeeIds)).toBe(true);
      expect(Array.isArray(act.attendeeSnapshots)).toBe(true);
      expect(['SCHEDULED', 'CANCELLED', 'COMPLETED']).toContain(act.status);

      // Verify attendee snapshot structure
      for (const snapshot of act.attendeeSnapshots) {
        expect(snapshot.employeeId).toBeDefined();
        expect(snapshot.name).toBeDefined();
        expect(snapshot.position).toBeDefined();
        expect(snapshot.label).toBeDefined();
      }

      // Check cancellation notice on cancelled activity
      if (act.status === 'CANCELLED') {
        expect(act.cancelReason).toBeDefined();
        expect(typeof act.publicCancellationNotice).toBe('string');
      }
    }
  });

  it('validates master data schemas: employees, locations, organizers, categories', () => {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const employees: Employee[] = fixture.master.employees;
    const locations: Location[] = fixture.master.locations;
    const organizers: Organizer[] = fixture.master.organizers;
    const categories: Category[] = fixture.master.categories;

    for (const emp of employees) {
      expect(emp.id).toBeDefined();
      expect(emp.name).toBeDefined();
      expect(emp.position).toBeDefined();
      expect(typeof emp.active).toBe('boolean');
    }

    for (const loc of locations) {
      expect(loc.id).toBeDefined();
      expect(loc.name).toBeDefined();
      expect(['OFFICE', 'EXTERNAL', 'ONLINE']).toContain(loc.type);
      expect(typeof loc.isBookableRoom).toBe('boolean');
    }

    for (const org of organizers) {
      expect(org.id).toBeDefined();
      expect(org.name).toBeDefined();
    }

    for (const cat of categories) {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeDefined();
      expect(cat.colorHex).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
