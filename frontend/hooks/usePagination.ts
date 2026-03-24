import { useState, useCallback } from "react";
import type { PaginatedResponse } from "@/types/api";

export interface PaginationState {
  page: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function usePagination() {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    totalCount: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const updateFromResponse = useCallback(
    <T>(response: PaginatedResponse<T>) => {
      setState((prev) => ({
        ...prev,
        totalCount: response.count,
        hasNext: !!response.next,
        hasPrevious: !!response.previous,
      }));
    },
    [],
  );

  const goToPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page: Math.max(1, page) }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) =>
      prev.hasNext ? { ...prev, page: prev.page + 1 } : prev,
    );
  }, []);

  const prevPage = useCallback(() => {
    setState((prev) =>
      prev.hasPrevious ? { ...prev, page: prev.page - 1 } : prev,
    );
  }, []);

  const resetPage = useCallback(() => {
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    ...state,
    updateFromResponse,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
  };
}
