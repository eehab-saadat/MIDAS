/**
 * Transcription API Service
 * Sends audio to the backend for Gemini-powered transcription.
 */

import { apiClient } from "./client";

interface TranscriptionResponse {
  transcription: string;
}

export const transcribeAPI = {
  /**
   * Upload an audio blob and get back a transcription string.
   */
  transcribe: (audioBlob: Blob, filename = "recording.webm") => {
    const fd = new FormData();
    fd.append("file", audioBlob, filename);
    return apiClient.postForm<TranscriptionResponse>("/transcribe/", fd);
  },
};
