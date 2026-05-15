import { apiClient } from "./client";
import type { DiagnosisResult } from "@/types/api";

export const diagnosisAPI = {
  /**
   * Trigger the AI diagnostic pipeline for a patient.
   * The backend may take significant time to respond.
   */
  run: (mrno: string) =>
    apiClient.post<DiagnosisResult>("/diagnose/", null, { mrno }),

  /**
   * Re-run diagnosis with clinician critique appended to the prompt.
   * The model will attempt to address the feedback in its revised output.
   */
  rerunWithCritique: (mrno: string, humanCritique: string) =>
    apiClient.post<DiagnosisResult>(
      "/diagnose/",
      { human_critique: humanCritique },
      { mrno },
    ),

  /**
   * Submit positive feedback — stores the approved diagnosis in the
   * RAG store so it can be used for future k-shot retrieval.
   */
  submitFeedback: (mrno: string, diagnosis: string, reasoning: string) =>
    apiClient.post<{ status: string; message: string }>(
      "/diagnosis-feedback/",
      { mrno, diagnosis, reasoning },
    ),
};
