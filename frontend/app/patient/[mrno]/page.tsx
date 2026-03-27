"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import {
  patientsAPI,
  encountersAPI,
  labsAPI,
  radiologyAPI,
  APIError,
} from "@/lib/api";
import type {
  Patient,
  EncounterSummary,
  LabSummary,
  RadiologySummary,
  Encounter,
  Lab,
  Radiology,
} from "@/types/api";

export default function PatientDetailsPage() {
  const params = useParams<{ mrno: string }>();
  const router = useRouter();
  const mrno = params.mrno;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [encounters, setEncounters] = useState<EncounterSummary[]>([]);
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [radiology, setRadiology] = useState<RadiologySummary[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // On-demand detail caches
  const [encounterDetails, setEncounterDetails] = useState<
    Record<number, Encounter>
  >({});
  const [labDetails, setLabDetails] = useState<Record<number, Lab>>({});
  const [radiologyDetails, setRadiologyDetails] = useState<
    Record<number, Radiology>
  >({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  // Expanded state
  const [expandedEncounter, setExpandedEncounter] = useState<number | null>(
    null,
  );
  const [expandedLab, setExpandedLab] = useState<number | null>(null);
  const [expandedRadiology, setExpandedRadiology] = useState<number | null>(
    null,
  );

  // Search filters for labs and radiology
  const [labSearch, setLabSearch] = useState("");
  const [radiologySearch, setRadiologySearch] = useState("");

  // Active tab
  const [activeTab, setActiveTab] = useState<
    "encounters" | "labs" | "radiology"
  >("encounters");

  useEffect(() => {
    if (!mrno) return;

    const fetchPatient = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await patientsAPI.search(mrno, 1);
        const match = res.results.find((p) => p.mrno === mrno);
        if (!match) {
          setError(`No patient found with MRN "${mrno}".`);
          return;
        }
        setPatient(match);
      } catch (err) {
        setError(
          err instanceof APIError
            ? err.message
            : "Failed to load patient data.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatient();
  }, [mrno]);

  useEffect(() => {
    if (!patient) return;

    const fetchRecords = async () => {
      setRecordsLoading(true);
      try {
        const [enc, lb, rad] = await Promise.all([
          patientsAPI.getEncountersSummary(patient.id),
          patientsAPI.getLabsSummary(patient.id),
          patientsAPI.getRadiologySummary(patient.id),
        ]);
        setEncounters(enc);
        setLabs(lb);
        setRadiology(rad);
      } catch {
        // Non-critical — individual sections show their own errors
      } finally {
        setRecordsLoading(false);
      }
    };

    fetchRecords();
  }, [patient]);

  const fetchEncounterDetail = useCallback(async (id: number) => {
    setLoadingDetail(`encounter-${id}`);
    try {
      const data = await encountersAPI.get(id);
      setEncounterDetails((prev) => ({ ...prev, [id]: data }));
    } catch {
      // Silently fail — user can retry by collapsing and expanding
    } finally {
      setLoadingDetail(null);
    }
  }, []);

  const fetchLabDetail = useCallback(async (id: number) => {
    setLoadingDetail(`lab-${id}`);
    try {
      const data = await labsAPI.get(id);
      setLabDetails((prev) => ({ ...prev, [id]: data }));
    } finally {
      setLoadingDetail(null);
    }
  }, []);

  const fetchRadiologyDetail = useCallback(async (id: number) => {
    setLoadingDetail(`radiology-${id}`);
    try {
      const data = await radiologyAPI.get(id);
      setRadiologyDetails((prev) => ({ ...prev, [id]: data }));
    } finally {
      setLoadingDetail(null);
    }
  }, []);

  const toggleEncounter = (id: number) => {
    if (expandedEncounter === id) {
      setExpandedEncounter(null);
      return;
    }
    setExpandedEncounter(id);
    if (!encounterDetails[id]) fetchEncounterDetail(id);
  };

  const toggleLab = (id: number) => {
    if (expandedLab === id) {
      setExpandedLab(null);
      return;
    }
    setExpandedLab(id);
    if (!labDetails[id]) fetchLabDetail(id);
  };

  const toggleRadiology = (id: number) => {
    if (expandedRadiology === id) {
      setExpandedRadiology(null);
      return;
    }
    setExpandedRadiology(id);
    if (!radiologyDetails[id]) fetchRadiologyDetail(id);
  };

  const filteredLabs = labSearch.trim()
    ? labs.filter((l) => {
        const q = labSearch.toLowerCase();
        return (
          (l.cpt_name || "").toLowerCase().includes(q) ||
          (l.cpt_id || "").toLowerCase().includes(q)
        );
      })
    : labs;

  const filteredRadiology = radiologySearch.trim()
    ? radiology.filter((r) => {
        const q = radiologySearch.toLowerCase();
        return (
          (r.cpt_name || "").toLowerCase().includes(q) ||
          (r.cpt_id || "").toLowerCase().includes(q)
        );
      })
    : radiology;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-base-100">
        <Navbar />
        <div className="container mx-auto px-4 py-16 flex flex-col items-center gap-4">
          <div className="alert alert-error max-w-md">
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
            <span>{error || "Patient not found."}</span>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => router.push("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Breadcrumb */}
        <div className="breadcrumbs text-sm mb-4">
          <ul>
            <li>
              <button
                onClick={() => router.push("/dashboard")}
                className="link link-hover"
              >
                Patients
              </button>
            </li>
            <li className="text-base-content font-medium">{patient.name}</li>
          </ul>
        </div>

        {/* Patient Header Card */}
        <div className="card bg-base-100 border border-base-300 shadow-sm mb-6">
          <div className="card-body py-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Avatar */}
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-14 h-14 flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-base-content truncate">
                  {patient.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-base-content/70">
                  <span className="font-mono font-semibold text-primary">
                    MRN {patient.mrno}
                  </span>
                  <span>
                    {patient.age !== null ? `${patient.age} yrs` : "—"}
                  </span>
                  <span
                    className={`badge badge-sm ${patient.gender === "Male" ? "badge-info" : "badge-secondary"}`}
                  >
                    {patient.gender}
                  </span>
                  {patient.dob && <span>DOB: {formatDate(patient.dob)}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => router.push(`/encounter/${patient.mrno}`)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Session
                </button>
              </div>
            </div>

            {/* History */}
            {patient.history && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-1">
                  Medical History
                </h3>
                <p className="text-sm text-base-content/80 whitespace-pre-line">
                  {patient.history}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="tabs tabs-box mb-4">
          <button
            role="tab"
            className={`tab ${activeTab === "encounters" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("encounters")}
          >
            Encounters
            {!recordsLoading && (
              <span className="badge badge-sm badge-ghost ml-2">
                {encounters.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            className={`tab ${activeTab === "labs" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("labs")}
          >
            Lab Reports
            {!recordsLoading && (
              <span className="badge badge-sm badge-ghost ml-2">
                {labs.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            className={`tab ${activeTab === "radiology" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("radiology")}
          >
            Radiology
            {!recordsLoading && (
              <span className="badge badge-sm badge-ghost ml-2">
                {radiology.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {recordsLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Encounters Tab ───────────────────────────────── */}
            {activeTab === "encounters" && (
              <div className="flex flex-col gap-2">
                {encounters.length === 0 ? (
                  <EmptyState label="No encounters recorded." />
                ) : (
                  encounters.map((enc) => {
                    const isOpen = expandedEncounter === enc.id;
                    const detail = encounterDetails[enc.id];
                    const isDetailLoading =
                      loadingDetail === `encounter-${enc.id}`;

                    return (
                      <div
                        key={enc.id}
                        className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={() => toggleEncounter(enc.id)}
                        />
                        <div className="collapse-title flex items-center gap-3 pr-12">
                          <div className="flex-1 flex flex-wrap items-center gap-2">
                            <span className="font-medium text-base-content">
                              {formatDateTime(enc.date)}
                            </span>
                            {enc.clinician_name && (
                              <span className="badge badge-sm badge-outline badge-primary">
                                {enc.clinician_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="collapse-content">
                          {isDetailLoading ? (
                            <div className="flex items-center gap-2 py-4">
                              <span className="loading loading-spinner loading-sm text-primary" />
                              <span className="text-sm text-base-content/60">
                                Loading encounter details…
                              </span>
                            </div>
                          ) : detail ? (
                            <EncounterDetail
                              encounter={detail}
                              formatDateTime={formatDateTime}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Labs Tab ────────────────────────────────────── */}
            {activeTab === "labs" && (
              <div className="flex flex-col gap-2">
                {labs.length === 0 ? (
                  <EmptyState label="No lab reports available." />
                ) : (
                  <>
                    <SearchInput
                      value={labSearch}
                      onChange={setLabSearch}
                      placeholder="Search by test name or CPT code…"
                    />
                    {filteredLabs.length === 0 ? (
                      <EmptyState label="No lab reports match your search." />
                    ) : (
                      filteredLabs.map((lab) => {
                        const isOpen = expandedLab === lab.id;
                        const detail = labDetails[lab.id];
                        const isDetailLoading =
                          loadingDetail === `lab-${lab.id}`;

                        return (
                          <div
                            key={lab.id}
                            className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={isOpen}
                              onChange={() => toggleLab(lab.id)}
                            />
                            <div className="collapse-title flex items-center gap-3 pr-12">
                              <div className="flex-1 flex flex-wrap items-center gap-2">
                                <span className="font-medium text-base-content">
                                  {lab.cpt_name || lab.cpt_id || "Lab Panel"}
                                </span>
                                <span className="text-sm text-base-content/50">
                                  {formatDate(lab.invoice_date)}
                                </span>
                              </div>
                            </div>
                            <div className="collapse-content">
                              {isDetailLoading ? (
                                <div className="flex items-center gap-2 py-4">
                                  <span className="loading loading-spinner loading-sm text-primary" />
                                  <span className="text-sm text-base-content/60">
                                    Loading lab details…
                                  </span>
                                </div>
                              ) : detail ? (
                                <LabDetail lab={detail} />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Radiology Tab ───────────────────────────────── */}
            {activeTab === "radiology" && (
              <div className="flex flex-col gap-2">
                {radiology.length === 0 ? (
                  <EmptyState label="No radiology records available." />
                ) : (
                  <>
                    <SearchInput
                      value={radiologySearch}
                      onChange={setRadiologySearch}
                      placeholder="Search by study name or CPT code…"
                    />
                    {filteredRadiology.length === 0 ? (
                      <EmptyState label="No radiology records match your search." />
                    ) : (
                      filteredRadiology.map((rad) => {
                        const isOpen = expandedRadiology === rad.id;
                        const detail = radiologyDetails[rad.id];
                        const isDetailLoading =
                          loadingDetail === `radiology-${rad.id}`;

                        return (
                          <div
                            key={rad.id}
                            className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              checked={isOpen}
                              onChange={() => toggleRadiology(rad.id)}
                            />
                            <div className="collapse-title flex items-center gap-3 pr-12">
                              <div className="flex-1 flex flex-wrap items-center gap-2">
                                <span className="font-medium text-base-content">
                                  {rad.cpt_name ||
                                    rad.cpt_id ||
                                    "Radiology Report"}
                                </span>
                                <span className="text-sm text-base-content/50">
                                  {formatDateTime(rad.created_at)}
                                </span>
                              </div>
                            </div>
                            <div className="collapse-content">
                              {isDetailLoading ? (
                                <div className="flex items-center gap-2 py-4">
                                  <span className="loading loading-spinner loading-sm text-primary" />
                                  <span className="text-sm text-base-content/60">
                                    Loading radiology details…
                                  </span>
                                </div>
                              ) : detail ? (
                                <RadiologyDetail radiology={detail} />
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components for expanded detail views
   ────────────────────────────────────────────────────────────────────────── */

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="input input-sm w-full max-w-xs mb-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 opacity-50"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        className="grow"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-base-content/50 text-sm">
      {label}
    </div>
  );
}

function EncounterDetail({
  encounter,
  formatDateTime,
}: {
  encounter: Encounter;
  formatDateTime: (d: string | null) => string;
}) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Symptoms */}
      {encounter.symptoms && encounter.symptoms.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-2">
            Symptoms / Findings
          </h4>
          <div className="flex flex-wrap gap-2">
            {encounter.symptoms.map((s) => (
              <div key={s.id} className="badge badge-outline badge-sm">
                {s.snomed_fsn}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {encounter.notes && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-2">
            Clinical Notes
          </h4>
          <div className="bg-base-200 rounded-lg p-4 text-sm text-base-content/80 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {encounter.notes}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-base-content/40 flex gap-4">
        <span>Created: {formatDateTime(encounter.created_at)}</span>
        {encounter.clinician_name && (
          <span>Clinician: {encounter.clinician_name}</span>
        )}
      </div>
    </div>
  );
}

function LabDetail({ lab }: { lab: Lab }) {
  const tests = Object.entries(lab.results || {});

  return (
    <div className="pt-2">
      {lab.cpt_id && (
        <p className="text-xs text-base-content/50 mb-2">CPT: {lab.cpt_id}</p>
      )}

      {tests.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr>
                <th className="text-base-content/60">Test</th>
                <th className="text-base-content/60">Result</th>
                <th className="text-base-content/60">Unit</th>
                <th className="text-base-content/60">Normal Range</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(([name, data]) => {
                const low = data.normal_range?.[0];
                const high = data.normal_range?.[1];
                const isOutOfRange =
                  data.result !== null &&
                  ((low && !isNaN(Number(low)) && data.result < Number(low)) ||
                    (high &&
                      !isNaN(Number(high)) &&
                      data.result > Number(high)));

                return (
                  <tr key={name}>
                    <td className="font-medium">{name}</td>
                    <td
                      className={isOutOfRange ? "text-error font-semibold" : ""}
                    >
                      {data.result !== null ? data.result : "—"}
                    </td>
                    <td className="text-base-content/60">{data.unit || "—"}</td>
                    <td className="text-base-content/60">
                      {low || high ? `${low || "—"} – ${high || "—"}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-base-content/50">
          No test results available.
        </p>
      )}
    </div>
  );
}

function RadiologyDetail({ radiology }: { radiology: Radiology }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      {radiology.cpt_id && (
        <p className="text-xs text-base-content/50">CPT: {radiology.cpt_id}</p>
      )}

      {radiology.technique && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-1">
            Technique
          </h4>
          <p className="text-sm text-base-content/80">{radiology.technique}</p>
        </div>
      )}

      {radiology.result && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-1">
            Findings
          </h4>
          <div className="bg-base-200 rounded-lg p-3 text-sm text-base-content/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {radiology.result}
          </div>
        </div>
      )}

      {radiology.conclusion && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-1">
            Conclusion
          </h4>
          <p className="text-sm text-base-content/80">{radiology.conclusion}</p>
        </div>
      )}

      {radiology.system_conclusion && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/50 mb-1">
            AI Conclusion
          </h4>
          <div className="bg-info/10 border border-info/20 rounded-lg p-3 text-sm text-base-content/80">
            {radiology.system_conclusion}
          </div>
        </div>
      )}
    </div>
  );
}
