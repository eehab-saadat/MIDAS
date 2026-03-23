/**
 * Radiology API Service
 */

import { apiClient } from "./client";
import {
  Radiology,
  CreateRadiologyInput,
  PaginatedResponse,
  RadiologyListParams,
} from "@/types/api";

export const radiologyAPI = {
  /**
   * List all radiology reports with optional filtering and pagination
   */
  list: (params?: RadiologyListParams) =>
    apiClient.get<PaginatedResponse<Radiology>>("/radiology/", params),

  /**
   * Create a new radiology report
   */
  create: (data: CreateRadiologyInput) =>
    apiClient.post<Radiology>("/radiology/", data),

  /**
   * Retrieve a specific radiology report
   */
  get: (id: number) => apiClient.get<Radiology>(`/radiology/${id}/`),

  /**
   * Full update of a radiology report
   */
  update: (id: number, data: Partial<CreateRadiologyInput>) =>
    apiClient.put<Radiology>(`/radiology/${id}/`, data),

  /**
   * Partial update of a radiology report
   */
  patch: (id: number, data: Partial<CreateRadiologyInput>) =>
    apiClient.patch<Radiology>(`/radiology/${id}/`, data),

  /**
   * Delete a radiology report
   */
  delete: (id: number) => apiClient.delete<void>(`/radiology/${id}/`),
};
