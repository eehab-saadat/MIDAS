import { apiClient } from "./client";
import type {
  BodyPart,
  PaginatedResponse,
  BodyPartListParams,
} from "@/types/api";

export const bodyPartsAPI = {
  list: (params?: BodyPartListParams) =>
    apiClient.get<PaginatedResponse<BodyPart>>("/body-parts/", params),

  get: (id: number) => apiClient.get<BodyPart>(`/body-parts/${id}/`),
};
