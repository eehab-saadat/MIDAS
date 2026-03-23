/**
 * API Services Index
 * Central export point for all API services
 */

export { apiClient, APIError } from "./client";
export { patientsAPI } from "./patients";
export { vitalsAPI } from "./vitals";
export { cliniciansAPI } from "./clinicians";
export { encountersAPI } from "./encounters";
export { medicationsAPI } from "./medications";
export { radiologyAPI } from "./radiology";
export { labsAPI } from "./labs";

// Re-export types
export type * from "@/types/api";
