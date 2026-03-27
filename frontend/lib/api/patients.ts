/**
 * Patients API Service
 */

import { apiClient } from "./client";
import type {
  Patient,
  CreatePatientInput,
  PaginatedResponse,
  PatientListParams,
  CompletePatientDetails,
  Vitals,
  Encounter,
  Medication,
  Radiology,
  Lab,
  EncounterSummary,
  LabSummary,
  RadiologySummary,
} from "@/types/api";

export const patientsAPI = {
  /**
   * List all patients with optional pagination
   * @param params - Optional pagination and filter parameters (page, search, ordering)
   * @example
   * patientsAPI.list({ page: 1 })
   * patientsAPI.list({ search: "john" }) // search by MRNO or name
   * patientsAPI.list({ ordering: "-name" }) // sort by name descending
   */
  list: (params?: PatientListParams) =>
    apiClient.get<PaginatedResponse<Patient>>("/patients/", params),

  /**
   * Search patients by MRNO or name
   * @param searchTerm - Search query string (case-insensitive)
   * @param page - Optional page number for pagination
   */
  search: (searchTerm: string, page?: number) =>
    apiClient.get<PaginatedResponse<Patient>>("/patients/", {
      search: searchTerm,
      page,
    }),

  /**
   * Create a new patient
   */
  create: (data: CreatePatientInput) =>
    apiClient.post<Patient>("/patients/", data),

  /**
   * Retrieve a specific patient
   */
  get: (id: number) => apiClient.get<Patient>(`/patients/${id}/`),

  /**
   * Full update of a patient
   */
  update: (id: number, data: Partial<CreatePatientInput>) =>
    apiClient.put<Patient>(`/patients/${id}/`, data),

  /**
   * Partial update of a patient
   */
  patch: (id: number, data: Partial<CreatePatientInput>) =>
    apiClient.patch<Patient>(`/patients/${id}/`, data),

  /**
   * Delete a patient
   */
  delete: (id: number) => apiClient.delete<void>(`/patients/${id}/`),

  /**
   * Get complete patient details by MRNO (demographics, vitals, labs, radiology, medications, encounters)
   */
  getByMrno: (mrno: string) =>
    apiClient.get<CompletePatientDetails>(`/patients/mrno/${mrno}/`),

  /**
   * Get all vitals for a specific patient
   */
  getVitals: (patientId: number) =>
    apiClient.get<PaginatedResponse<Vitals>>(`/patients/${patientId}/vitals/`),

  /**
   * Get all encounters for a specific patient
   */
  getEncounters: (patientId: number) =>
    apiClient.get<PaginatedResponse<Encounter>>(
      `/patients/${patientId}/encounters/`,
    ),

  /**
   * Get all medications for a specific patient
   */
  getMedications: (patientId: number) =>
    apiClient.get<PaginatedResponse<Medication>>(
      `/patients/${patientId}/medications/`,
    ),

  /**
   * Get all radiology reports for a specific patient
   */
  getRadiology: (patientId: number) =>
    apiClient.get<PaginatedResponse<Radiology>>(
      `/patients/${patientId}/radiology/`,
    ),

  /**
   * Get all lab results for a specific patient
   */
  getLabs: (patientId: number) =>
    apiClient.get<PaginatedResponse<Lab>>(`/patients/${patientId}/labs/`),

  /**
   * Lightweight encounter list (id, date, clinician_name only)
   */
  getEncountersSummary: (patientId: number) =>
    apiClient.get<EncounterSummary[]>(
      `/patients/${patientId}/encounters-summary/`,
    ),

  /**
   * Lightweight lab list (id, cpt_name, invoice_date only)
   */
  getLabsSummary: (patientId: number) =>
    apiClient.get<LabSummary[]>(`/patients/${patientId}/labs-summary/`),

  /**
   * Lightweight radiology list (id, cpt_name, created_at only)
   */
  getRadiologySummary: (patientId: number) =>
    apiClient.get<RadiologySummary[]>(
      `/patients/${patientId}/radiology-summary/`,
    ),
};
