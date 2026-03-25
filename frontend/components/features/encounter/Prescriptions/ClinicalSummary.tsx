"use client";

import { useEncounterStore } from "@/store/encounterStore";

interface ClinicalSummaryProps {
  onPreview: () => void;
}

export function ClinicalSummary({ onPreview }: ClinicalSummaryProps) {
  const diagnosisResult = useEncounterStore((s) => s.diagnosisResult);
  const customDiagnosis = useEncounterStore((s) => s.customDiagnosis);
  const setCustomDiagnosis = useEncounterStore((s) => s.setCustomDiagnosis);

  const hasAiPrefill =
    !!diagnosisResult && customDiagnosis.includes(diagnosisResult.diagnosis);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Clinical Diagnosis & Summary
        </h2>

        {/* AI prefill warning */}
        {hasAiPrefill && (
          <div role="alert" className="alert alert-warning alert-soft text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              This field has been pre-filled with AI-generated diagnosis &
              reasoning. <strong>Please verify, edit, and finalize</strong>{" "}
              before sharing.
            </span>
          </div>
        )}

        {/* Diagnosis textarea */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">
            Diagnosis
            {!customDiagnosis && !diagnosisResult && (
              <span className="text-xs text-base-content/40 ml-2">
                (Run AI pipeline or write your own)
              </span>
            )}
          </legend>
          <textarea
            className="textarea w-full min-h-[200px] text-sm"
            placeholder="Enter your clinical diagnosis, reasoning, and any additional notes..."
            value={customDiagnosis}
            onChange={(e) => setCustomDiagnosis(e.target.value)}
          />
        </fieldset>

        {/* Pre-fill from AI if not yet done */}
        {diagnosisResult && !hasAiPrefill && (
          <button
            className="btn btn-sm btn-outline btn-info self-start"
            onClick={() => {
              const text = [
                diagnosisResult.diagnosis,
                diagnosisResult.reasoning
                  ? `\n\nReasoning:\n${diagnosisResult.reasoning}`
                  : "",
                diagnosisResult.advisory
                  ? `\n\nAdvisory:\n${diagnosisResult.advisory}`
                  : "",
              ].join("");
              setCustomDiagnosis(text);
            }}
          >
            Pre-fill from AI Diagnosis
          </button>
        )}

        <div className="card-actions justify-end">
          <button
            className="btn btn-primary btn-sm"
            onClick={onPreview}
            disabled={!customDiagnosis.trim()}
          >
            Preview & Generate Summary
          </button>
        </div>
      </div>
    </div>
  );
}
