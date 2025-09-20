import { fetchLogs } from "../../api/log";

// Mock endpoints
const originalFetch = global.fetch;

jest.mock("../../api/endpoints", () => ({
  LOG_ENDPOINT: "http://mock-api/logs",
}));

describe("fetchLogs", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns default progressData if response has no data field", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ noData: true }),
    } as Response);

    const result = await fetchLogs("user-1");

    expect(result.progressData?.suggestions).toEqual([]);
    expect(result.progressData?.progress.totalAccepted).toBe(0);
  });

  it("returns computed progress and suggestions", async () => {
    const mockLogs = [
      {
        id: 1,
        event: "USER_ACCEPT",
        timestamp: "2025-05-01T00:00:00Z",
        time_lapse: 5,
        metadata: {
          has_bug: true,
          suggestion_text: "doSomething()",
          model: "test-model",
          prompt: "What is this?",
        },
      },
      {
        id: 2,
        event: "USER_ACCEPT",
        timestamp: "2025-05-01T01:00:00Z",
        time_lapse: 3,
        metadata: {
          has_bug: false,
          suggestion_text: "anotherThing()",
          model: "test-model",
          prompt: "Explain this.",
        },
      },
      {
        id: 3,
        event: "OTHER_EVENT",
        timestamp: "2025-05-01T02:00:00Z",
        time_lapse: 2,
        metadata: {
          has_bug: true,
          suggestion_text: "ignored()",
          model: "model-x",
          prompt: "Irrelevant?",
        },
      },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockLogs }),
    } as Response);

    const result = await fetchLogs("user-2");

    expect(result.progressData?.progress.totalAccepted).toBe(2);
    expect(result.progressData?.progress.totalWithBugs).toBe(1);
    expect(result.progressData?.progress.percentageWithBugs).toBe(50);
    expect(result.progressData?.suggestions.length).toBe(3);
  });

  it("handles invalid data format", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "not-an-array" }),
    } as Response);

    const result = await fetchLogs("user-3");
    expect(result.error).toBe("Invalid logs data format");
  });

  it("handles fetch errors", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchLogs("user-4");
    expect(result.error).toBe("Network error");
  });
});
