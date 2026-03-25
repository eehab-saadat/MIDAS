"use client";

import { useState, useEffect, useCallback } from "react";
import { radiologyAPI } from "@/lib/api";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { PaginatedList } from "@/components/ui/PaginatedList";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Radiology } from "@/types/api";

interface RadiologyHistoryProps {
  patientPk: number | null;
}

export function RadiologyHistory({ patientPk }: RadiologyHistoryProps) {
  const [items, setItems] = useState<Radiology[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const debouncedSearch = useDebounce(search, 300);

  const pagination = usePagination();

  const fetchData = useCallback(async () => {
    if (!patientPk) return;
    setIsLoading(true);
    try {
      const res = await radiologyAPI.list({
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

  // Reset to page 1 when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [debouncedSearch, ordering]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search radiology..."
          className="input input-sm flex-1 min-w-[180px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select select-sm"
          value={ordering}
          onChange={(e) => setOrdering(e.target.value)}
        >
          <option value="-created_at">Newest first</option>
          <option value="created_at">Oldest first</option>
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
          title="No radiology reports found"
          description={
            debouncedSearch
              ? "Try a different search term."
              : "Upload an image to get started."
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
            {items.map((rad) => (
              <div
                key={rad.id}
                tabIndex={0}
                className="collapse collapse-arrow border border-base-200 bg-base-200/20"
              >
                <input type="checkbox" />
                <div className="collapse-title text-sm font-medium flex items-center gap-2 pr-10">
                  <span className="truncate flex-1">
                    {rad.cpt_name || "Untitled"}
                  </span>
                  <span className="text-xs text-base-content/50 shrink-0">
                    {formatDate(rad.created_at)}
                  </span>
                  {rad.locked && (
                    <StatusBadge
                      variant="processing"
                      label="Processing"
                      pulse
                    />
                  )}
                </div>
                <div className="collapse-content text-sm space-y-2">
                  {rad.technique && (
                    <div>
                      <span className="font-medium text-base-content/70">
                        Technique:
                      </span>{" "}
                      {rad.technique}
                    </div>
                  )}
                  {rad.result && (
                    <div>
                      <span className="font-medium text-base-content/70">
                        Result:
                      </span>{" "}
                      {rad.result}
                    </div>
                  )}
                  {rad.conclusion && (
                    <div>
                      <span className="font-medium text-base-content/70">
                        Conclusion:
                      </span>{" "}
                      {rad.conclusion}
                    </div>
                  )}
                  {rad.system_conclusion && !rad.locked && (
                    <div className="p-2 bg-info/10 rounded">
                      <span className="font-medium text-info">
                        AI Conclusion:
                      </span>{" "}
                      {rad.system_conclusion}
                    </div>
                  )}
                  {rad.locked && (
                    <div className="flex items-center gap-2 text-warning text-xs">
                      <span className="loading loading-spinner loading-xs" />
                      Record is being analyzed. AI conclusion will appear once
                      processing completes.
                    </div>
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
