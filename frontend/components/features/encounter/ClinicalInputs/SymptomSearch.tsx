"use client";

import { useState, useRef, useEffect } from "react";
import { useSnomedSearch } from "@/hooks/useSnomedSearch";
import { symptomsAPI } from "@/lib/api";
import { useEncounterStore } from "@/store/encounterStore";
import type { SnomedEntity, SnomedEntityType } from "@/types/api";

export function SymptomSearch() {
  const {
    query,
    setQuery,
    entityType,
    setEntityType,
    bodyPartId,
    setBodyPartId,
    results,
    hasMore,
    isLoading,
    bodyParts,
    loadMore,
  } = useSnomedSearch(3);

  const encounterId = useEncounterStore((s) => s.encounterId);
  const addSymptom = useEncounterStore((s) => s.addSymptom);

  const [remarksFor, setRemarksFor] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setRemarksFor(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = async (entity: SnomedEntity) => {
    if (!encounterId) return;

    if (remarksFor !== entity.snomed_cid) {
      setRemarksFor(entity.snomed_cid);
      setRemarks("");
      return;
    }

    setIsAdding(true);
    try {
      const symptom = await symptomsAPI.create({
        encounter: encounterId,
        snomed_entity: entity.snomed_cid,
        clinician_remarks: remarks,
      });
      addSymptom(symptom);
      setRemarksFor(null);
      setRemarks("");
      setQuery("");
      setShowDropdown(false);
    } catch {
      // Error feedback could be improved
    } finally {
      setIsAdding(false);
    }
  };

  const entityTypes: { value: SnomedEntityType | ""; label: string }[] = [
    { value: "", label: "All Types" },
    { value: "finding", label: "Finding" },
    { value: "procedure", label: "Procedure" },
    { value: "body_structure", label: "Body Structure" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-3">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Add Symptoms
        </h2>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2">
          <select
            className="select select-sm"
            value={entityType}
            onChange={(e) =>
              setEntityType(e.target.value as SnomedEntityType | "")
            }
          >
            {entityTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {bodyParts.length > 0 && (
            <select
              className="select select-sm"
              value={bodyPartId ?? ""}
              onChange={(e) =>
                setBodyPartId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">All Body Parts</option>
              {bodyParts.map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search input + dropdown */}
        <div ref={wrapperRef} className="relative">
          <label className="input w-full">
            <svg
              className="h-4 w-4 opacity-50"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search SNOMED symptoms (min 3 chars)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
            />
            {isLoading && (
              <span className="loading loading-spinner loading-xs" />
            )}
          </label>

          {/* Results dropdown */}
          {showDropdown && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-base-300 bg-base-100 shadow-lg">
              <ul className="menu menu-sm p-1">
                {results.map((entity) => (
                  <li key={entity.snomed_cid}>
                    {remarksFor === entity.snomed_cid ? (
                      <div className="flex flex-col gap-1 p-2 bg-base-200/50 rounded">
                        <span className="text-xs font-medium">
                          {entity.fsn}
                        </span>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            className="input input-xs flex-1"
                            placeholder="Optional remarks..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAdd(entity);
                              }
                            }}
                          />
                          <button
                            className="btn btn-xs btn-primary"
                            disabled={isAdding}
                            onClick={() => handleAdd(entity)}
                          >
                            {isAdding ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              "Add"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="flex items-center justify-between w-full"
                        onClick={() => handleAdd(entity)}
                      >
                        <div className="min-w-0">
                          <span className="text-sm truncate block">
                            {entity.fsn}
                          </span>
                          <span className="text-xs text-base-content/50">
                            {entity.snomed_cid} &middot; {entity.entity_type}
                          </span>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 shrink-0 opacity-40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {hasMore && (
                <button
                  className="btn btn-ghost btn-xs btn-block"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  Load more...
                </button>
              )}
            </div>
          )}
        </div>

        {!encounterId && (
          <p className="text-xs text-warning">
            Encounter not created yet. Symptoms will be available once the
            session is initialized.
          </p>
        )}
      </div>
    </div>
  );
}
