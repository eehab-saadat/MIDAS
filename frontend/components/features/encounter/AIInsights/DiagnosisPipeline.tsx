"use client";

import { useState, useCallback } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { diagnosisAPI } from "@/lib/api";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import type { DiagnosisResult } from "@/types/api";

type PipelineStep = "idle" | "gathering" | "diagnosing" | "reasoning" | "complete" | "error";

const STEP_ORDER: PipelineStep[] = [
  "gathering",
  "diagnosing",
  "reasoning",
  "complete",
];

const STEP_LABELS: Record<string, string> = {
  gathering: "Gathering patient data",
  diagnosing: "Running diagnosis model",
  reasoning: "Generating reasoning",
  complete: "Diagnosis complete",
};

export function DiagnosisPipeline() {
  const patientMrno = useEncounterStore((s) => s.patientMrno);
  const symptoms = useEncounterStore((s) => s.symptoms);
  const diagnosisResult = useEncounterStore((s) => s.diagnosisResult);
  const setDiagnosisResult = useEncounterStore((s) => s.setDiagnosisResult);
  const setDiagnosisStatus = useEncounterStore((s) => s.setDiagnosisStatus);
  const setCustomDiagnosis = useEncounterStore((s) => s.setCustomDiagnosis);

  const [step, setStep] = useState<PipelineStep>("idle");
  const [error, setError] = useState<string | null>(null);

  const canRun = !!patientMrno;

  const runPipeline = useCallback(async () => {
    if (!patientMrno) return;

    setError(null);
    setDiagnosisResult(null);
    setDiagnosisStatus("running");

    // Simulate stepped progress for UX
    setStep("gathering");
    await sleep(800);
    setStep("diagnosing");

    try {
      const result = await diagnosisAPI.run(patientMrno);
      setStep("reasoning");
      await sleep(500);
      setStep("complete");
      setDiagnosisResult(result);
      setDiagnosisStatus("complete");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Diagnosis pipeline failed.";
      setError(msg);
      setStep("error");
      setDiagnosisStatus("error");
    }
  }, [patientMrno, setDiagnosisResult, setDiagnosisStatus]);

  const handlePrefill = () => {
    if (!diagnosisResult) return;
    const text = [
      diagnosisResult.diagnosis,
      diagnosisResult.reasoning
        ? `\n\nReasoning:\n${diagnosisResult.reasoning}`
        : "",
    ].join("");
    setCustomDiagnosis(text);
  };

  const isRunning = !["idle", "complete", "error"].includes(step);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4 p-4">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          AI Diagnostic Pipeline
        </h2>

        {/* Run button */}
        <div className="flex items-center gap-3">
          <div
            className={!canRun ? "tooltip" : ""}
            data-tip={!canRun ? "Patient data required to run diagnosis" : undefined}
          >
            <button
              className="btn btn-primary btn-sm"
              onClick={runPipeline}
              disabled={isRunning || !canRun}
            >
              {isRunning && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {isRunning ? "Running..." : "Run Diagnostic Pipeline"}
            </button>
          </div>
          {symptoms.length === 0 && (
            <span className="text-xs text-warning">
              Consider adding symptoms first for better results.
            </span>
          )}
        </div>

        {/* Progress steps */}
        {step !== "idle" && (
          <ul className="steps steps-vertical sm:steps-horizontal w-full text-xs">
            {STEP_ORDER.map((s) => {
              const idx = STEP_ORDER.indexOf(s);
              const currentIdx = STEP_ORDER.indexOf(step);
              const isActive =
                step === s || (step === "error" && idx <= currentIdx);
              const isDone =
                step === "complete" || (idx < currentIdx && step !== "error");

              return (
                <li
                  key={s}
                  className={`step ${isDone || isActive ? "step-primary" : ""}`}
                >
                  {STEP_LABELS[s]}
                </li>
              );
            })}
          </ul>
        )}

        {/* Error */}
        {error && (
          <ErrorAlert message={error} onRetry={runPipeline} />
        )}

        {/* Results */}
        {diagnosisResult && step === "complete" && (
          <DiagnosisResultCard
            result={diagnosisResult}
            onPrefill={handlePrefill}
          />
        )}
      </div>
    </div>
  );
}

function DiagnosisResultCard({
  result,
  onPrefill,
}: {
  result: DiagnosisResult;
  onPrefill: () => void;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="flex flex-col gap-3 border border-success/30 rounded-lg p-4 bg-success/5">
      {/* Diagnosis */}
      <div>
        <p className="text-xs font-semibold uppercase text-success mb-1">
          Diagnosis
        </p>
        <p className="text-sm font-medium">{result.diagnosis}</p>
      </div>

      {/* Reasoning (expandable) */}
      {result.reasoning && (
        <div>
          <button
            className="text-xs text-primary font-medium flex items-center gap-1"
            onClick={() => setShowReasoning(!showReasoning)}
          >
            {showReasoning ? "Hide" : "Show"} Reasoning
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-3 w-3 transition-transform ${showReasoning ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {showReasoning && (
            <p className="text-sm text-base-content/70 mt-1 whitespace-pre-wrap">
              {result.reasoning}
            </p>
          )}
        </div>
      )}

      {/* Advisory */}
      {result.advisory && (
        <div>
          <p className="text-xs font-semibold uppercase text-info mb-1">
            Advisory / Next Steps
          </p>
          <p className="text-sm text-base-content/70">{result.advisory}</p>
        </div>
      )}

      {/* Pre-fill button */}
      <div className="flex justify-end">
        <button className="btn btn-sm btn-outline btn-success" onClick={onPrefill}>
          Use as Pre-fill for Summary
        </button>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
