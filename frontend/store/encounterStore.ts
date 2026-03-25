import { create } from "zustand";
import { patientsAPI, encountersAPI } from "@/lib/api";
import type {
  CompletePatientDetails,
  Encounter,
  Symptom,
  Vitals,
  DiagnosisResult,
} from "@/types/api";

interface EncounterState {
  // Patient context
  patientMrno: string | null;
  patientPk: number | null;
  patientDetails: CompletePatientDetails | null;

  // Active encounter
  encounterId: number | null;
  encounter: Encounter | null;

  // Clinical inputs
  symptoms: Symptom[];
  currentVitals: Vitals | null;

  // Notes & AI
  notes: string;
  diagnosisResult: DiagnosisResult | null;
  diagnosisStatus: "idle" | "running" | "complete" | "error";

  // Summary
  customDiagnosis: string;
  summaryGenerated: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
}

interface EncounterActions {
  loadPatient: (mrno: string) => Promise<void>;
  createEncounter: (
    patientPk: number,
    clinicianId?: number | null,
  ) => Promise<Encounter | null>;
  setEncounter: (encounter: Encounter) => void;

  // Symptoms
  addSymptom: (symptom: Symptom) => void;
  removeSymptom: (id: number) => void;
  setSymptoms: (symptoms: Symptom[]) => void;

  // Vitals
  setVitals: (vitals: Vitals | null) => void;

  // Notes
  updateNotes: (text: string) => void;

  // Diagnosis
  setDiagnosisResult: (result: DiagnosisResult | null) => void;
  setDiagnosisStatus: (
    status: "idle" | "running" | "complete" | "error",
  ) => void;

  // Summary
  setCustomDiagnosis: (text: string) => void;
  setSummaryGenerated: (generated: boolean) => void;

  // Refresh patient data from server
  refreshPatientData: () => Promise<void>;

  reset: () => void;
}

const initialState: EncounterState = {
  patientMrno: null,
  patientPk: null,
  patientDetails: null,
  encounterId: null,
  encounter: null,
  symptoms: [],
  currentVitals: null,
  notes: "",
  diagnosisResult: null,
  diagnosisStatus: "idle",
  customDiagnosis: "",
  summaryGenerated: false,
  isLoading: false,
  error: null,
};

export const useEncounterStore = create<EncounterState & EncounterActions>(
  (set, get) => ({
    ...initialState,

    loadPatient: async (mrno: string) => {
      set({ isLoading: true, error: null, patientMrno: mrno });
      try {
        const data = await patientsAPI.getByMrno(mrno);
        set({ patientDetails: data, isLoading: false });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load patient.";
        set({ error: message, isLoading: false });
      }
    },

    createEncounter: async (patientPk, clinicianId = null) => {
      try {
        const encounter = await encountersAPI.create({
          patient: patientPk,
          clinician: clinicianId,
          date: new Date().toISOString(),
          notes: "",
        });
        set({
          encounterId: encounter.id,
          encounter,
          patientPk,
          notes: encounter.notes || "",
        });
        return encounter;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create encounter.";
        set({ error: message });
        return null;
      }
    },

    setEncounter: (encounter) =>
      set({
        encounter,
        encounterId: encounter.id,
        notes: encounter.notes || "",
      }),

    addSymptom: (symptom) =>
      set((s) => ({ symptoms: [...s.symptoms, symptom] })),

    removeSymptom: (id) =>
      set((s) => ({ symptoms: s.symptoms.filter((sym) => sym.id !== id) })),

    setSymptoms: (symptoms) => set({ symptoms }),

    setVitals: (vitals) => set({ currentVitals: vitals }),

    updateNotes: (text) => set({ notes: text }),

    setDiagnosisResult: (result) => set({ diagnosisResult: result }),

    setDiagnosisStatus: (status) => set({ diagnosisStatus: status }),

    setCustomDiagnosis: (text) => set({ customDiagnosis: text }),

    setSummaryGenerated: (generated) => set({ summaryGenerated: generated }),

    refreshPatientData: async () => {
      const mrno = get().patientMrno;
      if (!mrno) return;
      try {
        const data = await patientsAPI.getByMrno(mrno);
        set({ patientDetails: data });
      } catch {
        // silent refresh failure
      }
    },

    reset: () => set(initialState),
  }),
);
