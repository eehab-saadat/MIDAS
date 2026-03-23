"use client";

import { useEffect, useState } from "react";
import { patientsAPI, Patient, APIError } from "@/lib/api";
import { PatientRow } from "./PatientRow";

interface PatientListProps {
  searchQuery: string;
}

export function PatientList({ searchQuery }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  // Fetch patients from API with search support
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use backend search if search query exists, otherwise list all
        const response = searchQuery.trim()
          ? await patientsAPI.search(searchQuery, currentPage)
          : await patientsAPI.list({ page: currentPage });

        setPatients(response.results);
        setTotalCount(response.count);
        setHasNextPage(!!response.next);
        setHasPreviousPage(!!response.previous);
      } catch (err) {
        if (err instanceof APIError) {
          setError(`Failed to load patients: ${err.message}`);
        } else {
          setError("Failed to load patients. Please try again.");
        }
        console.error("Error fetching patients:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [currentPage, searchQuery]);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      {isLoading ? (
        <div className="card-body flex flex-col items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/70 mt-4">Loading patients...</p>
        </div>
      ) : error ? (
        <div className="card-body flex flex-col items-center justify-center py-12">
          <div className="alert alert-error w-full max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      ) : patients.length === 0 ? (
        <div className="card-body flex flex-col items-center justify-center py-12">
          <p className="text-base-content/50 text-center">
            No patients found matching your search.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-sm md:table-md">
            <thead className="bg-base-200">
              <tr>
                <th className="font-semibold text-base-content">MRN</th>
                <th className="font-semibold text-base-content">Name</th>
                <th className="font-semibold text-base-content">Age</th>
                <th className="font-semibold text-base-content">Gender</th>
                <th className="font-semibold text-base-content hidden md:table-cell">
                  DOB
                </th>
                <th className="font-semibold text-base-content hidden lg:table-cell">
                  Last Visit
                </th>
                <th className="font-semibold text-base-content text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <PatientRow key={patient.id} patient={patient} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer with pagination */}
      {!isLoading && !error && patients.length > 0 && (
        <div className="card-body py-4 border-t border-base-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Info text */}
            <p className="text-sm text-base-content/60">
              Showing {patients.length} of {totalCount} patients • Page{" "}
              <span className="font-semibold">{currentPage}</span>
            </p>

            {/* Pagination buttons */}
            <div className="join">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={!hasPreviousPage}
                className="btn btn-sm join-item"
              >
                ← Previous
              </button>

              <button
                disabled
                className="btn btn-sm join-item bg-base-200 border-base-300"
              >
                Page {currentPage}
              </button>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!hasNextPage}
                className="btn btn-sm join-item"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
