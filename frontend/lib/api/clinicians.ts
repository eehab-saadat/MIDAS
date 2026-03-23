/**
 * Clinicians API Service
 */

import { apiClient } from "./client";
import {
  Clinician,
  CreateClinicianInput,
  PaginatedResponse,
  ClinicianListParams,
} from "@/types/api";

export const cliniciansAPI = {
  /**
   * List all clinicians with optional search and pagination
   */
  list: (params?: ClinicianListParams) =>
    apiClient.get<PaginatedResponse<Clinician>>("/clinicians/", params),

  /**
   * Create a new clinician
   */
  create: (data: CreateClinicianInput) =>
    apiClient.post<Clinician>("/clinicians/", data),

  /**
   * Retrieve a specific clinician
   */
  get: (id: number) => apiClient.get<Clinician>(`/clinicians/${id}/`),

  /**
   * Full update of a clinician
   */
  update: (id: number, data: Partial<CreateClinicianInput>) =>
    apiClient.put<Clinician>(`/clinicians/${id}/`, data),

  /**
   * Partial update of a clinician
   */
  patch: (id: number, data: Partial<CreateClinicianInput>) =>
    apiClient.patch<Clinician>(`/clinicians/${id}/`, data),

  /**
   * Delete a clinician
   */
  delete: (id: number) => apiClient.delete<void>(`/clinicians/${id}/`),
};
