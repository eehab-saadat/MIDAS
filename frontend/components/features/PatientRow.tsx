"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Patient } from "@/types/api";

interface PatientRowProps {
  patient: Patient;
}

export function PatientRow({ patient }: PatientRowProps) {
  const [showModal, setShowModal] = useState(false);
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
    <>
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
        <td className="text-base-content/70 text-sm hidden md:table-cell">
          {formatDate(patient.dob)}
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

            {/* View Details Button */}
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-sm btn-outline"
              title="View patient details"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span className="hidden sm:inline">View</span>
            </button>
          </div>
        </td>
      </tr>

      {/* Patient Details Modal - Rendered via Portal */}
      {showModal &&
        createPortal(
          <dialog className="modal modal-open">
            <div className="modal-box w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{patient.name}</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>

              <div className="divider my-2"></div>

              {/* Patient Information Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-base-content/70">MRN</p>
                  <p className="font-semibold text-base-content">
                    {patient.mrno}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Age</p>
                  <p className="font-semibold text-base-content">
                    {patient.age}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Gender</p>
                  <p className="font-semibold text-base-content">
                    {patient.gender}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Date of Birth</p>
                  <p className="font-semibold text-base-content">
                    {formatDate(patient.dob)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-base-content/70">
                    Medical History
                  </p>
                  <p className="font-semibold text-base-content">
                    {patient.history}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-base-content/70">
                    Last Visit Date
                  </p>
                  <p className="font-semibold text-base-content">
                    {formatDate(patient.last_visit_date)}
                  </p>
                </div>
              </div>

              <div className="divider my-2"></div>

              {/* Action Buttons */}
              <div className="modal-action">
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.push(`/encounter/${patient.mrno}`);
                  }}
                  className="btn btn-primary"
                >
                  Start New Session
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Backdrop */}
            <form method="dialog" className="modal-backdrop">
              <button onClick={() => setShowModal(false)}>close</button>
            </form>
          </dialog>,
          document.body,
        )}
    </>
  );
}
