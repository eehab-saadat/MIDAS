import { useState, useEffect, useCallback } from "react";
import { patientsAPI, APIError } from "@/lib/api";
import type { CompletePatientDetails } from "@/types/api";

interface UsePatientDataReturn {
  data: CompletePatientDetails | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePatientData(mrno: string | null): UsePatientDataReturn {
  const [data, setData] = useState<CompletePatientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!mrno) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await patientsAPI.getByMrno(mrno);
      setData(result);
    } catch (err) {
      if (err instanceof APIError) {
        setError(
          err.status === 404
            ? `No patient found with MRNO "${mrno}".`
            : err.message,
        );
      } else {
        setError("Failed to load patient data. Please try again.");
      }
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [mrno]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
