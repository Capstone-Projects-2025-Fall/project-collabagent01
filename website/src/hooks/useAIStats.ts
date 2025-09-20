import { useEffect, useState } from "react";
import { getAIUsageStats } from "../api/stats";
import { AIStats } from "../api/types/suggestion";

/**
 * Custom hook to fetch AI usage statistics.
 * @module Hooks
 * @returns { aiStats: AIStats[] | undefined, isLoading: boolean, error: string | null }
 */
export const useAIStats = () => {
  const [aiStats, setAIStats] = useState<AIStats[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAIStats = async () => {
      setIsLoading(true);
      const { data, error } = await getAIUsageStats();

      if (error) {
        setError(error);
        setAIStats(undefined);
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError("No data found");
        setAIStats(undefined);
        setIsLoading(false);
        return;
      }

      setAIStats(data);
      setError(null);
      setIsLoading(false);
    };

    fetchAIStats();
  }, []);

  return { aiStats, isLoading, error };
};
