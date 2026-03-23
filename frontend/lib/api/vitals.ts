/**
 * Vitals API Service
 */

import { apiClient } from "./client";
import {
  Vitals,
  CreateVitalsInput,
  PaginatedResponse,
  VitalsListParams,
} from "@/types/api";

export const vitalsAPI = {
  /**
   * List all vitals with optional filtering and pagination
   */
  list: (params?: VitalsListParams) =>
    apiClient.get<PaginatedResponse<Vitals>>("/vitals/", params),

  /**
   * Create a new vitals record
   */
  create: (data: CreateVitalsInput) => apiClient.post<Vitals>("/vitals/", data),

  /**
   * Retrieve a specific vitals record
   */
  get: (id: number) => apiClient.get<Vitals>(`/vitals/${id}/`),

  /**
   * Full update of a vitals record
   */
  update: (id: number, data: Partial<CreateVitalsInput>) =>
    apiClient.put<Vitals>(`/vitals/${id}/`, data),

  /**
   * Partial update of a vitals record
   */
  patch: (id: number, data: Partial<CreateVitalsInput>) =>
    apiClient.patch<Vitals>(`/vitals/${id}/`, data),

  /**
   * Delete a vitals record
   */
  delete: (id: number) => apiClient.delete<void>(`/vitals/${id}/`),
};
