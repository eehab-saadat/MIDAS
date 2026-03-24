"use client";

import { useState } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { PatientInfoCard } from "./PatientContext/PatientInfoCard";
import { VitalsDisplay } from "./PatientContext/VitalsDisplay";
import { MedicationsList } from "./PatientContext/MedicationsList";
import { RecentEncountersCard } from "./PatientContext/RecentEncountersCard";
import { ClinicalInputsPanel } from "./ClinicalInputs/ClinicalInputsPanel";
import { DiagnosticsPanel } from "./Diagnostics/DiagnosticsPanel";
import { AIInsightsPanel } from "./AIInsights/AIInsightsPanel";
import { PrescriptionsPanel } from "./Prescriptions/PrescriptionsPanel";

const TABS = [
  { id: "context", label: "Patient Context" },
  { id: "clinical", label: "Clinical Inputs" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "ai", label: "AI Insights" },
  { id: "summary", label: "Summary" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EncounterTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("context");
  const patientDetails = useEncounterStore((s) => s.patientDetails);

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Tab bar */}
      <div role="tablist" className="tabs tabs-box mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "context" && patientDetails && (
        <PatientContextPanel details={patientDetails} />
      )}
      {activeTab === "clinical" && <ClinicalInputsPanel />}
      {activeTab === "diagnostics" && <DiagnosticsPanel />}
      {activeTab === "ai" && <AIInsightsPanel />}
      {activeTab === "summary" && <PrescriptionsPanel />}
    </div>
  );
}

function PatientContextPanel({
  details,
}: {
  details: NonNullable<ReturnType<typeof useEncounterStore.getState>["patientDetails"]>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PatientInfoCard
        info={details.personal_information}
        history={details.known_medical_history}
      />
      <VitalsDisplay vitals={details.vitals} />
      <MedicationsList medications={details.medications} />
      <RecentEncountersCard encounters={details.recent_encounters} />
    </div>
  );
}

