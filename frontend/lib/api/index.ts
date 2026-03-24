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
export { snomedEntitiesAPI } from "./snomed-entities";
export { symptomsAPI } from "./symptoms";
export { bodyPartsAPI } from "./body-parts";
export { diagnosisAPI } from "./diagnosis";
export { summaryAPI } from "./summary";

// Re-export types
export type * from "@/types/api";
