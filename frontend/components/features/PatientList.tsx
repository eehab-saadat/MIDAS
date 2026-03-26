"use client";

import { useEffect, useState } from "react";
import { patientsAPI, Patient, APIError } from "@/lib/api";
import { PatientRow } from "./PatientRow";
import { useDebounce } from "@/hooks/useDebounce";

interface PatientListProps {
  searchQuery: string;
  refreshTrigger?: number;
}

interface PatientDisplay extends Patient {
  clinicianName: string;
  lastEncounterDate: string;
}

// Sortable columns
type SortField = "mrno" | "name" | "age" | "last_visit";
type SortDir = "asc" | "desc";

// Maps frontend sort intent to the ?ordering= param the backend understands.
// age        — computed property, proxied through dob (age asc = youngest first = dob desc).
// mrno       — stored as string, proxied through annotated mrno_int cast.
// last_visit — annotated max encounter date subquery on the backend.
const ORDERING_PARAM: Record<SortField, Record<SortDir, string>> = {
  mrno:       { asc: "mrno_int",    desc: "-mrno_int" },
  name:       { asc: "name",        desc: "-name" },
  age:        { asc: "-dob",        desc: "dob" },
  last_visit: { asc: "last_visit",  desc: "-last_visit" },
};

function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  const isActive = field === active;
  return (
    <span className={`ml-1 inline-flex flex-col leading-none ${isActive ? "text-primary" : "text-base-content/25"}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 10 6"
        className={`w-2.5 h-2.5 ${isActive && dir === "asc" ? "text-primary" : "text-base-content/25"}`}
        fill="currentColor"
      >
        <path d="M5 0 L10 6 L0 6 Z" />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 10 6"
        className={`w-2.5 h-2.5 ${isActive && dir === "desc" ? "text-primary" : "text-base-content/25"}`}
        fill="currentColor"
      >
        <path d="M0 0 L10 0 L5 6 Z" />
      </svg>
    </span>
  );
}

export function PatientList({
  searchQuery,
  refreshTrigger = 0,
}: PatientListProps) {
  const [patients, setPatients] = useState<PatientDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Sort state — default: MRN ascending
  const [sortField, setSortField] = useState<SortField>("mrno");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Debounce the search query to avoid spamming the API
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // Fetch patients from API
  useEffect(() => {
    const fetchPatients = async (pageToFetch: number) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await patientsAPI.list({
          page: pageToFetch,
          search: debouncedSearchQuery.trim() || undefined,
          ordering: ORDERING_PARAM[sortField][sortDir],
        });
        const patientsList = response.results;

        setTotalCount(response.count);
        setHasNextPage(!!response.next);
        setHasPreviousPage(!!response.previous);

        // For each patient, try to fetch additional data (encounters, clinician info)
        const enrichedPatients = await Promise.all(
          patientsList.map(async (patient) => {
            try {
              const encounters = await patientsAPI.getEncounters(patient.id);
              const lastEncounter = encounters.results?.[0];
              return {
                ...patient,
                clinicianName: lastEncounter
                  ? `${lastEncounter.clinician}`
                  : "N/A",
                lastEncounterDate: lastEncounter?.date || "No encounters",
              } as PatientDisplay;
            } catch {
              return {
                ...patient,
                clinicianName: "N/A",
                lastEncounterDate: "No encounters",
              } as PatientDisplay;
            }
          }),
        );

        setPatients(enrichedPatients);
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

    let targetPage = currentPage;
    if (debouncedSearchQuery !== lastSearchQuery) {
      targetPage = 1;
      setCurrentPage(1);
      setLastSearchQuery(debouncedSearchQuery);
    }

    fetchPatients(targetPage);
  }, [currentPage, debouncedSearchQuery, refreshTrigger, lastSearchQuery, sortField, sortDir]);

  const headerCell = (label: string, field: SortField, className = "") => (
    <th
      className={`font-semibold text-base-content cursor-pointer select-none hover:text-primary transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <SortIcon field={field} active={sortField} dir={sortDir} />
      </span>
    </th>
  );

  const tableHead = (
    <thead className="bg-base-200">
      <tr>
        {headerCell("MRN", "mrno")}
        {headerCell("Name", "name")}
        {headerCell("Age", "age")}
        <th className="font-semibold text-base-content">Gender</th>
        {headerCell("Last Visit", "last_visit", "hidden lg:table-cell")}
        <th className="font-semibold text-base-content text-right">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      {isLoading ? (
        <div className="overflow-x-auto">
          <table className="table table-sm md:table-md">
            {tableHead}
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td><div className="skeleton h-4 w-20" /></td>
                  <td><div className="skeleton h-4 w-32" /></td>
                  <td><div className="skeleton h-4 w-8" /></td>
                  <td><div className="skeleton h-4 w-16" /></td>
                  <td className="hidden lg:table-cell"><div className="skeleton h-4 w-24" /></td>
                  <td>
                    <div className="flex justify-end gap-2 pr-2">
                      <div className="skeleton h-8 w-16 rounded" />
                      <div className="skeleton h-8 w-16 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            {tableHead}
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
            <p className="text-sm text-base-content/60">
              Showing {patients.length} out of {totalCount} patients • Page{" "}
              <span className="font-semibold">{currentPage}</span>
            </p>

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
