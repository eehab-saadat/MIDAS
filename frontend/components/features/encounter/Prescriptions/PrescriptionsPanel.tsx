"use client";

import { useState } from "react";
import { MedicationManager } from "./MedicationManager";
import { ClinicalSummary } from "./ClinicalSummary";
import { SummaryPreview } from "./SummaryPreview";

export function PrescriptionsPanel() {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MedicationManager />
        <ClinicalSummary onPreview={() => setShowPreview(true)} />
      </div>

      <SummaryPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </>
  );
}
