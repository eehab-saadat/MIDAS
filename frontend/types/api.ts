/**
 * API Types and Interfaces
 * Based on Django models and API documentation
 */

/* ============ Base Response Types ============ */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ============ Patient ============ */

export interface Patient {
  id: number;
  mrno: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  dob: string; // ISO date string
  age: number; // read-only, computed
  last_visit_date: string | null; // ISO datetime string, read-only, computed from most recent encounter
  history: string;
  created_at: string; // ISO datetime string, read-only
  updated_at: string; // ISO datetime string, read-only
}

export interface CreatePatientInput {
  mrno: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  dob: string;
  history: string;
}

/* ============ Vitals ============ */

export interface Vitals {
  id: number;
  patient: number;
  timestamp: string; // ISO datetime string
  weight: number;
  weight_unit: string;
  height: number;
  height_unit: string;
  temperature: number;
  temperature_unit: string;
  pulse: number;
  pulse_unit: string;
  respiratory_rate: number;
  respiratory_rate_unit: string;
  bp_high: number;
  bp_low: number;
}

export interface CreateVitalsInput {
  patient: number;
  timestamp: string;
  weight: number;
  weight_unit: string;
  height: number;
  height_unit: string;
  temperature: number;
  temperature_unit: string;
  pulse: number;
  pulse_unit: string;
  respiratory_rate: number;
  respiratory_rate_unit: string;
  bp_high: number;
  bp_low: number;
}

/* ============ Clinician ============ */

export interface Clinician {
  id: number;
  name: string;
  title: string;
  joining_date: string; // ISO date string
}

export interface CreateClinicianInput {
  name: string;
  title: string;
  joining_date: string;
}

/* ============ Encounter ============ */

export interface Encounter {
  id: number;
  patient: number;
  clinician: number;
  date: string; // ISO datetime string
  notes: string; // Markdown formatted
}

export interface CreateEncounterInput {
  patient: number;
  clinician: number;
  date: string;
  notes: string;
}

/* ============ Medication ============ */

export interface Medication {
  id: number;
  patient: number;
  prescribed_by: number;
  prescribed_on: string; // ISO date string
  active_agent_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  indication: string;
}

export interface CreateMedicationInput {
  patient: number;
  prescribed_by: number;
  prescribed_on: string;
  active_agent_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  indication: string;
}

/* ============ Radiology ============ */

export interface Radiology {
  id: number;
  patient: number;
  cpt_id: string;
  cpt_name: string;
  technique: string;
  result: string;
  conclusion: string;
  system_conclusion: string;
  file_path: string;
}

export interface CreateRadiologyInput {
  patient: number;
  cpt_id: string;
  cpt_name: string;
  technique: string;
  result: string;
  conclusion: string;
  system_conclusion: string;
  file_path: string;
}

/* ============ Lab Results ============ */

export interface Lab {
  id: number;
  patient: number;
  cpt_id: string;
  cpt_name: string;
  results: Record<string, number>; // JSON object with test name as key
  invoice_date: string; // ISO date string
}

export interface CreateLabInput {
  patient: number;
  cpt_id: string;
  cpt_name: string;
  results: Record<string, number>;
  invoice_date: string;
}

/* ============ Query Parameters ============ */

export interface ListQueryParams {
  page?: number;
  search?: string;
  ordering?: string;
}

export interface PatientListParams extends ListQueryParams {}
export interface VitalsListParams extends ListQueryParams {
  patient?: number;
}
export interface ClinicianListParams extends ListQueryParams {}
export interface EncounterListParams extends ListQueryParams {
  patient?: number;
  clinician?: number;
}
export interface MedicationListParams extends ListQueryParams {
  patient?: number;
}
export interface RadiologyListParams extends ListQueryParams {
  patient?: number;
}
export interface LabListParams extends ListQueryParams {
  patient?: number;
}
