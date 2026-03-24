"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import type { CompletePatientVitals } from "@/types/api";

interface VitalsDisplayProps {
  vitals: CompletePatientVitals | Record<string, never>;
}

export function VitalsDisplay({ vitals }: VitalsDisplayProps) {
  const isEmpty = !vitals || Object.keys(vitals).length === 0;
  const v = vitals as CompletePatientVitals;

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
            Latest Vitals
          </h2>
          {!isEmpty && v.timestamp && (
            <span className="text-xs text-base-content/40">
              {new Date(v.timestamp).toLocaleString()}
            </span>
          )}
        </div>

        {isEmpty ? (
          <EmptyState
            compact
            title="No vitals recorded"
            description="Vitals can be added in the Clinical Inputs tab."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
        ) : (
          <div className="stats stats-vertical sm:stats-horizontal shadow-none border border-base-200 w-full">
            <VitalStat
              label="Blood Pressure"
              value={v.blood_pressure || "N/A"}
              unit="mmHg"
            />
            <VitalStat
              label="Temperature"
              value={v.temperature != null ? String(v.temperature) : "N/A"}
              unit={v.temperature_unit || "\u00B0C"}
            />
            <VitalStat
              label="Pulse"
              value={v.pulse != null ? String(v.pulse) : "N/A"}
              unit={v.pulse_unit || "bpm"}
            />
            <VitalStat
              label="Resp. Rate"
              value={
                v.respiratory_rate != null
                  ? String(v.respiratory_rate)
                  : "N/A"
              }
              unit={v.respiratory_rate_unit || "/min"}
            />
          </div>
        )}

        {!isEmpty && (
          <div className="flex gap-6 text-sm">
            <span className="text-base-content/60">
              Weight:{" "}
              <span className="font-medium text-base-content">
                {v.weight != null
                  ? `${v.weight} ${v.weight_unit || "kg"}`
                  : "N/A"}
              </span>
            </span>
            <span className="text-base-content/60">
              Height:{" "}
              <span className="font-medium text-base-content">
                {v.height != null
                  ? `${v.height} ${v.height_unit || "cm"}`
                  : "N/A"}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function VitalStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="stat px-4 py-3">
      <div className="stat-title text-xs">{label}</div>
      <div className="stat-value text-lg">
        {value !== "N/A" ? value : <span className="text-base-content/30">--</span>}
      </div>
      {value !== "N/A" && <div className="stat-desc">{unit}</div>}
    </div>
  );
}
