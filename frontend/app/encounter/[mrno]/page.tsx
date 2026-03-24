"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEncounterStore } from "@/store/encounterStore";
import { PatientHeader } from "@/components/features/encounter/PatientHeader";
import { EncounterTabs } from "@/components/features/encounter/EncounterTabs";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

export default function EncounterPage() {
  const params = useParams<{ mrno: string }>();
  const router = useRouter();
  const mrno = params.mrno;

  const {
    patientDetails,
    isLoading,
    error,
    encounterId,
    loadPatient,
    createEncounter,
    reset,
  } = useEncounterStore();

  useEffect(() => {
    reset();
    if (mrno) {
      loadPatient(mrno);
    }
  }, [mrno, loadPatient, reset]);

  // Auto-create an encounter once patient is loaded
  useEffect(() => {
    if (patientDetails && !encounterId) {
      const patientIdStr = patientDetails.patient_id;
      // We need the numeric PK; fetch it by searching for the mrno
      // The by_mrno endpoint returns patient_id as mrno string, but we need
      // the Django PK for encounter creation. Use the patients list search.
      import("@/lib/api").then(({ patientsAPI }) => {
        patientsAPI
          .search(patientIdStr, 1)
          .then((res) => {
            const patient = res.results.find(
              (p) => p.mrno === patientIdStr,
            );
            if (patient) {
              createEncounter(patient.id);
            }
          })
          .catch(() => {
            // Non-critical — encounter can be created later
          });
      });
    }
  }, [patientDetails, encounterId, createEncounter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex flex-col items-center justify-center gap-4 p-8">
        <ErrorAlert
          message={error}
          onRetry={() => mrno && loadPatient(mrno)}
        />
        <button
          className="btn btn-outline btn-sm"
          onClick={() => router.push("/dashboard")}
        >
          &larr; Back to Dashboard
        </button>
      </div>
    );
  }

  if (!patientDetails) return null;

  return (
    <div className="min-h-screen bg-base-100">
      <PatientHeader details={patientDetails} />
      <EncounterTabs />
    </div>
  );
}
