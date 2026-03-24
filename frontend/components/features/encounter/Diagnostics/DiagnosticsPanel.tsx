"use client";

import { useState } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { RadiologyUploader } from "./RadiologyUploader";
import { LabEntryForm } from "./LabEntryForm";
import { RadiologyHistory } from "./RadiologyHistory";
import { LabHistory } from "./LabHistory";

type HistoryTab = "radiology" | "labs";

export function DiagnosticsPanel() {
  const patientPk = useEncounterStore((s) => s.patientPk);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("radiology");

  return (
    <div className="flex flex-col gap-6">
      {/* Upload section -- two cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RadiologyUploader />
        <LabEntryForm />
      </div>

      {/* History section */}
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
              Diagnostic History
            </h2>
            <div className="join">
              <button
                className={`btn btn-sm join-item ${historyTab === "radiology" ? "btn-active" : ""}`}
                onClick={() => setHistoryTab("radiology")}
              >
                Radiology
              </button>
              <button
                className={`btn btn-sm join-item ${historyTab === "labs" ? "btn-active" : ""}`}
                onClick={() => setHistoryTab("labs")}
              >
                Labs
              </button>
            </div>
          </div>

          {historyTab === "radiology" ? (
            <RadiologyHistory patientPk={patientPk} />
          ) : (
            <LabHistory patientPk={patientPk} />
          )}
        </div>
      </div>
    </div>
  );
}
