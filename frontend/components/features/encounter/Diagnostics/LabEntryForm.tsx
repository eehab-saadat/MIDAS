"use client";

import { useState, useRef } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { labsAPI, apiClient } from "@/lib/api";
import type { LabTestResult } from "@/types/api";

type EntryMode = "manual" | "ocr";

interface TestRow {
  name: string;
  result: string;
  unit: string;
  normalLow: string;
  normalHigh: string;
}

const emptyRow = (): TestRow => ({
  name: "",
  result: "",
  unit: "",
  normalLow: "",
  normalHigh: "",
});

export function LabEntryForm() {
  const patientPk = useEncounterStore((s) => s.patientPk);
  const refreshPatientData = useEncounterStore((s) => s.refreshPatientData);

  const [mode, setMode] = useState<EntryMode>("manual");
  const [cptName, setCptName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [tests, setTests] = useState<TestRow[]>([emptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateTest = (idx: number, field: keyof TestRow, value: string) => {
    setTests((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    );
  };

  const addRow = () => setTests((prev) => [...prev, emptyRow()]);

  const removeRow = (idx: number) => {
    setTests((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const buildResults = (): Record<string, LabTestResult> => {
    const results: Record<string, LabTestResult> = {};
    for (const t of tests) {
      if (!t.name.trim()) continue;
      results[t.name.trim().toUpperCase()] = {
        result: t.result ? parseFloat(t.result) : null,
        unit: t.unit,
        normal_range: [t.normalLow, t.normalHigh],
      };
    }
    return results;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientPk) return;

    setIsSubmitting(true);
    setMsg(null);

    try {
      await labsAPI.create({
        patient: patientPk,
        cpt_name: cptName,
        results: buildResults(),
        invoice_date: invoiceDate || undefined,
      });
      setMsg("Lab report saved.");
      setCptName("");
      setInvoiceDate("");
      setTests([emptyRow()]);
      await refreshPatientData();
    } catch {
      setMsg("Failed to save lab report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOcrUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !patientPk) return;
    setIsSubmitting(true);
    setMsg(null);

    try {
      const formData = new FormData();
      formData.append("patient", String(patientPk));
      formData.append("file", files[0]);

      const result = await apiClient.postForm<{
        cpt_name: string;
        results: Record<string, LabTestResult>;
      }>("/labs/ocr-upload/", formData);

      // Pre-fill the form with OCR results
      setCptName(result.cpt_name || "");
      const rows: TestRow[] = Object.entries(result.results).map(
        ([name, val]) => ({
          name,
          result: val.result != null ? String(val.result) : "",
          unit: val.unit || "",
          normalLow: val.normal_range?.[0] || "",
          normalHigh: val.normal_range?.[1] || "",
        }),
      );
      setTests(rows.length > 0 ? rows : [emptyRow()]);
      setMode("manual");
      setMsg("OCR results loaded. Please review and confirm.");
    } catch {
      setMsg("OCR processing failed or not yet available. Use manual entry.");
      setMode("manual");
    } finally {
      setIsSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
            Lab Report
          </h2>
          <div className="join">
            <button
              className={`btn btn-xs join-item ${mode === "manual" ? "btn-active" : ""}`}
              onClick={() => setMode("manual")}
            >
              Manual
            </button>
            <button
              className={`btn btn-xs join-item ${mode === "ocr" ? "btn-active" : ""}`}
              onClick={() => setMode("ocr")}
            >
              OCR Upload
            </button>
          </div>
        </div>

        {mode === "ocr" ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm text-base-content/60">
              Upload a lab report image for automatic extraction.
            </p>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => fileRef.current?.click()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "Choose Image"
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleOcrUpload(e.target.files)}
            />
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Panel name (e.g. CBC, LFT)..."
                className="input input-sm flex-1"
                value={cptName}
                onChange={(e) => setCptName(e.target.value)}
                required
              />
              <input
                type="date"
                className="input input-sm"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            {/* Test rows */}
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Normal Low</th>
                    <th>Normal High</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="input input-xs w-full"
                          placeholder="e.g. SODIUM"
                          value={t.name}
                          onChange={(e) =>
                            updateTest(i, "name", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input input-xs w-20"
                          type="number"
                          step="any"
                          value={t.result}
                          onChange={(e) =>
                            updateTest(i, "result", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input input-xs w-16"
                          placeholder="mg/dL"
                          value={t.unit}
                          onChange={(e) =>
                            updateTest(i, "unit", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input input-xs w-16"
                          value={t.normalLow}
                          onChange={(e) =>
                            updateTest(i, "normalLow", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="input input-xs w-16"
                          value={t.normalHigh}
                          onChange={(e) =>
                            updateTest(i, "normalHigh", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-circle"
                          onClick={() => removeRow(i)}
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-xs self-start"
              onClick={addRow}
            >
              + Add Test
            </button>

            <div className="card-actions justify-end items-center">
              {msg && (
                <span
                  className={`text-xs ${msg.includes("Failed") ? "text-error" : "text-success"}`}
                >
                  {msg}
                </span>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmitting || !patientPk}
              >
                {isSubmitting && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Save Lab Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
