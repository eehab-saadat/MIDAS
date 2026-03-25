"use client";

interface PaginatedListProps {
  page: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
  children: React.ReactNode;
  itemsPerPage?: number;
}

export function PaginatedList({
  page,
  totalCount,
  hasNext,
  hasPrevious,
  onPageChange,
  children,
  itemsPerPage = 10,
}: PaginatedListProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="flex flex-col gap-2">
      <div>{children}</div>

      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
          <p className="text-xs text-base-content/50">
            Page {page} of {totalPages} &middot; {totalCount} total
          </p>
          <div className="join">
            <button
              className="btn btn-xs join-item"
              disabled={!hasPrevious}
              onClick={() => onPageChange(page - 1)}
            >
              &larr; Prev
            </button>
            <button
              className="btn btn-xs join-item bg-base-200 border-base-300"
              disabled
            >
              {page}
            </button>
            <button
              className="btn btn-xs join-item"
              disabled={!hasNext}
              onClick={() => onPageChange(page + 1)}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
