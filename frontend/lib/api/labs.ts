/**
 * Lab Results API Service
 */

import { apiClient } from "./client";
import {
  Lab,
  CreateLabInput,
  PaginatedResponse,
  LabListParams,
} from "@/types/api";

export const labsAPI = {
  /**
   * List all lab results with optional filtering and pagination
   */
  list: (params?: LabListParams) =>
    apiClient.get<PaginatedResponse<Lab>>("/labs/", params),

  /**
   * Create a new lab result record
   */
  create: (data: CreateLabInput) => apiClient.post<Lab>("/labs/", data),

  /**
   * Retrieve a specific lab result record
   */
  get: (id: number) => apiClient.get<Lab>(`/labs/${id}/`),

  /**
   * Full update of a lab result record
   */
  update: (id: number, data: Partial<CreateLabInput>) =>
    apiClient.put<Lab>(`/labs/${id}/`, data),

  /**
   * Partial update of a lab result record
   */
  patch: (id: number, data: Partial<CreateLabInput>) =>
    apiClient.patch<Lab>(`/labs/${id}/`, data),

  /**
   * Delete a lab result record
   */
  delete: (id: number) => apiClient.delete<void>(`/labs/${id}/`),
};
