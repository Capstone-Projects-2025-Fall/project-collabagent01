import { getAIUsageStats } from "../../api/stats";

const originalFetch = global.fetch;

jest.mock("../../api/endpoints", () => ({
  LOG_ENDPOINT: "http://mock-api/logs",
}));

describe("getAIUsageStats", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns AI stats when response is valid", async () => {
    const mockStats = [
      { userId: "user1", totalSuggestions: 10, accepted: 6 },
      { userId: "user2", totalSuggestions: 5, accepted: 5 },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStats }),
    } as Response);

    const result = await getAIUsageStats();

    expect(result.data).toEqual(mockStats);
    expect(result.error).toBeUndefined();
  });

  it("returns an error when response.ok is false", async () => {
    const mockError = { message: "Unauthorized" };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => mockError,
    } as Response);

    const result = await getAIUsageStats();

    expect(result.error).toBe("Unauthorized");
    expect(result.data).toBeUndefined();
  });

  it("returns an error when data is missing", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await getAIUsageStats();

    expect(result.error).toBe("Invalid response: expected usage data");
    expect(result.data).toBeUndefined();
  });

  it("handles fetch failure", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network failure"));

    const result = await getAIUsageStats();

    expect(result.error).toBe("Network failure");
    expect(result.data).toBeUndefined();
  });
});
