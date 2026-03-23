/**
 * Medications API Service
 */

import { apiClient } from "./client";
import {
  Medication,
  CreateMedicationInput,
  PaginatedResponse,
  MedicationListParams,
} from "@/types/api";

export const medicationsAPI = {
  /**
   * List all medications with optional filtering and pagination
   */
  list: (params?: MedicationListParams) =>
    apiClient.get<PaginatedResponse<Medication>>("/medications/", params),

  /**
   * Create a new medication record
   */
  create: (data: CreateMedicationInput) =>
    apiClient.post<Medication>("/medications/", data),

  /**
   * Retrieve a specific medication record
   */
  get: (id: number) => apiClient.get<Medication>(`/medications/${id}/`),

  /**
   * Full update of a medication record
   */
  update: (id: number, data: Partial<CreateMedicationInput>) =>
    apiClient.put<Medication>(`/medications/${id}/`, data),

  /**
   * Partial update of a medication record
   */
  patch: (id: number, data: Partial<CreateMedicationInput>) =>
    apiClient.patch<Medication>(`/medications/${id}/`, data),

  /**
   * Delete a medication record
   */
  delete: (id: number) => apiClient.delete<void>(`/medications/${id}/`),
};
