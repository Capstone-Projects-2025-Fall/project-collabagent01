import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/react"; // <-- use this instead
import { useAIStats } from "../../hooks/useAIStats";
import { getAIUsageStats } from "../../api/stats";
import { AIStats } from "../../api/types/suggestion";

jest.mock("../../api/stats");
jest.mock("../../api/endpoints", () => ({
  BASE_ENDPOINT: "http://test-endpoint",
  AUTH_ENDPOINT: "http://test-endpoint/auth",
  STATS_ENDPOINT: "http://test-endpoint/stats",
}));

const mockGetAIUsageStats = getAIUsageStats as jest.Mock;

describe("useAIStats", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return AI stats on successful fetch", async () => {
    const mockStats: AIStats[] = [
      {
        id: "1",
        created_at: "2025-04-30T12:00:00Z",
        input_tokens: 100,
        output_tokens: 200,
        total_tokens: 300,
        model: "gpt-4",
        latency_seconds: 0.5,
        provider: "openai",
      },
    ];
    mockGetAIUsageStats.mockResolvedValue({ data: mockStats, error: null });

    const { result } = renderHook(() => useAIStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.aiStats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it("should handle API error", async () => {
    mockGetAIUsageStats.mockResolvedValue({
      data: undefined,
      error: "Fetch error",
    });

    const { result } = renderHook(() => useAIStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Fetch error");
    expect(result.current.aiStats).toBeUndefined();
  });

  it("should handle null data", async () => {
    mockGetAIUsageStats.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAIStats());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("No data found");
    expect(result.current.aiStats).toBeUndefined();
  });
});
