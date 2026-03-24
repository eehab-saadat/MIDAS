import { apiClient } from "./client";
import type {
  Symptom,
  CreateSymptomInput,
  PaginatedResponse,
  SymptomListParams,
} from "@/types/api";

export const symptomsAPI = {
  list: (params?: SymptomListParams) =>
    apiClient.get<PaginatedResponse<Symptom>>("/symptoms/", params),

  create: (data: CreateSymptomInput) =>
    apiClient.post<Symptom>("/symptoms/", data),

  get: (id: number) => apiClient.get<Symptom>(`/symptoms/${id}/`),

  delete: (id: number) => apiClient.delete<void>(`/symptoms/${id}/`),
};
