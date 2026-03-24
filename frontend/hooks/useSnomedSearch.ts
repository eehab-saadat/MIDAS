import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "./useDebounce";
import { snomedEntitiesAPI, bodyPartsAPI } from "@/lib/api";
import type {
  SnomedEntity,
  SnomedEntityType,
  BodyPart,
  PaginatedResponse,
} from "@/types/api";

interface UseSnomedSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  entityType: SnomedEntityType | "";
  setEntityType: (t: SnomedEntityType | "") => void;
  bodyPartId: number | null;
  setBodyPartId: (id: number | null) => void;
  results: SnomedEntity[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  bodyParts: BodyPart[];
  loadMore: () => void;
  reset: () => void;
}

export function useSnomedSearch(minChars: number = 3): UseSnomedSearchReturn {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<SnomedEntityType | "">("");
  const [bodyPartId, setBodyPartId] = useState<number | null>(null);
  const [results, setResults] = useState<SnomedEntity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);

  const debouncedQuery = useDebounce(query, 300);

  // Load body parts once
  useEffect(() => {
    bodyPartsAPI
      .list()
      .then((res) => setBodyParts(res.results))
      .catch(() => {});
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setResults([]);
  }, [debouncedQuery, entityType, bodyPartId]);

  // Search
  useEffect(() => {
    if (debouncedQuery.length < minChars) {
      setResults([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const params: Record<string, unknown> = {
      search: debouncedQuery,
      page,
    };
    if (entityType) params.entity_type = entityType;
    if (bodyPartId) params.body_part = bodyPartId;

    snomedEntitiesAPI
      .list(params as Parameters<typeof snomedEntitiesAPI.list>[0])
      .then((res: PaginatedResponse<SnomedEntity>) => {
        if (cancelled) return;
        setResults((prev) =>
          page === 1 ? res.results : [...prev, ...res.results],
        );
        setTotalCount(res.count);
        setHasMore(!!res.next);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setTotalCount(0);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, entityType, bodyPartId, page, minChars]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) setPage((p) => p + 1);
  }, [hasMore, isLoading]);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setPage(1);
    setTotalCount(0);
    setHasMore(false);
  }, []);

  return {
    query,
    setQuery,
    entityType,
    setEntityType,
    bodyPartId,
    setBodyPartId,
    results,
    totalCount,
    hasMore,
    isLoading,
    bodyParts,
    loadMore,
    reset,
  };
}
