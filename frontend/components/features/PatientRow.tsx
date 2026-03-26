"use client";

import { useRouter } from "next/navigation";
import { Patient } from "@/types/api";

interface PatientRowProps {
  patient: Patient;
}

export function PatientRow({ patient }: PatientRowProps) {
  const router = useRouter();

  const handleStartSession = () => {
    router.push(`/encounter/${patient.mrno}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No visits";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <tr className="hover:bg-base-200 transition-colors">
      <td className="font-mono text-sm font-semibold text-primary">
        {patient.mrno}
      </td>
      <td className="font-medium text-base-content">{patient.name}</td>
      <td className="text-base-content">{patient.age}</td>
      <td className="text-base-content">
        <span
          className={`badge badge-sm ${
            patient.gender === "Male" ? "badge-info" : "badge-secondary"
          }`}
        >
          {patient.gender}
        </span>
      </td>
      <td className="text-base-content/70 text-sm hidden lg:table-cell">
        {formatDate(patient.last_visit_date)}
      </td>
      <td>
        <div className="flex gap-2 justify-end">
          {/* Start Session Button */}
          <button
            onClick={handleStartSession}
            className="btn btn-sm btn-primary"
            title="Start a new diagnostic session for this patient"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <polyline points="5 12 3 12 12 3 21 12 19 12"></polyline>
              <polyline points="12 3 12 13"></polyline>
              <path d="M5 21h14"></path>
            </svg>
            <span className="hidden sm:inline">Session</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
