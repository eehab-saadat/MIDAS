import { apiClient } from "./client";
import type {
  SnomedEntity,
  PaginatedResponse,
  SnomedEntityListParams,
} from "@/types/api";

export const snomedEntitiesAPI = {
  list: (params?: SnomedEntityListParams) =>
    apiClient.get<PaginatedResponse<SnomedEntity>>(
      "/snomed-entities/",
      params,
    ),

  get: (cid: string) =>
    apiClient.get<SnomedEntity>(`/snomed-entities/${cid}/`),
};
