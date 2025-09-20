import { LOG_ENDPOINT } from "../../api/types/endpoints";
import { trackEvent, getLogsByUser } from "../../api/log-api";
import { LogData, LogEvent } from "../../api/types/event";
import { convertToSnakeCase } from "../../utils";

// Mock the dependencies
jest.mock("../../utils", () => ({
  convertToSnakeCase: jest.fn((obj) => ({
    ...obj,
    converted: true,
    time_lapse: obj.timeLapse, // Simulating snake case conversion
  })),
}));

global.fetch = jest.fn() as jest.Mock;

describe("Log API", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trackEvent", () => {
    const baseLogData: LogData = {
      event: LogEvent.MODEL_GENERATE,
      timeLapse: 100,
      metadata: { prompt: "test prompt" },
    };

    it("should send complete log data to the backend", () => {
      mockFetch.mockResolvedValue({ ok: true } as Response);

      trackEvent(baseLogData);

      expect(convertToSnakeCase).toHaveBeenCalledWith(baseLogData);
      expect(mockFetch).toHaveBeenCalledWith(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseLogData,
          converted: true,
          time_lapse: baseLogData.timeLapse,
        }),
      });
    });

    it("should handle minimal required log data", () => {
      const minimalLogData: LogData = {
        event: LogEvent.MODEL_GENERATE,
        timeLapse: 0,
        metadata: {},
      };

      trackEvent(minimalLogData);

      expect(mockFetch).toHaveBeenCalledWith(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...minimalLogData,
          converted: true,
          time_lapse: minimalLogData.timeLapse,
        }),
      });
    });

    it("should handle fetch errors silently", async () => {
      const error = new Error("Network error");
      mockFetch.mockRejectedValue(error);

      trackEvent(baseLogData);

      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to log data:",
        error
      );
    });

    it("should validate required fields in LogData", () => {
      // This test is more about TypeScript type checking than runtime behavior
      const invalidData = {
        // Missing required fields
        metadata: { test: "value" },
      } as unknown as LogData; // Force type to bypass TS error for testing purposes

      trackEvent(invalidData);

      // The function should still attempt to send the data
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("getLogsByUser", () => {
    const mockUserId = "user-123";
    const mockUserSectionId = "section-456";
    const mockUserClassId = "class-789";

    const mockLogData: LogData = {
      event: LogEvent.MODEL_GENERATE,
      timeLapse: 150,
      metadata: { suggestion: "test suggestion" },
    };

    it("should return logs with proper LogData structure", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [mockLogData] }),
      } as Response);

      const result = await getLogsByUser(mockUserId);

      expect(result.logs).toBeDefined();
      if (result.logs) {
        expect(result.logs[0]).toEqual(
          expect.objectContaining({
            event: expect.any(String),
            timeLapse: expect.any(Number),
            metadata: expect.any(Object),
          })
        );
      }
    });

    it("should handle empty metadata in returned logs", async () => {
      const logWithEmptyMetadata = {
        ...mockLogData,
        metadata: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [logWithEmptyMetadata] }),
      } as Response);

      const result = await getLogsByUser(mockUserId);
      expect(result.logs?.[0].metadata).toEqual({});
    });

    it("should validate the structure of returned logs", async () => {
      // Simulate malformed data from backend
      const malformedLog = {
        event: "INVALID_EVENT",
        // Missing timeLapse and metadata
        extraField: "should not be here",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [malformedLog] }),
      } as Response);

      const result = await getLogsByUser(mockUserId);
      expect(result.logs).toBeDefined();
      // The function should still return the data even if it doesn't match our interface
      expect(result.logs?.[0]).toEqual(malformedLog);
    });

    it("should handle API errors with proper error message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      } as Response);

      const result = await getLogsByUser(mockUserId);
      expect(result.error).toBe("Failed to fetch logs: Not Found");
    });

    it("should include timeLapse in the returned logs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [mockLogData] }),
      } as Response);

      const result = await getLogsByUser(mockUserId);
      expect(result.logs?.[0].timeLapse).toBeDefined();
    });
  });
});
