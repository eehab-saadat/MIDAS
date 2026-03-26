"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEncounterStore } from "@/store/encounterStore";
import { generatePatientSummaryPdf } from "@/lib/generatePatientPdf";

interface SummaryPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

type PdfBtnState = "idle" | "generating" | "saved";

export function SummaryPreview({ isOpen, onClose }: SummaryPreviewProps) {
  const patientDetails = useEncounterStore((s) => s.patientDetails);
  const customDiagnosis = useEncounterStore((s) => s.customDiagnosis);
  const notes = useEncounterStore((s) => s.notes);
  const setSummaryGenerated = useEncounterStore((s) => s.setSummaryGenerated);

  const [btnState, setBtnState] = useState<PdfBtnState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePdf = useCallback(async () => {
    if (!patientDetails) return;
    setBtnState("generating");
    setError(null);

    try {
      await generatePatientSummaryPdf({
        patientDetails,
        customDiagnosis,
        notes,
      });
      setSummaryGenerated(true);
      setBtnState("saved");
      setTimeout(() => setBtnState("idle"), 2500);
    } catch {
      setError("Failed to generate PDF. Please try again.");
      setBtnState("idle");
    }
  }, [patientDetails, customDiagnosis, notes, setSummaryGenerated]);

  if (!isOpen || !patientDetails) return null;

  const info = patientDetails.personal_information;
  const vitals = patientDetails.vitals;
  const hasVitals = vitals && Object.keys(vitals).length > 0;

  const btnClass =
    btnState === "saved"
      ? "btn btn-success btn-sm"
      : "btn btn-primary btn-sm";

  return createPortal(
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Patient Summary Preview</h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            &times;
          </button>
        </div>

        {/* Print-friendly summary content */}
        <div className="border border-base-300 rounded-lg p-6 bg-base-100 space-y-5 text-sm">
          {/* Patient info */}
          <section>
            <h4 className="font-semibold text-base border-b border-base-200 pb-1 mb-2">
              Patient Information
            </h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <SummaryField label="Name" value={info.name} />
              <SummaryField label="MRN" value={patientDetails.patient_id} />
              <SummaryField
                label="Age"
                value={info.age != null ? `${info.age} years` : "N/A"}
              />
              <SummaryField label="Gender" value={info.gender} />
            </div>
          </section>

          {/* Vitals */}
          {hasVitals && (
            <section>
              <h4 className="font-semibold text-base border-b border-base-200 pb-1 mb-2">
                Vitals
              </h4>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                {"blood_pressure" in vitals && (
                  <SummaryField label="BP" value={`${vitals.blood_pressure} mmHg`} />
                )}
                {"temperature" in vitals && vitals.temperature != null && (
                  <SummaryField
                    label="Temp"
                    value={`${vitals.temperature} ${vitals.temperature_unit || "°C"}`}
                  />
                )}
                {"pulse" in vitals && vitals.pulse != null && (
                  <SummaryField label="Pulse" value={`${vitals.pulse} bpm`} />
                )}
              </div>
            </section>
          )}

          {/* Diagnosis */}
          <section>
            <h4 className="font-semibold text-base border-b border-base-200 pb-1 mb-2">
              Clinical Diagnosis
            </h4>
            <p className="whitespace-pre-wrap text-base-content/80">
              {customDiagnosis || "No diagnosis provided."}
            </p>
          </section>

          {/* Medications */}
          {patientDetails.medications.length > 0 && (
            <section>
              <h4 className="font-semibold text-base border-b border-base-200 pb-1 mb-2">
                Medications
              </h4>
              <ul className="list-disc list-inside space-y-0.5">
                {patientDetails.medications.map((m, i) => (
                  <li key={i}>
                    {m.medication_name}
                    {m.dosage ? ` — ${m.dosage}` : ""}
                    {m.frequency ? `, ${m.frequency}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Notes */}
          {notes && (
            <section>
              <h4 className="font-semibold text-base border-b border-base-200 pb-1 mb-2">
                Encounter Notes
              </h4>
              <p className="whitespace-pre-wrap text-base-content/80">
                {notes}
              </p>
            </section>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-warning mt-2">{error}</p>
        )}

        {/* Actions */}
        <div className="modal-action">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Edit
          </button>
          <button
            className={btnClass}
            onClick={handleGeneratePdf}
            disabled={btnState !== "idle"}
          >
            {btnState === "generating" && (
              <span className="loading loading-spinner loading-xs" />
            )}
            {btnState === "saved" && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {btnState === "idle" && "Generate Shareable PDF"}
            {btnState === "generating" && "Generating…"}
            {btnState === "saved" && "Saved"}
          </button>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>,
    document.body,
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-base-content/50">{label}:</span>{" "}
      <span className="font-medium">{value || "N/A"}</span>
    </p>
  );
}
