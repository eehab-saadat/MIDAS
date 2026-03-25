"use client";

import { useRouter } from "next/navigation";
import type { CompletePatientDetails } from "@/types/api";

interface PatientHeaderProps {
  details: CompletePatientDetails;
}

export function PatientHeader({ details }: PatientHeaderProps) {
  const router = useRouter();
  const { personal_information: info, vitals, patient_id } = details;
  const hasVitals = vitals && Object.keys(vitals).length > 0;

  const initials = info.name
    ? info.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 backdrop-blur-sm">
      <div className="container mx-auto flex items-center gap-4 px-4 py-2.5">
        {/* Back button */}
        <button
          className="btn btn-ghost btn-sm btn-circle"
          onClick={() => router.push("/dashboard")}
          title="Back to Dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="avatar avatar-placeholder">
          <div className="bg-primary text-primary-content w-10 rounded-full">
            <span className="text-sm font-semibold">{initials}</span>
          </div>
        </div>

        {/* Name & MRN */}
        <div className="min-w-0">
          <h1 className="text-base font-bold truncate leading-tight">
            {info.name || "Unknown Patient"}
          </h1>
          <p className="text-xs text-base-content/60">
            MRN <span className="font-mono font-semibold">{patient_id}</span>
          </p>
        </div>

        {/* Demographic badges */}
        <div className="hidden sm:flex items-center gap-2 ml-2">
          {info.age != null && (
            <span className="badge badge-ghost badge-sm">
              {info.age} yrs
            </span>
          )}
          {info.gender && (
            <span
              className={`badge badge-sm ${info.gender === "Male" ? "badge-info" : "badge-secondary"}`}
            >
              {info.gender}
            </span>
          )}
        </div>

        {/* Vitals mini-badges (right side) */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {hasVitals && "blood_pressure" in vitals && vitals.blood_pressure && (
            <span className="badge badge-outline badge-sm gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              {vitals.blood_pressure}
            </span>
          )}
          {hasVitals && "temperature" in vitals && vitals.temperature != null && (
            <span className="badge badge-outline badge-sm">
              {vitals.temperature}&deg;{"temperature_unit" in vitals ? vitals.temperature_unit || "C" : "C"}
            </span>
          )}
          {hasVitals && "pulse" in vitals && vitals.pulse != null && (
            <span className="badge badge-outline badge-sm">
              {vitals.pulse} bpm
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
