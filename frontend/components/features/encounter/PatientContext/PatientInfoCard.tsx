"use client";

import { EmptyState } from "@/components/ui/EmptyState";

interface PatientInfoCardProps {
  info: {
    name: string;
    gender: string;
    dob: string | null;
    age: number | null;
  };
  history: string[];
}

export function PatientInfoCard({ info, history }: PatientInfoCardProps) {
  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Personal Information
        </h2>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <InfoField label="Full Name" value={info.name || "N/A"} />
          <InfoField label="Gender" value={info.gender || "N/A"} />
          <InfoField label="Date of Birth" value={formatDate(info.dob)} />
          <InfoField
            label="Age"
            value={info.age != null ? `${info.age} years` : "N/A"}
          />
        </div>

        <div className="divider my-0" />

        <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Medical History
        </h3>

        {history.length > 0 ? (
          <ul className="list-disc list-inside text-sm space-y-1 text-base-content/80">
            {history.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            title="No medical history recorded"
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M9 12h6M12 9v6" />
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-base-content/50 mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
