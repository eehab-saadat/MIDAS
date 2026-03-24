import { apiClient } from "./client";
import type { DiagnosisResult } from "@/types/api";

export const diagnosisAPI = {
  /**
   * Trigger the AI diagnostic pipeline for a patient.
   * The backend may take significant time to respond.
   */
  run: (mrno: string) =>
    apiClient.post<DiagnosisResult>("/diagnose/", null, { mrno }),
};
