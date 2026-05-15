"use client";

import { useState, useCallback } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { diagnosisAPI } from "@/lib/api";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import type { DiagnosisResult } from "@/types/api";

type PipelineStep =
  | "idle"
  | "gathering"
  | "diagnosing"
  | "reasoning"
  | "complete"
  | "error";

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

  const runPipelineWithCritique = useCallback(
    async (critique: string) => {
      if (!patientMrno) return;

      setError(null);
      setDiagnosisResult(null);
      setDiagnosisStatus("running");

      setStep("gathering");
      await sleep(400);
      setStep("diagnosing");

      try {
        const result = await diagnosisAPI.rerunWithCritique(
          patientMrno,
          critique,
        );
        setStep("reasoning");
        await sleep(500);
        setStep("complete");
        setDiagnosisResult(result);
        setDiagnosisStatus("complete");
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Re-diagnosis pipeline failed.";
        setError(msg);
        setStep("error");
        setDiagnosisStatus("error");
      }
    },
    [patientMrno, setDiagnosisResult, setDiagnosisStatus],
  );

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
            data-tip={
              !canRun ? "Patient data required to run diagnosis" : undefined
            }
          >
            <button
              className="btn btn-primary btn-sm"
              onClick={runPipeline}
              disabled={isRunning || !canRun}
            >
              {isRunning && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {isRunning ? "Running..." : "Run Diagnosis"}
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
        {error && <ErrorAlert message={error} onRetry={runPipeline} />}

        {/* Results */}
        {diagnosisResult && step === "complete" && (
          <DiagnosisResultCard
            result={diagnosisResult}
            onPrefill={handlePrefill}
            patientMrno={patientMrno}
            onRerunWithCritique={runPipelineWithCritique}
            isRunning={isRunning}
          />
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Feedback state types                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

type FeedbackState =
  | "idle"
  | "submitting_like"
  | "liked"
  | "critique_modal"
  | "submitting_critique"
  | "critique_error";

/* ────────────────────────────────────────────────────────────────────────── */
/*  DiagnosisResultCard                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function DiagnosisResultCard({
  result,
  onPrefill,
  patientMrno,
  onRerunWithCritique,
  isRunning,
}: {
  result: DiagnosisResult;
  onPrefill: () => void;
  patientMrno: string | null;
  onRerunWithCritique: (critique: string) => Promise<void>;
  isRunning: boolean;
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const [critiqueText, setCritiqueText] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleLike = async () => {
    if (!patientMrno || !result.diagnosis || !result.reasoning) return;
    setFeedbackState("submitting_like");
    setFeedbackError(null);

    try {
      await diagnosisAPI.submitFeedback(
        patientMrno,
        result.diagnosis,
        result.reasoning,
      );
      setFeedbackState("liked");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit feedback.";
      setFeedbackError(msg);
      setFeedbackState("idle");
    }
  };

  const handleDislike = () => {
    setCritiqueText("");
    setFeedbackError(null);
    setFeedbackState("critique_modal");
  };

  const handleSubmitCritique = async () => {
    if (!critiqueText.trim()) return;
    setFeedbackState("submitting_critique");
    setFeedbackError(null);

    try {
      await onRerunWithCritique(critiqueText.trim());
      setFeedbackState("idle");
      setCritiqueText("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to re-run diagnosis.";
      setFeedbackError(msg);
      setFeedbackState("critique_error");
    }
  };

  const handleCancelCritique = () => {
    setFeedbackState("idle");
    setCritiqueText("");
    setFeedbackError(null);
  };

  const isBusy =
    feedbackState === "submitting_like" ||
    feedbackState === "submitting_critique" ||
    isRunning;

  return (
    <>
      <div className="flex flex-col gap-3 border border-success/30 rounded-lg p-4 bg-success/5">
        <div>
          <p className="text-xs font-semibold uppercase text-success mb-1">
            Diagnosis
          </p>
          <p className="text-base font-medium">{result.diagnosis}</p>
        </div>

        {result.reasoning && (
          <div>
            <button
              className="text-xs font-semibold uppercase text-base-content/50 flex items-center gap-1"
              onClick={() => setShowReasoning(!showReasoning)}
            >
              Reasoning
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
              <p className="text-sm text-base-content/70 whitespace-pre-wrap leading-relaxed mt-1">
                {result.reasoning}
              </p>
            )}
          </div>
        )}

        {result.advisory && (
          <div>
            <p className="text-xs font-semibold uppercase text-info mb-1">
              Advisory / Next Steps
            </p>
            <p className="text-sm text-base-content/70">{result.advisory}</p>
          </div>
        )}

        {/* ── Feedback buttons ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-2 border-t border-base-300/50">
          {feedbackState === "liked" ? (
            <div className="flex items-center gap-2 text-success text-sm font-medium animate-fade-in">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Added to knowledge base
            </div>
          ) : (
            <>
              {/* Like button */}
              <button
                className="btn btn-sm btn-ghost gap-1 text-base-content/60 hover:text-success hover:bg-success/10 transition-all duration-200"
                onClick={handleLike}
                disabled={isBusy}
                title="Approve diagnosis — adds this case to the knowledge base for future reference"
              >
                {feedbackState === "submitting_like" ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 10v12" />
                    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                  </svg>
                )}
                Approve
              </button>

              {/* Dislike button */}
              <button
                className="btn btn-sm btn-ghost gap-1 text-base-content/60 hover:text-error hover:bg-error/10 transition-all duration-200"
                onClick={handleDislike}
                disabled={isBusy}
                title="Critique diagnosis — provide feedback and re-generate"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 14V2" />
                  <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                </svg>
                Critique
              </button>
            </>
          )}

          {/* Error message */}
          {feedbackError && (
            <span className="text-xs text-error ml-2">{feedbackError}</span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Pre-fill button */}
          <button
            className="btn btn-sm btn-outline btn-success"
            onClick={onPrefill}
          >
            Use as Pre-fill for Summary
          </button>
        </div>
      </div>

      {/* ── Critique Modal ────────────────────────────────────────────── */}
      {(feedbackState === "critique_modal" ||
        feedbackState === "submitting_critique" ||
        feedbackState === "critique_error") && (
        <CritiqueModal
          critiqueText={critiqueText}
          onCritiqueChange={setCritiqueText}
          onSubmit={handleSubmitCritique}
          onCancel={handleCancelCritique}
          isSubmitting={feedbackState === "submitting_critique"}
          error={
            feedbackState === "critique_error" ? feedbackError : null
          }
        />
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Critique Modal                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function CritiqueModal({
  critiqueText,
  onCritiqueChange,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  critiqueText: string;
  onCritiqueChange: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  return (
    <div className="modal modal-open modal-bottom sm:modal-middle z-50">
      <div className="modal-box border border-base-300 shadow-2xl">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-warning"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
            <path d="m15 5 3 3" />
          </svg>
          Provide Feedback
        </h3>

        <p className="text-sm text-base-content/60 mt-2">
          Describe what was incorrect or missing in the diagnosis. Your
          critique will be incorporated into the prompt and the diagnosis
          will be re-generated.
        </p>

        <textarea
          className="textarea textarea-bordered w-full mt-4 min-h-[120px] text-sm leading-relaxed focus:textarea-primary"
          placeholder="e.g. The diagnosis did not consider the patient's history of diabetes, or the lab results suggest a different condition..."
          value={critiqueText}
          onChange={(e) => onCritiqueChange(e.target.value)}
          disabled={isSubmitting}
          autoFocus
        />

        {error && (
          <div className="alert alert-error alert-sm mt-3">
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="modal-action">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm gap-1"
            onClick={onSubmit}
            disabled={!critiqueText.trim() || isSubmitting}
          >
            {isSubmitting && (
              <span className="loading loading-spinner loading-xs" />
            )}
            {isSubmitting ? "Re-generating..." : "Re-generate Diagnosis"}
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onCancel} disabled={isSubmitting}>
          close
        </button>
      </form>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
