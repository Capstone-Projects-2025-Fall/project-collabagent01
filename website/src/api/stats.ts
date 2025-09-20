import { LOG_ENDPOINT } from "./endpoints";
import { AIStats } from "./types/suggestion";

/**
 * Fetches AI usage statistics from the server.
 * @returns {Promise<{ data?: AIStats[]; error?: string }>} - The response from the server or an error message.
 */
export async function getAIUsageStats(): Promise<{
  data?: AIStats[];
  error?: string;
}> {
  try {
    const response = await fetch(`${LOG_ENDPOINT}/ai`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to get AI usage stats: ${response.status} ${response.statusText}`,
      };
    }

    if (!data.data) {
      return { error: "Invalid response: expected usage data" };
    }

    return { data: data.data as AIStats[] };

  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}