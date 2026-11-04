/**
 * Master Data schemas: Employees, Departments, Locations, Organizers, Categories
 */

export interface Employee {
  id: string;
  name: string;
  position: string;
  departmentId: string;
  active: boolean;
}

export interface Department {
  id: string;
  name: string;
  active: boolean;
}

export type LocationType = 'OFFICE' | 'EXTERNAL' | 'ONLINE';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  isBookableRoom: boolean; // Flag to indicate whether room collisions should trigger warnings
  active: boolean;
}

export interface Organizer {
  id: string;
  name: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  colorHex: string;
  active: boolean;
}
