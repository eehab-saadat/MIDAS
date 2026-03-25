"use client";

import { useState, useEffect, useCallback } from "react";
import { labsAPI } from "@/lib/api";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginatedList } from "@/components/ui/PaginatedList";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Lab } from "@/types/api";

interface LabHistoryProps {
  patientPk: number | null;
}

export function LabHistory({ patientPk }: LabHistoryProps) {
  const [items, setItems] = useState<Lab[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-invoice_date");
  const debouncedSearch = useDebounce(search, 300);

  const pagination = usePagination();

  const fetchData = useCallback(async () => {
    if (!patientPk) return;
    setIsLoading(true);
    try {
      const res = await labsAPI.list({
        patient: patientPk,
        search: debouncedSearch || undefined,
        ordering,
        page: pagination.page,
      });
      setItems(res.results);
      pagination.updateFromResponse(res);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [patientPk, debouncedSearch, ordering, pagination.page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    pagination.resetPage();
  }, [debouncedSearch, ordering]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search labs..."
          className="input input-sm flex-1 min-w-[180px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select select-sm"
          value={ordering}
          onChange={(e) => setOrdering(e.target.value)}
        >
          <option value="-invoice_date">Newest first</option>
          <option value="invoice_date">Oldest first</option>
          <option value="cpt_name">Name A-Z</option>
          <option value="-cpt_name">Name Z-A</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          compact
          title="No lab results found"
          description={
            debouncedSearch
              ? "Try a different search term."
              : "Add a lab report to get started."
          }
        />
      ) : (
        <PaginatedList
          page={pagination.page}
          totalCount={pagination.totalCount}
          hasNext={pagination.hasNext}
          hasPrevious={pagination.hasPrevious}
          onPageChange={pagination.goToPage}
        >
          <div className="flex flex-col gap-2">
            {items.map((lab) => (
              <div
                key={lab.id}
                tabIndex={0}
                className="collapse collapse-arrow border border-base-200 bg-base-200/20"
              >
                <input type="checkbox" />
                <div className="collapse-title text-sm font-medium flex items-center gap-2 pr-10">
                  <span className="truncate flex-1">
                    {lab.cpt_name || "Untitled Panel"}
                  </span>
                  <span className="text-xs text-base-content/50 shrink-0">
                    {formatDate(lab.invoice_date)}
                  </span>
                </div>
                <div className="collapse-content">
                  {lab.results && Object.keys(lab.results).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table table-xs">
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Result</th>
                            <th>Unit</th>
                            <th>Normal Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(lab.results).map(
                            ([testName, val]) => {
                              const v =
                                typeof val === "object" && val !== null
                                  ? val
                                  : {
                                      result: val as number | null,
                                      unit: "",
                                      normal_range: ["", ""] as [
                                        string,
                                        string,
                                      ],
                                    };
                              return (
                                <tr key={testName}>
                                  <td className="font-medium">{testName}</td>
                                  <td>
                                    {v.result != null ? v.result : "--"}
                                  </td>
                                  <td className="text-base-content/60">
                                    {v.unit || "--"}
                                  </td>
                                  <td className="text-base-content/60">
                                    {v.normal_range?.[0] || v.normal_range?.[1]
                                      ? `${v.normal_range[0]} - ${v.normal_range[1]}`
                                      : "--"}
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-base-content/40 italic">
                      No test results in this report.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PaginatedList>
      )}
    </div>
  );
}
