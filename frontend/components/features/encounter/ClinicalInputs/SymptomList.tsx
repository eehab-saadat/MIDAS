"use client";

import { useState } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { symptomsAPI } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";

export function SymptomList() {
  const symptoms = useEncounterStore((s) => s.symptoms);
  const removeSymptom = useEncounterStore((s) => s.removeSymptom);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await symptomsAPI.delete(id);
      removeSymptom(id);
    } catch {
      // Silently fail — could add error toast
    } finally {
      setDeletingId(null);
    }
  };

  if (symptoms.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
            Current Symptoms
          </h2>
          <EmptyState
            compact
            title="No symptoms added yet"
            description="Use the search above to add SNOMED-coded symptoms."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6M12 18v-6M9 15h6" />
              </svg>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-3">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Current Symptoms ({symptoms.length})
        </h2>

        <ul className="list">
          {symptoms.map((sym) => (
            <li key={sym.id} className="list-row items-center py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{sym.snomed_fsn}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="badge badge-xs badge-outline">
                    {sym.snomed_entity_type}
                  </span>
                  <span className="text-xs text-base-content/50 font-mono">
                    {sym.snomed_cid}
                  </span>
                </div>
                {sym.clinician_remarks && (
                  <p className="text-xs text-base-content/60 mt-1 italic">
                    &quot;{sym.clinician_remarks}&quot;
                  </p>
                )}
              </div>
              <button
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => handleDelete(sym.id)}
                disabled={deletingId === sym.id}
                title="Remove symptom"
              >
                {deletingId === sym.id ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
