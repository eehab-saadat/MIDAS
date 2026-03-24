import { apiClient } from "./client";

export interface GenerateSummaryInput {
  custom_diagnosis: string;
  notes?: string;
  medication_ids?: number[];
}

export interface SummaryResponse {
  html: string;
  pdf_url?: string;
}

export const summaryAPI = {
  generate: (encounterId: number, data: GenerateSummaryInput) =>
    apiClient.post<SummaryResponse>(
      `/encounters/${encounterId}/generate-summary/`,
      data,
    ),

  generatePdf: (encounterId: number) =>
    apiClient.post<{ pdf_url: string }>(
      `/encounters/${encounterId}/generate-pdf/`,
    ),
};
