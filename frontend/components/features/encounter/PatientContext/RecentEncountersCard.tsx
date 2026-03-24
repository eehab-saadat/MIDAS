"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import type { CompletePatientEncounter } from "@/types/api";

interface RecentEncountersCardProps {
  encounters: CompletePatientEncounter[];
}

export function RecentEncountersCard({
  encounters,
}: RecentEncountersCardProps) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Recent Encounters
        </h2>

        {encounters.length === 0 ? (
          <EmptyState
            compact
            title="No previous encounters"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {encounters.map((enc, i) => (
              <div
                key={enc.id ?? i}
                tabIndex={0}
                className="collapse collapse-arrow border border-base-200 bg-base-200/30"
              >
                <input type="checkbox" defaultChecked={i === 0} />
                <div className="collapse-title text-sm font-medium flex items-center gap-2">
                  <span>{formatDate(enc.date)}</span>
                  {enc.clinician && (
                    <span className="badge badge-ghost badge-xs">
                      {enc.clinician}
                    </span>
                  )}
                </div>
                <div className="collapse-content">
                  {/* Notes */}
                  {enc.notes ? (
                    <p className="text-sm text-base-content/80 whitespace-pre-wrap mb-2">
                      {enc.notes.length > 300
                        ? `${enc.notes.slice(0, 300)}...`
                        : enc.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-base-content/40 italic">
                      No notes recorded.
                    </p>
                  )}

                  {/* Symptoms */}
                  {enc.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {enc.symptoms.map((sym, si) => (
                        <span
                          key={si}
                          className="badge badge-sm badge-outline"
                          title={sym.clinician_remarks || undefined}
                        >
                          {sym.snomed_fsn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
