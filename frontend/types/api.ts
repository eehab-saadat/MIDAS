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
  dob: string;
  age: number;
  last_visit_date: string | null;
  history: string;
  created_at: string;
  updated_at: string;
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
  patient_mrno?: string;
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
  joining_date: string;
}

export interface CreateClinicianInput {
  name: string;
  title: string;
  joining_date: string;
}

/* ============ Body Part ============ */

export interface BodyPart {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/* ============ SNOMED Entity ============ */

export type SnomedEntityType =
  | "finding"
  | "procedure"
  | "body_structure"
  | "other";

export interface SnomedEntity {
  snomed_cid: string;
  fsn: string;
  umls_cui: string | null;
  entity_type: SnomedEntityType;
  body_parts: BodyPart[];
  created_at: string;
  updated_at: string;
}

/* ============ Symptom ============ */

export interface Symptom {
  id: number;
  encounter: number;
  snomed_entity: string;
  snomed_cid: string;
  snomed_fsn: string;
  snomed_entity_type: string;
  clinician_remarks: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSymptomInput {
  encounter: number;
  snomed_entity: string;
  clinician_remarks?: string;
}

/* ============ Encounter ============ */

export interface Encounter {
  id: number;
  patient: number;
  patient_mrno?: string;
  clinician: number | null;
  clinician_name?: string | null;
  date: string;
  notes: string;
  symptoms?: Symptom[];
  created_at: string;
  updated_at: string;
}

export interface CreateEncounterInput {
  patient: number;
  clinician?: number | null;
  date: string;
  notes?: string;
}

/* ============ Medication ============ */

export interface Medication {
  id: number;
  patient: number;
  patient_mrno?: string;
  prescribed_by: number | null;
  prescribed_by_name?: string | null;
  prescribed_on: string | null;
  active_agent_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  indication: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicationInput {
  patient: number;
  prescribed_by?: number | null;
  prescribed_on?: string;
  active_agent_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  indication?: string;
}

/* ============ Radiology ============ */

export interface Radiology {
  id: number;
  patient: number;
  patient_mrno?: string;
  cpt_id: string;
  cpt_name: string;
  technique: string;
  result: string;
  conclusion: string;
  system_conclusion: string;
  file_path: string;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRadiologyInput {
  patient: number;
  cpt_id?: string;
  cpt_name?: string;
  technique?: string;
  result?: string;
  conclusion?: string;
  file_path?: string;
}

/* ============ Lab Results ============ */

export interface LabTestResult {
  result: number | null;
  unit: string;
  normal_range: [string, string];
}

export interface Lab {
  id: number;
  patient: number;
  patient_mrno?: string;
  cpt_id: string;
  cpt_name: string;
  results: Record<string, LabTestResult>;
  invoice_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLabInput {
  patient: number;
  cpt_id?: string;
  cpt_name: string;
  results: Record<string, LabTestResult>;
  invoice_date?: string;
}

/* ============ Complete Patient Details ============ */

export interface CompletePatientVitals {
  timestamp: string | null;
  weight: number | null;
  weight_unit: string;
  height: number | null;
  height_unit: string;
  blood_pressure: string;
  temperature: number | null;
  temperature_unit: string;
  pulse: number | null;
  pulse_unit: string;
  respiratory_rate: number | null;
  respiratory_rate_unit: string;
}

export interface CompletePatientLabResult {
  id?: number;
  cpt_id: string;
  cpt_name: string;
  date: string | null;
  results: Record<string, LabTestResult>;
}

export interface CompletePatientRadiology {
  id?: number;
  cpt_id: string;
  cpt_name: string;
  technique: string;
  result: string;
  conclusion: string;
  system_conclusion: string;
  file_path: string;
  date: string;
}

export interface CompletePatientMedication {
  id?: number;
  medication_name: string;
  active_agent_name: string;
  dosage: string;
  frequency: string;
  indication: string;
  prescribed_on: string | null;
  prescribed_by: string | null;
}

export interface CompletePatientEncounterSymptom {
  snomed_cid: string;
  snomed_fsn: string;
  entity_type: string;
  clinician_remarks: string;
}

export interface CompletePatientEncounter {
  id?: number;
  date: string;
  clinician: string | null;
  notes: string;
  symptoms: CompletePatientEncounterSymptom[];
}

export interface CompletePatientDetails {
  patient_id: string;
  personal_information: {
    name: string;
    gender: string;
    dob: string | null;
    age: number | null;
  };
  vitals: CompletePatientVitals | Record<string, never>;
  lab_results: CompletePatientLabResult[];
  radiology_reports: CompletePatientRadiology[];
  medications: CompletePatientMedication[];
  recent_encounters: CompletePatientEncounter[];
  current_symptoms: string[];
  known_medical_history: string[];
  last_visit: string | null;
}

/* ============ Diagnosis ============ */

export interface DiagnosisResult {
  diagnosis: string;
  reasoning: string;
  advisory?: string;
}

/* ============ Summary Types (lightweight, for list views) ============ */

export interface EncounterSummary {
  id: number;
  patient: number;
  date: string;
  clinician: number | null;
  clinician_name: string | null;
}

export interface LabSummary {
  id: number;
  cpt_id: string;
  cpt_name: string;
  invoice_date: string | null;
}

export interface RadiologySummary {
  id: number;
  cpt_id: string;
  cpt_name: string;
  created_at: string;
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
  active?: boolean;
}
export interface RadiologyListParams extends ListQueryParams {
  patient?: number;
}
export interface LabListParams extends ListQueryParams {
  patient?: number;
}
export interface SnomedEntityListParams extends ListQueryParams {
  entity_type?: SnomedEntityType;
  body_part?: number;
}
export interface SymptomListParams extends ListQueryParams {
  encounter?: number;
  snomed_entity?: string;
}
export interface BodyPartListParams extends ListQueryParams {}
