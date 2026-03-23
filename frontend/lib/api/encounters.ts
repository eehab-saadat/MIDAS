/**
 * Encounters API Service
 */

import { apiClient } from "./client";
import {
  Encounter,
  CreateEncounterInput,
  PaginatedResponse,
  EncounterListParams,
} from "@/types/api";

export const encountersAPI = {
  /**
   * List all encounters with optional filtering and pagination
   */
  list: (params?: EncounterListParams) =>
    apiClient.get<PaginatedResponse<Encounter>>("/encounters/", params),

  /**
   * Create a new encounter
   */
  create: (data: CreateEncounterInput) =>
    apiClient.post<Encounter>("/encounters/", data),

  /**
   * Retrieve a specific encounter
   */
  get: (id: number) => apiClient.get<Encounter>(`/encounters/${id}/`),

  /**
   * Full update of an encounter
   */
  update: (id: number, data: Partial<CreateEncounterInput>) =>
    apiClient.put<Encounter>(`/encounters/${id}/`, data),

  /**
   * Partial update of an encounter
   */
  patch: (id: number, data: Partial<CreateEncounterInput>) =>
    apiClient.patch<Encounter>(`/encounters/${id}/`, data),

  /**
   * Delete an encounter
   */
  delete: (id: number) => apiClient.delete<void>(`/encounters/${id}/`),
};
