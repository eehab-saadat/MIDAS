"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import type { CompletePatientMedication } from "@/types/api";

interface MedicationsListProps {
  medications: CompletePatientMedication[];
}

export function MedicationsList({ medications }: MedicationsListProps) {
  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Current Medications
        </h2>

        {medications.length === 0 ? (
          <EmptyState
            compact
            title="No medications on record"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            }
          />
        ) : (
          <ul className="list">
            {medications.map((med, i) => (
              <li key={med.id ?? i} className="list-row items-start py-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {med.medication_name}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {[med.dosage, med.frequency].filter(Boolean).join(" · ") ||
                      "No dosage info"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {med.active_agent_name && (
                    <span className="badge badge-ghost badge-xs">
                      {med.active_agent_name}
                    </span>
                  )}
                  {med.indication && (
                    <p className="text-xs text-base-content/50 mt-0.5">
                      {med.indication}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
