"use client";

import { useEncounterStore } from "@/store/encounterStore";
import { VitalsForm } from "./VitalsForm";
import { SymptomSearch } from "./SymptomSearch";
import { SymptomList } from "./SymptomList";

export function ClinicalInputsPanel() {
  const patientDetails = useEncounterStore((s) => s.patientDetails);
  const patientPk = useEncounterStore((s) => s.patientPk);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Vitals entry */}
      <VitalsForm
        latestVitals={patientDetails?.vitals ?? {}}
        patientPk={patientPk}
      />

      {/* Right: Symptoms */}
      <div className="flex flex-col gap-4">
        <SymptomSearch />
        <SymptomList />
      </div>
    </div>
  );
}
